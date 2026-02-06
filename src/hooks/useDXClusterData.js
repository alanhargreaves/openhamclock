/**
 * useDXClusterData Hook
 * Unified DX cluster data - fetches once, filters once, provides both list and map data
 * Replaces separate useDXCluster and useDXPaths hooks
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getBandFromFreq, detectMode, getCallsignInfo } from '../utils/callsign.js';

export const useDXClusterData = (filters = {}, config = {}) => {
  const [allData, setAllData] = useState([]);
  const [spots, setSpots] = useState([]);     // For list display
  const [paths, setPaths] = useState([]);     // For map display
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef(0);
  
  const spotRetentionMs = (filters?.spotRetentionMinutes || 30) * 60 * 1000;
  const pollInterval = 30000;

  // Build query params for custom cluster settings
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    // Add source
    const source = config.dxClusterSource || 'dxspider-proxy';
    params.append('source', source);
    
    // Add custom cluster settings if using custom source
    if (source === 'custom' && config.customDxCluster) {
      if (config.customDxCluster.host) {
        params.append('host', config.customDxCluster.host);
      }
      if (config.customDxCluster.port) {
        params.append('port', config.customDxCluster.port);
      }
    }
    
    // Always send callsign for login (with SSID)
    if (config.callsign && config.callsign !== 'N0CALL') {
      params.append('callsign', config.callsign);
    }
    
    return params.toString();
  }, [config.dxClusterSource, config.customDxCluster, config.callsign]);

  // Apply filters to data
  const applyFilters = useCallback((data, filters) => {
    if (!filters || Object.keys(filters).length === 0) return data;
    
    return data.filter(item => {
      // Get spotter info for origin-based filtering
      const spotterInfo = getCallsignInfo(item.spotter);
      const call = item.dxCall || item.call;
      // Get DX station info for destination-based filtering
      const dxInfo = getCallsignInfo(call);
      
      // Watchlist only mode
      if (filters.watchlistOnly && filters.watchlist?.length > 0) {
        const matchesWatchlist = filters.watchlist.some(w => 
          call?.toUpperCase().includes(w.toUpperCase())
        );
        if (!matchesWatchlist) return false;
      }
      
      // Exclude list
      if (filters.excludeList?.length > 0) {
        const isExcluded = filters.excludeList.some(exc =>
          call?.toUpperCase().startsWith(exc.toUpperCase())
        );
        if (isExcluded) return false;
      }
      
      // CQ Zone filter (by spotter's zone)
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
      
      // Continent filter (spotter FROM selected continent, DX OUTSIDE that continent)
      if (filters.continents?.length > 0) {
        // Spotter must be from one of the selected continents
        if (!spotterInfo.continent || !filters.continents.includes(spotterInfo.continent)) {
          return false;
        }
        // DX must be OUTSIDE all selected continents (to show actual DX, not domestic)
        if (dxInfo.continent && filters.continents.includes(dxInfo.continent)) {
          return false;
        }
      }
      
      // Band filter
      if (filters.bands?.length > 0) {
        const band = getBandFromFreq(parseFloat(item.freq) * 1000);
        if (!filters.bands.includes(band)) return false;
      }
      
      // Mode filter
      if (filters.modes?.length > 0) {
        const mode = detectMode(item.comment);
        if (!mode || !filters.modes.includes(mode)) return false;
      }
      
      // Callsign search filter
      if (filters.callsign && filters.callsign.trim()) {
        const search = filters.callsign.trim().toUpperCase();
        const matchesCall = call?.toUpperCase().includes(search);
        const matchesSpotter = item.spotter?.toUpperCase().includes(search);
        if (!matchesCall && !matchesSpotter) return false;
      }
      
      return true;
    });
  }, []);

  // Fetch data from unified paths endpoint (has all the data we need)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const queryParams = buildQueryParams();
        const response = await fetch(`/api/dxcluster/paths?${queryParams}`);
        if (response.ok) {
          const newData = await response.json();
          const now = Date.now();
          
          setAllData(prev => {
            // Create map of existing items by unique key
            const existingMap = new Map(
              prev.map(item => [`${item.dxCall}-${item.freq}-${item.spotter}`, item])
            );
            
            // Add or update with new data
            newData.forEach(item => {
              const key = `${item.dxCall}-${item.freq}-${item.spotter}`;
              existingMap.set(key, { ...item, timestamp: item.timestamp || now });
            });
            
            // Filter out items older than retention time
            const validItems = Array.from(existingMap.values())
              .filter(item => (now - (item.timestamp || now)) < spotRetentionMs);
            
            // Sort by timestamp (newest first) and limit
            return validItems
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
              .slice(0, 200);
          });
          
          lastFetchRef.current = now;
        }
      } catch (err) {
        console.error('DX cluster data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, pollInterval);
    return () => clearInterval(interval);
  }, [spotRetentionMs, buildQueryParams]);

  // Clean up data when retention time changes
  useEffect(() => {
    setAllData(prev => {
      const now = Date.now();
      return prev.filter(item => (now - (item.timestamp || now)) < spotRetentionMs);
    });
  }, [spotRetentionMs]);

  // Apply filters and split into spots (for list) and paths (for map)
  useEffect(() => {
    const filtered = applyFilters(allData, filters);
    
    // Format for list display (matches old useDXCluster format)
    const spotList = filtered.map(item => ({
      call: item.dxCall,
      freq: item.freq,
      comment: item.comment || '',
      time: item.time || '',
      spotter: item.spotter,
      source: 'DXCluster',
      timestamp: item.timestamp
    }));
    
    // Format for map display (matches old useDXPaths format)
    // Only include items that have valid coordinates
    const pathList = filtered.filter(item => 
      item.spotterLat != null && item.spotterLon != null &&
      item.dxLat != null && item.dxLon != null
    );
    
    setSpots(spotList);
    setPaths(pathList);
  }, [allData, filters, applyFilters]);

  return { 
    spots,           // For DXClusterPanel list
    paths,           // For WorldMap
    loading, 
    totalSpots: allData.length 
  };
};

export default useDXClusterData;
