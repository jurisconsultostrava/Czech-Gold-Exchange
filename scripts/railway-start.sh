#!/usr/bin/env sh
# Railway container entrypoint: sync the DB schema, optionally seed, then start.
set -e

# Schema sync runs on boot by default. Once the schema is stable you can set
# RUN_MIGRATIONS=false on the Railway service to make startup more resilient
# (e.g. unaffected by a transient DB outage) and avoid push on every deploy.
if [ "$RUN_MIGRATIONS" != "false" ]; then
  echo "[railway-start] Pushing database schema (drizzle-kit push)..."
  pnpm --filter @workspace/db run push
fi

if [ "$RUN_SEED" = "true" ]; then
  echo "[railway-start] RUN_SEED=true — seeding database..."
  pnpm --filter @workspace/api-server run seed
fi

echo "[railway-start] Starting API server..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
