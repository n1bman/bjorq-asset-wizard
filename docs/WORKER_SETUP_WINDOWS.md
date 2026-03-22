# Bjorq 3D Worker — Windows Setup Guide

Complete zero-to-done guide for running Photo → 3D from the Bjorq Asset Wizard.

## Overview

The Wizard add-on runs inside Home Assistant (Linux container) which has
**no GPU**. The 3D Worker runs natively on your Windows PC where it uses
the NVIDIA GPU for fast TRELLIS.2 inference.

```text
┌─ Windows Host ─────────────────────────────┐
│                                             │
│  ┌── VirtualBox ──────────────────────┐     │
│  │  Home Assistant OS                 │     │
│  │  └─ Bjorq Asset Wizard add-on     │─────┼──► http://<host>:8080
│  └────────────────────────────────────┘     │
│                                             │
│  ┌── Bjorq 3D Worker ────────────────┐     │
│  │  Port 8080 (0.0.0.0)             │     │
│  │  TRELLIS.2 + NVIDIA GPU           │     │
│  └────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **OS** | Windows 10 or later (64-bit) |
| **GPU** | NVIDIA GPU with CUDA support |
| **NVIDIA Driver** | Latest Game Ready or Studio driver ([download](https://www.nvidia.com/Download/index.aspx)) |
| **Git** | [Git for Windows](https://git-scm.com/download/win) |
| **Build tools** | Visual Studio Build Tools 2022 (Desktop development with C++) |
| **Disk space** | 35 GB minimum (50+ GB recommended) |
| **RAM** | 16 GB minimum |

> **You do NOT need to install Python or conda manually.**
> The installer uses micromamba (a lightweight conda alternative).
> If CUDA extensions fail to build (cumesh/flex_gemm), install **Visual Studio Build Tools 2022**
> and re-run the installer.

## Step 1 — Download the Installer

Download **Bjorq3DWorkerSetup.exe** from the
[latest GitHub Release](https://github.com/n1bman/bjorq-asset-wizard/releases/latest).

## Step 2 — Run the Installer

1. Right-click → **Run as Administrator**
2. If Windows SmartScreen shows "Unknown publisher":
   - Click **"More info"** → **"Run anyway"**
   - (See [SmartScreen notes](#smartscreen-warning) below)
3. The installer will automatically:
   - Download and set up **micromamba** with Python 3.11 (no system Python needed)
   - Clone the TRELLIS.2 repository
   - Install PyTorch with CUDA GPU support
   - Install all Python dependencies
   - Download model weights (~15 GB — resumable if interrupted)
   - Start the worker on port 8080
   - Optionally register as a Windows Service (auto-start on boot)

> **Installation takes 15–30 minutes** depending on download speed.
> Progress is shown in the installer window.

## Step 3 — Verify the Worker

Open a browser on your Windows PC and visit:

```
http://localhost:8080/status
```

You should see a JSON response like:
```json
{
  "ok": true,
  "version": "2.5.2",
  "gpu": true,
  "vramGB": 24,
  "driver": "560.94",
  "installing": false,
  "lastError": null
}
}
```

The worker dashboard is available at: `http://localhost:8080/ui`

## Step 4 — Configure the Wizard Add-on

In Home Assistant → **Settings** → **Add-ons** → **Bjorq Asset Wizard** → **Configuration**:

```yaml
trellis_mode: external
trellis_worker_url: "http://10.0.2.2:8080"    # see networking below
trellis_worker_token: ""                        # optional
```

Save and **restart the add-on**.

## Step 5 — Test Connection

In the Wizard UI, go to **Photo → 3D**. You should see:

- ✅ **"Worker connected"** with GPU info if everything is working
- ❌ **"Worker not connected"** with error details if something is wrong — see [Troubleshooting](#troubleshooting)

Use the **"Test Connection"** button to verify connectivity.

## VirtualBox Networking

### Bridged Adapter (recommended)

1. VirtualBox → VM Settings → Network → Adapter 1:
   - Attached to: **Bridged Adapter**
   - Select your physical network adapter
2. Both the VM and Windows are on the same LAN
3. Find your Windows IP: run `ipconfig` → look for your LAN adapter's IPv4
4. Worker URL: `http://<windows-ip>:8080`

**Example**: Windows IP is `192.168.1.100` →
```
trellis_worker_url: "http://192.168.1.100:8080"
```

### NAT (simpler, no LAN exposure)

1. VirtualBox uses NAT by default
2. From inside the VM, the Windows host is always at **10.0.2.2**
3. Worker URL: `http://10.0.2.2:8080`

> With NAT, no port forwarding is needed — the VM initiates the connection.
> But you **must** allow port 8080 through Windows Firewall (see below).

### Host-only Adapter

1. VirtualBox → File → Host Network Manager → Create
2. Note the IP (usually `192.168.56.1`)
3. VM Settings → Network → Adapter 2 → Host-only Adapter
4. Worker URL: `http://192.168.56.1:8080`

## Windows Firewall

The worker binds to `0.0.0.0:8080`, but Windows Firewall may block incoming
connections from the VM.

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Bjorq 3D Worker" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

Or via GUI: Windows Defender Firewall → Advanced → Inbound Rules → New Rule → Port → TCP → 8080 → Allow.

## Option B: Manual Setup

If you prefer not to use the installer:

```powershell
# Clone the repo
git clone https://github.com/n1bman/bjorq-asset-wizard.git
cd bjorq-asset-wizard/trellis-worker

# Create Python environment (use your preferred method)
python -m venv venv
.\venv\Scripts\activate

# Install PyTorch with CUDA
pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu124

# Install worker dependencies
pip install -r requirements.txt

# Clone TRELLIS.2
git clone --recursive --depth 1 https://github.com/microsoft/TRELLIS.2.git trellis-repo

# Download weights (~15 GB)
python -c "from huggingface_hub import snapshot_download; snapshot_download('microsoft/TRELLIS.2-4B', local_dir='weights', ignore_patterns=['*.md','*.txt','.gitattributes'])"

# Start worker
python worker.py
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Connection refused" | Worker not running | Check `http://localhost:8080/status` on Windows |
| "Connection timed out" | Wrong IP or firewall | Verify IP (see networking above), open port 8080 in Windows Firewall |
| "HTTP 401" | Token mismatch | Ensure `trellis_worker_token` matches `WORKER_TOKEN` env on worker |
| "No GPU detected" | Missing NVIDIA driver | Install from [nvidia.com](https://www.nvidia.com/Download/index.aspx), restart worker |
| Weights download fails | Disk space or network | Need ~15 GB free; download is resumable — just re-run installer |
| Generation fails / OOM | Insufficient VRAM | Close other GPU apps; 12+ GB VRAM recommended |
| Service won't start | NSSM issue | Check `C:\ProgramData\Bjorq3DWorker\service-stderr.log` |

**Test from HA terminal:**
```bash
curl -s http://10.0.2.2:8080/status | jq .
```

## SmartScreen Warning

When running the installer, Windows SmartScreen may show **"Windows protected
your PC"** with "Unknown publisher". This is expected for unsigned builds.

- Click **"More info"** → **"Run anyway"**.
- To eliminate this warning, the project maintainer can add an Authenticode
  code-signing certificate. Set `CODE_SIGN_PFX_BASE64` and
  `CODE_SIGN_PFX_PASSWORD` as GitHub repository secrets — the CI workflow
  will sign the `.exe` automatically.

## Security

The worker listens on **all interfaces** (`0.0.0.0`). On a home network
this is fine, but on shared networks consider:

1. Setting `WORKER_TOKEN` to a random string on both worker and Wizard
2. Using Windows Firewall to restrict source IPs
3. Binding to a specific interface (set `WORKER_HOST=192.168.1.100`)
