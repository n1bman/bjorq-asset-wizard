ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.19
FROM ${BUILD_FROM}

# Install Node.js only — sharp bundles its own libvips
RUN apk add --no-cache nodejs npm git python3 py3-pip

WORKDIR /app

# --- Pre-create /data structure (safety net — run.sh also creates) ---
RUN mkdir -p \
    /data/storage/uploads \
    /data/storage/jobs \
    /data/storage/originals \
    /data/storage/optimized \
    /data/storage/thumbs \
    /data/storage/logs \
    /data/catalog

# --- Build frontend ---
# Copy frontend source (staged by prepare-addon.sh)
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && (npm ci || npm install)

COPY frontend/index.html frontend/vite.config.ts frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/tailwind.config.ts frontend/postcss.config.js frontend/components.json ./frontend/
COPY frontend/src/ ./frontend/src/
COPY frontend/public/ ./frontend/public/
RUN cd frontend && npx vite build --base="./"

# --- Build backend ---
# Install dependencies (staged by prepare-addon.sh)
COPY server/package.json server/package-lock.json* ./
RUN npm ci || npm install

# Build TypeScript → dist/
COPY server/tsconfig.json ./
COPY server/src/ ./src/
RUN npx tsc

# Move built frontend to public/ for static serving
RUN mv frontend/dist public

# Copy bundled starter catalog
COPY catalog-seed/ /app/catalog-seed/

# Copy HA entry point
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Runtime environment
ENV NODE_ENV=production \
    PORT=3500 \
    HOST=0.0.0.0 \
    CORS_ORIGINS=* \
    STORAGE_PATH=/data/storage \
    CATALOG_PATH=/data/catalog \
    BUNDLED_CATALOG_PATH=/app/catalog-seed

EXPOSE 3500

CMD ["/run.sh"]
