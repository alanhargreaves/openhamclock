/**
 * CallsignPopup — floating info popup for station lookup.
 *
 * Shown when a user clicks a callsign in the UI. Displays station info
 * (name, grid, country, state) and includes a
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
import { useRef, useEffect, useCallback, useState } from 'react';
import useCallsignLookup from '../hooks/app/useCallsignLookup.js';
import usePopupPosition from '../hooks/app/usePopupPosition.js';
import { getCallbookUrl, getCallbook, CALLBOOKS } from '../utils/callbook.js';
import { ctyLookup } from '../utils/ctyLookup.js';
import { esc } from '../utils/escapeHtml.js';

import { IconGlobe, IconRefresh } from './Icons.jsx';
import { extractBaseCall } from './CallsignLink.jsx';

// Approximate height for initial positioning (actual measured via ResizeObserver)
const POPUP_HEIGHT_ESTIMATE = 120;

// Styling helpers
const accentColor = 'var(--accent-cyan)';
const borderColor = 'var(--border-color)';
const bgColor = 'var(--bg-secondary)';
const textColor = 'var(--text-primary)';
const mutedColor = 'var(--text-muted)';

function CallsignPopup({ anchorRef, call, onClose, popupHeightRef, location }) {
  const popupRef = useRef(null);
  const recalculateRef = useRef(null);
  const pos = usePopupPosition(anchorRef, popupHeightRef, POPUP_HEIGHT_ESTIMATE, (fn) => {
    recalculateRef.current = fn;
  });

  // Measure actual popup height and report it back to the hook
  useEffect(() => {
    const el = popupRef.current;
    if (!el) return;

    const reportHeight = () => {
      const h = el.getBoundingClientRect().height;
      if (popupHeightRef && h > 0 && h !== popupHeightRef.current) {
        popupHeightRef.current = h;
        recalculateRef.current?.();
      }
    };

    // Initial measurement
    reportHeight();

    // Watch for async content changes (e.g., API data arriving)
    const observer = new ResizeObserver(reportHeight);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // Fetch rich data from server
  const { data, loading: apiLoading, error } = useCallsignLookup(call);

  // Synchronous ctyLookup for grid and country/entity
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
  const country = data?.country && data?.country !== 'Unknown' ? data.country : cty?.entity || null;
  const state = data?.state || null;

  // Local time from geo-time API
  // Priority: location prop (spot grid/coords) > callsign lookup grid > cty grid
  const [localTime, setLocalTime] = useState(null);

  useEffect(() => {
    let targetGrid = null;
    let lat = null;
    let lon = null;

    // Prefer spot location metadata
    if (location) {
      if (location.grid) {
        targetGrid = location.grid;
      } else if (location.lat != null && location.lon != null) {
        lat = location.lat;
        lon = location.lon;
      }
    }

    // Fall back to callsign lookup grid
    if (!targetGrid && lat == null && grid) {
      targetGrid = grid;
    }

    // No location data at all — skip
    if (!targetGrid && lat == null) {
      setLocalTime(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const fetchLocalTime = (url) => {
      fetch(url, { signal: controller.signal })
        .then((r) => r.json())
        .then((result) => {
          if (result.localTime && result.timezone) {
            setLocalTime(result.localTime);
          } else {
            setLocalTime(null);
          }
        })
        .catch(() => {
          setLocalTime(null);
        })
        .finally(() => {
          clearTimeout(timeoutId);
        });
    };

    if (targetGrid) {
      fetchLocalTime(`/api/geo-time?grid=${encodeURIComponent(targetGrid)}`);
    } else {
      fetchLocalTime(`/api/geo-time?lat=${lat}&lon=${lon}`);
    }

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [location, grid]);

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
      {/* Header row: callsign + local time + controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px 4px',
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
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
          {localTime && (
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '12px',
                color: accentColor,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {localTime}
            </span>
          )}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {apiLoading && !data && (
            <IconRefresh size={12} color={accentColor} style={{ animation: 'spin 1s linear infinite' }} />
          )}
          {error && !data && !apiLoading && (
            <span title={esc(error)} style={{ cursor: 'help', opacity: 0.7 }}>
              <IconRefresh size={12} color="var(--accent-red)" />
            </span>
          )}
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
            <IconGlobe size={12} color={accentColor} />
          </a>
        </span>
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
      </div>
    </div>
  );
}

export default CallsignPopup;
