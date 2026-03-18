# Changelog

## [2.3.1] — 2026-03-18

### Changed — LOD Architecture Clarification
- **LOD responsibility boundary**: Clarified that the Wizard addon only prepares, stores, and exposes LOD-ready asset variants and metadata. Runtime LOD selection and switching is the responsibility of the Bjorq Dashboard runtime.
- **LOD transform consistency**: All LOD variants now explicitly preserve the same pivot, scale, floor alignment, and orientation as the primary model (LOD0). LODs are always generated from the scene-compatible buffer.
- **Structured LOD metadata**: LOD metadata now includes per-variant triangle count and file size for Dashboard consumption.
- **Graceful degradation**: Assets remain fully usable even if Dashboard ignores LOD metadata entirely.

### Infrastructure
- Version bump to 2.3.1 across all surfaces (server, add-on, docs)

## [2.3.0] — 2026-03-18

### Added
- **Style variants** — Three controlled style variants (Cozy, Soft Minimal, Warm Wood) that all remain within Bjorq identity bounds. Variant selector in the Style step UI.
- **Automatic asset categorization** — Best-effort classification into chair/table/sofa/lamp/storage/decor/other using bounding box heuristics. Stored as metadata, never blocks pipeline.
- **LOD generation** — Automatic Level-of-Detail variants (LOD0/LOD1/LOD2) for scene performance. Skips for very light models.
- **Asset versioning** — Retry creates a new version with tracked seed, confidence, and lineage metadata.
- **Style drift detection** — Internal drift scoring across roughness, saturation, brightness, materials, and geometry. Auto-corrects if deviation exceeds threshold.
- **Scene compatibility** — Auto-fixes pivot centering, floor alignment (Y=0), and scale sanity. Validates orientation and aspect ratios.
- **Background processing queue** — Configurable concurrency limits (`MAX_CONCURRENT_JOBS`) with queue position tracking and safe failure handling.
- **Pipeline analytics** — In-memory metrics: success rate, retry count, fallback frequency, average confidence, generation time, TRELLIS failures, drift corrections, category distribution.
- **Queue status API** — `GET /generate/queue` returns current queue state. `GET /generate/metrics` returns pipeline analytics.
- **Queue position in UI** — GenerateProgress shows queue position when jobs are waiting.
- **Category and LOD badges in Review** — Review step shows detected category, LOD count, and version number.

### Changed
- Style normalizer and quality gate now accept variant parameter for variant-specific processing
- Pipeline now runs 11 steps (added drift detection, scene compat, category, LOD, analytics)
- Mock data updated with category, LOD, and version metadata

## [2.2.0] — 2026-03-18

### Added
- **Photo → 3D generation** — New "Photo → 3D" page (`/generate`) with 4-step wizard: Upload photos → Select style → Generate → Review result
- **TRELLIS engine management** — Inline engine status widget with one-click installation flow (`GET /trellis/status`, `POST /trellis/install`)
- **Generation API** — `POST /generate`, `GET /generate/jobs/:id`, `POST /generate/jobs/:id/retry` for async photo-to-3D job management
- **Style normalizer service** — Deterministic post-processing enforcing Bjorq Cozy visual identity (geometry simplification, material standardization, texture cleanup)
- **Quality gate** — Automatic validation against Dashboard Safe / Ultra Light / Standard performance limits with auto-reprocessing on failure
- **PhotoUploader component** — Multi-image drag & drop (1–4 photos) with preview grid, reorder, and helper tips
- **StyleSelector component** — Style preset and target profile selection UI
- **GenerateProgress component** — Real-time job progress polling with step-based visualization
- **GenerateReview component** — Result preview with regenerate and save-to-library actions
- **Style profile lock** — Global `BJORQ_STYLE_PROFILE` as single source of truth for visual identity
- **Geometry simplicity scoring** — Re-simplify if geometry is too busy
- **Shape integrity protection** — Bounding box comparison to prevent aggressive simplification from destroying silhouette
- **Input quality heuristics** — Checks blur, contrast, resolution; warns user about potential quality issues
- **Confidence scoring** — Internal 0–1 score computed from gate results, style consistency, and input quality
- **Seed-based variation** — Retry generates new variation via random seed, not identical output

### Infrastructure
- TRELLIS subprocess wrapper for CLI-based execution (no HTTP API assumed)
- Generation pipeline orchestrator: preprocess → generate → style normalize → optimize → validate → export
- All backend changes mirrored to `bjorq_asset_wizard/` addon

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
- **`prepare-addon.sh` execute permission**: Added `chmod +x` before running the script in `ha-addon.yml`. Git checkout doesn't preserve the execute bit, causing exit code 126 on the CI runner.
- Version bump to 2.0.3 across all surfaces.

## [2.0.2] — 2026-03-10

### Fixed — HA Image Build Pipeline
- **HA add-on now builds from correct Dockerfile** — CI was pushing the standalone image (non-root user, no `run.sh`) instead of the HA-specific image (HA base, root user, bashio integration). Added dedicated `ha-addon.yml` workflow.
- Standalone image moved to separate GHCR tag (`bjorq-asset-wizard-standalone-amd64`) to prevent collision with the HA image tag.

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
