'use strict';
/**
 * wsjtx-protocol.js — WSJT-X/MSHV/JTDX binary protocol reader and writer
 *
 * Implements the QDataStream-based binary protocol used by WSJT-X, MSHV, JTDX,
 * and JS8Call for UDP communication. Supports both reading (parsing incoming
 * messages) and writing (sending commands back to the application).
 *
 * Protocol reference: https://sourceforge.net/p/wsjt/wsjtx/ci/master/tree/Network/NetworkMessage.hpp
 */

const WSJTX_MAGIC = 0xadbccbda;

const WSJTX_MSG = {
  HEARTBEAT: 0,
  STATUS: 1,
  DECODE: 2,
  CLEAR: 3,
  REPLY: 4,
  QSO_LOGGED: 5,
  CLOSE: 6,
  REPLAY: 7,
  HALT_TX: 8,
  FREE_TEXT: 9,
  WSPR_DECODE: 10,
  LOCATION: 11,
  LOGGED_ADIF: 12,
  HIGHLIGHT_CALLSIGN: 13,
  SWITCH_CONFIG: 14,
  CONFIGURE: 15,
};

// ──────────────────────────────────────────────────────────────────────────────
// Reader — parse incoming WSJT-X binary messages
// ──────────────────────────────────────────────────────────────────────────────

class WSJTXReader {
  constructor(buffer) {
    this.buf = buffer;
    this.offset = 0;
  }
  remaining() {
    return this.buf.length - this.offset;
  }
  readUInt8() {
    if (this.remaining() < 1) return null;
    return this.buf.readUInt8(this.offset++);
  }
  readInt32() {
    if (this.remaining() < 4) return null;
    const v = this.buf.readInt32BE(this.offset);
    this.offset += 4;
    return v;
  }
  readUInt32() {
    if (this.remaining() < 4) return null;
    const v = this.buf.readUInt32BE(this.offset);
    this.offset += 4;
    return v;
  }
  readUInt64() {
    if (this.remaining() < 8) return null;
    const hi = this.buf.readUInt32BE(this.offset);
    const lo = this.buf.readUInt32BE(this.offset + 4);
    this.offset += 8;
    return hi * 0x100000000 + lo;
  }
  readBool() {
    const v = this.readUInt8();
    return v === null ? null : v !== 0;
  }
  readDouble() {
    if (this.remaining() < 8) return null;
    const v = this.buf.readDoubleBE(this.offset);
    this.offset += 8;
    return v;
  }
  readUtf8() {
    const len = this.readUInt32();
    if (len === null || len === 0xffffffff) return null;
    if (len === 0) return '';
    if (this.remaining() < len) return null;
    const str = this.buf.toString('utf8', this.offset, this.offset + len);
    this.offset += len;
    return str;
  }
  readQTime() {
    const ms = this.readUInt32();
    if (ms === null) return null;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return {
      ms,
      hours: h,
      minutes: m,
      seconds: s,
      formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
    };
  }
  readQDateTime() {
    const julianDay = this.readUInt64();
    const time = this.readQTime();
    const timeSpec = this.readUInt8();
    if (timeSpec === 2) this.readInt32();
    return { julianDay, time, timeSpec };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Writer — serialize outbound WSJT-X binary messages
// ──────────────────────────────────────────────────────────────────────────────

class WSJTXWriter {
  constructor() {
    this.parts = [];
  }
  writeUInt8(v) {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(v);
    this.parts.push(buf);
  }
  writeInt32(v) {
    const buf = Buffer.alloc(4);
    buf.writeInt32BE(v);
    this.parts.push(buf);
  }
  writeUInt32(v) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(v);
    this.parts.push(buf);
  }
  writeUInt64(v) {
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(Math.floor(v / 0x100000000));
    buf.writeUInt32BE(v >>> 0, 4);
    this.parts.push(buf);
  }
  writeBool(v) {
    this.writeUInt8(v ? 1 : 0);
  }
  writeDouble(v) {
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(v);
    this.parts.push(buf);
  }
  writeUtf8(str) {
    if (str === null || str === undefined) {
      this.writeUInt32(0xffffffff); // null string marker
      return;
    }
    const encoded = Buffer.from(str, 'utf8');
    this.writeUInt32(encoded.length);
    this.parts.push(encoded);
  }
  writeQColor(r, g, b, a) {
    // QColor serialization: spec(1) + padding(1) + r(2) + g(2) + b(2) + a(2) + pad(2)
    // Simplified: write as ARGB with spec=1 (RGB)
    const buf = Buffer.alloc(10);
    buf.writeUInt8(1, 0); // spec = RGB
    buf.writeUInt8(0, 1); // padding
    buf.writeUInt16BE(r * 257, 2); // Qt uses 16-bit color values
    buf.writeUInt16BE(g * 257, 4);
    buf.writeUInt16BE(b * 257, 6);
    buf.writeUInt16BE(a * 257, 8);
    this.parts.push(buf);
  }
  toBuffer() {
    return Buffer.concat(this.parts);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Message parser
// ──────────────────────────────────────────────────────────────────────────────

function parseMessage(buffer) {
  const reader = new WSJTXReader(buffer);
  const magic = reader.readUInt32();
  if (magic !== WSJTX_MAGIC) return null;

  const schema = reader.readUInt32();
  const type = reader.readUInt32();
  const id = reader.readUtf8();
  if (type === null || id === null) return null;

  const msg = { type, id, schema, timestamp: Date.now() };

  try {
    switch (type) {
      case WSJTX_MSG.HEARTBEAT:
        msg.maxSchema = reader.readUInt32();
        msg.version = reader.readUtf8();
        msg.revision = reader.readUtf8();
        break;
      case WSJTX_MSG.STATUS:
        msg.dialFrequency = reader.readUInt64();
        msg.mode = reader.readUtf8();
        msg.dxCall = reader.readUtf8();
        msg.report = reader.readUtf8();
        msg.txMode = reader.readUtf8();
        msg.txEnabled = reader.readBool();
        msg.transmitting = reader.readBool();
        msg.decoding = reader.readBool();
        msg.rxDF = reader.readUInt32();
        msg.txDF = reader.readUInt32();
        msg.deCall = reader.readUtf8();
        msg.deGrid = reader.readUtf8();
        msg.dxGrid = reader.readUtf8();
        msg.txWatchdog = reader.readBool();
        msg.subMode = reader.readUtf8();
        msg.fastMode = reader.readBool();
        msg.specialOp = reader.readUInt8();
        msg.freqTolerance = reader.readUInt32();
        msg.trPeriod = reader.readUInt32();
        msg.configName = reader.readUtf8();
        msg.txMessage = reader.readUtf8();
        break;
      case WSJTX_MSG.DECODE:
        msg.isNew = reader.readBool();
        msg.time = reader.readQTime();
        msg.snr = reader.readInt32();
        msg.deltaTime = reader.readDouble();
        msg.deltaFreq = reader.readUInt32();
        msg.mode = reader.readUtf8();
        msg.message = reader.readUtf8();
        msg.lowConfidence = reader.readBool();
        msg.offAir = reader.readBool();
        break;
      case WSJTX_MSG.CLEAR:
        msg.window = reader.readUInt8();
        break;
      case WSJTX_MSG.QSO_LOGGED:
        msg.dateTimeOff = reader.readQDateTime();
        msg.dxCall = reader.readUtf8();
        msg.dxGrid = reader.readUtf8();
        msg.txFrequency = reader.readUInt64();
        msg.mode = reader.readUtf8();
        msg.reportSent = reader.readUtf8();
        msg.reportRecv = reader.readUtf8();
        msg.txPower = reader.readUtf8();
        msg.comments = reader.readUtf8();
        msg.name = reader.readUtf8();
        msg.dateTimeOn = reader.readQDateTime();
        msg.operatorCall = reader.readUtf8();
        msg.myCall = reader.readUtf8();
        msg.myGrid = reader.readUtf8();
        msg.exchangeSent = reader.readUtf8();
        msg.exchangeRecv = reader.readUtf8();
        msg.adifPropMode = reader.readUtf8();
        break;
      case WSJTX_MSG.WSPR_DECODE:
        msg.isNew = reader.readBool();
        msg.time = reader.readQTime();
        msg.snr = reader.readInt32();
        msg.deltaTime = reader.readDouble();
        msg.frequency = reader.readUInt64();
        msg.drift = reader.readInt32();
        msg.callsign = reader.readUtf8();
        msg.grid = reader.readUtf8();
        msg.power = reader.readInt32();
        msg.offAir = reader.readBool();
        break;
      case WSJTX_MSG.LOGGED_ADIF:
        msg.adif = reader.readUtf8();
        break;
      case WSJTX_MSG.CLOSE:
        break;
      default:
        return null;
    }
  } catch (e) {
    return null;
  }

  return msg;
}

// ──────────────────────────────────────────────────────────────────────────────
// Message builders (outbound — send TO WSJT-X/MSHV/JTDX)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Build a REPLY message (type 4) — tells WSJT-X to call a decoded station.
 * This is equivalent to double-clicking a decode in the WSJT-X decode window.
 */
function buildReply(id, time, snr, deltaTime, deltaFreq, mode, message, lowConfidence, modifiers) {
  const w = new WSJTXWriter();
  w.writeUInt32(WSJTX_MAGIC);
  w.writeUInt32(2); // schema
  w.writeUInt32(WSJTX_MSG.REPLY);
  w.writeUtf8(id);
  // The reply payload is the same as a DECODE message
  w.writeUInt32(time); // QTime as ms since midnight
  w.writeInt32(snr);
  w.writeDouble(deltaTime);
  w.writeUInt32(deltaFreq);
  w.writeUtf8(mode);
  w.writeUtf8(message);
  w.writeBool(lowConfidence || false);
  w.writeUInt8(modifiers || 0); // keyboard modifiers (0 = none)
  return w.toBuffer();
}

/**
 * Build a HALT_TX message (type 8) — immediately stops WSJT-X from transmitting.
 */
function buildHaltTx(id, autoTxOnly) {
  const w = new WSJTXWriter();
  w.writeUInt32(WSJTX_MAGIC);
  w.writeUInt32(2);
  w.writeUInt32(WSJTX_MSG.HALT_TX);
  w.writeUtf8(id);
  w.writeBool(autoTxOnly || false);
  return w.toBuffer();
}

/**
 * Build a FREE_TEXT message (type 9) — sets the free-text message in WSJT-X.
 */
function buildFreeText(id, text, send) {
  const w = new WSJTXWriter();
  w.writeUInt32(WSJTX_MAGIC);
  w.writeUInt32(2);
  w.writeUInt32(WSJTX_MSG.FREE_TEXT);
  w.writeUtf8(id);
  w.writeUtf8(text);
  w.writeBool(send || false);
  return w.toBuffer();
}

/**
 * Build a HIGHLIGHT_CALLSIGN message (type 13) — highlights a callsign in WSJT-X decode window.
 * Set highlight=false to remove highlighting.
 */
function buildHighlightCallsign(id, callsign, bgR, bgG, bgB, fgR, fgG, fgB, highlight) {
  const w = new WSJTXWriter();
  w.writeUInt32(WSJTX_MAGIC);
  w.writeUInt32(2);
  w.writeUInt32(WSJTX_MSG.HIGHLIGHT_CALLSIGN);
  w.writeUtf8(id);
  w.writeUtf8(callsign);
  w.writeQColor(bgR || 0, bgG || 0, bgB || 0, highlight !== false ? 255 : 0);
  w.writeQColor(fgR || 255, fgG || 255, fgB || 255, highlight !== false ? 255 : 0);
  w.writeBool(highlight !== false); // last CQ only
  return w.toBuffer();
}

/**
 * Build a SWITCH_CONFIG message (type 14) — switch WSJT-X to a named configuration.
 */
function buildSwitchConfig(id, configName) {
  const w = new WSJTXWriter();
  w.writeUInt32(WSJTX_MAGIC);
  w.writeUInt32(2);
  w.writeUInt32(WSJTX_MSG.SWITCH_CONFIG);
  w.writeUtf8(id);
  w.writeUtf8(configName);
  return w.toBuffer();
}

module.exports = {
  WSJTX_MAGIC,
  WSJTX_MSG,
  WSJTXReader,
  WSJTXWriter,
  parseMessage,
  buildReply,
  buildHaltTx,
  buildFreeText,
  buildHighlightCallsign,
  buildSwitchConfig,
};
