#!/usr/bin/env sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
dashboard="$PWD/workspace/dashboard.html"
if [ ! -f "$dashboard" ]; then
  exec sh scripts/run-node.sh scripts/launch.mjs "$@"
fi
if [ "${1:-}" = "--no-open" ]; then
  printf '%s\n' "$dashboard"
  exit 0
fi
case "$(uname -s)" in
  Darwin) exec open "$dashboard" ;;
  *) exec xdg-open "$dashboard" ;;
esac
