const net = require('net');
const http = require('http');
// Pull the live application configuration module
const appConfig = require('../server/config.js');

const OHC_HOST = '127.0.0.1';
const OHC_PORT = 3001;

let client = new net.Socket();
client.setNoDelay(true);

let isConnecting = false;
let currentHost = '';
let currentPort = null;

// Dynamic connection manager that checks your UI values
function connectToN3FJP() {
  if (isConnecting) return;

  // Clear Node's module cache for the config file so it forces a fresh read from the disk
  delete require.cache[require.resolve('../server/config.js')];
  const freshConfig = require('../server/config.js');

  // 🚀 Check injected process environment variables first, then fallback to disk config
  const N3FJP_HOST = process.env.N3FJP_TARGET_HOST || freshConfig.n3fjpHost || '127.0.0.1';
  const N3FJP_PORT = parseInt(process.env.N3FJP_TARGET_PORT || freshConfig.n3fjpPort || 1100, 10);

  currentHost = N3FJP_HOST;
  currentPort = N3FJP_PORT;
  isConnecting = true;

  console.log(`📡 Attempting connection to N3FJP at ${N3FJP_HOST}:${N3FJP_PORT}...`);

  client.connect(N3FJP_PORT, N3FJP_HOST, () => {
    console.log(`✅ Bridge Connected to N3FJP at ${N3FJP_HOST}:${N3FJP_PORT} (Low-Latency Mode)`);
    isConnecting = false;
  });
}

// Kickstart initial connection
connectToN3FJP();

let dataBuffer = '';

client.on('data', (data) => {
  dataBuffer += data.toString();
  while (dataBuffer.includes('</CMD>')) {
    const endIdx = dataBuffer.indexOf('</CMD>') + 6;
    const currentRecord = dataBuffer.substring(0, endIdx);
    dataBuffer = dataBuffer.substring(endIdx);
    processN3FJPRecord(currentRecord);
  }
});

// Utility to convert ADIF format (e.g., N044 38.5 or W070 12.3) to Decimal Degrees
function parseAdifCoords(rawStr, isLongitude) {
  if (!rawStr) return 0;
  const clean = rawStr.toUpperCase().trim();
  if (!clean) return 0;

  const match = clean.match(/^([NSEW])\s*(\d+)(?:\s+([\d.]+))?/);
  if (!match) {
    const val = parseFloat(clean);
    return Number.isFinite(val) ? val : 0;
  }

  const dir = match[1];
  const degrees = parseInt(match[2], 10);
  const minutes = match[3] ? parseFloat(match[3]) : 0;

  let decimal = degrees + minutes / 60;

  if (dir === 'S' || dir === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

// Quick helper to fetch true callsign coordinates from your existing server database
function fetchTrueCallCoords(callsign) {
  return new Promise((resolve) => {
    const call = (callsign || '').toUpperCase().trim();
    if (!call || call === 'CLEAR') return resolve(null);

    const req = http.get(`http://${OHC_HOST}:${OHC_PORT}/api/callsign/${encodeURIComponent(call)}`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data && typeof data.lat === 'number' && typeof data.lon === 'number') {
            return resolve({ lat: data.lat, lon: data.lon });
          }
        } catch (e) {}
        resolve(null);
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

async function processN3FJPRecord(raw) {
  const getTag = (tag) => {
    const m = raw.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 'i'));
    return m && m[1] ? m[1].trim() : '';
  };

  const call = getTag('CALL');
  const isClearSignal = raw.includes('CLEARTAB') || raw.includes('<CLEAR>') || (raw.includes('CALLTAB') && call === '');

  let eventType = isClearSignal ? 'clear' : raw.includes('CALLTAB') ? 'preview' : 'log';

  if (!call && eventType !== 'clear') return;

  // Parse the raw incoming coordinates out of N3FJP
  const rawLat = getTag('LAT');
  const rawLon = getTag('LON');
  let lat = parseAdifCoords(rawLat, false);
  let lon = parseAdifCoords(rawLon, true);

  // 🚨 THE CRITICAL INTERCEPTION:
  if (lat === 42.4 && lon === -71.7 && call && !isClearSignal) {
    const trueCoords = await fetchTrueCallCoords(call);
    if (trueCoords) {
      lat = trueCoords.lat;
      lon = trueCoords.lon;
    } else {
      lat = 0.0;
      lon = 0.0;
    }
  }

  const qso = {
    dx_call: isClearSignal ? 'CLEAR' : call,
    dx_grid: getTag('GRIDSQUARE') || getTag('GRID'),
    lat: lat,
    lon: lon,
    status: isClearSignal ? 'clear' : eventType,
    source: 'n3fjp',
    ts_utc: new Date().toISOString(),
  };

  const payload = JSON.stringify(qso);
  const req = http.request(
    {
      hostname: OHC_HOST,
      port: OHC_PORT,
      path: '/api/n3fjp/qso',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Connection: 'close',
      },
    },
    (res) => {
      res.on('data', () => {});
    },
  );

  req.on('error', (e) => console.error('❌ Bridge Error:', e.message));
  req.write(payload);
  req.end();

  console.log(
    `⚡ ${eventType === 'clear' ? '🗑️  CLEARED' : '📡 SENT'}: ${call || 'N/A'} (Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)})`,
  );
}

client.on('error', (err) => {
  console.error('❌ Socket Error:', err.message);
  isConnecting = false;
});

client.on('close', () => {
  isConnecting = false;
  console.log('📡 Connection closed. Checking configuration and retrying in 5s...');
  
  // Clean up the socket state completely before regenerating
  client.removeAllListeners();
  client.destroy();
  client = new net.Socket();
  client.setNoDelay(true);
  
  // Rebind the standard data parsing to the fresh socket instance
  client.on('data', (data) => {
    dataBuffer += data.toString();
    while (dataBuffer.includes('</CMD>')) {
      const endIdx = dataBuffer.indexOf('</CMD>') + 6;
      const currentRecord = dataBuffer.substring(0, endIdx);
      dataBuffer = dataBuffer.substring(endIdx);
      processN3FJPRecord(currentRecord);
    }
  });
  client.on('error', (err) => { console.error('❌ Socket Error:', err.message); isConnecting = false; });
  client.on('close', client.listeners('close')[0] || (() => {})); 

  setTimeout(() => {
    connectToN3FJP();
  }, 5000);
});
