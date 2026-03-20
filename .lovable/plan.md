

# v2.4.3 — Micromamba-based installer + UX improvements

## Problem

`install.ps1` uses embeddable Python which lacks `venv` module, causing `No module named venv` on clean Windows machines. Additionally, the EngineStatus UI needs clearer step-by-step guidance and `lastError` display.

## Changes

### 1. Rewrite `trellis-worker/windows/install.ps1` — Micromamba primary, full Python fallback

Replace the entire Python setup section (current lines 117-163) with:

**Primary path (micromamba):**
- Download `micromamba.exe` to `$InstallDir\bin\micromamba.exe` from conda-forge GitHub releases
- Create environment: `micromamba create -p $InstallDir\env python=3.11 pip -y -c conda-forge`
- Set `$pythonExe = "$InstallDir\env\python.exe"` and `$pipExe = "$InstallDir\env\Scripts\pip.exe"`
- All subsequent pip/python calls use these paths

**Fallback path (if micromamba download fails):**
- Download full Python 3.11.9 installer (`python-3.11.9-amd64.exe`) from python.org
- Run silent install to `$InstallDir\python` with pip enabled: `python-3.11.9-amd64.exe /quiet InstallAllUsers=0 TargetDir=$InstallDir\python Include_pip=1 PrependPath=0`
- Create venv: `$InstallDir\python\python.exe -m venv $InstallDir\venv`
- Set `$pythonExe = "$InstallDir\venv\Scripts\python.exe"` and `$pipExe = "$InstallDir\venv\Scripts\pip.exe"`

**Path resolution logic:**
- After setup, write the chosen `$pythonExe` path to `$InstallDir\python-path.txt` so other scripts (`start-worker.ps1`, `register-service.ps1`) can read it
- Log which strategy was used

All command invocations use array splatting (already done in v2.4.2).

### 2. Update `trellis-worker/windows/start-worker.ps1`

- Read `python-path.txt` if it exists, otherwise try `$InstallDir\env\python.exe`, then `$InstallDir\venv\Scripts\python.exe`
- Use whichever path exists

### 3. Update `trellis-worker/windows/register-service.ps1`

- Same path resolution logic as `start-worker.ps1`

### 4. Update `trellis-worker/windows/Bjorq3DWorker.iss`

- Update `AppVersion` to `2.4.3`

### 5. Update `src/components/generate/EngineStatus.tsx` — Better guided flow

In the "Not connected" section of `ExternalWorkerStatus`:
- Add numbered step badges (Step 1, 2, 3) with clearer visual hierarchy
- Step 1: "Install Worker" — download link + brief instruction
- Step 2: "Configure URL" — show current URL, explain NAT vs Bridged with concrete examples
- Step 3: "Test Connection" — the existing test button
- Display `lastError` from worker status more prominently (amber warning box when it contains GPU/install errors vs red for connection errors)
- Add auto-refresh polling every 10s when not connected (stop when connected)

### 6. Update `docs/WORKER_SETUP_WINDOWS.md` — Complete zero-to-done guide

Restructure to follow the exact flow:
1. Prerequisites (GPU driver, Git, disk space)
2. Download `.exe` from Releases (with direct link)
3. Run installer (note SmartScreen warning)
4. Verify: open `http://localhost:8080/status` on Windows
5. Configure HA add-on: set `trellis_mode: external` + URL
6. Test Connection from Wizard UI
7. Troubleshooting table (firewall, NAT/Bridged, GPU, weights)

Update "Option A" to mention micromamba-based install (no manual Python needed). Remove references to `venv` in the one-click path.

### 7. Version bump to 2.4.3

Update all 5 locations:
- `server/package.json`
- `server/src/index.ts`
- `bjorq_asset_wizard/server/package.json`
- `bjorq_asset_wizard/server/src/index.ts`
- `bjorq_asset_wizard/config.yaml`
- `trellis-worker/windows/Bjorq3DWorker.iss`
- `CHANGELOG.md`

## Files modified

- `trellis-worker/windows/install.ps1` (major rewrite of Python setup)
- `trellis-worker/windows/start-worker.ps1` (path resolution)
- `trellis-worker/windows/register-service.ps1` (path resolution)
- `trellis-worker/windows/Bjorq3DWorker.iss` (version)
- `src/components/generate/EngineStatus.tsx` (guided flow + auto-refresh)
- `docs/WORKER_SETUP_WINDOWS.md` (complete rewrite)
- `CHANGELOG.md` + 5 version files

## Technical notes

- Micromamba binary is ~5MB, downloaded from `https://github.com/mamba-org/micromamba-releases/releases/latest/download/micromamba-win-64`
- Micromamba creates a fully functional conda env with real Python (not embeddable), so `pip`, `venv`, and all stdlib modules work
- The `python-path.txt` file acts as a simple registry so all scripts agree on which Python to use regardless of which strategy was chosen

