/**
 * ContestPanel Component
 * Displays upcoming contests with contestcalendar.com credit
 */
import React from 'react';

export const ContestPanel = ({ data, loading }) => {
  const getModeColor = (mode) => {
    switch(mode) {
      case 'CW': return 'var(--accent-cyan)';
      case 'SSB': return 'var(--accent-amber)';
      case 'RTTY': return 'var(--accent-purple)';
      case 'FT8': case 'FT4': return 'var(--accent-green)';
      case 'Mixed': return 'var(--text-secondary)';
      default: return 'var(--text-secondary)';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="panel" style={{ padding: '8px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header" style={{ 
        marginBottom: '6px',
        fontSize: '11px'
      }}>
        🏆 CONTESTS
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
            <div className="loading-spinner" />
          </div>
        ) : data && data.length > 0 ? (
          <div style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }}>
            {data.slice(0, 6).map((contest, i) => (
              <div 
                key={`${contest.name}-${i}`}
                style={{ 
                  padding: '4px 0',
                  borderBottom: i < Math.min(data.length, 6) - 1 ? '1px solid var(--border-color)' : 'none'
                }}
              >
                <div style={{ 
                  color: 'var(--text-primary)', 
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {contest.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span style={{ color: getModeColor(contest.mode) }}>{contest.mode}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{formatDate(contest.start)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px', fontSize: '11px' }}>
            No upcoming contests
          </div>
        )}
      </div>
      
      {/* Contest Calendar Credit */}
      <div style={{ 
        marginTop: '6px', 
        paddingTop: '6px', 
        borderTop: '1px solid var(--border-color)',
        textAlign: 'right'
      }}>
        <a 
          href="https://www.contestcalendar.com" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            fontSize: '9px', 
            color: 'var(--text-muted)', 
            textDecoration: 'none'
          }}
        >
          WA7BNM Contest Calendar
        </a>
      </div>
    </div>
  );
};

export default ContestPanel;
