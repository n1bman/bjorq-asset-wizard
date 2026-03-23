#!/usr/bin/with-contenv bashio
# ============================================
# Bjorq Asset Wizard â€” Home Assistant Entry Point
# ============================================
# Reads HA add-on options and maps them to environment variables.

set -e

# --- Ensure storage directories exist FIRST ---
# This runs before bashio config reads so directories always exist
# even if config parsing fails on first boot.
mkdir -p \
    /data/storage/uploads \
    /data/storage/jobs \
    /data/storage/originals \
    /data/storage/optimized \
    /data/storage/thumbs \
    /data/storage/logs \
    /data/catalog/furniture \
    /data/catalog/devices \
    /data/catalog/decor

# --- Read HA add-on options ---
export LOG_LEVEL=$(bashio::config 'log_level')
export MAX_FILE_SIZE_MB=$(bashio::config 'max_file_size_mb')
export THUMBNAIL_SIZE=$(bashio::config 'thumbnail_size')
export THUMBNAIL_QUALITY=$(bashio::config 'thumbnail_quality')
export DEFAULT_MAX_TEXTURE_SIZE=$(bashio::config 'max_texture_size')
export DEFAULT_TEXTURE_QUALITY=$(bashio::config 'texture_quality')
export JOB_RETENTION_HOURS=$(bashio::config 'job_retention_hours')

# --- Fixed paths for HA add-on environment ---
export NODE_ENV=production
export PORT=3500
export HOST=0.0.0.0
export STORAGE_PATH=/data/storage
export CATALOG_PATH=/data/catalog
export LOG_FILE=/data/storage/logs/wizard.log

# --- CORS: Allow HA ingress ---
export CORS_ORIGINS="*"

bashio::log.info "Starting Bjorq Asset Wizard..."
bashio::log.info "  Storage: ${STORAGE_PATH}"
bashio::log.info "  Catalog: ${CATALOG_PATH}"
bashio::log.info "  Port:    ${PORT}"
bashio::log.info "  Log:     ${LOG_LEVEL}"

# --- Start the service ---
exec node --max-old-space-size=1024 /app/dist/index.js

