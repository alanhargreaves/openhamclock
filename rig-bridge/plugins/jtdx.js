'use strict';
/**
 * JTDX plugin — bidirectional control for JTDX digital mode software.
 *
 * JTDX is a fork of WSJT-X with enhanced JT65/JT9/FT8 decoding. It uses
 * the identical WSJT-X UDP binary protocol. Typically runs on a different
 * UDP port than WSJT-X to allow simultaneous operation.
 *
 * Config section: config.jtdx
 *   enabled:      boolean  (default: false)
 *   udpPort:      number   (default: 2238)
 *   bindAddress:  string   (default: '127.0.0.1')
 *   verbose:      boolean  (default: false)
 *
 * API endpoints (registered via base factory):
 *   GET  /api/jtdx/status
 *   POST /api/jtdx/reply
 *   POST /api/jtdx/halt
 *   POST /api/jtdx/freetext
 *   POST /api/jtdx/highlight
 */

const { createDigitalModePlugin } = require('./digital-mode-base');

module.exports = createDigitalModePlugin({
  id: 'jtdx',
  name: 'JTDX',
  configKey: 'jtdx',
  defaultPort: 2238,
  tag: 'JTDX',
});
