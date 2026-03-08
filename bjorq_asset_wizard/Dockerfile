# ============================================
# Bjorq Asset Wizard — Home Assistant Add-on
# ============================================
# Build context: bjorq_asset_wizard/ (after prepare-addon.sh)
#
# The prepare-addon.sh script copies server/ into this directory
# so the HA add-on builder can access it.
#
# For local testing from repo root:
#   ./bjorq_asset_wizard/prepare-addon.sh
#   docker build -t bjorq-addon bjorq_asset_wizard/

ARG BUILD_FROM=node:20-alpine
FROM ${BUILD_FROM} AS builder

# Install Node.js + build dependencies for sharp
RUN apk add --no-cache nodejs npm python3 make g++ vips-dev

WORKDIR /app

# Copy server package files
COPY server/package.json server/package-lock.json* ./
RUN npm ci --ignore-scripts && npm rebuild sharp

COPY server/tsconfig.json ./
COPY server/src/ ./src/

RUN npm run build

# --- Production stage ---
FROM ${BUILD_FROM}

RUN apk add --no-cache nodejs npm vips bash

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create storage directories
RUN mkdir -p \
    /data/storage/uploads \
    /data/storage/jobs \
    /data/storage/originals \
    /data/storage/optimized \
    /data/storage/thumbs \
    /data/storage/logs \
    /data/catalog/furniture \
    /data/catalog/devices \
    /data/catalog/decor

# Copy run script
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Environment defaults
ENV NODE_ENV=production \
    PORT=3500 \
    HOST=0.0.0.0 \
    STORAGE_PATH=/data/storage \
    CATALOG_PATH=/data/catalog \
    LOG_LEVEL=info

EXPOSE 3500

CMD ["/run.sh"]
