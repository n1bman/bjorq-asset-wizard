# Changelog

## [1.1.2] — 2026-03-09

### Fixed — Bugfix: Analyze Pipeline & Catalog Metadata
- **glTF extension support**: Registered `ALL_EXTENSIONS` from `@gltf-transform/extensions` with `NodeIO` in both analyzer and optimizer. Real-world models using Draco compression, KHR_materials_unlit, KHR_texture_transform, etc. now parse correctly.
- **Stage-level error diagnostics**: Analyze pipeline now reports specific failure stages (GLB parse, geometry scan, texture extraction, bounding box computation) instead of generic "Request failed".
- **API client error parsing**: Frontend now correctly extracts error messages from both `{ error: "string" }` and `{ error: { message: "string" } }` response shapes.
- **Thumbnail null handling**: Optimize response now returns `thumbnail: null` instead of `""` when no thumbnail is generated. Prevents empty-string issues in catalog metadata.
- **TypeScript types**: Updated `OptimizeResponse.outputs.thumbnail` and `metadata.thumbnail` to `string | null`.

### Changed
- Version bump to 1.1.2 across all version sources.

## [1.1.1] — 2026-03-09

### Fixed — Phase 9: Optimization V2 Validation
- **Garbled optimizer code**: Fixed corrupted import (`textureCompressssss`), garbled `textureCompress` call, and broken filter expression in `optimizer.ts` that caused TypeScript build failures in CI.
- **Sharp encoder integration**: `textureCompress` now receives `sharp` as explicit encoder for reliable texture resizing.
- **Null-safe texture checks**: Added `?? 0` guards on `t.width` and `t.height` in texture filter to prevent TS18047 errors.

### Added
- **V2 Operations Summary card**: Review UI now shows per-operation status for Normalize Scale, Floor Alignment, and Texture Optimization — including applied/skipped state, skip reasons, warnings, and texture resolution before/after.

### Changed
- Version bump to 1.1.1 across all version sources.

## [1.1.0] — 2026-03-09

### Added — Phase 8: Optimization V2 (Advanced Asset Normalization)
- **Normalize scale**: Uses `flatten()` from gltf-transform to bake all node transforms into vertex data. After flattening, all nodes have identity transforms (scale 1,1,1) while preserving world dimensions. Ensures consistent behavior in Three.js and physics systems.
- **Set floor to Y=0**: Computes the lowest vertex Y across all POSITION accessors and shifts the model vertically so the floor sits at Y=0. Updates pivot metadata to `"bottom-center"` accordingly.
- **Optimize base color textures**: Uses `textureResize()` from gltf-transform to downsample oversized base color textures. Respects configurable `maxTextureSize` (default 2048). Reports `texturesResized` count in reduction stats.
- **V2 optimization flags in metadata**: `normalizationApplied`, `floorAlignmentApplied`, `textureOptimizationApplied` booleans now appear in optimize response metadata, `result.json`, and catalog `meta.json`.
- **Active UI controls**: The three V2 options are now fully interactive in the optimization panel (no longer "Coming in V2"). Max texture size is configurable via a dropdown when texture optimization is enabled.

### Changed
- Optimizer V1_SKIPPED list reduced — `normalizeScale`, `setFloorToY0`, `optimizeBaseColorTextures`, `maxTextureSize` are now implemented.
- Review section "Skipped (V2)" label changed to just "Skipped".
- Version bump to 1.1.0 across all version sources.
- `CATALOG_CONTRACT.md` updated with new optional V2 optimization flags (non-breaking under schemaVersion 1.0).

## [1.0.0] — 2026-03-09

### Added — Phase 7: Precompute Scene Metadata & Wizard 1.0
- **Scene metadata in catalog**: `boundingBox`, `center`, `pivot`, and `estimatedScale` are now computed during optimization and persisted into `meta.json` during ingest. External consumers no longer need to reprocess the GLB.
- **Scene data in optimize response**: `OptimizeResponse.metadata` now includes `boundingBox`, `center`, and `estimatedScale` for immediate frontend use.
- **Scene data in result.json**: The optimize route writes a `scene` block to `result.json` containing `boundingBox`, `dimensions`, `placement`, and `estimatedScale` for ingest consumption.
- **Pivot derivation**: Automatically computed from bounding box — `"bottom-center"` if model sits on Y=0, otherwise `"center"`.

### Changed
- Version bump to 1.0.0 — stable Wizard release.
- `CATALOG_CONTRACT.md` updated with new optional scene metadata fields (non-breaking under schemaVersion 1.0).

## [0.6.0] — 2026-03-09

### Added — Phase 6: Pipeline Validation and Diagnostics
- **Defensive catalog validation**: `validateAssetMeta()` checks required fields (`id`, `name`, `category`, `schemaVersion`, `model`, `placement`) before including assets in the catalog index. Invalid assets are silently skipped.
- **Sorted catalog output**: Categories, subcategories, and assets are now sorted alphabetically for consistent ordering across rebuilds.
- **Optimization explanations**: New `explanations: string[]` field in optimize response provides human-readable reasons when optimization achieves low/zero reduction (e.g., "No duplicate materials detected", "Model was already well-optimized").
- **`GET /catalog/diagnostics`**: New endpoint returning catalog health metrics — `catalogSizeMB`, `assetCount`, `largestAssetMB`, `largestAssetId`, `schemaVersion`, and storage usage details.
- **Analyze robustness**: Added 100 MB safety limit check before analysis, OOM error detection with clear error messages, and improved buffer size logging.
- **Enhanced cleanup logging**: Job cleanup now logs per-job removal details (job ID, age, reason, freed size) and always logs scan summaries.
- **`diagnostics` capability**: `/version` endpoint now includes `"diagnostics"` in capabilities array.

### Changed
- Version bump to 0.6.0 across all version sources.

## [0.5.0] — 2026-03-09

### Added — Phase 5: Wizard Integration Readiness
- **Frozen catalog schema v1**: All `meta.json` files now include `schemaVersion: "1.0"`. Breaking changes require a version bump.
- **`schemaVersion` in catalog index**: `/catalog/index` response includes `schemaVersion: "1.0"` for consumer compatibility detection.
- **Thumbnail support**: Ingest copies `thumb.webp` from job output when available. Missing thumbnails are `null` (not empty string).
- **`GET /catalog/asset/:id/thumbnail`**: New route to serve asset thumbnails directly, returning `image/webp` or 404.
- **Enhanced `/version` endpoint**: Now includes `catalogSchemaVersion` and `capabilities` array for external consumer feature detection.
- **Phase 4 metadata in catalog**: `originalFileSizeKB`, `reductionPercent`, and `targetProfile` are now written to `meta.json` during ingest.
- **Integration contract documentation**: `docs/bjorq-asset-wizard-infra/CATALOG_CONTRACT.md` — frozen v1 contract covering folder structure, schemas, API responses, target profiles, and versioning policy.

### Changed
- `CatalogAssetMeta.thumbnail` type changed from `string` to `string | null` — consumers should handle `null`.
- Version bump to 0.5.0 across all version sources.

## [0.4.1] — 2026-03-09

### Fixed
- Added missing `stage` property to `OptimizeErrorResponse` and `AnalysisErrorResponse` TypeScript types, fixing Docker build failure (TS2353).

## [0.4.0] — 2026-03-09

### Added
- **Large file support**: Upload limit raised to 100 MB with explicit frontend validation and backend enforcement. Fixes 16.4 MB upload failure caused by 8-second frontend timeout.
- **Upload progress tracking**: Real-time progress bar during file upload using XMLHttpRequest, replacing blind `fetch` calls.
- **Processing state UI**: Distinct uploading → processing → complete → error states with stage-specific error messages (upload/parse/analyze/optimize/ingest).
- **File size validation**: Client-side size check with warning for files > 50 MB and rejection for files > 100 MB.
- **Catalog storage policy**: Soft limit (2 GB) and hard limit (5 GB) with `GET /catalog/policy` endpoint. Individual asset warning at 25 MB.
- **Target profiles**: Assets are classified as mobile/tablet/wall/desktop/heavy based on triangle count and file size.
- **Richer metadata**: `originalFileSizeKB`, `reductionPercent`, and `targetProfile` added to optimize response and asset metadata.
- **Job cleanup service**: Automatic cleanup of stale jobs (>7 days) and failed jobs (>1 day) from `/data/storage/jobs`. Runs on startup and every 6 hours.
- **Stage-aware error responses**: All backend routes include `stage` field in error responses for precise failure identification.

### Changed
- Frontend request timeout increased from 8s to 120s (general) and 300s (upload routes).
- Fastify `requestTimeout` set to 300s and `bodyLimit` to 100 MB for large file support.
- FileUploader component rebuilt with progress bar, size validation, warnings, error states, and reset capability.
- Optimize page shows upload progress, processing spinner, catalog size warnings, and target profile badges.
- Version bump to 0.4.0 across all version sources.

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
