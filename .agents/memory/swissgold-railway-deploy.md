---
name: SwissGold Railway deploy
description: How this monorepo is adapted to deploy on Railway (single combined service).
---

# Railway deployment (single combined service)

The app deploys to Railway as ONE web service: the Express API server (`@workspace/api-server`) also serves the built Vite storefront. Frontend at `/`, JSON API at `/api`, same origin so the customer auth cookie just works (no CORS/SameSite changes). Backed by a Railway Postgres plugin (`DATABASE_URL`).

Files: `Dockerfile`, `railway.json`, `scripts/railway-start.sh`, `.dockerignore` (all at repo root).

**Why single-service:** avoids a cross-origin frontend/backend split (which would force `SameSite=None` cookies + CORS). The storefront's API client targets `/api` (OpenAPI `servers: [{url: /api}]`), so relative same-origin calls resolve correctly.

## Non-obvious constraints
- **Must use a glibc base image (`node:24-bookworm-slim`), NOT alpine/musl.** `pnpm-workspace.yaml` `overrides` prune every `*-musl` native binary (rollup, `@tailwindcss/oxide`, lightningcss). A musl image fails the Vite build.
- Storefront serving in `app.ts` is gated on `SERVE_STATIC_DIR` (set in the Dockerfile to the frontend `dist/public`). Unset on Replit, so Replit's separate static service is unaffected. SPA fallback uses an Express 5 regex route `app.get(/.*/, ...)` that skips `/api`.
- `app.set("trust proxy", 1)` in production so `Secure` cookies are honored behind Railway's TLS proxy.
- `scripts/railway-start.sh` runs `drizzle-kit push` on boot (skippable via `RUN_MIGRATIONS=false`), seeds only when `RUN_SEED=true`, then `exec node artifacts/api-server/dist/index.mjs`.

**Why boot-time push is gateable:** running `drizzle-kit push` on every boot is convenient for first deploy but operationally brittle (a transient DB outage blocks startup). Set `RUN_MIGRATIONS=false` once the schema stabilizes.

## Required Railway env vars
`DATABASE_URL` (Postgres plugin), `JWT_SECRET` or `SESSION_SECRET` (jwtSecret.ts is fail-fast), `ADMIN_EMAIL`, `ADMIN_PASSWORD`. `PORT` is injected by Railway. Optional: `RUN_SEED`, `RUN_MIGRATIONS`, feed overrides `PRODUCT_FEED_URL`/`PRICE_FEED_URL`/`SPOT_API_URL`.
