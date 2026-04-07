'use strict';
/**
 * tls.js — Self-signed certificate generation and management
 *
 * Generates a self-signed RSA-2048 certificate for rig-bridge's HTTPS server.
 * Certificates are stored in ~/.config/openhamclock/certs/ (or the platform
 * equivalent) so they survive rig-bridge updates.
 *
 * This module has no dependencies on config.js — it computes the cert directory
 * independently using the same platform logic — so there is no circular import.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const forge = require('node-forge');

// ── Cert storage path ────────────────────────────────────────────────────────
// Mirrors config.js's externalDir logic but appends /certs
function resolveCertDir() {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'openhamclock', 'certs');
  }
  return path.join(os.homedir(), '.config', 'openhamclock', 'certs');
}

const CERT_DIR = resolveCertDir();
const KEY_PATH = path.join(CERT_DIR, 'rig-bridge.key');
const CERT_PATH = path.join(CERT_DIR, 'rig-bridge.crt');

// ── Certificate generation ───────────────────────────────────────────────────

/**
 * Generate a new RSA-2048 self-signed certificate.
 * @returns {Promise<{ privateKeyPem: string, certPem: string }>}
 */
function generateCert() {
  return new Promise((resolve, reject) => {
    forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, (err, keyPair) => {
      if (err) return reject(err);

      const cert = forge.pki.createCertificate();
      cert.publicKey = keyPair.publicKey;
      // Random 16-byte serial — avoids OS trust-store caching bugs when a cert
      // is regenerated (macOS Keychain and some browsers cache by issuer+serial).
      cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16));

      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

      const attrs = [{ name: 'commonName', value: 'localhost' }];
      cert.setSubject(attrs);
      cert.setIssuer(attrs); // self-signed

      cert.setExtensions([
        { name: 'basicConstraints', cA: false },
        {
          name: 'keyUsage',
          digitalSignature: true,
          keyEncipherment: true,
        },
        {
          name: 'extKeyUsage',
          serverAuth: true,
        },
        {
          name: 'subjectAltName',
          altNames: [
            { type: 2, value: 'localhost' }, // DNS
            { type: 7, ip: '127.0.0.1' }, // IP
          ],
        },
      ]);

      cert.sign(keyPair.privateKey, forge.md.sha256.create());

      resolve({
        privateKeyPem: forge.pki.privateKeyToPem(keyPair.privateKey),
        certPem: forge.pki.certificateToPem(cert),
      });
    });
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Ensure certificate and key files exist on disk.
 * Generates them if missing or if forceRegen is true.
 *
 * @param {boolean} [forceRegen=false]
 * @returns {Promise<{ keyPath: string, certPath: string, generated: boolean }>}
 */
async function ensureCerts(forceRegen = false) {
  const exists = fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH);

  if (exists && !forceRegen) {
    return { keyPath: KEY_PATH, certPath: CERT_PATH, generated: false };
  }

  console.log('[TLS] Generating self-signed certificate (RSA-2048, 10-year validity)…');

  const { privateKeyPem, certPem } = await generateCert();

  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
  }

  fs.writeFileSync(KEY_PATH, privateKeyPem, { mode: 0o600 });
  fs.writeFileSync(CERT_PATH, certPem, { mode: 0o644 });

  console.log(`[TLS] Certificate written to ${CERT_DIR}`);
  return { keyPath: KEY_PATH, certPath: CERT_PATH, generated: true };
}

/**
 * Load key and cert buffers from disk.
 * @returns {{ key: Buffer, cert: Buffer }}
 * @throws if files do not exist
 */
function loadCreds() {
  return {
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH),
  };
}

/**
 * Parse the on-disk certificate and return human-readable metadata.
 * Returns { exists: false } if no certificate file is present.
 *
 * @returns {{ exists: boolean, fingerprint?: string, subject?: string, notBefore?: string, notAfter?: string, daysLeft?: number }}
 */
function getCertInfo() {
  if (!fs.existsSync(CERT_PATH)) {
    return { exists: false };
  }

  try {
    const pem = fs.readFileSync(CERT_PATH, 'utf8');
    const cert = forge.pki.certificateFromPem(pem);

    // SHA-1 fingerprint formatted as colon-separated hex pairs (matches browser/OS display)
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const md = forge.md.sha1.create();
    md.update(der);
    const raw = md.digest().toHex();
    const fingerprint = raw.match(/.{2}/g).join(':').toUpperCase();

    const notBefore = cert.validity.notBefore.toISOString();
    const notAfter = cert.validity.notAfter.toISOString();
    const daysLeft = Math.floor((cert.validity.notAfter - Date.now()) / 86400000);

    const cnField = cert.subject.getField('CN');
    const subject = cnField ? cnField.value : 'localhost';

    return { exists: true, fingerprint, subject, notBefore, notAfter, daysLeft };
  } catch (e) {
    return { exists: true, fingerprint: null, error: e.message };
  }
}

module.exports = { ensureCerts, loadCreds, getCertInfo, CERT_DIR, KEY_PATH, CERT_PATH };
