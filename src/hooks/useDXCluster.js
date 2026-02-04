/**
 * useDXCluster Hook
 * Fetches and filters DX cluster spots with 30-minute retention
 */
import { useState, useEffect, useCallback } from 'react';
import { getBandFromFreq, detectMode, getCallsignInfo } from '../utils/callsign.js';

export const useDXCluster = (source = 'auto', filters = {}) => {
  const [allSpots, setAllSpots] = useState([]); // All accumulated spots
  const [data, setData] = useState([]); // Filtered spots for display
  const [loading, setLoading] = useState(true);
  const [activeSource, setActiveSource] = useState('');
  
  // Get retention time from filters, default to 30 minutes
  const spotRetentionMs = (filters?.spotRetentionMinutes || 30) * 60 * 1000;
  const pollInterval = 30000; // 30 seconds (was 5 seconds - reduced to save bandwidth)

  // Apply filters to spots
  const applyFilters = useCallback((spots, filters) => {
    if (!filters || Object.keys(filters).length === 0) return spots;
    
    return spots.filter(spot => {
      // Get spotter info for origin-based filtering
      const spotterInfo = getCallsignInfo(spot.spotter);
      
      // Watchlist only mode - must match watchlist
      if (filters.watchlistOnly && filters.watchlist?.length > 0) {
        const matchesWatchlist = filters.watchlist.some(w => 
          spot.call?.toUpperCase().includes(w.toUpperCase())
        );
        if (!matchesWatchlist) return false;
      }
      
      // Exclude list - hide matching calls - match the call as a prefix
      if (filters.excludeList?.length > 0) {
        const isExcluded = filters.excludeList.some(exc =>
          spot.call?.toUpperCase().startsWith(exc.toUpperCase())
        );
        if (isExcluded) return false;
      }
      
      // CQ Zone filter - filter by SPOTTER's zone
      if (filters.cqZones?.length > 0) {
        if (!spotterInfo.cqZone || !filters.cqZones.includes(spotterInfo.cqZone)) {
          return false;
        }
      }
      
      // ITU Zone filter
      if (filters.ituZones?.length > 0) {
        if (!spotterInfo.ituZone || !filters.ituZones.includes(spotterInfo.ituZone)) {
          return false;
        }
      }
      
      // Continent filter - filter by SPOTTER's continent
      if (filters.continents?.length > 0) {
        if (!spotterInfo.continent || !filters.continents.includes(spotterInfo.continent)) {
          return false;
        }
      }
      
      // Band filter
      if (filters.bands?.length > 0) {
        const band = getBandFromFreq(parseFloat(spot.freq) * 1000);
        if (!filters.bands.includes(band)) return false;
      }
      
      // Mode filter
      if (filters.modes?.length > 0) {
        const mode = detectMode(spot.comment);
        if (!mode || !filters.modes.includes(mode)) return false;
      }
      
      // Callsign search filter
      if (filters.callsign && filters.callsign.trim()) {
        const search = filters.callsign.trim().toUpperCase();
        const matchesCall = spot.call?.toUpperCase().includes(search);
        const matchesSpotter = spot.spotter?.toUpperCase().includes(search);
        if (!matchesCall && !matchesSpotter) return false;
      }
      
      return true;
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/dxcluster/spots?source=${encodeURIComponent(source)}`);
        if (response.ok) {
          const newSpots = await response.json();
          
          setAllSpots(prev => {
            const now = Date.now();
            // Create map of existing spots by unique key
            const existingMap = new Map(
              prev.map(s => [`${s.call}-${s.freq}-${s.spotter}`, s])
            );
            
            // Add or update with new spots
            newSpots.forEach(spot => {
              const key = `${spot.call}-${spot.freq}-${spot.spotter}`;
              existingMap.set(key, { ...spot, timestamp: now });
            });
            
            // Filter out spots older than retention time
            const validSpots = Array.from(existingMap.values())
              .filter(s => (now - (s.timestamp || now)) < spotRetentionMs);
            
            // Sort by timestamp (newest first) and limit
            return validSpots
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
              .slice(0, 200);
          });
          
          setActiveSource('dxcluster');
        }
      } catch (err) {
        console.error('DX cluster error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, pollInterval);
    return () => clearInterval(interval);
  }, [source, spotRetentionMs]);

  // Clean up spots immediately when retention time changes
  useEffect(() => {
    setAllSpots(prev => {
      const now = Date.now();
      return prev.filter(s => (now - (s.timestamp || now)) < spotRetentionMs);
    });
  }, [spotRetentionMs]);

  // Apply filters whenever allSpots or filters change
  useEffect(() => {
    const filtered = applyFilters(allSpots, filters);
    setData(filtered);
  }, [allSpots, filters, applyFilters]);

  return { data, loading, activeSource, totalSpots: allSpots.length };
};

export default useDXCluster;
