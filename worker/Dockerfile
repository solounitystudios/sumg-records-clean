# ---- Build stage ----
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

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

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
