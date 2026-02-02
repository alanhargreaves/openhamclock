/**
 * usePSKReporter Hook
 * Fetches PSKReporter data showing where your digital mode signals are being received
 * 
 * Uses HTTP API with server-side caching to respect PSKReporter rate limits.
 * 
 * For real-time MQTT updates, see mqtt.pskreporter.info (requires mqtt.js library)
 */
import { useState, useEffect, useCallback } from 'react';

// Convert grid square to lat/lon
function gridToLatLon(grid) {
  if (!grid || grid.length < 4) return null;
  
  const g = grid.toUpperCase();
  const lon = (g.charCodeAt(0) - 65) * 20 - 180;
  const lat = (g.charCodeAt(1) - 65) * 10 - 90;
  const lonMin = parseInt(g[2]) * 2;
  const latMin = parseInt(g[3]) * 1;
  
  let finalLon = lon + lonMin + 1;
  let finalLat = lat + latMin + 0.5;
  
  if (grid.length >= 6) {
    const lonSec = (g.charCodeAt(4) - 65) * (2/24);
    const latSec = (g.charCodeAt(5) - 65) * (1/24);
    finalLon = lon + lonMin + lonSec + (1/24);
    finalLat = lat + latMin + latSec + (0.5/24);
  }
  
  return { lat: finalLat, lon: finalLon };
}

export const usePSKReporter = (callsign, options = {}) => {
  const {
    minutes = 15,           // Time window in minutes (default 15)
    enabled = true,         // Enable/disable fetching
    refreshInterval = 300000, // Refresh every 5 minutes (PSKReporter friendly)
    maxSpots = 100          // Max spots to display
  } = options;

  const [txReports, setTxReports] = useState([]);
  const [rxReports, setRxReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    if (!callsign || callsign === 'N0CALL' || !enabled) {
      setTxReports([]);
      setRxReports([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch combined endpoint from our server (handles caching)
      const response = await fetch(`/api/pskreporter/${encodeURIComponent(callsign)}?minutes=${minutes}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Process TX reports (where I'm being heard)
        const txData = data.tx?.reports || [];
        const processedTx = txData
          .map(r => ({
            ...r,
            // Ensure we have location data
            lat: r.lat || (r.receiverGrid ? gridToLatLon(r.receiverGrid)?.lat : null),
            lon: r.lon || (r.receiverGrid ? gridToLatLon(r.receiverGrid)?.lon : null),
            age: r.age || Math.floor((Date.now() - r.timestamp) / 60000)
          }))
          .filter(r => r.lat && r.lon)
          .slice(0, maxSpots);
        
        // Process RX reports (what I'm hearing)
        const rxData = data.rx?.reports || [];
        const processedRx = rxData
          .map(r => ({
            ...r,
            lat: r.lat || (r.senderGrid ? gridToLatLon(r.senderGrid)?.lat : null),
            lon: r.lon || (r.senderGrid ? gridToLatLon(r.senderGrid)?.lon : null),
            age: r.age || Math.floor((Date.now() - r.timestamp) / 60000)
          }))
          .filter(r => r.lat && r.lon)
          .slice(0, maxSpots);
        
        setTxReports(processedTx);
        setRxReports(processedRx);
        setLastUpdate(new Date());
        
        // Check for errors in response
        if (data.error || data.tx?.error || data.rx?.error) {
          setError(data.error || data.tx?.error || data.rx?.error);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('PSKReporter fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [callsign, minutes, enabled, maxSpots]);

  useEffect(() => {
    fetchData();
    
    if (enabled && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, enabled, refreshInterval]);

  // Computed stats
  const txBands = [...new Set(txReports.map(r => r.band))].filter(b => b && b !== 'Unknown');
  const txModes = [...new Set(txReports.map(r => r.mode))].filter(Boolean);
  
  const stats = {
    txCount: txReports.length,
    rxCount: rxReports.length,
    txBands,
    txModes,
    bestSnr: txReports.length > 0
      ? txReports.reduce((max, r) => (r.snr || -99) > (max?.snr || -99) ? r : max, null)
      : null
  };

  return {
    txReports,
    txCount: txReports.length,
    rxReports,
    rxCount: rxReports.length,
    stats,
    loading,
    error,
    connected: false, // HTTP mode - not real-time connected
    source: 'http',
    lastUpdate,
    refresh: fetchData
  };
};

export default usePSKReporter;
