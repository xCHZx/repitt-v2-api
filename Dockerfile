# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Dependencias de sistema para sharp (build-time)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libvips-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# sharp necesita libvips en runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

# Copiar build
COPY --from=builder /app/dist ./dist

# Copiar assets estáticos (flyer template)
COPY --from=builder /app/src/assets ./src/assets

# Copiar migraciones de Drizzle
COPY --from=builder /app/drizzle ./drizzle

# Script de migración (JS puro, sin compilación)
COPY migrate.js ./

# Entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
