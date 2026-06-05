/**
 * Watchtower — Cloudflare Worker that monitors openhamclock infrastructure
 * and posts state-change alerts to a Discord webhook.
 *
 * Why CF Workers instead of another Railway service: Railway has had outages
 * in the past, and a watchdog that goes down when the thing it's watching
 * goes down is useless. CF runs the prober outside Railway's blast radius.
 *
 * Probes (every 1 min):
 *   - openhamclock.com /api/health  (also reads subsystems: fletcher, rbn,
 *                                    satellites, propagation)
 *   - proppy-production.up.railway.app /api/version
 *   - spider-production.up.railway.app /health
 *
 * State stored in KV (WATCHTOWER_STATE) per (service, subsystem). On a
 * status flip, posts a Discord embed and pings the configured role IDs on
 * any 'down' transition. Daily heartbeat at 09:00 UTC so the channel knows
 * the watchtower itself is alive.
 *
 * Env vars (set via wrangler secret / wrangler.toml):
 *   - DISCORD_WEBHOOK_URL   (secret, required)
 *   - DISCORD_PING_ROLES    (comma-separated role IDs, e.g. "A,B")
 *   - PROBE_TIMEOUT_MS      (default 8000)
 */

const SERVICES = [
  {
    name: 'openhamclock',
    url: 'https://openhamclock.com/api/health',
    parse: parseOpenHamClock, // returns { aggregate, subsystems: {fletcher, rbn, ...} }
  },
  {
    name: 'proppy',
    url: 'https://proppy-production.up.railway.app/api/version',
    parse: parseSimple200,
  },
  {
    name: 'spider',
    url: 'https://spider-production.up.railway.app/health',
    parse: parseSimple200,
  },
];

const STATUS_COLORS = {
  ok: 0x57f287, // green
  degraded: 0xfee75c, // yellow
  down: 0xed4245, // red
  unknown: 0x99aab5, // gray
};

const SEVERITY = { ok: 0, unknown: 0, degraded: 1, down: 2 };

// ── HTTP probes ────────────────────────────────────────────────────────────

async function probe(service, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(service.url, { signal: controller.signal });
    if (!res.ok) {
      return [{ subsystem: 'aggregate', status: 'down', detail: `HTTP ${res.status}` }];
    }
    const body = await res.text();
    return service.parse(body, res);
  } catch (err) {
    return [{ subsystem: 'aggregate', status: 'down', detail: `probe failed: ${err.message || err}` }];
  } finally {
    clearTimeout(timer);
  }
}

function parseOpenHamClock(body) {
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return [{ subsystem: 'aggregate', status: 'down', detail: 'invalid JSON response' }];
  }

  const out = [];
  out.push({
    subsystem: 'aggregate',
    status: data.subsystemStatus || 'unknown',
    detail: `version ${data.version} · uptime ${data.uptimeFormatted || ''}`.trim(),
  });

  const subs = data.subsystems || {};
  for (const key of ['fletcher', 'rbn', 'satellites', 'propagation']) {
    const s = subs[key];
    if (!s) continue;
    out.push({
      subsystem: key,
      status: s.status || 'unknown',
      detail: s.detail || null,
    });
  }
  return out;
}

function parseSimple200() {
  return [{ subsystem: 'aggregate', status: 'ok', detail: '2xx response' }];
}

// ── State + transitions ────────────────────────────────────────────────────

async function readPrev(env, service, subsystem) {
  const key = `${service}.${subsystem}`;
  const raw = await env.WATCHTOWER_STATE.get(key);
  return raw ? JSON.parse(raw) : null;
}

async function writeCurrent(env, service, subsystem, status, detail) {
  const key = `${service}.${subsystem}`;
  await env.WATCHTOWER_STATE.put(key, JSON.stringify({ status, detail, since: new Date().toISOString() }));
}

function describeFlip(prev, curr) {
  const prevSev = SEVERITY[prev.status] ?? 0;
  const currSev = SEVERITY[curr.status] ?? 0;
  if (currSev > prevSev) return 'declined';
  if (currSev < prevSev) return 'recovered';
  return 'changed';
}

// ── Discord post ───────────────────────────────────────────────────────────

async function postFlip(env, service, subsystem, prev, curr) {
  if (!env.DISCORD_WEBHOOK_URL) return;

  const direction = describeFlip(prev, curr);
  const pingRoles = (env.DISCORD_PING_ROLES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const mentions = curr.status === 'down' && pingRoles.length ? pingRoles.map((id) => `<@&${id}>`).join(' ') + ' ' : '';

  const symbol = direction === 'recovered' ? '✅' : direction === 'declined' ? '🚨' : '🔄';
  const subsystemTitle = subsystem === 'aggregate' ? '' : ` · ${subsystem}`;

  const embed = {
    title: `${symbol} ${service}${subsystemTitle}: ${prev.status} → ${curr.status}`,
    color: STATUS_COLORS[curr.status] ?? STATUS_COLORS.unknown,
    timestamp: new Date().toISOString(),
    fields: [
      { name: 'Previous', value: `\`${prev.status}\``, inline: true },
      { name: 'Current', value: `\`${curr.status}\``, inline: true },
    ],
  };
  if (curr.detail) embed.fields.push({ name: 'Detail', value: curr.detail.slice(0, 1024) });
  if (prev.since) embed.fields.push({ name: 'Held since', value: prev.since, inline: true });

  await fetch(env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: mentions || undefined,
      embeds: [embed],
      allowed_mentions: { roles: pingRoles },
    }),
  });
}

async function postHeartbeat(env, snapshot) {
  if (!env.DISCORD_WEBHOOK_URL) return;
  const lines = Object.entries(snapshot)
    .filter(([k]) => k.endsWith('.aggregate'))
    .map(([k, v]) => {
      const service = k.replace('.aggregate', '');
      const emoji = v.status === 'ok' ? '🟢' : v.status === 'degraded' ? '🟡' : v.status === 'down' ? '🔴' : '⚪';
      return `${emoji} **${service}**: ${v.status}`;
    });
  await fetch(env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: '🗼 Watchtower daily heartbeat',
          description: lines.join('\n') || 'no services configured',
          color: 0x5865f2,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
}

// ── Tick ───────────────────────────────────────────────────────────────────

async function tick(env, opts = {}) {
  const timeoutMs = parseInt(env.PROBE_TIMEOUT_MS, 10) || 8000;
  const flips = [];
  const snapshot = {};

  for (const service of SERVICES) {
    const results = await probe(service, timeoutMs);
    for (const r of results) {
      const prev = (await readPrev(env, service.name, r.subsystem)) || { status: 'unknown', detail: null };
      snapshot[`${service.name}.${r.subsystem}`] = r;
      // Only post a flip when status actually changes AND we've seen the
      // prior status before (skips boot-time unknown → ok noise).
      if (prev.status !== r.status && prev.status !== 'unknown') {
        flips.push({ service: service.name, subsystem: r.subsystem, prev, curr: r });
      }
      // CF KV free tier caps writes at 1000/day. We only write when the
      // status actually changes (or on first-ever observation) to stay well
      // inside that budget. Steady-state writes ≈ 0.
      if (prev.status !== r.status) {
        await writeCurrent(env, service.name, r.subsystem, r.status, r.detail);
      }
    }
  }

  for (const f of flips) {
    await postFlip(env, f.service, f.subsystem, f.prev, f.curr);
  }

  // Daily heartbeat at 09:00 UTC. We use a KV-stored ISO date so we only
  // post once per day even if the cron fires more than once at that hour.
  const now = new Date();
  if (opts.forceHeartbeat || (now.getUTCHours() === 9 && now.getUTCMinutes() < 5)) {
    const today = now.toISOString().slice(0, 10);
    const last = await env.WATCHTOWER_STATE.get('lastHeartbeatDay');
    if (last !== today || opts.forceHeartbeat) {
      await postHeartbeat(env, snapshot);
      await env.WATCHTOWER_STATE.put('lastHeartbeatDay', today);
    }
  }

  return { flips: flips.length, snapshot };
}

// ── Worker exports ─────────────────────────────────────────────────────────

export default {
  async scheduled(controller, env) {
    await tick(env);
  },

  // GET /tick  — manual run, returns flips + snapshot
  // GET /test-flip?service=X&subsystem=Y&status=down  — force a fake flip for testing
  // GET /heartbeat  — force heartbeat now
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/tick') {
      const result = await tick(env);
      return Response.json(result);
    }

    if (url.pathname === '/heartbeat') {
      const result = await tick(env, { forceHeartbeat: true });
      return Response.json({ ok: true, ...result });
    }

    if (url.pathname === '/test-flip') {
      const service = url.searchParams.get('service') || 'watchtower';
      const subsystem = url.searchParams.get('subsystem') || 'self-test';
      const status = url.searchParams.get('status') || 'down';
      const prev = { status: 'ok', detail: 'test', since: new Date().toISOString() };
      const curr = { status, detail: 'forced via /test-flip' };
      await postFlip(env, service, subsystem, prev, curr);
      return Response.json({ ok: true, posted: { service, subsystem, prev, curr } });
    }

    if (url.pathname === '/state') {
      // Dump current KV state as JSON for debugging.
      const list = await env.WATCHTOWER_STATE.list();
      const state = {};
      for (const k of list.keys) {
        state[k.name] = JSON.parse((await env.WATCHTOWER_STATE.get(k.name)) || 'null');
      }
      return Response.json(state);
    }

    return new Response(
      'watchtower\n\nGET /tick — run one probe cycle now\nGET /heartbeat — post the heartbeat now\nGET /state — dump KV state\nGET /test-flip?status=down — force a Discord post\n',
      { headers: { 'Content-Type': 'text/plain' } },
    );
  },
};
