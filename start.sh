#!/usr/bin/env sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec sh scripts/run-node.sh scripts/launch.mjs "$@"
