# Bjorq 3D Worker

Standalone TRELLIS.2 inference server for the Bjorq Asset Wizard.

Runs on a Windows (or Linux) machine with an NVIDIA GPU and exposes an HTTP API
that the Wizard HA add-on connects to for Photo → 3D generation.

## Quick Start (Windows)

1. Download `Bjorq3DWorkerSetup.exe` from the latest GitHub Release
2. Run the installer — it handles Python, TRELLIS.2, weights, and deps
3. The worker starts on `http://0.0.0.0:8080` and opens the dashboard
4. In the Bjorq Asset Wizard add-on config, set:
   - `trellis_mode`: `external`
   - `trellis_worker_url`: `http://<your-windows-ip>:8080`

## Manual Start

```bash
pip install -r requirements.txt
# Install PyTorch with CUDA (see https://pytorch.org/get-started/locally/)
pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu124

python worker.py
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/status` | Worker health + GPU info |
| `POST` | `/jobs` | Submit generation job (multipart) |
| `GET` | `/jobs/:id` | Job status + progress |
| `GET` | `/jobs/:id/result.glb` | Download result GLB |
| `GET` | `/ui` | Status dashboard |
| `GET` | `/logs` | Recent log lines |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKER_PORT` | `8080` | HTTP port |
| `WORKER_TOKEN` | _(empty)_ | Bearer token for auth (optional) |
| `TRELLIS_REPO` | `./trellis-repo` | Path to TRELLIS.2 clone |
| `TRELLIS_WEIGHTS` | `./weights` | Path to model weights |
| `JOBS_DIR` | `./jobs` | Temp directory for job files |

## Requirements

- **NVIDIA GPU** with CUDA-capable driver
- **Python 3.11+**
- **~20 GB disk** for weights + TRELLIS repo
- **Windows 10+** or Linux

## Networking (VirtualBox)

If HA runs in VirtualBox on the same Windows machine:

- **Bridged adapter** (recommended): Use Windows LAN IP (e.g. `http://192.168.1.100:8080`)
- **NAT**: Use `http://10.0.2.2:8080` from inside the VM

See `docs/WORKER_SETUP_WINDOWS.md` for detailed instructions.
