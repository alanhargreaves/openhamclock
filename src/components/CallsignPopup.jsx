/**
 * CallsignPopup — floating info popup for station lookup.
 *
 * Shown when a user clicks a callsign in the UI. Displays station info
 * (name, grid, country, CQ/ITU zones, coordinates) and includes a
 * clickable icon to open the callsign in the user's configured callbook.
 *
 * Auto-dismisses after 15s. Dismisses on outside click or Escape key.
 *
 * Usage:
 *   <CallsignPopup
 *     anchorRef={refToCallsignSpan}
 *     call="K1ABC"
 *     onClose={() => setShowPopup(false)}
 *   />
 */
import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useCallsignLookup from '../hooks/app/useCallsignLookup.js';
import usePopupPosition from '../hooks/app/usePopupPosition.js';
import { getCallbookUrl, getCallbook, CALLBOOKS } from '../utils/callbook.js';
import { ctyLookup } from '../utils/ctyLookup.js';
import { esc } from '../utils/escapeHtml.js';
import { IconExternalLink } from './Icons.jsx';
import { extractBaseCall } from './CallsignLink.jsx';

// Approximate height for initial positioning calculation
const POPUP_HEIGHT_ESTIMATE = 160;

// Styling helpers
const accentColor = 'var(--accent-cyan)';
const borderColor = 'var(--border-color)';
const bgColor = 'var(--bg-secondary)';
const textColor = 'var(--text-primary)';
const mutedColor = 'var(--text-muted)';

function CallsignPopup({ anchorRef, call, onClose }) {
  const { t } = useTranslation();
  const popupRef = useRef(null);
  const pos = usePopupPosition(anchorRef, POPUP_HEIGHT_ESTIMATE);

  // Fetch rich data from server
  const { data, loading: apiLoading } = useCallsignLookup(call);

  // Synchronous ctyLookup for instant CQ/ITU zones
  const cty = ctyLookup(call);

  // Extract base call for callbook URL
  const baseCall = extractBaseCall(call);

  // Get configured callbook name
  const callbookId = getCallbook();
  const callbookLabel = CALLBOOKS.find((cb) => cb.id === callbookId)?.label || 'QRZ.com';

  // Close on outside click
  const handleClickOutside = useCallback(
    (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) && !anchorRef?.current?.contains(e.target)) {
        onClose();
      }
    },
    [anchorRef, onClose],
  );

  // Close on Escape
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  // Build display values
  const name = data?.name || data?.fname || null;
  const grid = data?.grid || cty?.grid || null;
  const country = data?.country || cty?.entity || null;
  const state = data?.state || null;
  const lat = data?.lat || cty?.lat || null;
  const lon = data?.lon || cty?.lon || null;
  const cqZone = data?.cqZone || cty?.cq || null;
  const ituZone = data?.ituZone || cty?.itu || null;

  // Position info row
  const positionInfo =
    [lat != null, lon != null].filter(Boolean).length > 0
      ? `${lat?.toFixed(4) || '?'}°, ${lon?.toFixed(4) || '?'}°`
      : null;

  const handleCallbookClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (baseCall) {
      window.open(getCallbookUrl(baseCall), '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      ref={popupRef}
      role="tooltip"
      aria-label={`Station info for ${call}`}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        minWidth: 180,
        maxWidth: 300,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        padding: '0',
        zIndex: 10000,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '12px',
        color: textColor,
        lineHeight: 1.4,
        animation: 'fadeIn 0.15s ease-out',
      }}
      className="callsign-popup"
    >
      {/* Header row: callsign + external link icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px 4px',
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <span
          style={{
            fontWeight: '700',
            fontSize: '13px',
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.5px',
          }}
        >
          {esc(call)}
        </span>
        <a
          href={getCallbookUrl(baseCall)}
          onClick={handleCallbookClick}
          title={`Open ${call} in ${callbookLabel}`}
          rel="noopener noreferrer"
          style={{
            color: accentColor,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            opacity: 0.7,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => {
            e.target.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.target.style.opacity = '0.7';
          }}
        >
          <IconExternalLink size={12} color={accentColor} />
        </a>
      </div>

      {/* Body */}
      <div style={{ padding: '6px 10px 8px' }}>
        {/* Name */}
        {name && <div style={{ marginBottom: '3px', opacity: 0.9 }}>{esc(name)}</div>}

        {/* Grid + Country/State */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px', opacity: 0.85 }}>
          {grid && (
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: '600',
                fontSize: '11px',
              }}
            >
              {esc(grid)}
            </span>
          )}
          {grid && country && <span>·</span>}
          {(country || state) && (
            <span style={{ fontSize: '11px' }}>
              {esc(country)}
              {state ? ` · ${esc(state)}` : ''}
            </span>
          )}
        </div>

        {/* CQ / ITU zones */}
        {(cqZone || ituZone) && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '3px', fontSize: '11px', opacity: 0.8 }}>
            {cqZone != null && <span>CQ {esc(String(cqZone))}</span>}
            {ituZone != null && <span>ITU {esc(String(ituZone))}</span>}
          </div>
        )}

        {/* Coordinates */}
        {positionInfo && <div style={{ fontSize: '11px', opacity: 0.7 }}>{esc(positionInfo)}</div>}

        {/* Loading indicator */}
        {apiLoading && !data && (
          <div style={{ marginTop: '4px', fontSize: '10px', opacity: 0.5, fontStyle: 'italic' }}>
            {t('callsignPopup.lookupLoading', 'Looking up...')}
          </div>
        )}
      </div>
    </div>
  );
}

export default CallsignPopup;
