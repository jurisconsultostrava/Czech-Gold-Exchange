# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- API server: `artifacts/api-server` — routes in `src/routes/{catalog,shop,admin,adminIO}.ts`, seed in `src/scripts/seed.ts`
- Storefront: `artifacts/swissgold` — pages in `src/pages`, shared UI in `src/components`
- Design tokens (source of truth): `artifacts/swissgold/src/index.css` `:root` block
- Reference design (decoded from the user's MHTML capture): `attached_assets/swissgold-reference.css`
- DB schema: `@workspace/db` package; API contract: `@workspace/api-spec` (OpenAPI) → generated hooks/types in `@workspace/api-client-react`

## Deploy on Railway

Single web service (the Express API server also serves the built storefront) + a Railway Postgres plugin. Files: `Dockerfile`, `railway.json`, `scripts/railway-start.sh`, `.dockerignore`.

- **Build**: Railway builds the `Dockerfile` (glibc `node:24-bookworm-slim` — NOT alpine, because the workspace prunes `*-musl` native binaries). It installs deps, builds libs + API bundle, then builds the storefront with `BASE_PATH=/`.
- **Run**: `scripts/railway-start.sh` runs `drizzle-kit push` (schema sync), optionally seeds when `RUN_SEED=true`, then starts `node artifacts/api-server/dist/index.mjs`. The server reads `SERVE_STATIC_DIR` (set in the Dockerfile) to serve the frontend at `/` with SPA fallback; `/api/*` is the JSON API. Healthcheck: `/api/healthz`.
- **Required env vars on Railway**: `DATABASE_URL` (from the Postgres plugin), `JWT_SECRET` (or `SESSION_SECRET`), `ADMIN_EMAIL`, `ADMIN_PASSWORD`. `PORT` is injected by Railway. Optional: `RUN_SEED=true` for first deploy, `RUN_MIGRATIONS=false` to skip the boot-time `drizzle-kit push` once the schema is stable, and feed overrides `PRODUCT_FEED_URL`/`PRICE_FEED_URL`/`SPOT_API_URL`.
- The single-origin setup means customer auth cookies work without CORS/SameSite changes; `trust proxy` is enabled in production so `Secure` cookies are honored behind Railway's TLS proxy.

## Architecture decisions

- The **product feed** (`PRODUCT_FEED_URL`, xaumanager.cz `…/export/meistergold`) is the catalog source for the seed (authoritative material/weight/fineness/category/image). The **price feed** (`PRICE_FEED_URL`, the mergado.com shoptet-univerzalni XML) supplies live price/stock/buyback at request time, matched to each product by `CODE` (=`product.id`) first, then by normalized `NAME` as a fallback.
- **Price unit + margin model**: the mergado price feed quotes the **final published retail price incl. VAT in whole CZK** — used as-is (NO ÷100 haléře conversion, NO category/global margin added). `sellPriceCzk` defaults to the feed price; per-product `price_overrides` (marginPct/marginCzk, opt-in `active`) can still adjust it. NOTE: the old xaumanager price feed was in haléře (÷100); if you ever switch `PRICE_FEED_URL` back, restore the conversion in `lib/feeds.ts`.
- Live metal spot prices are proxied server-side; the client reads them via `useGetSpot`/`useGetPrices`. Primary source is the xaumanager spot API (`SPOT_API_URL`); if it fails or returns no metals, `fetchSpot` falls back to **GoldAPI.io** (`GOLDAPI_KEY`, metals in CZK). The primary feed usually omits the EUR/CZK rate, so it's backfilled from GoldAPI by deriving gold-in-CZK ÷ gold-in-EUR (GoldAPI is metals-only); if that also fails, `/spot` falls back to `settings.eurToCzk`. All wrapped in the 60s spot cache so GoldAPI is hit at most once/min.
- EUR display uses `eurCzk` from settings via a client-side `CurrencyProvider` (CZK/EUR toggle in the navbar) — no separate EUR price field; EUR is derived from the CZK price at request time.
- Admin auth is JWT (bearer token in `localStorage` key `sg_admin_token`); import/export endpoints use plain `fetch`, everything else uses generated hooks.
- Visual design intentionally matches the real SwissGold.cz (dark gold/black, Manrope/Inter/JetBrains Mono). See memory `swissgold-reference-design.md`.

## Product

Czech precious-metals e-commerce storefront: homepage, catalog (`/katalog`, category filter via URL `?category=`), product detail (`/detail/:id`), cart (`/kosik`, paylibo QR), buyback request + calculator (`/vykup`), about (`/o-nas`), and a JWT-protected admin area (`/admin`) with product/order/buyback management and XML/CSV import-export. Live spot-price ticker, CZK/EUR currency toggle, Czech UI throughout.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
