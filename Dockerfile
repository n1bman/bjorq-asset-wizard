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

# Copy backend package files — use npm ci for deterministic installs
COPY server/package.json server/package-lock.json* ./
RUN npm ci || npm install

# Copy source and compile TypeScript
COPY server/tsconfig.json ./
COPY server/src/ ./src/
RUN npx tsc

# --- Stage 2: Production ---
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S bjorq && \
    adduser -S bjorq -u 1001 -G bjorq

# Copy built output from builder
COPY --from=builder /app/dist ./dist

# Install production deps only (sharp bundles its own libvips)
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

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
    LOG_LEVEL=info \
    CORS_ORIGINS=*

EXPOSE 3500

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3500/health || exit 1

CMD ["node", "dist/index.js"]
