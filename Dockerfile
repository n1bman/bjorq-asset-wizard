# ============================================
# Bjorq Asset Wizard — Production Dockerfile
# ============================================
# Multi-stage build for the backend service.
# Frontend is built separately (Vite static site).
#
# Build:  docker build -t bjorq-asset-wizard .
# Run:    docker run -p 3500:3500 -v wizard-data:/app/storage bjorq-asset-wizard

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for sharp (native module)
RUN apk add --no-cache python3 make g++ vips-dev

# Copy backend package files
COPY server/package.json ./
RUN npm install

COPY server/tsconfig.json ./
COPY server/src/ ./src/

RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine AS production

WORKDIR /app

# Runtime dependency for sharp
RUN apk add --no-cache vips

# Create non-root user
RUN addgroup -g 1001 -S bjorq && \
    adduser -S bjorq -u 1001 -G bjorq

# Copy built output and production deps
COPY server/package.json ./
RUN npm install --omit=dev --ignore-scripts

# Copy sharp native bindings from builder
COPY --from=builder /app/node_modules/sharp /app/node_modules/sharp

COPY --from=builder /app/dist ./dist

# Create storage directories
RUN mkdir -p \
    storage/uploads \
    storage/jobs \
    storage/originals \
    storage/optimized \
    storage/thumbs \
    storage/logs \
    storage/catalog \
    public/catalog/furniture \
    public/catalog/devices \
    public/catalog/decor && \
    chown -R bjorq:bjorq /app

USER bjorq

# Environment defaults
ENV NODE_ENV=production \
    PORT=3500 \
    HOST=0.0.0.0 \
    STORAGE_PATH=./storage \
    CATALOG_PATH=./public/catalog \
    LOG_LEVEL=info

EXPOSE 3500

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3500/health || exit 1

CMD ["node", "dist/index.js"]
