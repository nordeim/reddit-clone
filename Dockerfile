# syntax=docker/dockerfile:1.7

# embers — multi-stage Dockerfile
# Builds the @embers/server Fastify backend as a production image.
# The client SPA (@embers/web) is built separately and deployed to a static host
# (see docs/REMEDIATION_PLAN.md §4 — ADR-003 single-file build is still in force
# for the client until the deferred B17 frontend refactor pass).

# ----------------------------------------------------------------------------
# Stage 1: builder — install all deps, build all workspaces
# ----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build deps for native modules (better-sqlite3, argon2).
# Both ship prebuilt binaries for linux/x64 Node 20, so this is a safety net.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Copy lockfile + package manifests first to maximise layer caching.
COPY package.json package-lock.json* ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/

# Install all dependencies (including devDependencies — needed for build).
RUN npm ci --no-audit --no-fund

# Copy the rest of the source.
COPY tsconfig.base.json ./
COPY apps/server apps/server
COPY apps/web apps/web
COPY packages/shared packages/shared
COPY packages/db packages/db

# Build workspaces in topological order (matches root package.json `build` script).
RUN npm run build

# Prune devDependencies so the runner stage is smaller.
RUN npm prune --omit=dev

# ----------------------------------------------------------------------------
# Stage 2: runner — production image
# ----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Runtime deps for native modules (better-sqlite3, argon2).
# The prebuilt .node binaries from the builder stage are copied with node_modules.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy package manifests (for `require()` resolution at runtime).
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/apps/server/package.json /app/apps/server/package.json
COPY --from=builder /app/packages/shared/package.json /app/packages/shared/package.json
COPY --from=builder /app/packages/db/package.json /app/packages/db/package.json

# Copy production node_modules (already pruned in builder).
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/server/node_modules /app/apps/server/node_modules
COPY --from=builder /app/packages/shared/node_modules /app/packages/shared/node_modules
COPY --from=builder /app/packages/db/node_modules /app/packages/db/node_modules

# Copy built artifacts only (no source, no tests, no docs).
COPY --from=builder /app/apps/server/dist /app/apps/server/dist
COPY --from=builder /app/packages/shared/dist /app/packages/shared/dist
COPY --from=builder /app/packages/db/dist /app/packages/db/dist

# Copy Drizzle migrations (runtime-applied by openDb() on first start).
COPY --from=builder /app/packages/db/src/migrations /app/packages/db/src/migrations

# Copy the seed script (opt-in via `npm run db:seed`).
COPY --from=builder /app/packages/db/scripts /app/packages/db/scripts

# Create a data directory for the SQLite file (mounted as a volume in production).
RUN mkdir -p /data

# Environment defaults (override in docker-compose / docker run).
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000 \
    DATABASE_URL=/data/dev.db \
    LOG_LEVEL=info

# Production secrets MUST be provided at runtime via -e or env_file.
# The image refuses to start if these are missing (enforced by loadEnv()).
ARG JWT_ACCESS_SECRET
ARG JWT_REFRESH_SECRET
ARG CORS_ORIGIN

EXPOSE 4000

# Healthcheck: hit /health every 30s; if it returns non-200 three times in a row, unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# Run the server (ESM — entry is dist/index.js).
CMD ["node", "apps/server/dist/index.js"]
