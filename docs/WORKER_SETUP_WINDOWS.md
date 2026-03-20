# Bjorq 3D Worker — Windows Setup Guide

Complete guide for setting up the Bjorq 3D Worker on a Windows PC,
especially when running Home Assistant in VirtualBox.

## Overview

The Bjorq Asset Wizard runs inside Home Assistant (Linux container) which
typically has **no GPU access**. The 3D Worker runs natively on your Windows
machine where it can use the NVIDIA GPU for fast TRELLIS.2 inference.

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
| **Disk space** | ~25 GB (Python + TRELLIS.2 + model weights) |
| **RAM** | 16 GB minimum |

> **Note**: You do **not** need to install CUDA Toolkit separately. PyTorch
> ships with its own CUDA runtime. Just make sure you have an up-to-date
> NVIDIA driver.

## Installation

### Option A: One-click installer (recommended)

1. Download **Bjorq3DWorkerSetup.exe** from the
   [latest GitHub Release](https://github.com/n1bman/bjorq-asset-wizard/releases)
2. Run as Administrator
3. The installer will:
   - Install embedded Python 3.11
   - Clone TRELLIS.2 repository
   - Install PyTorch with GPU support
   - Download model weights (~15 GB — resumable)
   - Start the worker on port 8080
   - Optionally register as a Windows Service (auto-start)
4. The worker dashboard opens at `http://localhost:8080/ui`

### Option B: Manual setup

```powershell
# Clone the worker
git clone https://github.com/n1bman/bjorq-asset-wizard.git
cd bjorq-asset-wizard/trellis-worker

# Create Python venv
python -m venv venv
.\venv\Scripts\activate

# Install PyTorch with CUDA
pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu124

# Install worker deps
pip install -r requirements.txt

# Clone TRELLIS.2
git clone --recursive --depth 1 https://github.com/microsoft/TRELLIS.2.git trellis-repo

# Download weights (~15 GB)
python -c "from huggingface_hub import snapshot_download; snapshot_download('microsoft/TRELLIS.2-4B', local_dir='weights', ignore_patterns=['*.md','*.txt','.gitattributes'])"

# Start worker
python worker.py
```

## VirtualBox Networking

### Bridged Adapter (recommended)

1. In VirtualBox → VM Settings → Network → Adapter 1:
   - Attached to: **Bridged Adapter**
   - Select your physical network adapter
2. Both the VM and Windows host are on the same LAN
3. Find your Windows IP: `ipconfig` → look for your LAN adapter's IPv4
4. Worker URL: `http://<windows-ip>:8080`

**Example**: If Windows IP is `192.168.1.100`:
```
Worker URL: http://192.168.1.100:8080
```

### NAT (simpler, no LAN exposure)

1. VirtualBox uses NAT by default
2. From inside the VM, the Windows host is always at **10.0.2.2**
3. Worker URL: `http://10.0.2.2:8080`

> **Important**: With NAT, no port forwarding is needed in VirtualBox because
> the VM initiates the connection to the host. But you **must** allow port 8080
> through the Windows Firewall (see below).

### Host-only Adapter

1. VirtualBox → File → Host Network Manager → Create
2. Note the IP (usually `192.168.56.1`)
3. VM Settings → Network → Adapter 2:
   - Attached to: **Host-only Adapter**
4. Worker URL: `http://192.168.56.1:8080`

## Windows Firewall

The worker binds to `0.0.0.0:8080`, but Windows Firewall may block incoming
connections from the VM.

### Allow port 8080:

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Bjorq 3D Worker" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

Or via GUI:
1. Windows Defender Firewall → Advanced Settings
2. Inbound Rules → New Rule
3. Port → TCP → 8080 → Allow → All profiles
4. Name: "Bjorq 3D Worker"

## Configure Wizard Add-on

In Home Assistant → Settings → Add-ons → Bjorq Asset Wizard → Configuration:

```yaml
trellis_mode: external
trellis_worker_url: "http://10.0.2.2:8080"    # or your Windows IP
trellis_worker_token: ""                        # optional
```

Or set environment variables:
```
TRELLIS_MODE=external
TRELLIS_WORKER_URL=http://10.0.2.2:8080
TRELLIS_WORKER_TOKEN=
```

After saving, restart the add-on. The "Photo → 3D" page should show
**"Worker connected"** with GPU info.

## Troubleshooting

### Worker not reachable

| Symptom | Solution |
|---------|----------|
| "Connection refused" | Check if worker is running: `http://localhost:8080/status` on Windows |
| "Connection timed out" | Wrong IP or firewall blocking. Try pinging from HA terminal |
| "HTTP 401" | Token mismatch. Check `TRELLIS_WORKER_TOKEN` in both places |

**Test from HA terminal:**
```bash
curl -s http://10.0.2.2:8080/status | jq .
```

### No GPU detected

1. Check NVIDIA driver: `nvidia-smi` in PowerShell
2. If not found: install the latest driver from [nvidia.com](https://www.nvidia.com/Download/index.aspx)
3. After driver install, restart the worker

### Weights download fails

- Check disk space (need ~15 GB free)
- The download is resumable — just restart the installer
- If behind a proxy, set `HTTPS_PROXY` before running the installer

### Generation fails

- Check the worker log at `http://localhost:8080/ui` (Log section)
- Common cause: out of GPU memory. Close other GPU-intensive apps
- TRELLIS.2 works best with 12+ GB VRAM

### Worker won't start as service

- Ensure NSSM was installed (check `C:\ProgramData\Bjorq3DWorker\nssm.exe`)
- Check service status: `Get-Service Bjorq3DWorker`
- View logs: `C:\ProgramData\Bjorq3DWorker\service-stderr.log`

## SmartScreen Warning

When running the installer, Windows SmartScreen may show **"Windows protected
your PC"** with "Unknown publisher". This is expected for unsigned builds.

- Click **"More info"** → **"Run anyway"** to proceed.
- To eliminate this warning, the project maintainer can add an Authenticode
  code-signing certificate. Set `CODE_SIGN_PFX_BASE64` and
  `CODE_SIGN_PFX_PASSWORD` as GitHub repository secrets — the CI workflow
  will sign the `.exe` automatically. Code-signing certificates cost
  ~$70–$400/year from providers like DigiCert, Sectigo, or SSL.com.

## Security

The worker listens on **all interfaces** (`0.0.0.0`). On a home network
this is fine, but on shared networks consider:

1. Setting `WORKER_TOKEN` to a random string on both worker and Wizard
2. Using Windows Firewall to restrict source IPs
3. Binding to a specific interface (set `WORKER_HOST=192.168.1.100`)
