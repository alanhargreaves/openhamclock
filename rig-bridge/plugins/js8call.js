'use strict';
/**
 * JS8Call plugin — bidirectional control for JS8Call messaging software.
 *
 * JS8Call uses a modified WSJT-X UDP binary protocol with the same base
 * message format. The core message types (HEARTBEAT, STATUS, DECODE, CLEAR,
 * REPLY, HALT_TX, FREE_TEXT) work identically. JS8Call adds its own
 * application-specific behavior on top (directed messages, inbox, heartbeat
 * network) but these are encoded within the standard DECODE message text.
 *
 * Config section: config.js8call
 *   enabled:      boolean  (default: false)
 *   udpPort:      number   (default: 2242)
 *   bindAddress:  string   (default: '127.0.0.1')
 *   verbose:      boolean  (default: false)
 *
 * API endpoints (registered via base factory):
 *   GET  /api/js8call/status
 *   POST /api/js8call/reply
 *   POST /api/js8call/halt
 *   POST /api/js8call/freetext
 *   POST /api/js8call/highlight
 */

const { createDigitalModePlugin } = require('./digital-mode-base');

module.exports = createDigitalModePlugin({
  id: 'js8call',
  name: 'JS8Call',
  configKey: 'js8call',
  defaultPort: 2242,
  tag: 'JS8Call',
});
