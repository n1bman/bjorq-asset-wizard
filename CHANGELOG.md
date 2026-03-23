# Changelog

## [2.7.0] — 2026-03-23

### Added
- **Installer companion UI** — Added a new Bjorq 3D Worker Manager with buttons for Start, Stop, Repair, Service control, Dashboard access, and live status/log viewing so the worker feels like a real Windows app instead of only loose scripts.
- **Interactive install window** — The Windows installer now opens a dedicated setup window that shows the real install steps and live logs while TRELLIS.2, Python, weights, and firewall setup are running.

### Changed
- **Primary Start Menu entry now opens the manager UI** — The installer now launches a proper management window after setup instead of throwing the user directly into the console worker.
- **SmartScreen expectation is explicit** — Unsigned builds still trigger Windows reputation warnings until an Authenticode certificate is configured in CI; the product now explains that more clearly instead of feeling broken.

## [2.6.1] â€” 2026-03-22

### Added
- **Optional Build Tools bootstrap in the Windows installer** â€” Bjorq3DWorkerSetup.exe now exposes an installer option that automatically downloads and installs Visual Studio Build Tools 2022 with the required C++ workload when cl.exe is missing.

### Changed
- **Smoother Windows prerequisite flow** â€” The setup guide and installer flow now explain that Python is still fully automatic, while the native TRELLIS.2 C++ toolchain can be bootstrapped from inside the installer instead of sending the user off to install everything manually first.

## [2.6.0] Ã¢â‚¬â€ 2026-03-22

### Changed
- **Version sync for HA + worker releases** Ã¢â‚¬â€ Bumped add-on, backend, worker, installer, docs, and release surfaces to `2.6.0` so Home Assistant and GitHub releases see a clearly new version instead of mixed `2.5.x` metadata.

### Fixed
- **TRELLIS.2 Windows integration** Ã¢â‚¬â€ Continued aligning the worker with the upstream TRELLIS.2 single-image pipeline and added stricter Windows prerequisite checks so installs fail earlier and more honestly when required CUDA build tooling is missing.

## [2.5.4] Ã¢â‚¬â€ 2026-03-22

### Fixed
- **TRELLIS.2 pipeline integration** Ã¢â‚¬â€ The worker now follows the upstream TRELLIS.2 API more closely: it loads `Trellis2ImageTo3DPipeline`, moves the pipeline to CUDA when available, calls `pipeline.run(image)[0]`, and exports GLB from mesh output instead of assuming a dict-shaped response.
- **Single-image UX alignment** Ã¢â‚¬â€ The Wizard UI and backend now enforce one input image per generation so the product matches TRELLIS.2's official minimal example instead of incorrectly advertising a 1Ã¢â‚¬â€œ4 image workflow.
- **Build-tools preflight** Ã¢â‚¬â€ The Windows installer now checks for Visual Studio Build Tools / `cl.exe` before attempting required CUDA extension builds, failing early with a clear action instead of allowing a successful-looking install that later crashes on missing `cumesh` / `flex_gemm`.

## [2.5.3] Ã¢â‚¬â€ 2026-03-22

### Changed
- **Worker lifecycle is now explicit** Ã¢â‚¬â€ The Windows installer no longer enables the background service by default. Users now start the visible console worker manually, and background auto-start is an explicit checkbox/shortcut instead of implicit behavior.
- **New stop/cleanup flow** Ã¢â‚¬â€ Added `stop-worker.ps1` and `cleanup.ps1` so users can stop the worker cleanly, remove the Windows service, free port 8080, remove the firewall rule, and let uninstall clean `C:\ProgramData\Bjorq3DWorker`.
- **Safer startup UX** Ã¢â‚¬â€ `start-worker.ps1` now refuses to launch if the background service is already running or if port 8080 is already occupied, preventing duplicate hidden worker processes.

## [2.5.2] Ã¢â‚¬â€ 2026-03-22

### Fixed
- **Windows installer: worker file copy** Ã¢â‚¬â€ `install.ps1` now copies `worker.py`, `jobs.py`, `trellis_bridge.py`, and `ui/` from the correct extracted path (`{app}\\worker\\...`) into `C:\\ProgramData\\Bjorq3DWorker\\worker`. This fixes installs where the worker started with `can't open file ...\\worker.py` because the ProgramData worker directory was empty.
- **TRELLIS pipeline import** Ã¢â‚¬â€ `trellis_bridge.py` now imports the pipeline class from `trellis2.pipelines.trellis2_image_to_3d` (since `trellis2.pipelines.__init__` does not reliably re-export it) and shows a clear error when required CUDA extension modules are missing.
- **Required CUDA extensions** Ã¢â‚¬â€ Installer now installs **o-voxel** (which builds/installs `cumesh` and `flex_gemm`) and fails fast with actionable guidance if build tools are missing, preventing opaque runtime import failures.
- **Disk space guidance** Ã¢â‚¬â€ Updated installer warning + Windows setup docs to reflect realistic disk usage (35 GB minimum, 50+ GB recommended).

## [2.5.1] Ã¢â‚¬â€ 2026-03-20

### Fixed
- **TRELLIS bridge imports** Ã¢â‚¬â€ Fixed `No module named 'trellis'` by updating `trellis_bridge.py` to import from `trellis2` (matching the actual TRELLIS.2 repo package name). Falls back through `trellis2.pipelines.Trellis2ImageTo3DPipeline` Ã¢â€ â€™ `TrellisImageTo3DPipeline` Ã¢â€ â€™ legacy `trellis.pipelines` with detailed error reporting on failure.
- **Installer stderr handling** Ã¢â‚¬â€ Replaced `$ErrorActionPreference = "Stop"` with a new `Invoke-Tool` helper that checks `$LASTEXITCODE` only. pip stderr warnings (deprecation notices, etc.) no longer abort the install with `NativeCommandError`.
- **64-bit PowerShell** Ã¢â‚¬â€ Inno Setup now launches `install.ps1` and Start Menu shortcuts via `{sysnative}\WindowsPowerShell\v1.0\powershell.exe`, preventing SysWOW64 path issues on 64-bit Windows.
- **nvidia-smi resolution** Ã¢â‚¬â€ `Find-NvidiaSmi` checks PATH, `System32`, and `C:\Program Files\NVIDIA Corporation\NVSMI\` for robust GPU detection.
- **Worker bridge error reporting** Ã¢â‚¬â€ `worker.py` now tracks `bridge_error` and exposes it in `/status.lastError` so the Wizard shows the real reason generation fails (e.g. missing TRELLIS module) instead of generic errors.

### Added
- **Windows Firewall rule** Ã¢â‚¬â€ `install.ps1` automatically creates an inbound TCP rule for the worker port (default 8080) so HA VMs can reach the worker without manual firewall configuration.
- **"Press any key" on exit** Ã¢â‚¬â€ `start-worker.ps1` and the `.bat` launcher keep the console window open on error so users can read the error message.
- **Root cause errors in UI** Ã¢â‚¬â€ `EngineStatus.tsx` now detects bridge/import errors vs connection errors and shows actionable guidance with a "Open worker UI" link for debugging.

### Changed
- Worker version bumped to 2.5.1 across all 7 locations.

## [2.5.0] Ã¢â‚¬â€ 2026-03-20

### Fixed
- **Windows installer: zero-manual-prereqs** Ã¢â‚¬â€ Replaced embeddable Python (which lacked `venv` module) with **micromamba** as the primary runtime strategy. The installer now downloads micromamba and creates a fully functional conda environment with Python 3.11 Ã¢â‚¬â€ no system Python installation needed. If micromamba fails, falls back to the full Python 3.11 installer with silent install.
- **Runtime path resolution** Ã¢â‚¬â€ All worker scripts (`start-worker.ps1`, `register-service.ps1`) now read `python-path.txt` to discover the correct Python executable, with fallback to `env\python.exe` (micromamba) then `venv\Scripts\python.exe` (full Python). Supports both installation strategies transparently.

### Changed
- **EngineStatus UI guided flow** Ã¢â‚¬â€ External worker setup now shows numbered steps (Install Ã¢â€ â€™ Configure URL Ã¢â€ â€™ Test Connection) with clearer visual hierarchy, VirtualBox networking examples inline, and auto-refresh polling every 10s when not connected. `lastError` is displayed prominently with amber styling for GPU/driver errors vs red for connection errors.
- **Documentation rewrite** Ã¢â‚¬â€ `docs/WORKER_SETUP_WINDOWS.md` restructured as a complete "zero to done" guide matching the actual flow: prerequisites Ã¢â€ â€™ download Ã¢â€ â€™ install Ã¢â€ â€™ verify Ã¢â€ â€™ configure Ã¢â€ â€™ test Ã¢â€ â€™ troubleshooting. Removed references to manual Python/venv setup in the one-click path.

## [2.4.2] Ã¢â‚¬â€ 2026-03-20

### Fixed
- **Windows installer PS 5.1 compatibility** Ã¢â‚¬â€ All external command invocations (`git`, `pip`, `python`) now use array splatting instead of bare `--flag` tokens, fixing parser errors on Windows PowerShell 5.1 ("Missing expression after unary operator '--'").
- **Prerequisite handling** Ã¢â‚¬â€ Installer resolves `git` via `Get-Command` and reports actionable errors with download links when git or NVIDIA drivers are missing. Failures write structured `status.json` + `install.log` instead of crashing.

### Added
- **Optional Authenticode code signing** Ã¢â‚¬â€ `worker-installer.yml` now signs `Bjorq3DWorkerSetup.exe` when `CODE_SIGN_PFX_BASE64` and `CODE_SIGN_PFX_PASSWORD` secrets are configured. Unsigned builds still succeed without signing secrets.

## [2.4.1] Ã¢â‚¬â€ 2026-03-20

### Fixed
- **Windows installer build** Ã¢â‚¬â€ Removed invalid `SetupIconFile` reference to `.svg` (Inno Setup requires `.ico`). The installer now builds without icon errors.

## [2.4.0] Ã¢â‚¬â€ 2026-03-20

### Added
- **External 3D Worker architecture** Ã¢â‚¬â€ Photo Ã¢â€ â€™ 3D generation can now be offloaded to a standalone "Bjorq 3D Worker" running on a Windows PC with NVIDIA GPU, solving all TRELLIS/CUDA/Rust dependency issues in the HA container.
- **New project: `trellis-worker/`** Ã¢â‚¬â€ Python/FastAPI inference server with async job API (`POST /jobs`, `GET /jobs/:id`, `GET /jobs/:id/result.glb`), GPU auto-detection, static status dashboard (`/ui`), and optional Bearer token auth.
- **Windows installer scripts** Ã¢â‚¬â€ `trellis-worker/windows/` with PowerShell installer (`install.ps1`), service registration (`register-service.ps1`), launcher, healthcheck, and Inno Setup `.iss` config for building `Bjorq3DWorkerSetup.exe` in CI.
- **Dual engine mode** Ã¢â‚¬â€ `TRELLIS_MODE` env var (`local` | `external`). External mode proxies all generation to the remote worker; local mode preserves existing in-container behavior.
- **Worker connection test** Ã¢â‚¬â€ `GET /trellis/test-connection` endpoint and "Test Connection" button in UI.
- **Add-on config options** Ã¢â‚¬â€ `trellis_mode`, `trellis_worker_url`, `trellis_worker_token` configurable in HA UI.
- **Setup documentation** Ã¢â‚¬â€ `docs/WORKER_SETUP_WINDOWS.md` with VirtualBox networking guide (Bridged/NAT/Host-only), firewall setup, and troubleshooting.

### Changed
- `EngineStatus.tsx` rewritten as dual-mode component: shows worker connection status in external mode, preserves local install UI in local mode.
- `manager.ts` refactored with external worker client (submit Ã¢â€ â€™ poll Ã¢â€ â€™ fetch GLB) alongside preserved local install pipeline.

## [2.3.9] Ã¢â‚¬â€ 2026-03-18

### Changed
- **TRELLIS installer matches official repo** Ã¢â‚¬â€ Clone now uses `--recursive` for submodules (o-voxel). Dependency installation mirrors official `setup.sh` structure: PyTorch with platform-appropriate index URL, basic deps in batches, 6 CUDA extensions (flash-attn, nvdiffrast, nvdiffrec, CuMesh, FlexGEMM, o-voxel) each built separately with graceful skip on failure. Pretrained weights downloaded via `huggingface-hub` from `microsoft/TRELLIS.2-4B`.
- **Environment capability detection** Ã¢â‚¬â€ New `detectEnvironmentCapabilities()` probes for `nvidia-smi` (GPU name + VRAM), `nvcc` (CUDA Toolkit version), and disk space. Results exposed in `/trellis/status` response as `environment` object.
- **Honest status reporting** Ã¢â‚¬â€ `TrellisStatusResponse` now includes `environment` (platform, GPU, CUDA, missing requirements), `extensions` (per-extension install status), and `weightsDownloaded`. UI shows clear warnings when requirements are not met and allows best-effort install with disclaimer.
- **EngineStatus UI** Ã¢â‚¬â€ Shows detected platform, GPU, CUDA info. Lists missing requirements with recommendation to use external GPU worker. After install, shows per-extension and weights status with expandable details.

## [2.3.8] Ã¢â‚¬â€ 2026-03-18

### Fixed
- **TRELLIS dependency install** Ã¢â‚¬â€ Replaced hardcoded `requirements.txt` assumption with auto-detected install strategy. TRELLIS.2 uses `setup.sh` with individual pip commands, not a requirements file. The installer now detects `setup.sh`, `requirements.txt`, or `pyproject.toml` and selects the correct method. Basic dependencies are installed in batches mirroring `setup.sh --basic`. GPU extensions (flash-attn) are attempted separately and gracefully skipped on CPU-only systems.

## [2.3.7] Ã¢â‚¬â€ 2026-03-18

### Fixed
- **TRELLIS spawn ENOENT fix** Ã¢â‚¬â€ Resolved `spawn git ENOENT` during engine install by resolving absolute binary paths (`/usr/bin/git`, `/usr/bin/python3`, `/usr/bin/pip3`) at startup and using them in all `child_process.spawn()` calls. Bare command names failed despite binaries being present due to PATH resolution issues in the HA container environment.

## [2.3.6] Ã¢â‚¬â€ 2026-03-18

### Fixed
- **Packaging: force fresh image build** Ã¢â‚¬â€ v2.3.5 GHCR image was built before Dockerfile included `git`/`python3`. Bumped to 2.3.6 to guarantee HA pulls a new image with all runtime dependencies.
- **Startup dependency check** Ã¢â‚¬â€ Server now logs availability of `git`, `python3`, and `pip3` at startup so missing runtime deps are immediately visible in logs.

## [2.3.5] Ã¢â‚¬â€ 2026-03-18

### Fixed
- **TRELLIS install directory conflict**: Separated runtime state (`status.json`) from the git clone target. New layout: `/data/trellis/repo/`, `/data/trellis/venv/`, `/data/trellis/workspace/`, `/data/trellis/status.json`
- **Idempotent installation**: Repeated install attempts now skip already-completed steps (valid repo, existing venv) instead of failing
- **Invalid repo recovery**: If `repo/` exists but is not a valid git checkout, it is cleaned up and re-cloned automatically
- **Docker deps** (v2.3.4): Added `git`, `python3`, `py3-pip` to Alpine image for engine installation

## [2.3.2] Ã¢â‚¬â€ 2026-03-18

### Fixed
- **Backend CI typecheck**: Removed unsupported `tolerance` option from `weld()` calls in LOD generator and style normalizer (breaking change in `@gltf-transform/functions`)
- **Dependency pinning**: `@gltf-transform` packages pinned to exact `4.1.0` to prevent future API drift
- Applied same fixes to add-on mirror (`bjorq_asset_wizard/server/`)

## [2.3.1] Ã¢â‚¬â€ 2026-03-18

### Changed Ã¢â‚¬â€ LOD Architecture Clarification
- **LOD responsibility boundary**: Clarified that the Wizard addon only prepares, stores, and exposes LOD-ready asset variants and metadata. Runtime LOD selection and switching is the responsibility of the Bjorq Dashboard runtime.
- **LOD transform consistency**: All LOD variants now explicitly preserve the same pivot, scale, floor alignment, and orientation as the primary model (LOD0). LODs are always generated from the scene-compatible buffer.
- **Structured LOD metadata**: LOD metadata now includes per-variant triangle count and file size for Dashboard consumption.
- **Graceful degradation**: Assets remain fully usable even if Dashboard ignores LOD metadata entirely.

### Infrastructure
- Version bump to 2.3.1 across all surfaces (server, add-on, docs)

## [2.3.0] Ã¢â‚¬â€ 2026-03-18

### Added
- **Style variants** Ã¢â‚¬â€ Three controlled style variants (Cozy, Soft Minimal, Warm Wood) that all remain within Bjorq identity bounds. Variant selector in the Style step UI.
- **Automatic asset categorization** Ã¢â‚¬â€ Best-effort classification into chair/table/sofa/lamp/storage/decor/other using bounding box heuristics. Stored as metadata, never blocks pipeline.
- **LOD generation** Ã¢â‚¬â€ Automatic Level-of-Detail variants (LOD0/LOD1/LOD2) for scene performance. Skips for very light models.
- **Asset versioning** Ã¢â‚¬â€ Retry creates a new version with tracked seed, confidence, and lineage metadata.
- **Style drift detection** Ã¢â‚¬â€ Internal drift scoring across roughness, saturation, brightness, materials, and geometry. Auto-corrects if deviation exceeds threshold.
- **Scene compatibility** Ã¢â‚¬â€ Auto-fixes pivot centering, floor alignment (Y=0), and scale sanity. Validates orientation and aspect ratios.
- **Background processing queue** Ã¢â‚¬â€ Configurable concurrency limits (`MAX_CONCURRENT_JOBS`) with queue position tracking and safe failure handling.
- **Pipeline analytics** Ã¢â‚¬â€ In-memory metrics: success rate, retry count, fallback frequency, average confidence, generation time, TRELLIS failures, drift corrections, category distribution.
- **Queue status API** Ã¢â‚¬â€ `GET /generate/queue` returns current queue state. `GET /generate/metrics` returns pipeline analytics.
- **Queue position in UI** Ã¢â‚¬â€ GenerateProgress shows queue position when jobs are waiting.
- **Category and LOD badges in Review** Ã¢â‚¬â€ Review step shows detected category, LOD count, and version number.

### Changed
- Style normalizer and quality gate now accept variant parameter for variant-specific processing
- Pipeline now runs 11 steps (added drift detection, scene compat, category, LOD, analytics)
- Mock data updated with category, LOD, and version metadata

## [2.2.0] Ã¢â‚¬â€ 2026-03-18

### Added
- **Photo Ã¢â€ â€™ 3D generation** Ã¢â‚¬â€ New "Photo Ã¢â€ â€™ 3D" page (`/generate`) with 4-step wizard: Upload photos Ã¢â€ â€™ Select style Ã¢â€ â€™ Generate Ã¢â€ â€™ Review result
- **TRELLIS engine management** Ã¢â‚¬â€ Inline engine status widget with one-click installation flow (`GET /trellis/status`, `POST /trellis/install`)
- **Generation API** Ã¢â‚¬â€ `POST /generate`, `GET /generate/jobs/:id`, `POST /generate/jobs/:id/retry` for async photo-to-3D job management
- **Style normalizer service** Ã¢â‚¬â€ Deterministic post-processing enforcing Bjorq Cozy visual identity (geometry simplification, material standardization, texture cleanup)
- **Quality gate** Ã¢â‚¬â€ Automatic validation against Dashboard Safe / Ultra Light / Standard performance limits with auto-reprocessing on failure
- **PhotoUploader component** Ã¢â‚¬â€ Multi-image drag & drop (1Ã¢â‚¬â€œ4 photos) with preview grid, reorder, and helper tips
- **StyleSelector component** Ã¢â‚¬â€ Style preset and target profile selection UI
- **GenerateProgress component** Ã¢â‚¬â€ Real-time job progress polling with step-based visualization
- **GenerateReview component** Ã¢â‚¬â€ Result preview with regenerate and save-to-library actions
- **Style profile lock** Ã¢â‚¬â€ Global `BJORQ_STYLE_PROFILE` as single source of truth for visual identity
- **Geometry simplicity scoring** Ã¢â‚¬â€ Re-simplify if geometry is too busy
- **Shape integrity protection** Ã¢â‚¬â€ Bounding box comparison to prevent aggressive simplification from destroying silhouette
- **Input quality heuristics** Ã¢â‚¬â€ Checks blur, contrast, resolution; warns user about potential quality issues
- **Confidence scoring** Ã¢â‚¬â€ Internal 0Ã¢â‚¬â€œ1 score computed from gate results, style consistency, and input quality
- **Seed-based variation** Ã¢â‚¬â€ Retry generates new variation via random seed, not identical output

### Infrastructure
- TRELLIS subprocess wrapper for CLI-based execution (no HTTP API assumed)
- Generation pipeline orchestrator: preprocess Ã¢â€ â€™ generate Ã¢â€ â€™ style normalize Ã¢â€ â€™ optimize Ã¢â€ â€™ validate Ã¢â€ â€™ export
- All backend changes mirrored to `bjorq_asset_wizard/` addon

## [2.1.0] Ã¢â‚¬â€ 2026-03-10

### Added
- **Dashboard-compatible API** Ã¢â‚¬â€ All catalog endpoints (`/catalog/index`, `/libraries/:lib/index`) now include a flat `assets` array with dashboard-friendly field aliases (`triangleCount`, `fileSize`, `thumbnailUrl`, `modelUrl`)
- **Library items alias** Ã¢â‚¬â€ `/libraries` response includes `items` array for broader client compatibility

### Changed
- Catalog index response is backwards-compatible: nested `categories` structure is preserved alongside the new flat `assets` array

## [2.0.9] Ã¢â‚¬â€ 2026-03-10

### Fixed
- Add missing `@react-three/fiber` and `@react-three/drei` dependencies (fixes frontend build)
- Remove duplicate `import sharp` in optimizer.ts (fixes server build)
- Fix `no-explicit-any` lint error in library index filter
- Add `bjorq_asset_wizard/` to frontend eslint ignores
- Add `syncStatus` field to `CatalogAssetMeta` type
- Remove deprecated `tolerance` option from `weld()` (v4 is lossless, fixes typecheck)
- Update CATALOG_VERSION constant to match release

## [2.0.8] Ã¢â‚¬â€ 2026-03-10

### Added
- **Catalog Export/Import** Ã¢â‚¬â€ Backup and restore entire catalog as `.tar.gz` archive; merge or overwrite strategy
- **Library index filtering** Ã¢â‚¬â€ Dashboard library API (`/libraries/:lib/index`) now returns only published assets
- **Onboarding Guide** Ã¢â‚¬â€ Comprehensive step-by-step guide at `docs/ONBOARDING.md`
- **Mesh simplification** Ã¢â‚¬â€ Balanced profile reduces triangles ~25%, Low Power ~50%, using meshoptimizer (weld + simplify)
- **Client-side 3D thumbnails** Ã¢â‚¬â€ Real model renders captured via Three.js instead of SVG info-cards
- **Download button** Ã¢â‚¬â€ Download optimized model directly from the Review step
- **Thumbnail upload on ingest** Ã¢â‚¬â€ Client-rendered thumbnails are uploaded alongside the model during catalog save

### Changed
- Updated optimization profiles with `simplifyRatio` and `simplifyError` parameters
- Ingest endpoint now accepts optional `thumbnail` file in multipart upload
- Updated add-on documentation (README.md, DOCS.md) to reflect v2.0.7 features and API endpoints

## [2.0.7] Ã¢â‚¬â€ 2026-03-10

### Fixed
- Add `init: false` to HA add-on config Ã¢â‚¬â€ fixes S6 Overlay V3 PID 1 conflict that prevented startup
- Fix `run.sh` shebang to `#!/usr/bin/with-contenv bashio` for proper S6 environment loading

## [2.0.6] Ã¢â‚¬â€ 2026-03-10

### Fixed
- Isolate Docker layer cache between HA and standalone workflows to prevent stale builds
- Removed GHA cache from `ha-addon.yml` entirely; added `scope=standalone` to `docker.yml`

## [2.0.5] Ã¢â‚¬â€ 2026-03-10

### Changed
- Version bump to 2.0.5 Ã¢â‚¬â€ forces HA to pull a clean, never-cached image tag.
- No functional changes from 2.0.3.

## [2.0.3] Ã¢â‚¬â€ 2026-03-10

### Fixed Ã¢â‚¬â€ HA Workflow Permission Error
- **`prepare-addon.sh` execute permission**: Added `chmod +x` before running the script in `ha-addon.yml`. Git checkout doesn't preserve the execute bit, causing exit code 126 on the CI runner.
- Version bump to 2.0.3 across all surfaces.

## [2.0.2] Ã¢â‚¬â€ 2026-03-10

### Fixed Ã¢â‚¬â€ HA Image Build Pipeline
- **HA add-on now builds from correct Dockerfile** Ã¢â‚¬â€ CI was pushing the standalone image (non-root user, no `run.sh`) instead of the HA-specific image (HA base, root user, bashio integration). Added dedicated `ha-addon.yml` workflow.
- Standalone image moved to separate GHCR tag (`bjorq-asset-wizard-standalone-amd64`) to prevent collision with the HA image tag.

## [2.0.1] Ã¢â‚¬â€ 2026-03-10

### Fix Ã¢â‚¬â€ HA Startup Permission + Legacy Path Cleanup
- **Pre-create `/data` directories** in HA Dockerfile so they exist at image layer (safety net)
- **Reorder `run.sh`** Ã¢â‚¬â€ `mkdir -p` now runs before `bashio::config` reads, preventing `set -e` abort on first boot
- **Eliminate legacy paths** Ã¢â‚¬â€ `docker-compose.yml`, `.env.example`, and `init-storage` all use `/data/storage` + `/data/catalog`
- **Version bump** to 2.0.1 across all surfaces

## [2.0.0] Ã¢â‚¬â€ 2026-03-10

### Major Release Ã¢â‚¬â€ Bjorq Asset Wizard v2

Marks the first stable production release with full end-to-end asset pipeline:

- **Persistent catalog storage** Ã¢â‚¬â€ assets survive HA add-on restarts (`/data/catalog`)
- **Thumbnail rendering** Ã¢â‚¬â€ catalog cards show real asset thumbnails
- **Dimensions pipeline** Ã¢â‚¬â€ dimensions persist through analyze Ã¢â€ â€™ optimize Ã¢â€ â€™ catalog Ã¢â€ â€™ UI
- **Optimization profiles** Ã¢â‚¬â€ High Quality / Balanced / Low Power presets
- **Large-file UX** Ã¢â‚¬â€ direct port link for bypassing HA ingress limits
- **Catalog diagnostics** Ã¢â‚¬â€ startup scan + /health catalog info
- **Startup reliability** Ã¢â‚¬â€ correct initialization order, permission handling

Includes all fixes from v1.0.0 through v1.1.11.
