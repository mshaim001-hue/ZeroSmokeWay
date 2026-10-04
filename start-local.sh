#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -d backend/node_modules || ! -d webapp/node_modules ]]; then
  echo 'Install dependencies: npm ci --prefix backend && npm ci --prefix webapp'
  exit 1
fi
npm start --prefix backend &
backend_pid=$!
trap 'kill "$backend_pid" 2>/dev/null || true' EXIT INT TERM
npm run dev --prefix webapp
