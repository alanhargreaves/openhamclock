#!/bin/bash
# ============================================================
# fetch-wasm.sh — download P.533 WASM from latest CI artifact
# ============================================================
# Pulls p533.mjs + p533.wasm from the most recent successful
# build-wasm.yml run and places them at public/wasm/ so Vite
# copies them into dist/ and serves at /wasm/p533.{mjs,wasm}.
#
# Requires: GITHUB_TOKEN env var (GitHub Actions artifact API
# requires auth even for public repos), plus curl + jq + unzip.
#
# Failure mode: if token is missing, no unexpired artifact is
# found, or download fails, the script exits 0 with a warning.
# The runtime falls back to /api/bands (proppy REST) and then
# the built-in heuristic, so the build still ships a working app.
# ============================================================

set -uo pipefail

REPO="${WASM_REPO:-accius/openhamclock}"
ARTIFACT_NAME="p533-wasm"
DEST_DIR="public/wasm"

warn() { echo "⚠  fetch-wasm: $1 — skipping (runtime will use REST fallback)" >&2; exit 0; }

if [ -z "${GITHUB_TOKEN:-}" ]; then
  warn "GITHUB_TOKEN not set"
fi

for bin in curl jq unzip; do
  command -v "$bin" >/dev/null 2>&1 || warn "$bin not installed"
done

mkdir -p "$DEST_DIR"

echo "→ fetch-wasm: looking up latest $ARTIFACT_NAME artifact for $REPO..."

ARTIFACT_JSON=$(curl -sfL \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO/actions/artifacts?name=$ARTIFACT_NAME&per_page=20" \
  2>/dev/null) || warn "GitHub API request failed"

DOWNLOAD_URL=$(printf '%s' "$ARTIFACT_JSON" \
  | jq -r '.artifacts // [] | map(select(.expired == false)) | sort_by(.created_at) | reverse | .[0].archive_download_url // ""')

if [ -z "$DOWNLOAD_URL" ] || [ "$DOWNLOAD_URL" = "null" ]; then
  warn "no unexpired $ARTIFACT_NAME artifact found"
fi

TMP_ZIP=$(mktemp -t p533-wasm.XXXXXX.zip)
trap 'rm -f "$TMP_ZIP"' EXIT

echo "→ fetch-wasm: downloading..."
curl -sfL \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  "$DOWNLOAD_URL" -o "$TMP_ZIP" \
  || warn "artifact download failed"

unzip -q -o "$TMP_ZIP" -d "$DEST_DIR" || warn "unzip failed"

# Verify sha256 if the artifact shipped one
if [ -f "$DEST_DIR/p533.sha256" ] && command -v sha256sum >/dev/null 2>&1; then
  (cd "$DEST_DIR" && sha256sum -c p533.sha256 >/dev/null 2>&1) \
    || warn "sha256 mismatch on downloaded WASM"
fi

echo "✓ fetch-wasm: installed to $DEST_DIR/"
ls -lh "$DEST_DIR/" | grep -E 'p533\.(mjs|wasm)$' || true
