/**
 * Custom Leaflet CRS for Azimuthal Equidistant projection.
 * Centers on a given lat/lon (DE location). Distances from center
 * are preserved, great circles from center are straight lines.
 */
const DEG = Math.PI / 180;

export function createAzimuthalCRS(lat0, lon0) {
  const L = window.L;
  if (!L) return null;

  const phi0 = lat0 * DEG;
  const lam0 = lon0 * DEG;
  const sinPhi0 = Math.sin(phi0);
  const cosPhi0 = Math.cos(phi0);

  const projection = {
    project(latlng) {
      const phi = latlng.lat * DEG;
      const lam = latlng.lng * DEG;
      const cosC = sinPhi0 * Math.sin(phi) + cosPhi0 * Math.cos(phi) * Math.cos(lam - lam0);
      const c = Math.acos(Math.max(-1, Math.min(1, cosC)));
      if (c < 1e-10) return new L.Point(0, 0);
      const k = c / Math.sin(c);
      const x = k * Math.cos(phi) * Math.sin(lam - lam0);
      const y = k * (cosPhi0 * Math.sin(phi) - sinPhi0 * Math.cos(phi) * Math.cos(lam - lam0));
      return new L.Point(x, y);
    },

    unproject(point) {
      const rho = Math.sqrt(point.x * point.x + point.y * point.y);
      if (rho < 1e-10) return new L.LatLng(lat0, lon0);
      const c = rho;
      const sinC = Math.sin(c);
      const cosC = Math.cos(c);
      const lat = Math.asin(cosC * sinPhi0 + (point.y * sinC * cosPhi0) / rho) / DEG;
      const lon = (lam0 + Math.atan2(point.x * sinC, rho * cosPhi0 * cosC - point.y * sinPhi0 * sinC)) / DEG;
      return new L.LatLng(lat, ((lon + 540) % 360) - 180);
    },

    bounds: new L.Bounds(new L.Point(-Math.PI, -Math.PI), new L.Point(Math.PI, Math.PI)),
  };

  // Shift origin: projection center (0,0) → pixel (PI, PI), flip Y for screen coords.
  // pixel_x = (x + PI) * scale
  // pixel_y = (-y + PI) * scale
  const transformation = new L.Transformation(1, Math.PI, -1, Math.PI);

  return L.Util.extend({}, L.CRS, {
    projection,
    transformation,
    code: 'AzimuthalEquidistant',

    scale(zoom) {
      return Math.pow(2, zoom);
    },

    zoom(scale) {
      return Math.log(scale) / Math.LN2;
    },

    // Great-circle distance in meters (used by L.circle, etc.)
    distance(latlng1, latlng2) {
      const R = 6371000;
      const p1 = latlng1.lat * DEG;
      const p2 = latlng2.lat * DEG;
      const dp = (latlng2.lat - latlng1.lat) * DEG;
      const dl = (latlng2.lng - latlng1.lng) * DEG;
      const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    infinite: true,
  });
}
