#!/usr/bin/env bash
set -euo pipefail

echo "[render-deploy] Starting deploy script"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[render-deploy] WARNING: DATABASE_URL is not set. Skipping migrations."
  echo "[render-deploy] To run migrations automatically, set DATABASE_URL in the environment."
else
  echo "[render-deploy] Running migrations (drizzle-kit push)"
  npm run migrate
  
  echo "[render-deploy] Fixing session table if needed"
  # Run the session table fix to ensure correct column types
  psql "$DATABASE_URL" -f migrations/fix_session_table.sql || true
fi

echo "[render-deploy] Starting server"
exec node dist/index.cjs
