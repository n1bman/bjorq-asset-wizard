# Changelog

## [2.7.1] — 2026-03-23

### Fixed
- **Build Tools auto-install verification** — The worker installer now treats the Visual Studio bootstrapper as successful when cl.exe is present after installation, even if the bootstrapper returns a warning or non-zero exit code. This fixes false failure screens where Build Tools were actually installed correctly.

## [2.7.0] â€” 2026-03-23

### Added
- **Installer companion UI** â€” Added a new Bjorq 3D Worker Manager with buttons for Start, Stop, Repair, Service control, Dashboard access, and live status/log viewing so the worker feels like a real Windows app instead of only loose scripts.
- **Interactive install window** â€” The Windows installer now opens a dedicated setup window that shows the real install steps and live logs while TRELLIS.2, Python, weights, and firewall setup are running.

### Changed
- **Primary Start Menu entry now opens the manager UI** â€” The installer now launches a proper management window after setup instead of throwing the user directly into the console worker.
- **SmartScreen expectation is explicit** â€” Unsigned builds still trigger Windows reputation warnings until an Authenticode certificate is configured in CI; the product now explains that more clearly instead of feeling broken.

## [2.6.1] Ã¢â‚¬â€ 2026-03-22

### Added
- **Optional Build Tools bootstrap in the Windows installer** Ã¢â‚¬â€ Bjorq3DWorkerSetup.exe now exposes an installer option that automatically downloads and installs Visual Studio Build Tools 2022 with the required C++ workload when cl.exe is missing.

### Changed
- **Smoother Windows prerequisite flow** Ã¢â‚¬â€ The setup guide and installer flow now explain that Python is still fully automatic, while the native TRELLIS.2 C++ toolchain can be bootstrapped from inside the installer instead of sending the user off to install everything manually first.

## [2.6.0] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-22

### Changed
- **Version sync for HA + worker releases** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Bumped add-on, backend, worker, installer, docs, and release surfaces to `2.6.0` so Home Assistant and GitHub releases see a clearly new version instead of mixed `2.5.x` metadata.

### Fixed
- **TRELLIS.2 Windows integration** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Continued aligning the worker with the upstream TRELLIS.2 single-image pipeline and added stricter Windows prerequisite checks so installs fail earlier and more honestly when required CUDA build tooling is missing.

## [2.5.4] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-22

### Fixed
- **TRELLIS.2 pipeline integration** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â The worker now follows the upstream TRELLIS.2 API more closely: it loads `Trellis2ImageTo3DPipeline`, moves the pipeline to CUDA when available, calls `pipeline.run(image)[0]`, and exports GLB from mesh output instead of assuming a dict-shaped response.
- **Single-image UX alignment** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â The Wizard UI and backend now enforce one input image per generation so the product matches TRELLIS.2's official minimal example instead of incorrectly advertising a 1ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“4 image workflow.
- **Build-tools preflight** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â The Windows installer now checks for Visual Studio Build Tools / `cl.exe` before attempting required CUDA extension builds, failing early with a clear action instead of allowing a successful-looking install that later crashes on missing `cumesh` / `flex_gemm`.

## [2.5.3] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-22

### Changed
- **Worker lifecycle is now explicit** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â The Windows installer no longer enables the background service by default. Users now start the visible console worker manually, and background auto-start is an explicit checkbox/shortcut instead of implicit behavior.
- **New stop/cleanup flow** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Added `stop-worker.ps1` and `cleanup.ps1` so users can stop the worker cleanly, remove the Windows service, free port 8080, remove the firewall rule, and let uninstall clean `C:\ProgramData\Bjorq3DWorker`.
- **Safer startup UX** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `start-worker.ps1` now refuses to launch if the background service is already running or if port 8080 is already occupied, preventing duplicate hidden worker processes.

## [2.5.2] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-22

### Fixed
- **Windows installer: worker file copy** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `install.ps1` now copies `worker.py`, `jobs.py`, `trellis_bridge.py`, and `ui/` from the correct extracted path (`{app}\\worker\\...`) into `C:\\ProgramData\\Bjorq3DWorker\\worker`. This fixes installs where the worker started with `can't open file ...\\worker.py` because the ProgramData worker directory was empty.
- **TRELLIS pipeline import** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `trellis_bridge.py` now imports the pipeline class from `trellis2.pipelines.trellis2_image_to_3d` (since `trellis2.pipelines.__init__` does not reliably re-export it) and shows a clear error when required CUDA extension modules are missing.
- **Required CUDA extensions** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Installer now installs **o-voxel** (which builds/installs `cumesh` and `flex_gemm`) and fails fast with actionable guidance if build tools are missing, preventing opaque runtime import failures.
- **Disk space guidance** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Updated installer warning + Windows setup docs to reflect realistic disk usage (35 GB minimum, 50+ GB recommended).

## [2.5.1] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-20

### Fixed
- **TRELLIS bridge imports** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Fixed `No module named 'trellis'` by updating `trellis_bridge.py` to import from `trellis2` (matching the actual TRELLIS.2 repo package name). Falls back through `trellis2.pipelines.Trellis2ImageTo3DPipeline` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `TrellisImageTo3DPipeline` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ legacy `trellis.pipelines` with detailed error reporting on failure.
- **Installer stderr handling** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Replaced `$ErrorActionPreference = "Stop"` with a new `Invoke-Tool` helper that checks `$LASTEXITCODE` only. pip stderr warnings (deprecation notices, etc.) no longer abort the install with `NativeCommandError`.
- **64-bit PowerShell** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Inno Setup now launches `install.ps1` and Start Menu shortcuts via `{sysnative}\WindowsPowerShell\v1.0\powershell.exe`, preventing SysWOW64 path issues on 64-bit Windows.
- **nvidia-smi resolution** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `Find-NvidiaSmi` checks PATH, `System32`, and `C:\Program Files\NVIDIA Corporation\NVSMI\` for robust GPU detection.
- **Worker bridge error reporting** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `worker.py` now tracks `bridge_error` and exposes it in `/status.lastError` so the Wizard shows the real reason generation fails (e.g. missing TRELLIS module) instead of generic errors.

### Added
- **Windows Firewall rule** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `install.ps1` automatically creates an inbound TCP rule for the worker port (default 8080) so HA VMs can reach the worker without manual firewall configuration.
- **"Press any key" on exit** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `start-worker.ps1` and the `.bat` launcher keep the console window open on error so users can read the error message.
- **Root cause errors in UI** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `EngineStatus.tsx` now detects bridge/import errors vs connection errors and shows actionable guidance with a "Open worker UI" link for debugging.

### Changed
- Worker version bumped to 2.5.1 across all 7 locations.

## [2.5.0] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-20

### Fixed
- **Windows installer: zero-manual-prereqs** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Replaced embeddable Python (which lacked `venv` module) with **micromamba** as the primary runtime strategy. The installer now downloads micromamba and creates a fully functional conda environment with Python 3.11 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no system Python installation needed. If micromamba fails, falls back to the full Python 3.11 installer with silent install.
- **Runtime path resolution** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â All worker scripts (`start-worker.ps1`, `register-service.ps1`) now read `python-path.txt` to discover the correct Python executable, with fallback to `env\python.exe` (micromamba) then `venv\Scripts\python.exe` (full Python). Supports both installation strategies transparently.

### Changed
- **EngineStatus UI guided flow** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â External worker setup now shows numbered steps (Install ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Configure URL ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Test Connection) with clearer visual hierarchy, VirtualBox networking examples inline, and auto-refresh polling every 10s when not connected. `lastError` is displayed prominently with amber styling for GPU/driver errors vs red for connection errors.
- **Documentation rewrite** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `docs/WORKER_SETUP_WINDOWS.md` restructured as a complete "zero to done" guide matching the actual flow: prerequisites ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ download ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ install ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ verify ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ configure ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ test ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ troubleshooting. Removed references to manual Python/venv setup in the one-click path.

## [2.4.2] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-20

### Fixed
- **Windows installer PS 5.1 compatibility** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â All external command invocations (`git`, `pip`, `python`) now use array splatting instead of bare `--flag` tokens, fixing parser errors on Windows PowerShell 5.1 ("Missing expression after unary operator '--'").
- **Prerequisite handling** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Installer resolves `git` via `Get-Command` and reports actionable errors with download links when git or NVIDIA drivers are missing. Failures write structured `status.json` + `install.log` instead of crashing.

### Added
- **Optional Authenticode code signing** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `worker-installer.yml` now signs `Bjorq3DWorkerSetup.exe` when `CODE_SIGN_PFX_BASE64` and `CODE_SIGN_PFX_PASSWORD` secrets are configured. Unsigned builds still succeed without signing secrets.

## [2.4.1] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-20

### Fixed
- **Windows installer build** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Removed invalid `SetupIconFile` reference to `.svg` (Inno Setup requires `.ico`). The installer now builds without icon errors.

## [2.4.0] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-20

### Added
- **External 3D Worker architecture** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Photo ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 3D generation can now be offloaded to a standalone "Bjorq 3D Worker" running on a Windows PC with NVIDIA GPU, solving all TRELLIS/CUDA/Rust dependency issues in the HA container.
- **New project: `trellis-worker/`** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Python/FastAPI inference server with async job API (`POST /jobs`, `GET /jobs/:id`, `GET /jobs/:id/result.glb`), GPU auto-detection, static status dashboard (`/ui`), and optional Bearer token auth.
- **Windows installer scripts** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `trellis-worker/windows/` with PowerShell installer (`install.ps1`), service registration (`register-service.ps1`), launcher, healthcheck, and Inno Setup `.iss` config for building `Bjorq3DWorkerSetup.exe` in CI.
- **Dual engine mode** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `TRELLIS_MODE` env var (`local` | `external`). External mode proxies all generation to the remote worker; local mode preserves existing in-container behavior.
- **Worker connection test** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `GET /trellis/test-connection` endpoint and "Test Connection" button in UI.
- **Add-on config options** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `trellis_mode`, `trellis_worker_url`, `trellis_worker_token` configurable in HA UI.
- **Setup documentation** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `docs/WORKER_SETUP_WINDOWS.md` with VirtualBox networking guide (Bridged/NAT/Host-only), firewall setup, and troubleshooting.

### Changed
- `EngineStatus.tsx` rewritten as dual-mode component: shows worker connection status in external mode, preserves local install UI in local mode.
- `manager.ts` refactored with external worker client (submit ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ poll ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ fetch GLB) alongside preserved local install pipeline.

## [2.3.9] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-18

### Changed
- **TRELLIS installer matches official repo** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Clone now uses `--recursive` for submodules (o-voxel). Dependency installation mirrors official `setup.sh` structure: PyTorch with platform-appropriate index URL, basic deps in batches, 6 CUDA extensions (flash-attn, nvdiffrast, nvdiffrec, CuMesh, FlexGEMM, o-voxel) each built separately with graceful skip on failure. Pretrained weights downloaded via `huggingface-hub` from `microsoft/TRELLIS.2-4B`.
- **Environment capability detection** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â New `detectEnvironmentCapabilities()` probes for `nvidia-smi` (GPU name + VRAM), `nvcc` (CUDA Toolkit version), and disk space. Results exposed in `/trellis/status` response as `environment` object.
- **Honest status reporting** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `TrellisStatusResponse` now includes `environment` (platform, GPU, CUDA, missing requirements), `extensions` (per-extension install status), and `weightsDownloaded`. UI shows clear warnings when requirements are not met and allows best-effort install with disclaimer.
- **EngineStatus UI** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Shows detected platform, GPU, CUDA info. Lists missing requirements with recommendation to use external GPU worker. After install, shows per-extension and weights status with expandable details.

## [2.3.8] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-18

### Fixed
- **TRELLIS dependency install** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Replaced hardcoded `requirements.txt` assumption with auto-detected install strategy. TRELLIS.2 uses `setup.sh` with individual pip commands, not a requirements file. The installer now detects `setup.sh`, `requirements.txt`, or `pyproject.toml` and selects the correct method. Basic dependencies are installed in batches mirroring `setup.sh --basic`. GPU extensions (flash-attn) are attempted separately and gracefully skipped on CPU-only systems.

## [2.3.7] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-18

### Fixed
- **TRELLIS spawn ENOENT fix** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Resolved `spawn git ENOENT` during engine install by resolving absolute binary paths (`/usr/bin/git`, `/usr/bin/python3`, `/usr/bin/pip3`) at startup and using them in all `child_process.spawn()` calls. Bare command names failed despite binaries being present due to PATH resolution issues in the HA container environment.

## [2.3.6] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-18

### Fixed
- **Packaging: force fresh image build** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â v2.3.5 GHCR image was built before Dockerfile included `git`/`python3`. Bumped to 2.3.6 to guarantee HA pulls a new image with all runtime dependencies.
- **Startup dependency check** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Server now logs availability of `git`, `python3`, and `pip3` at startup so missing runtime deps are immediately visible in logs.

## [2.3.5] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-18

### Fixed
- **TRELLIS install directory conflict**: Separated runtime state (`status.json`) from the git clone target. New layout: `/data/trellis/repo/`, `/data/trellis/venv/`, `/data/trellis/workspace/`, `/data/trellis/status.json`
- **Idempotent installation**: Repeated install attempts now skip already-completed steps (valid repo, existing venv) instead of failing
- **Invalid repo recovery**: If `repo/` exists but is not a valid git checkout, it is cleaned up and re-cloned automatically
- **Docker deps** (v2.3.4): Added `git`, `python3`, `py3-pip` to Alpine image for engine installation

## [2.3.2] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-18

### Fixed
- **Backend CI typecheck**: Removed unsupported `tolerance` option from `weld()` calls in LOD generator and style normalizer (breaking change in `@gltf-transform/functions`)
- **Dependency pinning**: `@gltf-transform` packages pinned to exact `4.1.0` to prevent future API drift
- Applied same fixes to add-on mirror (`bjorq_asset_wizard/server/`)

## [2.3.1] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-18

### Changed ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â LOD Architecture Clarification
- **LOD responsibility boundary**: Clarified that the Wizard addon only prepares, stores, and exposes LOD-ready asset variants and metadata. Runtime LOD selection and switching is the responsibility of the Bjorq Dashboard runtime.
- **LOD transform consistency**: All LOD variants now explicitly preserve the same pivot, scale, floor alignment, and orientation as the primary model (LOD0). LODs are always generated from the scene-compatible buffer.
- **Structured LOD metadata**: LOD metadata now includes per-variant triangle count and file size for Dashboard consumption.
- **Graceful degradation**: Assets remain fully usable even if Dashboard ignores LOD metadata entirely.

### Infrastructure
- Version bump to 2.3.1 across all surfaces (server, add-on, docs)

## [2.3.0] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-18

### Added
- **Style variants** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Three controlled style variants (Cozy, Soft Minimal, Warm Wood) that all remain within Bjorq identity bounds. Variant selector in the Style step UI.
- **Automatic asset categorization** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Best-effort classification into chair/table/sofa/lamp/storage/decor/other using bounding box heuristics. Stored as metadata, never blocks pipeline.
- **LOD generation** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Automatic Level-of-Detail variants (LOD0/LOD1/LOD2) for scene performance. Skips for very light models.
- **Asset versioning** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Retry creates a new version with tracked seed, confidence, and lineage metadata.
- **Style drift detection** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Internal drift scoring across roughness, saturation, brightness, materials, and geometry. Auto-corrects if deviation exceeds threshold.
- **Scene compatibility** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Auto-fixes pivot centering, floor alignment (Y=0), and scale sanity. Validates orientation and aspect ratios.
- **Background processing queue** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Configurable concurrency limits (`MAX_CONCURRENT_JOBS`) with queue position tracking and safe failure handling.
- **Pipeline analytics** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â In-memory metrics: success rate, retry count, fallback frequency, average confidence, generation time, TRELLIS failures, drift corrections, category distribution.
- **Queue status API** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `GET /generate/queue` returns current queue state. `GET /generate/metrics` returns pipeline analytics.
- **Queue position in UI** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â GenerateProgress shows queue position when jobs are waiting.
- **Category and LOD badges in Review** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Review step shows detected category, LOD count, and version number.

### Changed
- Style normalizer and quality gate now accept variant parameter for variant-specific processing
- Pipeline now runs 11 steps (added drift detection, scene compat, category, LOD, analytics)
- Mock data updated with category, LOD, and version metadata

## [2.2.0] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-18

### Added
- **Photo ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 3D generation** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â New "Photo ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 3D" page (`/generate`) with 4-step wizard: Upload photos ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Select style ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Generate ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Review result
- **TRELLIS engine management** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Inline engine status widget with one-click installation flow (`GET /trellis/status`, `POST /trellis/install`)
- **Generation API** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `POST /generate`, `GET /generate/jobs/:id`, `POST /generate/jobs/:id/retry` for async photo-to-3D job management
- **Style normalizer service** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Deterministic post-processing enforcing Bjorq Cozy visual identity (geometry simplification, material standardization, texture cleanup)
- **Quality gate** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Automatic validation against Dashboard Safe / Ultra Light / Standard performance limits with auto-reprocessing on failure
- **PhotoUploader component** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Multi-image drag & drop (1ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“4 photos) with preview grid, reorder, and helper tips
- **StyleSelector component** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Style preset and target profile selection UI
- **GenerateProgress component** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Real-time job progress polling with step-based visualization
- **GenerateReview component** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Result preview with regenerate and save-to-library actions
- **Style profile lock** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Global `BJORQ_STYLE_PROFILE` as single source of truth for visual identity
- **Geometry simplicity scoring** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Re-simplify if geometry is too busy
- **Shape integrity protection** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Bounding box comparison to prevent aggressive simplification from destroying silhouette
- **Input quality heuristics** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Checks blur, contrast, resolution; warns user about potential quality issues
- **Confidence scoring** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Internal 0ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“1 score computed from gate results, style consistency, and input quality
- **Seed-based variation** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Retry generates new variation via random seed, not identical output

### Infrastructure
- TRELLIS subprocess wrapper for CLI-based execution (no HTTP API assumed)
- Generation pipeline orchestrator: preprocess ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ generate ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ style normalize ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ optimize ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ validate ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ export
- All backend changes mirrored to `bjorq_asset_wizard/` addon

## [2.1.0] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-10

### Added
- **Dashboard-compatible API** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â All catalog endpoints (`/catalog/index`, `/libraries/:lib/index`) now include a flat `assets` array with dashboard-friendly field aliases (`triangleCount`, `fileSize`, `thumbnailUrl`, `modelUrl`)
- **Library items alias** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `/libraries` response includes `items` array for broader client compatibility

### Changed
- Catalog index response is backwards-compatible: nested `categories` structure is preserved alongside the new flat `assets` array

## [2.0.9] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-10

### Fixed
- Add missing `@react-three/fiber` and `@react-three/drei` dependencies (fixes frontend build)
- Remove duplicate `import sharp` in optimizer.ts (fixes server build)
- Fix `no-explicit-any` lint error in library index filter
- Add `bjorq_asset_wizard/` to frontend eslint ignores
- Add `syncStatus` field to `CatalogAssetMeta` type
- Remove deprecated `tolerance` option from `weld()` (v4 is lossless, fixes typecheck)
- Update CATALOG_VERSION constant to match release

## [2.0.8] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-10

### Added
- **Catalog Export/Import** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Backup and restore entire catalog as `.tar.gz` archive; merge or overwrite strategy
- **Library index filtering** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Dashboard library API (`/libraries/:lib/index`) now returns only published assets
- **Onboarding Guide** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Comprehensive step-by-step guide at `docs/ONBOARDING.md`
- **Mesh simplification** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Balanced profile reduces triangles ~25%, Low Power ~50%, using meshoptimizer (weld + simplify)
- **Client-side 3D thumbnails** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Real model renders captured via Three.js instead of SVG info-cards
- **Download button** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Download optimized model directly from the Review step
- **Thumbnail upload on ingest** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Client-rendered thumbnails are uploaded alongside the model during catalog save

### Changed
- Updated optimization profiles with `simplifyRatio` and `simplifyError` parameters
- Ingest endpoint now accepts optional `thumbnail` file in multipart upload
- Updated add-on documentation (README.md, DOCS.md) to reflect v2.0.7 features and API endpoints

## [2.0.7] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-10

### Fixed
- Add `init: false` to HA add-on config ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â fixes S6 Overlay V3 PID 1 conflict that prevented startup
- Fix `run.sh` shebang to `#!/usr/bin/with-contenv bashio` for proper S6 environment loading

## [2.0.6] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-10

### Fixed
- Isolate Docker layer cache between HA and standalone workflows to prevent stale builds
- Removed GHA cache from `ha-addon.yml` entirely; added `scope=standalone` to `docker.yml`

## [2.0.5] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-10

### Changed
- Version bump to 2.0.5 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â forces HA to pull a clean, never-cached image tag.
- No functional changes from 2.0.3.

## [2.0.3] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-10

### Fixed ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â HA Workflow Permission Error
- **`prepare-addon.sh` execute permission**: Added `chmod +x` before running the script in `ha-addon.yml`. Git checkout doesn't preserve the execute bit, causing exit code 126 on the CI runner.
- Version bump to 2.0.3 across all surfaces.

## [2.0.2] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-10

### Fixed ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â HA Image Build Pipeline
- **HA add-on now builds from correct Dockerfile** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â CI was pushing the standalone image (non-root user, no `run.sh`) instead of the HA-specific image (HA base, root user, bashio integration). Added dedicated `ha-addon.yml` workflow.
- Standalone image moved to separate GHCR tag (`bjorq-asset-wizard-standalone-amd64`) to prevent collision with the HA image tag.

## [2.0.1] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-10

### Fix ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â HA Startup Permission + Legacy Path Cleanup
- **Pre-create `/data` directories** in HA Dockerfile so they exist at image layer (safety net)
- **Reorder `run.sh`** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `mkdir -p` now runs before `bashio::config` reads, preventing `set -e` abort on first boot
- **Eliminate legacy paths** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `docker-compose.yml`, `.env.example`, and `init-storage` all use `/data/storage` + `/data/catalog`
- **Version bump** to 2.0.1 across all surfaces

## [2.0.0] ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-03-10

### Major Release ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Bjorq Asset Wizard v2

Marks the first stable production release with full end-to-end asset pipeline:

- **Persistent catalog storage** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â assets survive HA add-on restarts (`/data/catalog`)
- **Thumbnail rendering** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â catalog cards show real asset thumbnails
- **Dimensions pipeline** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â dimensions persist through analyze ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ optimize ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ catalog ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ UI
- **Optimization profiles** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â High Quality / Balanced / Low Power presets
- **Large-file UX** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â direct port link for bypassing HA ingress limits
- **Catalog diagnostics** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â startup scan + /health catalog info
- **Startup reliability** ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â correct initialization order, permission handling

Includes all fixes from v1.0.0 through v1.1.11.
