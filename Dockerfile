FROM node:24-bookworm-slim

ENV NODE_ENV=production
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable

COPY . .

# Instalace s povolenými build skripty
RUN pnpm install --frozen-lockfile --prod=false --config.unsafe-perm=true

# Build
RUN pnpm run typecheck:libs \
 && pnpm --filter @workspace/api-server run build \
 && PORT=8080 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/swissgold run build

ENV SERVE_STATIC_DIR=/app/artifacts/swissgold/dist/public
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "scripts/railway-start.sh"]
