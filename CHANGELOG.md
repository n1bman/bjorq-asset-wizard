# Changelog

## [0.3.3] — 2026-03-09

### Fixed
- **ESM compatibility**: Replaced CJS `__dirname` (unavailable in ES modules) with `fileURLToPath`/`dirname` shim. Fixes server crash on startup under `"type": "module"`.

### Changed
- Version bump to 0.3.3 across all version sources.
- Updated README/DOCS version references and release tag examples.

## [0.3.2] — 2026-03-09

### Fixed
- **Docker build**: Removed frontend source exclusions from `.dockerignore` that blocked the multi-stage Vite build (`"/public": not found`).

### Changed
- Version bump to 0.3.2 across all version sources.

## [0.3.0] — 2026-03-09

### Added
- **Frontend UI in Docker**: Both Dockerfiles now include a Vite build stage, compiling the React frontend and serving it via Fastify. The HA ingress panel now shows the full Wizard UI instead of raw JSON.
- **SPA routing**: Fastify serves `index.html` as fallback for all non-API routes, enabling React Router client-side navigation.
- **HA ingress support**: API client auto-detects `/api/hassio_ingress/<token>/` base path. React Router uses dynamic `basename` for correct subpath routing.
- **`prepare-addon.sh` stages frontend**: The script now copies both `server/` and frontend source into the add-on build context.

### Changed
- **Vite base path**: Set `base: "./"` for relative asset paths (required for HA ingress subpath).
- **Catalog version synced**: `CATALOG_VERSION` now matches wizard version (`0.3.0`) instead of independent `1.0.0`.
- **API client**: `detectBaseUrl()` replaces hardcoded `localhost:3500` — supports HA ingress, same-origin Docker, and localStorage override.
- Version bump to 0.3.0 across all version sources.

## [0.2.9] — 2026-03-09

### Fixed
- **Catalog path mismatch**: Static file serving for catalog assets now uses `CATALOG_PATH` instead of `STORAGE_PATH/catalog`. In Home Assistant, these are different directories (`/data/catalog` vs `/data/storage/catalog`), causing ingested assets to be invisible via the API.

### Added
- `STORAGE_PATH` and `CATALOG_PATH` environment defaults in HA Dockerfile as safety net if bashio fails.

### Changed
- Version bump to 0.2.9 across all version sources.

## [0.2.8] — 2026-03-09

### Fixed
- **CORS crash**: Fixed `Invalid CORS origin option` error that caused restart loops in Home Assistant. CORS now safely defaults to `origin: true` when `CORS_ORIGINS` is unset or `*`.
- **Root route**: Added `GET /` handler returning service status JSON, preventing 500 errors from HA ingress probes.
- **Version detection**: Hardcoded version constant instead of relying on `npm_package_version` (unavailable when running compiled `dist/index.js`).
- **Dockerfile ENV**: Added `CORS_ORIGINS=*` default to both Dockerfiles so CORS works without `run.sh`.

### Changed
- Version bump to 0.2.8 across `server/package.json`, `config.yaml`, and health endpoint.

## [0.2.7] — 2026-03-08

### Fixed
- Home Assistant version mismatch resolved (duplicate config in docs renamed).
- Add-on correctly detected as version 0.2.7.

## [0.2.5] — 2026-03-07

### Fixed
- Version synchronization across repository.
- Docker build stabilization (removed fragile sharp rebuild steps).
- CI restricted to amd64-only.
