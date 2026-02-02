/**
 * PSKReporter Panel
 * Shows where your digital mode signals are being received
 */
import React, { useState } from 'react';
import { usePSKReporter } from '../hooks/usePSKReporter.js';

const PSKReporterPanel = ({ callsign, onShowOnMap }) => {
  const [timeWindow, setTimeWindow] = useState(15); // minutes
  const [activeTab, setActiveTab] = useState('tx'); // 'tx' or 'rx'
  
  const { 
    txReports, 
    txCount, 
    rxReports, 
    rxCount, 
    stats,
    loading, 
    error,
    lastUpdate,
    refresh 
  } = usePSKReporter(callsign, { 
    minutes: timeWindow,
    enabled: callsign && callsign !== 'N0CALL'
  });

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }) + 'z';
  };

  const formatAge = (minutes) => {
    if (minutes < 1) return 'now';
    if (minutes === 1) return '1m ago';
    return `${minutes}m ago`;
  };

  const getSnrColor = (snr) => {
    if (snr === null || snr === undefined) return 'var(--text-muted)';
    if (snr >= 0) return '#4ade80';  // Green - excellent
    if (snr >= -10) return '#fbbf24'; // Yellow - good
    if (snr >= -15) return '#f97316'; // Orange - fair
    return '#ef4444'; // Red - weak
  };

  const reports = activeTab === 'tx' ? txReports : rxReports;
  const count = activeTab === 'tx' ? txCount : rxCount;

  if (!callsign || callsign === 'N0CALL') {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-icon">📡</span>
          <h3>PSKReporter</h3>
        </div>
        <div className="panel-content">
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
            Set your callsign in Settings to see PSKReporter data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-icon">📡</span>
        <h3>PSKReporter</h3>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select 
            value={timeWindow}
            onChange={(e) => setTimeWindow(parseInt(e.target.value))}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '0.75rem',
              color: 'var(--text-primary)'
            }}
          >
            <option value={5}>5 min</option>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
          </select>
          <button 
            onClick={refresh}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              opacity: loading ? 0.5 : 1
            }}
            disabled={loading}
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-tertiary)'
      }}>
        <button
          onClick={() => setActiveTab('tx')}
          style={{
            flex: 1,
            padding: '8px',
            background: activeTab === 'tx' ? 'var(--bg-secondary)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'tx' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'tx' ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'tx' ? '600' : '400'
          }}
        >
          📤 Being Heard ({txCount})
        </button>
        <button
          onClick={() => setActiveTab('rx')}
          style={{
            flex: 1,
            padding: '8px',
            background: activeTab === 'rx' ? 'var(--bg-secondary)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'rx' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'rx' ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'rx' ? '600' : '400'
          }}
        >
          📥 Hearing ({rxCount})
        </button>
      </div>

      <div className="panel-content" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {error ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            <div style={{ marginBottom: '8px' }}>⚠️ PSKReporter temporarily unavailable</div>
            <div style={{ fontSize: '0.7rem' }}>Will retry automatically</div>
          </div>
        ) : loading && reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            Loading...
          </div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            No {activeTab === 'tx' ? 'reception reports' : 'stations heard'} in the last {timeWindow} minutes
            <div style={{ fontSize: '0.65rem', marginTop: '8px' }}>
              (Make sure you're transmitting digital modes like FT8)
            </div>
          </div>
        ) : (
          <>
            {/* Summary stats for TX */}
            {activeTab === 'tx' && txCount > 0 && (
              <div style={{ 
                padding: '8px 12px', 
                background: 'var(--bg-tertiary)', 
                borderRadius: '4px',
                marginBottom: '8px',
                fontSize: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span>
                    <strong style={{ color: 'var(--accent-primary)' }}>{txCount}</strong> stations hearing you
                  </span>
                  {stats.txBands.length > 0 && (
                    <span>
                      Bands: {stats.txBands.join(', ')}
                    </span>
                  )}
                  {stats.txModes.length > 0 && (
                    <span>
                      Modes: {stats.txModes.slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Reports list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {reports.slice(0, 25).map((report, idx) => (
                <div 
                  key={idx}
                  onClick={() => onShowOnMap && report.lat && report.lon && onShowOnMap(report)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    gap: '8px',
                    padding: '6px 8px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: report.lat && report.lon ? 'pointer' : 'default',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ 
                      fontWeight: '600', 
                      color: 'var(--accent-primary)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {activeTab === 'tx' ? report.receiver : report.sender}
                    </span>
                    {(activeTab === 'tx' ? report.receiverGrid : report.senderGrid) && (
                      <span style={{ 
                        marginLeft: '6px', 
                        color: 'var(--text-muted)',
                        fontSize: '0.7rem'
                      }}>
                        {activeTab === 'tx' ? report.receiverGrid : report.senderGrid}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ 
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {report.freqMHz} {report.band}
                  </div>
                  
                  <div style={{ 
                    color: 'var(--text-muted)',
                    minWidth: '40px',
                    textAlign: 'center'
                  }}>
                    {report.mode}
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    minWidth: '70px',
                    justifyContent: 'flex-end'
                  }}>
                    {report.snr !== null && (
                      <span style={{ 
                        color: getSnrColor(report.snr),
                        fontFamily: 'var(--font-mono)',
                        fontWeight: '600'
                      }}>
                        {report.snr > 0 ? '+' : ''}{report.snr}dB
                      </span>
                    )}
                    <span style={{ 
                      color: 'var(--text-muted)',
                      fontSize: '0.65rem'
                    }}>
                      {formatAge(report.age)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {reports.length > 25 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '8px', 
                color: 'var(--text-muted)',
                fontSize: '0.7rem'
              }}>
                Showing 25 of {reports.length} reports
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with last update */}
      {lastUpdate && (
        <div style={{ 
          padding: '4px 12px', 
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          textAlign: 'right'
        }}>
          Updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default PSKReporterPanel;

export { PSKReporterPanel };
