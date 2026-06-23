/**
 * MapDataListView
 *
 * Screen-reader-first textual rendering of the data normally plotted on the
 * map. Sub-issue #1002 under the accessibility umbrella #997. Sits alongside
 * the map as a regular dockable panel.
 *
 * v1 covers DX spots, satellites overhead, and ground activations (POTA /
 * SOTA / WWFF / WWBOTA). v2 adds lightning, aurora, aircraft, and Winlink
 * gateways: those live inside their Leaflet plugin hooks, which broadcast
 * `mapdata:<layer>` CustomEvents collected by useMapTextData and passed in
 * here as props (null = layer disabled).
 */

import React from 'react';
import { calculateBearing, calculateDistance, formatDistance } from '../utils/geo.js';

const COMPASS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const compass8 = (deg) => COMPASS_8[Math.round(deg / 45) % 8];

const sectionStyle = { marginBottom: '20px' };
const sectionTitleStyle = {
  fontSize: '13px',
  color: 'var(--accent-cyan)',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontWeight: 700,
};
const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
};
const thStyle = {
  textAlign: 'left',
  padding: '4px 6px',
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border-color)',
  fontWeight: 600,
};
const tdStyle = {
  padding: '4px 6px',
  borderBottom: '1px dotted rgba(255,255,255,0.06)',
  verticalAlign: 'top',
};
const emptyStyle = { color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' };

function Section({ title, count, columns, children, emptyMsg, isEmpty }) {
  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>
        {title}
        {count != null && (
          <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 400 }}>— {count}</span>
        )}
      </h2>
      {isEmpty ? (
        <div style={emptyStyle}>{emptyMsg}</div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col" style={thStyle}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      )}
    </section>
  );
}

function relativeMinutes(ts) {
  if (!ts) return null;
  const diffMs = Math.max(0, Date.now() - ts);
  return Math.floor(diffMs / 60000);
}

function ageAriaLabel(minutes) {
  if (minutes == null) return '';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
}

function ageDisplay(minutes) {
  if (minutes == null) return '—';
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

// Seconds-resolution age for fast-moving data (lightning).
function ageFine(ts) {
  if (!ts) return { display: '—', aria: '' };
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return { display: `${seconds}s`, aria: `${seconds} seconds ago` };
  const minutes = Math.floor(seconds / 60);
  return { display: `${minutes}m`, aria: ageAriaLabel(minutes) };
}

function freqDisplay(freq) {
  if (freq == null || freq === '') return '?';
  const v = parseFloat(freq);
  if (!Number.isFinite(v)) return '?';
  return v > 1000 ? (v / 1000).toFixed(3) : v.toFixed(3);
}

function bearingDistanceLabel(deLat, deLon, lat, lon, units) {
  if (deLat == null || deLon == null || lat == null || lon == null) return null;
  const bearing = Math.round(calculateBearing(deLat, deLon, lat, lon));
  const distanceKm = calculateDistance(deLat, deLon, lat, lon);
  return {
    bearing,
    compass: compass8(bearing),
    distance: formatDistance(distanceKm, units),
    distanceKm,
  };
}

// Sort by distance from DE when we know where DE is; otherwise leave order alone.
function sortByDistance(items, deLat, deLon) {
  if (deLat == null || deLon == null) return items;
  return items
    .map((item) => ({ item, d: calculateDistance(deLat, deLon, item.lat, item.lon) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.item);
}

export default function MapDataListView({
  dxSpots = [],
  satellites = [],
  potaSpots = [],
  sotaSpots = [],
  wwffSpots = [],
  wwbotaSpots = [],
  lightning = null,
  aircraft = null,
  aurora = null,
  winlink = null,
  deLocation,
  units = 'metric',
}) {
  const deLat = deLocation?.lat;
  const deLon = deLocation?.lon;

  const dxRows = (dxSpots || []).slice(0, 50).map((spot, i) => {
    const minutes = relativeMinutes(spot.timestamp);
    const bd = bearingDistanceLabel(deLat, deLon, spot.dxLat, spot.dxLon, units);
    const freq = freqDisplay(spot.freq);
    return (
      <tr key={`dx-${spot.id || i}`}>
        <td style={tdStyle}>
          {freq}
          <span className="visually-hidden"> megahertz</span>
        </td>
        <td style={tdStyle}>{spot.call || '?'}</td>
        <td style={tdStyle} aria-label={bd ? `bearing ${bd.bearing} degrees ${bd.compass}, ${bd.distance}` : undefined}>
          {bd ? `${bd.bearing}° ${bd.compass} · ${bd.distance}` : '—'}
        </td>
        <td style={tdStyle} aria-label={minutes != null ? ageAriaLabel(minutes) : undefined}>
          {ageDisplay(minutes)}
        </td>
      </tr>
    );
  });

  const overhead = (satellites || [])
    .filter((s) => s.isVisible && (s.elevation ?? -1) > 0)
    .sort((a, b) => (b.elevation ?? 0) - (a.elevation ?? 0));

  const satRows = overhead.slice(0, 50).map((sat, i) => {
    const nextPassMin = (() => {
      const t = sat.nextPassStartTimes?.[0];
      if (!t) return null;
      const diff = new Date(t).getTime() - Date.now();
      if (!Number.isFinite(diff) || diff < 0) return null;
      return Math.round(diff / 60000);
    })();
    return (
      <tr key={`sat-${sat.name || i}`}>
        <td style={tdStyle}>{sat.name}</td>
        <td style={tdStyle} aria-label={`elevation ${sat.elevation} degrees`}>
          {sat.elevation}°
        </td>
        <td style={tdStyle} aria-label={`azimuth ${sat.azimuth} degrees ${compass8(sat.azimuth)}`}>
          {sat.azimuth}° {compass8(sat.azimuth)}
        </td>
        <td style={tdStyle}>{sat.mode || '—'}</td>
        <td
          style={tdStyle}
          aria-label={nextPassMin != null ? `next pass in ${nextPassMin} minutes` : 'no pass scheduled'}
        >
          {nextPassMin != null ? `${nextPassMin}m` : '—'}
        </td>
      </tr>
    );
  });

  const buildActivationRow = (kind, spot, i) => {
    const minutes = relativeMinutes(spot.timestamp);
    const bd = bearingDistanceLabel(deLat, deLon, spot.lat, spot.lon, units);
    return (
      <tr key={`${kind}-${spot.ref || spot.call}-${i}`}>
        <td style={tdStyle}>{kind}</td>
        <td style={tdStyle}>{spot.call || '?'}</td>
        <td style={tdStyle}>{spot.ref || '—'}</td>
        <td style={tdStyle}>
          {freqDisplay(spot.freq)}
          <span className="visually-hidden"> megahertz</span>
        </td>
        <td style={tdStyle} aria-label={bd ? `bearing ${bd.bearing} degrees ${bd.compass}, ${bd.distance}` : undefined}>
          {bd ? `${bd.bearing}° ${bd.compass} · ${bd.distance}` : '—'}
        </td>
        <td style={tdStyle} aria-label={minutes != null ? ageAriaLabel(minutes) : undefined}>
          {ageDisplay(minutes)}
        </td>
      </tr>
    );
  };

  const activationRows = [
    ...(potaSpots || []).slice(0, 25).map((s, i) => buildActivationRow('POTA', s, i)),
    ...(sotaSpots || []).slice(0, 25).map((s, i) => buildActivationRow('SOTA', s, i)),
    ...(wwffSpots || []).slice(0, 25).map((s, i) => buildActivationRow('WWFF', s, i)),
    ...(wwbotaSpots || []).slice(0, 25).map((s, i) => buildActivationRow('WWBOTA', s, i)),
  ];

  const lightningRows = sortByDistance(lightning?.strikes || [], deLat, deLon)
    .slice(0, 25)
    .map((strike, i) => {
      const bd = bearingDistanceLabel(deLat, deLon, strike.lat, strike.lon, units);
      const age = ageFine(strike.timestamp);
      return (
        <tr key={`strike-${strike.id || i}`}>
          <td
            style={tdStyle}
            aria-label={bd ? `bearing ${bd.bearing} degrees ${bd.compass}, ${bd.distance}` : undefined}
          >
            {bd ? `${bd.bearing}° ${bd.compass} · ${bd.distance}` : '—'}
          </td>
          <td style={tdStyle} aria-label={`${strike.intensity} kiloamperes`}>
            {strike.intensity} kA
          </td>
          <td style={tdStyle}>{strike.polarity}</td>
          <td style={tdStyle} aria-label={age.aria}>
            {age.display}
          </td>
        </tr>
      );
    });

  const aircraftRows = sortByDistance(aircraft?.aircraft || [], deLat, deLon)
    .slice(0, 25)
    .map((plane, i) => {
      const bd = bearingDistanceLabel(deLat, deLon, plane.lat, plane.lon, units);
      const alt = plane.onGround ? null : plane.alt_ft;
      return (
        <tr key={`plane-${plane.id || i}`}>
          <td style={tdStyle}>{plane.call || plane.registration || '?'}</td>
          <td style={tdStyle}>{plane.type || '—'}</td>
          <td style={tdStyle} aria-label={alt != null ? `${alt} feet` : 'on ground'}>
            {alt != null ? `${alt.toLocaleString()} ft` : 'ground'}
          </td>
          <td style={tdStyle} aria-label={plane.speed_kn != null ? `${Math.round(plane.speed_kn)} knots` : undefined}>
            {plane.speed_kn != null ? `${Math.round(plane.speed_kn)} kn` : '—'}
          </td>
          <td
            style={tdStyle}
            aria-label={bd ? `bearing ${bd.bearing} degrees ${bd.compass}, ${bd.distance}` : undefined}
          >
            {bd ? `${bd.bearing}° ${bd.compass} · ${bd.distance}` : '—'}
          </td>
        </tr>
      );
    });

  const winlinkRows = sortByDistance(winlink?.gateways || [], deLat, deLon)
    .slice(0, 25)
    .map((gw, i) => {
      const bd = bearingDistanceLabel(deLat, deLon, gw.lat, gw.lon, units);
      const channels = (gw.channels || []).slice().sort((a, b) => a.frequency - b.frequency);
      const shown = channels
        .slice(0, 3)
        .map((c) => `${(c.frequency / 1e6).toFixed(3)} ${c.modeLabel || ''}`.trim())
        .join(', ');
      const more = channels.length > 3 ? ` +${channels.length - 3} more` : '';
      return (
        <tr key={`gw-${gw.callsign || i}`}>
          <td style={tdStyle}>{gw.callsign}</td>
          <td style={tdStyle}>{gw.gridsquare || '—'}</td>
          <td style={tdStyle} aria-label={`${shown} megahertz${more}`}>
            {shown}
            {more}
          </td>
          <td
            style={tdStyle}
            aria-label={bd ? `bearing ${bd.bearing} degrees ${bd.compass}, ${bd.distance}` : undefined}
          >
            {bd ? `${bd.bearing}° ${bd.compass} · ${bd.distance}` : '—'}
          </td>
        </tr>
      );
    });

  const auroraSummary = aurora?.summary;
  const auroraLines = auroraSummary
    ? [
        `Peak probability: ${auroraSummary.maxProbability}%${
          auroraSummary.maxLat != null ? ` (${auroraSummary.maxLat > 0 ? 'northern' : 'southern'} hemisphere)` : ''
        }`,
        auroraSummary.southernExtentNorth != null
          ? `Northern oval extends south to ${Math.round(auroraSummary.southernExtentNorth)}°N`
          : 'Northern oval: no significant activity',
        auroraSummary.northernExtentSouth != null
          ? `Southern oval extends north to ${Math.abs(Math.round(auroraSummary.northernExtentSouth))}°S`
          : 'Southern oval: no significant activity',
        auroraSummary.probabilityAtDe != null
          ? `Probability at your location: ${auroraSummary.probabilityAtDe}%`
          : null,
        auroraSummary.forecastTime ? `Forecast time: ${new Date(auroraSummary.forecastTime).toUTCString()}` : null,
      ].filter(Boolean)
    : [];

  const layerOffMsg = (name) => `${name} layer is off — enable it from the map layers menu to populate this section.`;

  return (
    <div className="panel" style={{ padding: '12px 14px', height: '100%', overflowY: 'auto' }}>
      <div role="note" style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.4 }}>
        Screen-reader-friendly text view of the data plotted on the map. Each section corresponds to a map layer.
        Sections only populate when the relevant data is loaded.
      </div>

      <Section
        title="DX Spots"
        count={dxRows.length}
        columns={['Frequency', 'Callsign', 'Bearing / Distance', 'Age']}
        emptyMsg="No DX spots loaded."
        isEmpty={dxRows.length === 0}
      >
        {dxRows}
      </Section>

      <Section
        title="Satellites Overhead"
        count={satRows.length}
        columns={['Name', 'Elevation', 'Azimuth', 'Mode', 'Next Pass']}
        emptyMsg="No satellites currently above the horizon."
        isEmpty={satRows.length === 0}
      >
        {satRows}
      </Section>

      <Section
        title="Activations (POTA / SOTA / WWFF / WWBOTA)"
        count={activationRows.length}
        columns={['Program', 'Callsign', 'Reference', 'Frequency', 'Bearing / Distance', 'Age']}
        emptyMsg="No activation spots loaded."
        isEmpty={activationRows.length === 0}
      >
        {activationRows}
      </Section>

      <Section
        title="Lightning Strikes"
        count={lightning ? lightningRows.length : null}
        columns={['Bearing / Distance', 'Intensity', 'Polarity', 'Age']}
        emptyMsg={lightning ? 'No strikes received yet.' : layerOffMsg('Lightning')}
        isEmpty={lightningRows.length === 0}
      >
        {lightningRows}
      </Section>

      <Section
        title="Aircraft"
        count={aircraft ? aircraftRows.length : null}
        columns={['Callsign', 'Type', 'Altitude', 'Speed', 'Bearing / Distance']}
        emptyMsg={aircraft ? 'No aircraft loaded yet.' : layerOffMsg('Aircraft')}
        isEmpty={aircraftRows.length === 0}
      >
        {aircraftRows}
      </Section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Aurora Forecast</h2>
        {auroraLines.length > 0 ? (
          <ul
            style={{
              margin: 0,
              paddingLeft: '18px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.7,
            }}
          >
            {auroraLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <div style={emptyStyle}>{aurora ? 'Aurora forecast loading…' : layerOffMsg('Aurora')}</div>
        )}
      </section>

      <Section
        title="Winlink Gateways (nearest first)"
        count={winlink ? winlinkRows.length : null}
        columns={['Callsign', 'Grid', 'Frequencies / Modes', 'Bearing / Distance']}
        emptyMsg={winlink ? 'No gateways loaded yet.' : layerOffMsg('Winlink Gateways')}
        isEmpty={winlinkRows.length === 0}
      >
        {winlinkRows}
      </Section>

      <div role="note" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '16px', lineHeight: 1.5 }}>
        Lightning, aircraft, aurora, and Winlink sections follow their map layer toggles — turn the layer on and the
        section populates. Feedback on what is useful versus noise is welcome on issue #1002.
      </div>
    </div>
  );
}
