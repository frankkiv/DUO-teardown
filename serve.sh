#!/usr/bin/env bash
# Rebuild and serve the page locally: http://localhost:8137/
cd "$(dirname "$0")"
[ -d "$HOME/.nvm/versions/node" ] && export PATH="$(ls -d $HOME/.nvm/versions/node/*/bin | tail -1):$PATH"
node build.mjs && exec python3 -m http.server 8137 --directory docs --bind 0.0.0.0
