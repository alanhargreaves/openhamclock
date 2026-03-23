'use strict';
/**
 * plugins/rigctld.js — rigctld / Hamlib TCP plugin
 *
 * Connects to a running rigctld daemon via TCP and provides rig control
 * by sending single-letter commands over a persistent socket connection.
 */

const net = require('net');

module.exports = {
  id: 'rigctld',
  name: 'rigctld / Hamlib (TCP)',
  category: 'rig',
  configKey: 'radio',

  create(config, { updateState, state }) {
    let socket = null;
    let queue = [];
    let pending = null;
    let pollTimer = null;
    let reconnectTimer = null;
    let wasExplicitlyDisconnected = false;

    function stopPolling() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function process() {
      if (pending || queue.length === 0 || !socket) return;
      const req = queue.shift();
      pending = req;
      socket.write(req.cmd + '\n');
    }

    function send(cmd, cb) {
      if (!socket) {
        if (cb) cb(new Error('Not connected'));
        return;
      }
      queue.push({ cmd, cb });
      process();
    }

    function handleResponse(line) {
      if (!pending) return;
      const req = pending;

      if (line.startsWith('RPRT ')) {
        // rigctld default mode: GET commands return raw value(s) only, no RPRT.
        //                       SET commands return only RPRT.
        // rigctld extended mode (-e): all commands return value(s) then RPRT.
        //
        // Rules:
        //   SET commands  → always advance on RPRT (it's their only response)
        //   GET error     → always advance (RPRT -11 = unsupported, etc.)
        //   GET success   → ignore if queue already advanced via data line;
        //                   but advance if 'm' got mode but no passband yet
        const code = parseInt(line.slice(5));
        const isGet = req.cmd === 'f' || req.cmd === 'm' || req.cmd === 't';
        const advance =
          !isGet || // SET command
          code !== 0 || // any error
          (req.cmd === 'm' && req._mode); // 'm' got mode but passband never arrived
        if (advance) {
          pending = null;
          if (req.cb) req.cb(code !== 0 ? new Error(`RPRT ${code}`) : null, '');
          state.lastUpdate = Date.now();
          process();
        }
        // else: trailing RPRT 0 for a GET in extended mode — queue already
        // advanced on the data line, nothing to do.
        return;
      }

      // Data lines — update state and advance the queue for GET commands.
      // SET commands produce no data lines; their RPRT is handled above.
      if (req.cmd === 'f') {
        pending = null;
        const freq = parseInt(line);
        if (freq > 0) {
          if (state.freq !== freq) console.log(`[Rigctld] freq → ${(freq / 1e6).toFixed(6)} MHz`);
          updateState('freq', freq);
        }
        if (req.cb) req.cb(null, line);
        state.lastUpdate = Date.now();
        process();
      } else if (req.cmd === 'm') {
        // 'm' returns TWO data lines: mode string then passband integer.
        // Keep pending across the first line so the queue doesn't advance early.
        if (!req._mode) {
          req._mode = line;
          if (line && state.mode !== line) console.log(`[Rigctld] mode → ${line}`);
          updateState('mode', line);
          // wait for passband line
        } else {
          pending = null;
          updateState('width', parseInt(line));
          if (req.cb) req.cb(null, line);
          state.lastUpdate = Date.now();
          process();
        }
      } else if (req.cmd === 't') {
        pending = null;
        const ptt = line === '1';
        if (state.ptt !== ptt) console.log(`[Rigctld] PTT → ${ptt ? 'TX' : 'RX'}`);
        updateState('ptt', ptt);
        if (req.cb) req.cb(null, line);
        state.lastUpdate = Date.now();
        process();
      }
    }

    function startPolling() {
      stopPolling();
      pollTimer = setInterval(() => {
        if (!socket) return;
        send('f');
        send('m');
        send('t');
      }, config.radio.pollInterval || 1000);
    }

    function connect() {
      if (socket) return;
      wasExplicitlyDisconnected = false;

      const host = config.radio.rigctldHost || '127.0.0.1';
      const port = config.radio.rigctldPort || 4532;
      // SECURITY: Defensive host check — primary validation is in POST /api/config,
      // but guard here too in case config is edited manually.
      if (
        !/^(localhost|\d{1,3}(\.\d{1,3}){3}|\[[\da-fA-F:]+\]|[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*)$/.test(
          host,
        ) ||
        /[/:]{2}|[/\\]/.test(host)
      ) {
        console.error(`[Rigctld] Refused to connect: invalid host value "${host}"`);
        return;
      }
      console.log(`[Rigctld] Connecting to ${host}:${port}...`);

      const s = new net.Socket();
      s.connect(port, host, () => {
        console.log('[Rigctld] Connected');
        updateState('connected', true);
        socket = s;
        startPolling();
      });

      s.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          handleResponse(line.trim());
        }
      });

      s.on('close', () => {
        updateState('connected', false);
        socket = null;
        stopPolling();
        pending = null;
        queue = [];

        if (!wasExplicitlyDisconnected) {
          console.log('[Rigctld] Connection lost — retrying in 5 s…');
          reconnectTimer = setTimeout(connect, 5000);
        }
      });

      s.on('error', (err) => {
        if (!wasExplicitlyDisconnected) {
          console.error(`[Rigctld] Error: ${err.message}`);
        }
        s.destroy();
      });
    }

    function disconnect() {
      wasExplicitlyDisconnected = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      stopPolling();
      if (socket) {
        try {
          socket.destroy();
        } catch (e) {}
        socket = null;
      }
      pending = null;
      queue = [];
      updateState('connected', false);
      console.log('[Rigctld] Disconnected');
    }

    function setFreq(hz) {
      console.log(`[Rigctld] SET FREQ: ${(hz / 1e6).toFixed(6)} MHz`);
      send(`F ${hz}`);
      // Some Hamlib backends (notably Yaesu newcat: FT-991A, FT-DX10, FT-950,
      // FT-891, etc.) send a FT0/FT1 TX-VFO-select CAT command as part of
      // resolving RIG_VFO_CURR internally, which the radio interprets as
      // activating split mode.  Other backends (some Icom, Kenwood) can
      // exhibit similar VFO side-effects.
      // Workaround: send S 0 VFOA after each freq change to reset split.
      // Enable via config.radio.fixSplit = true, or fix at source by starting
      // rigctld with --set-conf=rig_vfo=1.
      if (config.radio.fixSplit) {
        send('S 0 VFOA');
      }
    }

    function setMode(mode) {
      console.log(`[Rigctld] SET MODE: ${mode}`);
      send(`M ${mode} 0`);
    }

    function setPTT(on) {
      console.log(`[Rigctld] SET PTT: ${on ? 'TX' : 'RX'}`);
      send(on ? 'T 1' : 'T 0');
    }

    return { connect, disconnect, setFreq, setMode, setPTT };
  },
};
