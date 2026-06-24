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

## Architecture decisions

- Live metal spot prices are proxied server-side; the client reads them via `useGetSpot`/`useGetPrices`.
- Prices are stored in haléře (÷100). EUR display uses `eurCzk` from settings via a client-side `CurrencyProvider` (CZK/EUR toggle in the navbar) — no separate EUR price field.
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
