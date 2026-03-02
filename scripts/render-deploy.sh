#!/usr/bin/env bash
set -euo pipefail

echo "[render-deploy] Starting deploy script"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[render-deploy] WARNING: DATABASE_URL is not set. Skipping migrations."
  echo "[render-deploy] To run migrations automatically, set DATABASE_URL in the environment."
else
  echo "[render-deploy] Running migrations (drizzle-kit push)"
  npm run migrate
fi

echo "[render-deploy] Starting server"
exec node dist/index.cjs
