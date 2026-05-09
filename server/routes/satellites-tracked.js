// Curated list of active ham radio and amateur-accessible satellites
// Last audited: March 2026
//
// REMOVED (dead/decayed/not ham):
//   AO-92 (43137) — re-entered Feb 2024
//   PO-101 (43678) — previously listed as decommissioned, restored (still active)
//   AO-27 (22825) — dead since ~2020
//   RS-15 (23439) — dead for years
//   FO-99 (43937) — dead/marginal
//   UVSQ-SAT (47438) — science payload, not ham
//   MeznSat (46489) — science payload, not ham
//   CAS-5A (54684) — decayed from orbit
//   ARISS/SSTV-ISS — duplicate NORAD 25544, consolidated into ISS entry
//
// ADDED:
//   AO-123 (ASRTU-1) — FM transponder, active since Aug 2025
//   SO-124 (HADES-R) — FM repeater, active since Feb 2025
//   SO-125 (HADES-ICM) — FM repeater, active since Jun 2025
//   QMR-KWT-2 — FM repeater/SSTV, launched Dec 2025, NORAD 67291
//   EWS-G1 (GOES-13, 29155) — geostationary, GVAR/SD, 1685.7/1676.0 MHz
//   EWS-G2 (GOES-15, 36411) — geostationary, GVAR/SD, 1685.7/1676.0 MHz
//   ELEKTRO-L2 (41105) — geostationary, HRIT/LRIT, 1691.0 MHz
//   ELEKTRO-L3 (44903) — geostationary, HRIT/LRIT, 1691.0 MHz
//   GK-2A (43823) — geostationary, HRIT/LRIT, 1692.14 MHz
//   HIMAWARI-9 (41836) — geostationary, HimawariCast, 4148.0 MHz
//   NOAA-20 (43013) — polar, HRD X-Band, 7812.0 MHz
//   NOAA-21 (54234) — polar, HRD X-Band, 7812.0 MHz
//
// UPDATED: Frequency data (downlink, uplink, tone, armTone, frequency,
//   hrptFrequency, grbFrequency, sdFrequency) merged from satconfig.json
//   for all applicable satellites — ISS, SO-50, AO-91, AO-123, SO-125,
//   QMR-KWT-2, GOES-18/19, METOP-B/C, METEOR M2-3/4, RS-44, QO-100,
//   AO-7, FO-29, JO-97, AO-73, CAS-4A/4B, CAS-6, XW-2A/B/C/F, IO-117
//
// FIXED: TEVEL NORAD IDs corrected per AMSAT TLE bulletin
//
const HAM_SATELLITES = {
  // ── High Priority — Popular FM Satellites ──────────────────────
  ISS: {
    norad: 25544,
    name: 'ISS (ZARYA)',
    color: '#00ffff',
    priority: 1,
    mode: 'FM/APRS/SSTV',
    downlink: '145.800 MHz',
    uplink: '145.990 MHz',
    tone: '67.0 Hz',
  },
  'SO-50': {
    norad: 27607,
    name: 'SO-50',
    color: '#00ff00',
    priority: 1,
    mode: 'FM',
    downlink: '436.795 MHz',
    uplink: '145.850 MHz',
    tone: '67.0 Hz',
    armTone: '74.4 Hz',
  },
  'AO-91': {
    norad: 43017,
    name: 'AO-91 (Fox-1B)',
    color: '#ff6600',
    priority: 2,
    mode: 'FM (sunlight only)',
    downlink: '145.960 MHz',
    uplink: '435.250 MHz',
    tone: '67.0 Hz',
  },
  'AO-123': {
    norad: 61781,
    name: 'AO-123 (ASRTU-1)',
    color: '#ff3399',
    priority: 1,
    mode: 'FM',
    downlink: '435.400 MHz',
    uplink: '145.850 MHz',
    tone: '67.0 Hz',
  },
  'SO-124': {
    norad: 62690,
    name: 'SO-124 (HADES-R)',
    color: '#ff44aa',
    priority: 1,
    mode: 'FM',
  },
  'SO-125': {
    norad: 63492,
    name: 'SO-125 (HADES-ICM)',
    color: '#ff55bb',
    priority: 1,
    mode: 'FM',
    downlink: '436.666 MHz',
    uplink: '145.875 MHz',
    tone: '67.0 Hz',
  },
  'QMR-KWT-2': {
    norad: 67291,
    name: 'QMR-KWT-2',
    color: '#ff88dd',
    priority: 1,
    mode: 'FM/SSTV',
    downlink: '436.950 MHz',
    uplink: '145.920 MHz',
    tone: '67.0 Hz',
  },
  'PO-101': {
    norad: 43678,
    name: 'PO-101 (DIWATA-2B)',
    color: '#cc66ff',
    priority: 2,
    mode: 'FM',
    downlink: '145.900 MHz',
    uplink: '437.500 MHz',
    tone: '141.3 Hz',
  },

  // ── Weather Satellites — GOES & METEOR ─────────────────────────
  'GOES-18': {
    norad: 51850,
    name: 'GOES-18',
    color: '#66ff66',
    priority: 1,
    mode: 'GRB/HRIT/LRIT',
    frequency: '1694.100 MHz',
    grbFrequency: '1686.600 MHz',
  },
  'GOES-19': {
    norad: 60133,
    name: 'GOES-19',
    color: '#33cc33',
    priority: 1,
    mode: 'GRB/HRIT/LRIT',
    frequency: '1694.100 MHz',
    grbFrequency: '1686.600 MHz',
  },
  'METOP-B': {
    norad: 38771,
    name: 'MetOp-B',
    color: '#FF6600',
    priority: 1,
    mode: 'HRPT/AHRPT',
    hrptFrequency: '1701.300 MHz',
  },
  'METOP-C': {
    norad: 43689,
    name: 'MetOp-C',
    color: '#FF8800',
    priority: 1,
    mode: 'HRPT/AHRPT',
    hrptFrequency: '1701.300 MHz',
  },
  'METEOR-M2-3': {
    norad: 57166,
    name: 'METEOR M2-3',
    color: '#FF0000',
    priority: 1,
    mode: 'HRPT/LRPT',
    frequency: '137.900 MHz',
    hrptFrequency: '1700.000 MHz',
  },
  'METEOR-M2-4': {
    norad: 59051,
    name: 'METEOR M2-4',
    color: '#FF0000',
    priority: 1,
    mode: 'HRPT/LRPT',
    frequency: '137.100 MHz',
    hrptFrequency: '1700.000 MHz',
  },

  // ── Weather Satellites — Geostationary (non-GOES) ─────────────
  'EWS-G1': {
    norad: 29155,
    name: 'EWS-G1 (GOES-13)',
    color: '#0066ff',
    priority: 2,
    mode: 'GVAR/SD',
    frequency: '1685.700 MHz',
    sdFrequency: '1676.000 MHz',
  },
  'EWS-G2': {
    norad: 36411,
    name: 'EWS-G2 (GOES-15)',
    color: '#0044cc',
    priority: 2,
    mode: 'GVAR/SD',
    frequency: '1685.700 MHz',
    sdFrequency: '1676.000 MHz',
  },
  'ELEKTRO-L2': {
    norad: 41105,
    name: 'ELEKTRO-L2',
    color: '#ffcc00',
    priority: 2,
    mode: 'HRIT/LRIT',
    frequency: '1691.000 MHz',
  },
  'ELEKTRO-L3': {
    norad: 44903,
    name: 'ELEKTRO-L3',
    color: '#ff9900',
    priority: 2,
    mode: 'HRIT/LRIT',
    frequency: '1691.000 MHz',
  },
  'GK-2A': {
    norad: 43823,
    name: 'GK-2A',
    color: '#ff33cc',
    priority: 1,
    mode: 'HRIT/LRIT',
    frequency: '1692.140 MHz',
  },
  'HIMAWARI-9': {
    norad: 41836,
    name: 'HIMAWARI-9',
    color: '#9900cc',
    priority: 1,
    mode: 'HimawariCast',
    frequency: '4148.000 MHz',
  },

  // ── Weather Satellites — Polar (X-Band) ───────────────────────
  'NOAA-20': {
    norad: 43013,
    name: 'NOAA-20',
    color: '#00ccff',
    priority: 2,
    mode: 'HRD (X-Band)',
    frequency: '7812.000 MHz',
  },
  'NOAA-21': {
    norad: 54234,
    name: 'NOAA-21',
    color: '#0099ff',
    priority: 2,
    mode: 'HRD (X-Band)',
    frequency: '7812.000 MHz',
  },

  // ── Linear Transponder Satellites ──────────────────────────────
  'RS-44': {
    norad: 44909,
    name: 'RS-44 (DOSAAF)',
    color: '#ff0066',
    priority: 1,
    mode: 'Linear',
    downlink: '435.610 - 435.670 MHz',
    uplink: '145.935 - 145.995 MHz',
  },
  'QO-100': {
    norad: 43700,
    name: "QO-100 (Es'hail-2)",
    color: '#ffff00',
    priority: 1,
    mode: 'Linear (GEO)',
    downlink: '10489.550 - 10489.800 MHz',
    uplink: '2400.050 - 2400.300 MHz',
  },
  'AO-7': {
    norad: 7530,
    name: 'AO-7',
    color: '#ffcc00',
    priority: 2,
    mode: 'Linear (daylight)',
    downlink: '145.925 - 145.975 MHz',
    uplink: '432.125 - 432.175 MHz',
  },
  'FO-29': {
    norad: 24278,
    name: 'FO-29 (JAS-2)',
    color: '#ff6699',
    priority: 2,
    mode: 'Linear (scheduled)',
    downlink: '435.800 - 435.900 MHz',
    uplink: '145.900 - 146.000 MHz',
  },
  'JO-97': {
    norad: 43803,
    name: 'JO-97 (JY1Sat)',
    color: '#cc99ff',
    priority: 2,
    mode: 'Linear/FM',
    downlink: '145.855 - 145.875 MHz',
    uplink: '435.100 - 435.120 MHz',
  },
  'AO-73': {
    norad: 39444,
    name: 'AO-73 (FUNcube-1)',
    color: '#ffcc66',
    priority: 2,
    mode: 'Linear/Telemetry',
    downlink: '145.950 - 145.970 MHz',
    uplink: '435.130 - 435.150 MHz',
  },
  'EO-88': {
    norad: 42017,
    name: 'EO-88 (Nayif-1)',
    color: '#ffaa66',
    priority: 3,
    mode: 'Linear/Telemetry',
  },

  // ── CAS (Chinese Amateur Satellites) ───────────────────────────
  'CAS-4A': {
    norad: 42761,
    name: 'CAS-4A',
    color: '#9966ff',
    priority: 2,
    mode: 'Linear',
    downlink: '145.910 - 145.930 MHz',
    uplink: '435.210 - 435.230 MHz',
  },
  'CAS-4B': {
    norad: 42759,
    name: 'CAS-4B',
    color: '#9933ff',
    priority: 2,
    mode: 'Linear',
    downlink: '145.915 - 145.935 MHz',
    uplink: '435.270 - 435.290 MHz',
  },
  'CAS-6': {
    norad: 44881,
    name: 'CAS-6 (TO-108)',
    color: '#cc66ff',
    priority: 2,
    mode: 'Linear',
    downlink: '145.915 - 145.935 MHz',
    uplink: '435.270 - 435.290 MHz',
  },

  // ── XW-2 Constellation (CAS-3) — intermittent ─────────────────
  'XW-2A': {
    norad: 40903,
    name: 'XW-2A (CAS-3A)',
    color: '#66ff99',
    priority: 3,
    mode: 'Linear',
    downlink: '145.660 - 145.680 MHz',
    uplink: '435.030 - 435.050 MHz',
  },
  'XW-2B': {
    norad: 40911,
    name: 'XW-2B (CAS-3B)',
    color: '#66ffcc',
    priority: 3,
    mode: 'Linear',
    downlink: '145.730 - 145.750 MHz',
    uplink: '435.090 - 435.110 MHz',
  },
  'XW-2C': {
    norad: 40906,
    name: 'XW-2C (CAS-3C)',
    color: '#99ffcc',
    priority: 3,
    mode: 'Linear',
    downlink: '145.795 - 145.815 MHz',
    uplink: '435.150 - 435.170 MHz',
  },
  'XW-2F': {
    norad: 40910,
    name: 'XW-2F (CAS-3F)',
    color: '#ccffcc',
    priority: 3,
    mode: 'Linear',
    downlink: '145.975 - 145.995 MHz',
    uplink: '435.330 - 435.350 MHz',
  },

  // ── Digipeaters ────────────────────────────────────────────────
  'IO-86': {
    norad: 40931,
    name: 'IO-86 (LAPAN-A2/ORARI)',
    color: '#33ccaa',
    priority: 2,
    mode: 'APRS Digipeater',
    downlink: '145.825 MHz',
    uplink: '145.825 MHz',
  },
  'IO-117': {
    norad: 53106,
    name: 'IO-117 (GreenCube)',
    color: '#00ff99',
    priority: 2,
    mode: 'Digipeater',
    downlink: '435.310 MHz',
    uplink: '435.310 MHz',
  },

  // ── TEVEL Constellation — activated periodically ───────────────
  // NORAD IDs corrected per AMSAT TLE bulletin Dec 2022
  'TEVEL-1': {
    norad: 51013,
    name: 'TEVEL-1',
    color: '#66ccff',
    priority: 3,
    mode: 'FM',
  },
  'TEVEL-2': {
    norad: 51069,
    name: 'TEVEL-2',
    color: '#66ddff',
    priority: 3,
    mode: 'FM',
  },
  'TEVEL-3': {
    norad: 50988,
    name: 'TEVEL-3',
    color: '#66eeff',
    priority: 3,
    mode: 'FM',
  },
  'TEVEL-4': {
    norad: 51063,
    name: 'TEVEL-4',
    color: '#77ccff',
    priority: 3,
    mode: 'FM',
  },
  'TEVEL-5': {
    norad: 50998,
    name: 'TEVEL-5',
    color: '#77ddff',
    priority: 3,
    mode: 'FM',
  },
  'TEVEL-6': {
    norad: 50999,
    name: 'TEVEL-6',
    color: '#77eeff',
    priority: 3,
    mode: 'FM',
  },
  'TEVEL-7': {
    norad: 51062,
    name: 'TEVEL-7',
    color: '#88ccff',
    priority: 3,
    mode: 'FM',
  },
  'TEVEL-8': {
    norad: 50989,
    name: 'TEVEL-8',
    color: '#88ddff',
    priority: 3,
    mode: 'FM',
  },
};

module.exports = { HAM_SATELLITES };
