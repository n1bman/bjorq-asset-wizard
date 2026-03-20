

# External 3D Worker Architecture — v2.4.0

## Summary

Pivot Photo→3D from in-addon TRELLIS installation to an external "Bjorq 3D Worker" running on Windows with NVIDIA GPU. The Wizard addon becomes a thin proxy. This is a major feature addition spanning ~15 new files and ~8 modified files.

## Architecture

```text
┌─────────────────────┐       HTTP :8080        ┌──────────────────────┐
│  HA Add-on (Wizard)  │ ─────────────────────► │  Bjorq 3D Worker     │
│  Alpine / no GPU     │                         │  Windows / NVIDIA GPU│
│  TRELLIS_MODE=       │  GET /status            │  FastAPI + TRELLIS.2 │
│    external          │  POST /jobs             │  Async job queue     │
│  TRELLIS_WORKER_URL  │  GET /jobs/:id          │  Optional auth token │
│                      │  GET /jobs/:id/result   │                      │
└─────────────────────┘                          └──────────────────────┘
```

## Implementation Plan

### 1. Create `trellis-worker/` — Python/FastAPI worker (6 files)

**`trellis-worker/worker.py`** — FastAPI server:
- `GET /status` → `{ ok, version, gpu, driver, cudaRuntime, vramGB, installing, progress, lastError, endpoints }`
- `POST /jobs` — multipart `images[]` + JSON `options` → `{ jobId }` (202)
- `GET /jobs/{id}` → `{ status, progress, step, error? }`
- `GET /jobs/{id}/result.glb` → binary GLB (application/octet-stream)
- `GET /ui` → static HTML dashboard
- `Authorization: Bearer <token>` via env `WORKER_TOKEN`
- GPU detection via `torch.cuda` at startup
- Thread-pool executor for async generation (1 concurrent job)

**`trellis-worker/trellis_bridge.py`** — wraps TRELLIS.2 inference:
- Loads TRELLIS pipeline from local clone
- `generate(images, options) → GLB bytes`
- Sets `TRELLIS_WEIGHTS` env for weight path

**`trellis-worker/jobs.py`** — in-memory job store:
- Job states: `queued → processing → done | failed`
- Progress tracking per step
- Auto-cleanup of completed jobs after 1h

**`trellis-worker/ui/index.html`** — static dashboard:
- Shows: running state, GPU info, VRAM, version, last job, port, log tail, "copy URL" button
- Auto-refreshes every 5s via fetch `/status`

**`trellis-worker/requirements.txt`** — FastAPI, uvicorn, torch, torchvision, huggingface-hub, python-multipart

**`trellis-worker/README.md`** — usage docs

### 2. Create `trellis-worker/windows/` — Windows installer (5 files)

**`install.ps1`** — main setup:
- Creates `C:\ProgramData\Bjorq3DWorker\`
- Downloads embedded Python 3.11, creates venv
- Clones TRELLIS.2 `--recursive`
- Installs PyTorch GPU wheels + deps
- Downloads weights via huggingface-hub (~15GB, resumable)
- Detects NVIDIA driver via `nvidia-smi`; clear error if missing
- Writes `status.json` during install for progress tracking

**`start-worker.ps1`** — launch worker (bind 0.0.0.0:8080)

**`register-service.ps1`** — optional Windows Service via `nssm`

**`healthcheck.ps1`** — verify worker is responding on port 8080

**`Bjorq3DWorker.iss`** — Inno Setup script (recipe only; .exe built in CI)

### 3. Modify backend — External worker proxy

**`server/src/services/trellis/manager.ts`** (+ bjorq copy):
- Read `TRELLIS_MODE` env (`local` | `external`, default `local`)
- Read `TRELLIS_WORKER_URL` and `TRELLIS_WORKER_TOKEN`
- `getTrellisStatus()`: when external, fetch `GET WORKER_URL/status`, translate to `TrellisStatusResponse` with `mode: "external"` and `workerUrl`
- `generateWithTrellis()`: when external, POST images to worker `/jobs`, poll `/jobs/:id`, fetch `/jobs/:id/result.glb`, return `Uint8Array`
- New export: `testWorkerConnection()` — ping worker `/status`
- When external, `startTrellisInstall()` becomes a no-op with guidance message
- All existing local-mode code preserved (gated by `mode !== "external"`)

**`server/src/routes/trellis.ts`** (+ bjorq copy):
- `POST /trellis/install`: when external, return `{ success: true, message: "External worker mode — run the installer on your GPU PC" }`
- New `GET /trellis/test-connection` — proxy ping to worker `/status`

**`server/.env.example`** — add:
```
# TRELLIS mode: "local" (install in container) or "external" (use remote worker)
TRELLIS_MODE=external
TRELLIS_WORKER_URL=http://10.0.2.2:8080
TRELLIS_WORKER_TOKEN=
```

### 4. Modify frontend — Dual-mode EngineStatus

**`src/types/generate.ts`**:
- Add to `TrellisStatusResponse`: `mode?: "local" | "external"`, `workerUrl?: string`, `lastError?: string`

**`src/components/generate/EngineStatus.tsx`** — rewrite for dual mode:
- When `mode=external` + connected: green badge "Worker connected", GPU/VRAM/version info
- When `mode=external` + not connected: red badge, worker URL display, "Test Connection" button, setup instructions with link to docs, "Download Worker Installer" link
- When `mode=local`: existing behavior unchanged
- No "Install Anyway" in external mode

**`src/services/generate-api.ts`**:
- Add `testWorkerConnection()` → `GET /trellis/test-connection`

### 5. Add-on configuration

**`bjorq_asset_wizard/config.yaml`** — add options:
```yaml
trellis_mode: external
trellis_worker_url: "http://10.0.2.2:8080"
trellis_worker_token: ""
```
With schema validation. These get passed as env vars via `run.sh`.

### 6. Documentation

**`docs/WORKER_SETUP_WINDOWS.md`**:
- Prerequisites (NVIDIA GPU, driver, Windows 10+)
- Download & run installer
- VirtualBox networking: Bridged (use LAN IP) vs NAT (use `10.0.2.2:8080`)
- Windows Firewall: allow port 8080
- Configure Wizard: set worker URL in add-on config
- Troubleshooting: not reachable, no GPU, weights download, disk space

### 7. Version bump to 2.4.0

Update 5 locations: `server/package.json`, `server/src/index.ts`, `bjorq_asset_wizard/config.yaml`, `bjorq_asset_wizard/server/package.json`, `bjorq_asset_wizard/server/src/index.ts` + `CHANGELOG.md`.

## Files Summary

**New (12):**
`trellis-worker/worker.py`, `trellis-worker/trellis_bridge.py`, `trellis-worker/jobs.py`, `trellis-worker/ui/index.html`, `trellis-worker/requirements.txt`, `trellis-worker/README.md`, `trellis-worker/windows/install.ps1`, `trellis-worker/windows/start-worker.ps1`, `trellis-worker/windows/register-service.ps1`, `trellis-worker/windows/healthcheck.ps1`, `trellis-worker/windows/Bjorq3DWorker.iss`, `docs/WORKER_SETUP_WINDOWS.md`

**Modified (12):**
`server/src/services/trellis/manager.ts`, `bjorq_asset_wizard/server/src/services/trellis/manager.ts`, `server/src/routes/trellis.ts`, `bjorq_asset_wizard/server/src/routes/trellis.ts`, `server/.env.example`, `src/types/generate.ts`, `server/src/types/generate.ts`, `bjorq_asset_wizard/server/src/types/generate.ts`, `src/components/generate/EngineStatus.tsx`, `src/services/generate-api.ts`, `bjorq_asset_wizard/config.yaml`, `CHANGELOG.md` + 4 version files

