#!/usr/bin/env bash
set -euo pipefail

# The main public site stays a Vinext/Cloudflare deployment. This companion
# build is deliberately static so GitHub Pages can host the same client app.
export RIFFIZER_STATIC_EXPORT=1
export RIFFIZER_BASE_PATH="${RIFFIZER_BASE_PATH:-/Riffizer}"

bash "$(dirname "$0")/build-verified.sh"
node "$(dirname "$0")/prepare-pages-output.mjs"
