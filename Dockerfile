# SwissGold.cz — single-service Railway image.
# The Express API server (port $PORT) serves both the JSON API under /api and
# the built Vite storefront for everything else, so the whole app runs as one
# Railway web service backed by a Railway Postgres plugin (DATABASE_URL).
#
# IMPORTANT: must be a glibc base (bookworm), NOT alpine/musl — pnpm-workspace.yaml
# prunes the *-musl native binaries (rollup, tailwind oxide, lightningcss), so a
# musl image would fail the frontend build.
FROM node:24-bookworm-slim

ENV NODE_ENV=production
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

# pnpm is provided via corepack (version pinned by package.json/lockfile).
RUN corepack enable

# Copy the whole monorepo. .dockerignore keeps node_modules/dist/etc. out.
COPY . .

# Install all dependencies (including dev — needed for the build step).
RUN pnpm install --frozen-lockfile --prod=false

# Build composite libs, bundle the API server, then build the storefront.
# vite.config.ts requires PORT and BASE_PATH at build time; BASE_PATH=/ makes
# assets resolve from the domain root.
RUN pnpm run typecheck:libs \
 && pnpm --filter @workspace/api-server run build \
 && PORT=8080 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/swissgold run build

# Tell the API server where the built frontend lives.
ENV SERVE_STATIC_DIR=/app/artifacts/swissgold/dist/public
# Railway overrides PORT at runtime; this is just a sensible default.
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "scripts/railway-start.sh"]
