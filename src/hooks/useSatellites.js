/**
 * useSatellites Hook
 * Tracks amateur radio satellites using TLE data and satellite.js
 */
import { useState, useEffect, useCallback } from 'react';
import * as satellite from 'satellite.js';

// List of popular amateur radio satellites
const AMATEUR_SATS = [
  'ISS (ZARYA)',
  'SO-50',
  'AO-91',
  'AO-92',
  'CAS-4A',
  'CAS-4B',
  'XW-2A',
  'XW-2B',
  'JO-97',
  'RS-44'
];

export const useSatellites = (observerLocation) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tleData, setTleData] = useState({});

  // Fetch TLE data
  useEffect(() => {
    const fetchTLE = async () => {
      try {
        const response = await fetch('/api/satellites/tle');
        if (response.ok) {
          const tle = await response.json();
          setTleData(tle);
        }
      } catch (err) {
        console.error('TLE fetch error:', err);
      }
    };

    fetchTLE();
    const interval = setInterval(fetchTLE, 6 * 60 * 60 * 1000); // 6 hours
    return () => clearInterval(interval);
  }, []);

  // Calculate satellite positions
  const calculatePositions = useCallback(() => {
    if (!observerLocation || Object.keys(tleData).length === 0) {
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const positions = [];

      // Observer position in radians
      const observerGd = {
        longitude: satellite.degreesToRadians(observerLocation.lon),
        latitude: satellite.degreesToRadians(observerLocation.lat),
        height: 0.1 // km above sea level
      };

      Object.entries(tleData).forEach(([name, tle]) => {
        // Server returns tle1/tle2, handle both formats
        const line1 = tle.line1 || tle.tle1;
        const line2 = tle.line2 || tle.tle2;
        if (!line1 || !line2) return;

        try {
          const satrec = satellite.twoline2satrec(line1, line2);
          const positionAndVelocity = satellite.propagate(satrec, now);
          
          if (!positionAndVelocity.position) return;

          const gmst = satellite.gstime(now);
          const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
          
          // Convert to degrees
          const lat = satellite.degreesLat(positionGd.latitude);
          const lon = satellite.degreesLong(positionGd.longitude);
          const alt = positionGd.height;

          // Calculate look angles
          const lookAngles = satellite.ecfToLookAngles(
            observerGd,
            satellite.eciToEcf(positionAndVelocity.position, gmst)
          );

          const azimuth = satellite.radiansToDegrees(lookAngles.azimuth);
          const elevation = satellite.radiansToDegrees(lookAngles.elevation);
          const rangeSat = lookAngles.rangeSat;

          // Only include if above horizon or popular sat
          const isPopular = AMATEUR_SATS.some(s => name.includes(s));
          if (elevation > -5 || isPopular) {
            positions.push({
              name,
              lat,
              lon,
              alt: Math.round(alt),
              azimuth: Math.round(azimuth),
              elevation: Math.round(elevation),
              range: Math.round(rangeSat),
              visible: elevation > 0,
              isPopular
            });
          }
        } catch (e) {
          // Skip satellites with invalid TLE
        }
      });

      // Sort by elevation (highest first) and limit
      positions.sort((a, b) => b.elevation - a.elevation);
      setData(positions.slice(0, 20));
      setLoading(false);
    } catch (err) {
      console.error('Satellite calculation error:', err);
      setLoading(false);
    }
  }, [observerLocation, tleData]);

  // Update positions every 5 seconds
  useEffect(() => {
    calculatePositions();
    const interval = setInterval(calculatePositions, 5000);
    return () => clearInterval(interval);
  }, [calculatePositions]);

  return { data, loading };
};

export default useSatellites;
