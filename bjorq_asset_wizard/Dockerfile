# ============================================
# Bjorq Asset Wizard — Home Assistant Add-on
# ============================================
ARG BUILD_FROM=node:20-alpine
FROM node:20-alpine AS builder

RUN apk add --no-cache git python3 make g++ vips-dev

WORKDIR /src
RUN git clone --depth 1 https://github.com/n1bman/bjorq-asset-wizard.git .

WORKDIR /src/server
RUN npm ci --ignore-scripts && npm rebuild sharp
RUN npm run build

# --- Production stage ---
FROM ${BUILD_FROM}

# vips for sharp, bash/curl/jq for bashio — NO nodejs/npm (already in base)
RUN apk add --no-cache vips bash curl jq

# Install bashio
RUN curl -sL https://github.com/hassio-addons/bashio/archive/refs/tags/v0.16.2.tar.gz | tar xz \
    && mv bashio-0.16.2/lib /usr/lib/bashio \
    && ln -s /usr/lib/bashio/bashio /usr/bin/bashio \
    && rm -rf bashio-0.16.2

WORKDIR /app

COPY --from=builder /src/server/package.json ./
COPY --from=builder /src/server/node_modules ./node_modules
COPY --from=builder /src/server/dist ./dist

RUN mkdir -p /data/storage/uploads /data/storage/jobs /data/storage/originals \
    /data/storage/optimized /data/storage/thumbs /data/storage/logs \
    /data/catalog/furniture /data/catalog/devices /data/catalog/decor

COPY run.sh /run.sh
RUN chmod +x /run.sh

ENV NODE_ENV=production PORT=3500 HOST=0.0.0.0 \
    STORAGE_PATH=/data/storage CATALOG_PATH=/data/catalog LOG_LEVEL=info

EXPOSE 3500
CMD ["/run.sh"]
