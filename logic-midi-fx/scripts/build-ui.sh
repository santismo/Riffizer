#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${root}"

# The plugin loads the same client, engine, and styling as the hosted Riffizer
# app, but from its own bundled WebView resources.
npx vite --config logic-midi-fx/ui/vite.config.ts build
