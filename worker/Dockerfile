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

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
