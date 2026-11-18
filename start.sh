#!/usr/bin/env sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  echo 'Next Role needs Node.js 20 or newer: https://nodejs.org'
  exit 1
fi
node scripts/launch.mjs
