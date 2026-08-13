#!/usr/bin/env bash
#
# Deploy WONK CITY (the static build in docs/) to wadan-no-ki.tech.
#
# Run this FROM YOUR OWN MACHINE, where `ssh sizenkai` already works
# (an SSH host alias in ~/.ssh/config, or set DEPLOY_REMOTE=user@host below).
# It builds the site and rsyncs docs/ to the server's web root.
#
#   ./city/deploy.sh                 # build + deploy
#   ./city/deploy.sh --dry-run       # preview what would change (no upload)
#   DEPLOY_PATH=/srv/www ./city/deploy.sh
#
set -euo pipefail

# --- config (override via env) ------------------------------------------------
REMOTE="${DEPLOY_REMOTE:-sizenkai}"                       # ssh alias or user@host
REMOTE_PATH="${DEPLOY_PATH:-/var/www/wadan-no-ki.tech}"   # server document root
URL="${DEPLOY_URL:-https://wadan-no-ki.tech/}"
# -----------------------------------------------------------------------------

cd "$(dirname "$0")/.."

echo "→ building WONK CITY ..."
node city/build.mjs

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync not found. Install it, or use scp:  scp -r docs/* ${REMOTE}:${REMOTE_PATH}/" >&2
  exit 1
fi

echo "→ deploying docs/ → ${REMOTE}:${REMOTE_PATH}/"
# --delete keeps the server a mirror of docs/ (removes files deleted locally).
# Pass extra flags straight through, e.g. --dry-run.
rsync -avz --delete \
  --exclude '.DS_Store' \
  "$@" \
  docs/ "${REMOTE}:${REMOTE_PATH}/"

echo "✓ deployed → ${URL}"
