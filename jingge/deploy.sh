#!/bin/sh
set -eu
cd "$(dirname "$0")"
port="${PORT:-8080}"
bind="${HOST:-127.0.0.1}"
printf '晶格研习室：http://%s:%s\n' "$bind" "$port"
exec python3 -m http.server "$port" --bind "$bind" --directory dist
