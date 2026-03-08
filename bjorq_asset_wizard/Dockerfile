# ============================================
# Bjorq Asset Wizard — Home Assistant Add-on
# ============================================
# This Dockerfile is used by the HA add-on builder.
# Build context = this directory (bjorq_asset_wizard/).
#
# For local testing from repo root:
#   docker build -f bjorq_asset_wizard/Dockerfile -t bjorq-addon .
#
# For HA add-on builder (hassio-builder):
#   The builder uses this directory as context, so server/
#   source is fetched via a pre-build copy step.
#   See README.md for the prepare-addon workflow.

ARG BUILD_FROM
FROM ${BUILD_FROM:-node:20-alpine} AS base

# Install Node.js (HA base images don't include it)
RUN apk add --no-cache nodejs npm

# Install build dependencies for sharp (native module)
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /app

# --- Build stage ---
# Copy server source (placed here by prepare-addon.sh or CI)
COPY server/package.json server/package-lock.json* ./
RUN npm ci --ignore-scripts && npm rebuild sharp

COPY server/tsconfig.json ./
COPY server/src/ ./src/

RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# Remove build tools to shrink image
RUN apk del python3 make g++

# Runtime dependency for sharp
RUN apk add --no-cache vips

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
COPY bjorq_asset_wizard/run.sh /run.sh
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
