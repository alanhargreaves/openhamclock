const normalizeCall = (value) =>
  String(value == null ? '' : value)
    .trim()
    .toUpperCase();

const normalizeFreq = (value) => String(value == null ? '' : value).trim();

export const buildDXSpotKey = (spot = {}) => {
  if (!spot) return '';
  const id = typeof spot.id === 'string' ? spot.id.trim() : '';
  if (id) return id;

  const dxCall = normalizeCall(spot.dxCall || spot.call);
  const freq = normalizeFreq(spot.freq);
  const spotter = normalizeCall(spot.spotter);

  if (!dxCall) return '';

  return `${dxCall}|${freq}|${spotter}`;
};

export const matchesDXSpotPath = (spot, path) => {
  if (!spot || !path) return false;
  const spotKey = buildDXSpotKey(spot);
  const pathKey = buildDXSpotKey(path);

  if (spotKey && pathKey) return spotKey === pathKey;

  return (
    normalizeCall(spot?.call) === normalizeCall(path?.dxCall) &&
    normalizeFreq(spot?.freq) === normalizeFreq(path?.freq) &&
    normalizeCall(spot?.spotter) === normalizeCall(path?.spotter)
  );
};

export const findDXPathForSpot = (paths = [], spot) => paths.find((path) => matchesDXSpotPath(spot, path));
