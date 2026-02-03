/**
 * DXClusterPanel Component
 * Displays DX cluster spots with filtering controls and ON/OFF toggle
 */
import React from 'react';
import { getBandColor } from '../utils/callsign.js';

export const DXClusterPanel = ({ 
  data, 
  loading, 
  totalSpots,
  filters,
  onFilterChange,
  onOpenFilters,
  onHoverSpot,
  hoveredSpot,
  showOnMap,
  onToggleMap
}) => {
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters?.cqZones?.length) count++;
    if (filters?.ituZones?.length) count++;
    if (filters?.continents?.length) count++;
    if (filters?.bands?.length) count++;
    if (filters?.modes?.length) count++;
    if (filters?.watchlist?.length) count++;
    if (filters?.excludeList?.length) count++;
    if (filters?.callsign) count++;
    if (filters?.watchlistOnly) count++;
    return count;
  };

  const filterCount = getActiveFilterCount();
  const spots = data || [];

  return (
    <div className="panel" style={{ 
      padding: '10px', 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        fontSize: '12px', 
        color: 'var(--accent-green)', 
        fontWeight: '700', 
        marginBottom: '6px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <span>🌐 DX CLUSTER <span style={{ color: 'var(--accent-green)', fontSize: '10px' }}>● LIVE</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{spots.length}/{totalSpots || spots.length}</span>
          <button
            onClick={onOpenFilters}
            style={{
              background: filterCount > 0 ? 'rgba(255, 170, 0, 0.3)' : 'rgba(100, 100, 100, 0.3)',
              border: `1px solid ${filterCount > 0 ? '#ffaa00' : '#666'}`,
              color: filterCount > 0 ? '#ffaa00' : '#888',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontFamily: 'JetBrains Mono',
              cursor: 'pointer'
            }}
          >
            🔍 Filters
          </button>
          <button
            onClick={onToggleMap}
            style={{
              background: showOnMap ? 'rgba(68, 136, 255, 0.3)' : 'rgba(100, 100, 100, 0.3)',
              border: `1px solid ${showOnMap ? '#4488ff' : '#666'}`,
              color: showOnMap ? '#4488ff' : '#888',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontFamily: 'JetBrains Mono',
              cursor: 'pointer'
            }}
          >
            🗺️ {showOnMap ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
      
      {/* Quick search */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
        <input
          type="text"
          placeholder="Quick search..."
          value={filters?.callsign || ''}
          onChange={(e) => onFilterChange?.({ ...filters, callsign: e.target.value || undefined })}
          style={{
            flex: 1,
            padding: '4px 8px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '3px',
            color: 'var(--text-primary)',
            fontSize: '11px',
            fontFamily: 'JetBrains Mono'
          }}
        />
      </div>

      {/* Spots list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <div className="loading-spinner" />
        </div>
      ) : spots.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: 'var(--text-muted)',
          fontSize: '12px'
        }}>
          {filterCount > 0 ? 'No spots match filters' : 'No spots available'}
        </div>
      ) : (
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          fontSize: '12px',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          {spots.slice(0, 25).map((spot, i) => {
            // Frequency can be in MHz (string like "14.070") or kHz (number like 14070)
            let freqDisplay = '?';
            let freqMHz = 0;
            
            if (spot.freq) {
              const freqVal = parseFloat(spot.freq);
              if (freqVal > 1000) {
                // It's in kHz, convert to MHz
                freqMHz = freqVal / 1000;
                freqDisplay = freqMHz.toFixed(3);
              } else {
                // Already in MHz
                freqMHz = freqVal;
                freqDisplay = freqVal.toFixed(3);
              }
            }
            
            const color = getBandColor(freqMHz);
            const isHovered = hoveredSpot?.call === spot.call;
            
            return (
              <div
                key={`${spot.call}-${spot.freq}-${i}`}
                onMouseEnter={() => onHoverSpot?.(spot)}
                onMouseLeave={() => onHoverSpot?.(null)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '55px 1fr 1fr auto',
                  gap: '6px',
                  padding: '5px 6px',
                  borderRadius: '3px',
                  marginBottom: '2px',
                  background: isHovered ? 'rgba(68, 136, 255, 0.25)' : (i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'),
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  borderLeft: isHovered ? '2px solid #4488ff' : '2px solid transparent'
                }}
              >
                <div style={{ color, fontWeight: '600' }}>
                  {freqDisplay}
                </div>
                <div style={{ 
                  color: 'var(--text-primary)', 
                  fontWeight: '700',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {spot.call}
                </div>
                <div style={{ 
                  color: 'var(--text-muted)', 
                  fontSize: '10px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  alignSelf: 'center'
                }}>
                  de {spot.spotter || '?'}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                  {spot.time || ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DXClusterPanel;
