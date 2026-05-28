/**
 * CallsignLink — clickable callsign that opens the user's chosen callbook
 * or shows a popup with station info.
 *
 * Usage (popup mode — recommended):
 *   const { showPopup } = useCallsignPopup();
 *   <CallsignLink call={spot.call} onPopup={showPopup} />
 *
 * Usage (legacy tab mode):
 *   <CallsignLink call={spot.call} />
 *
 * Reads the global toggle from localStorage (ohc_qrz_links).
 * When enabled and `onPopup` is provided, clicking shows the station info popup.
 * When enabled and `onPopup` is NOT provided, clicking opens the callbook in a new tab.
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { getCallbookUrl } from '../utils/callbook.js';

// ── Extract base callsign from decorated/portable calls ──
// 5Z4/OZ6ABL → OZ6ABL, UA1TAN/M → UA1TAN, W1ABC/6 → W1ABC
// OE1XYZ-12 → OE1XYZ  (MeshCom / APRS SSID suffix stripped before QRZ lookup)
// Picks the segment that looks most like a home callsign.
const MODIFIERS = new Set(['M', 'P', 'QRP', 'MM', 'AM', 'R', 'T', 'B', 'BCN', 'LH', 'A', 'E', 'J', 'AG', 'AE', 'KT']);
export function extractBaseCall(raw) {
  if (!raw) return '';
  // Strip SSID suffix (-12, -99, etc.) used by MeshCom and APRS
  const withoutSsid = raw.replace(/-\d+$/, '');
  if (!withoutSsid.includes('/')) return withoutSsid.toUpperCase();
  const parts = withoutSsid.toUpperCase().split('/');
  const candidates = parts.filter((p) => p && !MODIFIERS.has(p) && !/^\d$/.test(p));
  if (candidates.length === 0) return parts[0] || withoutSsid.toUpperCase();
  if (candidates.length === 1) return candidates[0];
  const pat = /^[A-Z]{1,3}\d{1,4}[A-Z]{1,4}$/;
  const full = candidates.filter((c) => pat.test(c));
  if (full.length === 1) return full[0];
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0];
}

// ── Context for the global QRZ toggle ──
const QRZContext = createContext({ enabled: true, toggle: () => {} });

export function QRZProvider({ children }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('ohc_qrz_links') !== 'false';
    } catch {
      return true;
    }
  });

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ohc_qrz_links', String(next));
      } catch {}
      return next;
    });
  }, []);

  return <QRZContext.Provider value={{ enabled, toggle }}>{children}</QRZContext.Provider>;
}

export function useQRZ() {
  return useContext(QRZContext);
}

// ── Toggle button for panel headers ──
export function QRZToggle({ style }) {
  const { enabled, toggle } = useQRZ();
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      title={enabled ? 'Click callsigns to open the callbook lookup (ON)' : 'Callsign links disabled (OFF)'}
      style={{
        cursor: 'pointer',
        fontSize: '11px',
        opacity: enabled ? 1 : 0.4,
        userSelect: 'none',
        transition: 'opacity 0.2s',
        ...style,
      }}
    >
      🔍
    </span>
  );
}

// ── The callsign link itself ──
// onPopup(call, anchorEl) — optional callback for popup mode
export default function CallsignLink({
  call,
  color = 'inherit',
  fontWeight = 'inherit',
  fontSize = 'inherit',
  style = {},
  children,
  onPopup,
}) {
  const { enabled } = useQRZ();
  const spanRef = useRef(null);

  if (!call) return children || null;

  // Strip portable suffixes and prefixes for QRZ lookup (5Z4/OZ6ABL → OZ6ABL, UA1TAN/M → UA1TAN)
  const baseCall = extractBaseCall(call);

  const handleClick = (e) => {
    if (!enabled) return;
    e.stopPropagation();

    if (onPopup) {
      // Popup mode — show the info popup
      onPopup(call, spanRef.current);
    } else {
      // Legacy mode — open callbook in new tab
      window.open(getCallbookUrl(baseCall), '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <span
      ref={spanRef}
      onClick={handleClick}
      style={{
        color,
        fontWeight,
        fontSize,
        cursor: enabled ? 'pointer' : 'inherit',
        borderBottom: enabled ? '1px dotted rgba(255,255,255,0.15)' : 'none',
        transition: 'color 0.15s',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (enabled) e.target.style.color = 'var(--accent-cyan)';
      }}
      onMouseLeave={(e) => {
        if (enabled) e.target.style.color = color;
      }}
      title={enabled ? `Look up ${call}` : call}
    >
      {children || call}
    </span>
  );
}

// ── Global handler for Leaflet HTML popups ──
// Call setupMapQRZHandler() once on app mount.
// In popup HTML, use: <b data-qrz-call="K1ABC" style="cursor:pointer">K1ABC</b>
let _mapHandlerInstalled = false;
export function setupMapQRZHandler() {
  if (_mapHandlerInstalled) return;
  _mapHandlerInstalled = true;

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-qrz-call]');
    if (!el) return;

    // Check if QRZ links are enabled
    let enabled = true;
    try {
      enabled = localStorage.getItem('ohc_qrz_links') !== 'false';
    } catch {}
    if (!enabled) return;

    const call = el.getAttribute('data-qrz-call');
    if (call) {
      const baseCall = extractBaseCall(call);
      window.open(getCallbookUrl(baseCall), '_blank', 'noopener,noreferrer');
    }
  });
}
