function normalizeCall(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function normalizeFreq(value) {
  return String(value || '').trim();
}

function buildDXPathIdentityKey(path = {}) {
  const dxCall = normalizeCall(path.dxCall || path.call);
  const freq = normalizeFreq(path.freq);
  const spotter = normalizeCall(path.spotter);

  if (!dxCall || !freq || !spotter) return '';

  return `${dxCall}|${freq}|${spotter}`;
}

function areDXPathsDuplicate(existing = {}, candidate = {}, now = Date.now(), dedupWindowMs = 120000) {
  const existingKey = buildDXPathIdentityKey(existing);
  const candidateKey = buildDXPathIdentityKey(candidate);

  if (!existingKey || !candidateKey || existingKey !== candidateKey) return false;

  return now - (existing.timestamp || 0) < dedupWindowMs;
}

module.exports = {
  buildDXPathIdentityKey,
  areDXPathsDuplicate,
};
