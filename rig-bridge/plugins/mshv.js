'use strict';
/**
 * MSHV plugin — bidirectional control for MSHV digital mode software.
 *
 * MSHV uses the same WSJT-X UDP binary protocol but supports additional modes
 * (MSK144, Q65, etc.) and multi-stream decoding. Runs on a separate UDP port
 * so it can operate simultaneously with WSJT-X.
 *
 * Config section: config.mshv
 *   enabled:      boolean  (default: false)
 *   udpPort:      number   (default: 2239)
 *   bindAddress:  string   (default: '127.0.0.1')
 *   verbose:      boolean  (default: false)
 *
 * API endpoints (registered via base factory):
 *   GET  /api/mshv/status
 *   POST /api/mshv/reply
 *   POST /api/mshv/halt
 *   POST /api/mshv/freetext
 *   POST /api/mshv/highlight
 */

const { createDigitalModePlugin } = require('./digital-mode-base');

module.exports = createDigitalModePlugin({
  id: 'mshv',
  name: 'MSHV',
  configKey: 'mshv',
  defaultPort: 2239,
  tag: 'MSHV',
});
