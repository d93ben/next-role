#!/usr/bin/env sh
set -eu
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
manifest="$script_dir/node-runtime.txt"
IFS= read -r version < "$manifest"
version=$(printf '%s' "$version" | tr -d '\r')

case "$(uname -s)" in
  Darwin) platform=darwin ;;
  Linux) platform=linux ;;
  *) platform='' ;;
esac
case "$(uname -m)" in
  x86_64|amd64) arch=x64 ;;
  arm64|aarch64) arch=arm64 ;;
  *) arch='' ;;
esac
runtime="$script_dir/../.next-role-runtime"
dist="node-v$version-$platform-$arch"
local_node="$runtime/$dist/bin/node"
if [ -n "$platform" ] && [ -n "$arch" ] && [ -x "$local_node" ]; then
  exec "$local_node" "$@"
fi
if command -v node >/dev/null 2>&1 && node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" >/dev/null 2>&1; then
  exec node "$@"
fi
if [ -z "$platform" ] || [ -z "$arch" ]; then
  echo 'Next Role can download portable Node for macOS and Linux on x64 or Arm64. This machine needs an existing Node.js 20 or newer.' >&2
  exit 1
fi

name="$dist.tar.gz"
expected=$(awk -v name="$name" '{ sub(/\r$/, "", $2); if ($2 == name) print $1 }' "$manifest")
[ -n "$expected" ] || { echo 'Missing portable Node checksum.' >&2; exit 1; }
mkdir -p -- "$runtime"
stage=$(mktemp -d "$runtime/.download.XXXXXX")
trap 'rm -rf -- "$stage"' EXIT
trap 'exit 1' HUP INT TERM
archive="$stage/$name"
url="https://nodejs.org/dist/v$version/$name"
echo "Downloading portable Node.js $version into the Next Role folder." >&2
if command -v curl >/dev/null 2>&1; then
  curl --fail --location --proto '=https' --max-time 120 --silent --show-error --output "$archive" "$url"
else
  wget --https-only --timeout=120 --output-document="$archive" "$url"
fi
if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum < "$archive")
else
  actual=$(shasum -a 256 < "$archive")
fi
if [ "${actual%% *}" != "$expected" ]; then
  echo 'The portable Node download did not match its SHA-256 checksum.' >&2
  exit 1
fi
tar -xzf "$archive" -C "$stage" "$dist/bin/node" "$dist/LICENSE"
if ! mv -- "$stage/$dist" "$runtime/" && [ ! -x "$local_node" ]; then
  echo 'Could not move portable Node into the Next Role folder.' >&2
  exit 1
fi
rm -rf -- "$stage"
trap - EXIT HUP INT TERM
exec "$local_node" "$@"
