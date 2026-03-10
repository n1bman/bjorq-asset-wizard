# Changelog

## [2.1.0] — 2026-03-10

### Added
- **Dashboard-compatible API** — All catalog endpoints (`/catalog/index`, `/libraries/:lib/index`) now include a flat `assets` array with dashboard-friendly field aliases (`triangleCount`, `fileSize`, `thumbnailUrl`, `modelUrl`)
- **Library items alias** — `/libraries` response includes `items` array for broader client compatibility

### Changed
- Catalog index response is backwards-compatible: nested `categories` structure is preserved alongside the new flat `assets` array

## [2.0.9] — 2026-03-10

### Fixed
- Add missing `@react-three/fiber` and `@react-three/drei` dependencies (fixes frontend build)
- Remove duplicate `import sharp` in optimizer.ts (fixes server build)
- Fix `no-explicit-any` lint error in library index filter
- Add `bjorq_asset_wizard/` to frontend eslint ignores
- Add `syncStatus` field to `CatalogAssetMeta` type
- Remove deprecated `tolerance` option from `weld()` (v4 is lossless, fixes typecheck)
- Update CATALOG_VERSION constant to match release

## [2.0.8] — 2026-03-10

### Added
- **Catalog Export/Import** — Backup and restore entire catalog as `.tar.gz` archive; merge or overwrite strategy
- **Library index filtering** — Dashboard library API (`/libraries/:lib/index`) now returns only published assets
- **Onboarding Guide** — Comprehensive step-by-step guide at `docs/ONBOARDING.md`
- **Mesh simplification** — Balanced profile reduces triangles ~25%, Low Power ~50%, using meshoptimizer (weld + simplify)
- **Client-side 3D thumbnails** — Real model renders captured via Three.js instead of SVG info-cards
- **Download button** — Download optimized model directly from the Review step
- **Thumbnail upload on ingest** — Client-rendered thumbnails are uploaded alongside the model during catalog save

### Changed
- Updated optimization profiles with `simplifyRatio` and `simplifyError` parameters
- Ingest endpoint now accepts optional `thumbnail` file in multipart upload
- Updated add-on documentation (README.md, DOCS.md) to reflect v2.0.7 features and API endpoints



## [2.0.7] — 2026-03-10

### Fixed
- Add `init: false` to HA add-on config — fixes S6 Overlay V3 PID 1 conflict that prevented startup
- Fix `run.sh` shebang to `#!/usr/bin/with-contenv bashio` for proper S6 environment loading

## [2.0.6] — 2026-03-10

### Fixed
- Isolate Docker layer cache between HA and standalone workflows to prevent stale builds
- Removed GHA cache from `ha-addon.yml` entirely; added `scope=standalone` to `docker.yml`

## [2.0.5] — 2026-03-10

### Changed
- Version bump to 2.0.5 — forces HA to pull a clean, never-cached image tag.
- No functional changes from 2.0.3.

## [2.0.3] — 2026-03-10

### Fixed — HA Workflow Permission Error

- **`prepare-addon.sh` execute permission**: Added `chmod +x` before running the
  script in `ha-addon.yml`. Git checkout doesn't preserve the execute bit, causing
  exit code 126 on the CI runner.
- Version bump to 2.0.3 across all surfaces.

## [2.0.2] — 2026-03-10

### Fixed — HA Image Build Pipeline

- **HA add-on now builds from correct Dockerfile** — CI was pushing the standalone
  image (non-root user, no `run.sh`) instead of the HA-specific image (HA base, root
  user, bashio integration). Added dedicated `ha-addon.yml` workflow.
- Standalone image moved to separate GHCR tag (`bjorq-asset-wizard-standalone-amd64`)
  to prevent collision with the HA image tag.

## [2.0.1] — 2026-03-10

### Fix — HA Startup Permission + Legacy Path Cleanup

- **Pre-create `/data` directories** in HA Dockerfile so they exist at image layer (safety net)
- **Reorder `run.sh`** — `mkdir -p` now runs before `bashio::config` reads, preventing `set -e` abort on first boot
- **Eliminate legacy paths** — `docker-compose.yml`, `.env.example`, and `init-storage` all use `/data/storage` + `/data/catalog`
- **Version bump** to 2.0.1 across all surfaces

## [2.0.0] — 2026-03-10

### Major Release — Bjorq Asset Wizard v2

Marks the first stable production release with full end-to-end asset pipeline:

- **Persistent catalog storage** — assets survive HA add-on restarts (`/data/catalog`)
- **Thumbnail rendering** — catalog cards show real asset thumbnails
- **Dimensions pipeline** — dimensions persist through analyze → optimize → catalog → UI
- **Optimization profiles** — High Quality / Balanced / Low Power presets
- **Large-file UX** — direct port link for bypassing HA ingress limits
- **Catalog diagnostics** — startup scan + /health catalog info
- **Startup reliability** — correct initialization order, permission handling

Includes all fixes from v1.0.0 through v1.1.11.

## [1.1.11] — 2026-03-09

### Fixed — Persistence, Thumbnails, Dimensions, Optimization Profiles
- **Catalog persistence fix**: Changed all fallback storage defaults from relative paths (`./storage`, `./public/catalog`) to persistent HA paths (`/data/storage`, `/data/catalog`). This ensures catalog assets survive add-on restarts even if environment variables are not set. Affected files: `storage.ts`, `index.ts`, `health.ts` (both server/ and bjorq_asset_wizard/).
- **Thumbnail display**: `AssetCard` and `AssetDetailDrawer` now render actual `<img>` thumbnails from the catalog API (`/catalog/files/...`) instead of always showing a placeholder icon. Includes error fallback.
- **Dimensions pipeline fix**: Catalog ingest now reads dimensions from `scene.dimensions` (populated by the optimize route) instead of `after.dimensions` (which is a StatsSnapshot with no dimensions field). Dimensions now persist through the full pipeline: Analyze → Optimize → Save to Catalog → UI.
- **Optimization profiles**: Added High Quality / Balanced / Low Power profile selector in the optimize UI. Server applies profile presets (texture size, cleanup aggressiveness) with explicit user options overriding profile defaults.

### Changed
- Version bump to 1.1.11 across all surfaces.
- CATALOG_VERSION bumped to 1.1.11.

## [1.1.10] — 2026-03-09

### Added — Persistence Diagnostics + Large-file UX
- **Catalog startup diagnostics**: Server logs `CATALOG_PATH`, lists directory contents, and counts assets on every boot. Enables definitive persistence testing.
- **Catalog info in `/health`**: Health endpoint now returns `catalog.path`, `catalog.exists`, and `catalog.assetCount` for remote verification without SSH.
- **Direct mode link**: Upload & Optimize pages show a clickable "Open Wizard in direct mode (Port 3500)" link for large files. Sidebar shows the link when running inside HA ingress.
- **Persistence indicators**: Catalog page header shows "Permanently stored" badge. Published assets show a "Persistent" badge on cards.

### Changed
- Version bump to 1.1.10 across all surfaces.

## [1.1.9] — 2026-03-09

### Fixed — Final Runtime Fixes
- **Large model 413 error**: Exposed port 3500 by default in HA config to bypass ingress proxy size limits. Added `--max-old-space-size=1024` to Node process. Frontend detects 413 errors and suggests direct port access. Files >10 MB show a warning banner.
- **Thumbnail generation**: New `thumbnail.ts` generates a branded info-card image (name, triangles, materials, file size) using `sharp` during optimization. `thumb.webp` is created automatically for every optimized asset and carried through to the catalog.
- **Dashboard asset flow**: Bumped catalog VERSION to 1.1.9. Simplified `WizardSettingsCard` to show only the direct port method (removed confusing Method B).
- **Storage persistence clarity**: Updated `StorageStatusCard` with explicit lifecycle documentation (jobs = temporary 24h, catalog = permanent). Added "save to keep" warning in optimization results.

### Changed
- Version bump to 1.1.9 across all surfaces.

## [1.1.8] — 2026-03-09

### Fixed — Runtime Stabilization
- **HTML response detection**: `api-client.ts` now checks `Content-Type` header before parsing JSON in both `fetch` and `XHR` paths. Non-JSON responses (HTML error pages from HA ingress proxy) produce descriptive errors instead of generic "Request failed".
- **Wizard Integration page crash**: Added optional chaining and fallback values for `dimensions` and `performance` in `WizardAssetCard` and `WizardAssetDetail`. Made both fields optional in `AssetMetadata` type to match real catalog data.
- **Dashboard connection guidance**: Replaced generic "copy this URL" with two documented methods: direct port exposure (recommended) and HA Supervisor proxy with Long-Lived Access Token. Clarified that ingress URLs are internal-only.

### Changed
- **Storage persistence note**: Added clarification that `/data` is persistent HA add-on storage surviving restarts and upgrades.
- Version bump to 1.1.8 across all surfaces.

## [1.1.7] — 2026-03-09

### Fixed — Stabilization Patch
- **Analyze/optimize error propagation**: Removed `withFallback()` wrapper from `analyzeModel()` and `optimizeModel()`. Errors (timeouts, OOM, parse failures) now always propagate to the UI instead of silently falling back to mock data.
- **Export/download button**: Replaced `window.open()` with programmatic blob download via fetch + anchor element. Works inside HA ingress where `window.open("_blank")` is blocked or loses session.
- **Wizard Integration page**: Added error state handling to `WizardCatalogBrowser` and wrapped page in `PreviewErrorBoundary` to prevent black screen on failures.

### Added
- **Delete asset**: `DELETE /catalog/asset/:id` endpoint removes asset directory recursively and triggers reindex. Frontend adds delete button with `AlertDialog` confirmation in both drawer and detail page.
- **Dashboard sync URL guidance**: `WizardSettingsCard` now shows the API base URL with copy button and lists available Dashboard-facing endpoints (`/libraries`, `/assets/:id/meta`, etc.).

### Changed
- **System status labels**: "Connection" → "Wizard Backend" with clarifying note about Dashboard sync. "Total Assets" → "Published Assets". "Version" → "Catalog Schema". "Health" → "Wizard Health".
- **CATALOG_VERSION** bumped to match app version (1.1.7).
- Version bump to 1.1.7 across all version sources.

## [1.1.6] — 2026-03-09

### Fixed — Systems Repair & Architecture Hardening
- **Removed WizardClient**: Deleted `wizard-client.ts`, `WizardContext.tsx`, and `wizard-mock-data.ts`. Eliminated hardcoded `localhost:3500` polling. All API communication unified on the ingress-safe `apiClient`.
- **Wired asset action buttons**: Optimize, Ingest, Export, and Sync buttons in `AssetDetailDrawer` and `AssetDetail` now have real click handlers. Export downloads the GLB via the model endpoint. Optimize/Ingest show status toasts for already-processed assets.
- **Implemented POST /sync**: Replaced 501 stub. Accepts `{ assetIds }`, verifies each asset exists in catalog, updates `meta.json` with `syncStatus: "synced"`, `lastSyncedAt`, and `lifecycleStatus: "published"`.
- **Asset lifecycle status**: Added `AssetLifecycleStatus` type (`uploaded | analyzed | optimized | published`). Assets are set to `published` on catalog ingest. UI displays lifecycle badge.

### Added — Dashboard-Facing Library API
- `GET /libraries` — returns list of available libraries (currently `default` only)
- `GET /libraries/:library/index` — returns catalog index for a specific library
- `GET /assets/:id/meta` — returns asset metadata JSON
- `GET /assets/:id/model` — alias for `/catalog/asset/:id/model`
- `GET /assets/:id/thumbnail` — alias for `/catalog/asset/:id/thumbnail`
- `GET /catalog/asset/:id/export` — download model GLB with `Content-Disposition: attachment`

### Changed
- README rewritten with architecture documentation, asset lifecycle, Dashboard consumption model, storage layout, and known limitations.
- `WizardProvider` removed from App.tsx — no more duplicate context providers.
- Server notFoundHandler updated to return 404 JSON for `/libraries` and `/assets/` prefixes.


## [1.1.4] — 2026-03-09

### Fixed — Viewer Hardening & Final UX Polish
- **Preview error isolation**: Added `PreviewErrorBoundary` (React ErrorBoundary) wrapping all preview/drawer content. Viewer errors can no longer crash the page.
- **Asset preview panel**: New `AssetPreviewPanel` component with thumbnail rendering, fallback placeholder, and hover-to-reveal path diagnostics (model path, thumbnail path).
- **Catalog asset click stability**: Clicking catalog assets no longer causes blank/brown states. Drawer uses `key={asset.id}` for clean re-renders.
- **Defensive rendering**: All `performance` and `dimensions` access uses optional chaining across drawer, detail page, and asset cards.
- **Path diagnostics**: Asset detail drawer and full page now display model/thumbnail paths and bounding box data when available.
- **Placeholder consistency**: Missing thumbnails show clean "Preview unavailable" state; failed thumbnail loads show "Thumbnail failed to load".

### Changed
- Version bump to 1.1.4 across all version sources.


## [1.1.3] — 2026-03-09

### Fixed — Consolidated Bugfix Pass
- **Analyze error propagation**: Backend now returns specific error messages (e.g., "Analyze failed at GLB parse: ...") instead of generic "Analysis failed unexpectedly". Stack traces logged for all failures.
- **Health/version log noise**: Suppressed info-level request logging for `/health` and `/version` polling endpoints to reduce log clutter in production.
- **Integration page false "unreachable"**: Switched Integration page from separate `WizardClient` to main `useConnection` context, ensuring consistent connection state across all screens.
- **Catalog asset drawer crash**: Added defensive rendering for missing `performance` and `dimensions` data, preventing blank/broken states when metadata is incomplete.
- **Frontend consistency**: All screens now use the same connection model — no more conflicting connected/disconnected states.

### Changed
- Version bump to 1.1.3 across all version sources.


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
