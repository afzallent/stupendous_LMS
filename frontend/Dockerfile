# syntax=docker/dockerfile:1

# ---- deps ----------------------------------------------------------------
FROM node:22-slim AS deps
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ---------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app
RUN npm install -g pnpm

# NEXT_PUBLIC_* variables are inlined into the browser bundle at BUILD time,
# not read at runtime. Without this ARG the shipped bundle would fall back to
# http://localhost:8000 and every client-side API call from the deployed site
# would fail. In Coolify this must be set as a BUILD variable, not just a
# runtime environment variable. See PRODUCTION_READINESS.md (P1-9).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN if [ -z "$NEXT_PUBLIC_API_URL" ]; then \
      echo "ERROR: NEXT_PUBLIC_API_URL build argument is required." >&2; \
      echo "Set it as a BUILD variable so it is compiled into the client bundle." >&2; \
      exit 1; \
    fi

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- runtime -------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

RUN npm install -g pnpm \
    && apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Production dependencies only: the previous single-stage image shipped the
# full dev toolchain and source tree.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

# Run as the unprivileged user that ships with the node image.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3000/ || exit 1

CMD ["pnpm", "start"]
