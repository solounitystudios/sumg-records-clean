# ---- Build stage ----
FROM node:20-slim AS builder

WORKDIR /app

# SUMG-OPS-P0-001: deterministic install. `npm ci` requires package-lock.json and
# installs exactly the locked tree — no version float on rebuild. The worker is
# pinned to @supabase/supabase-js 2.104.0 (same as the root app); realtime-js
# >= 2.106 throws at createClient() on Node < 22 (no global WebSocket), which is
# what previously crash-looped this service.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Production stage ----
FROM node:20-slim

# ffmpeg + libvips dependencies for sharp
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ffmpeg \
      libvips-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
