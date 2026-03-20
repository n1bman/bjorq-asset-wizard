#Requires -Version 5.1
<#
.SYNOPSIS
    Bjorq 3D Worker — Windows Installer
.DESCRIPTION
    Installs everything needed to run the Bjorq 3D Worker on Windows:
    1. Embedded Python 3.11 + venv
    2. TRELLIS.2 repository (recursive clone)
    3. PyTorch with CUDA support
    4. Python dependencies
    5. Model weights (~15 GB)
.NOTES
    Run as Administrator for best results.
    Requires: NVIDIA GPU driver installed, git, ~25 GB free disk space.
#>

param(
    [string]$InstallDir = "C:\ProgramData\Bjorq3DWorker",
    [int]$Port = 8080,
    [switch]$NoService,
    [switch]$SkipWeights
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$PYTHON_VERSION = "3.11.9"
$PYTHON_URL = "https://www.python.org/ftp/python/$PYTHON_VERSION/python-$PYTHON_VERSION-embed-amd64.zip"
$TRELLIS_REPO_URL = "https://github.com/microsoft/TRELLIS.2.git"
$WORKER_VERSION = "1.0.0"

$StatusFile = Join-Path $InstallDir "status.json"
$LogFile = Join-Path $InstallDir "install.log"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Write-Status {
    param([string]$Step, [int]$Progress, [string]$Error = "")
    $status = @{
        installing = $true
        progress   = $Progress
        step       = $Step
        lastError  = $Error
        version    = $WORKER_VERSION
    } | ConvertTo-Json
    [System.IO.File]::WriteAllText($StatusFile, $status)
    $msg = "[$Progress%] $Step"
    Write-Host $msg -ForegroundColor Cyan
    Add-Content -Path $LogFile -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
}

function Write-Fatal {
    param([string]$Message)
    Write-Status -Step "FAILED: $Message" -Progress -1 -Error $Message
    Write-Host "`n  ERROR: $Message" -ForegroundColor Red
    Write-Host "  See log: $LogFile" -ForegroundColor Yellow
    exit 1
}

function Test-NvidiaGpu {
    try {
        $output = & nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader,nounits 2>$null
        if ($LASTEXITCODE -ne 0) { return $null }
        $parts = $output.Split(",") | ForEach-Object { $_.Trim() }
        return @{
            Name    = $parts[0]
            VramMB  = [int]$parts[1]
            Driver  = $parts[2]
        }
    }
    catch {
        return $null
    }
}

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------

Write-Host "`n  Bjorq 3D Worker Installer v$WORKER_VERSION" -ForegroundColor Green
Write-Host "  Install directory: $InstallDir`n"

# Create install dir
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $InstallDir "jobs") -Force | Out-Null
"" | Set-Content $LogFile

# Check GPU
Write-Status -Step "Checking NVIDIA GPU" -Progress 2
$gpu = Test-NvidiaGpu
if (-not $gpu) {
    Write-Fatal "No NVIDIA GPU detected. Install NVIDIA drivers first. See: https://www.nvidia.com/Download/index.aspx"
}

$vramGB = [math]::Round($gpu.VramMB / 1024)
Write-Host "  GPU: $($gpu.Name) ($($vramGB) GB VRAM, driver $($gpu.Driver))" -ForegroundColor Green
if ($vramGB -lt 12) {
    Write-Host "  WARNING: Low VRAM ($vramGB GB). Generation may fail or be very slow." -ForegroundColor Yellow
}

# Check git
Write-Status -Step "Checking git" -Progress 5
try {
    $gitVer = & git --version 2>$null
    Write-Host "  Git: $gitVer"
}
catch {
    Write-Fatal "Git is not installed. Download from https://git-scm.com/download/win"
}

# ---------------------------------------------------------------------------
# Step 1: Python
# ---------------------------------------------------------------------------

Write-Status -Step "Setting up Python $PYTHON_VERSION" -Progress 10

$pythonDir = Join-Path $InstallDir "python"
$venvDir = Join-Path $InstallDir "venv"
$pythonExe = Join-Path $venvDir "Scripts\python.exe"
$pipExe = Join-Path $venvDir "Scripts\pip.exe"

if (-not (Test-Path $pythonExe)) {
    # Download embeddable Python
    $zipPath = Join-Path $env:TEMP "python-embed.zip"
    Write-Host "  Downloading Python $PYTHON_VERSION..."
    Invoke-WebRequest -Uri $PYTHON_URL -OutFile $zipPath -UseBasicParsing

    # Extract
    if (Test-Path $pythonDir) { Remove-Item $pythonDir -Recurse -Force }
    Expand-Archive -Path $zipPath -DestinationPath $pythonDir -Force
    Remove-Item $zipPath -Force

    # Enable pip in embeddable python (uncomment import site)
    $pthFile = Get-ChildItem $pythonDir -Filter "python*._pth" | Select-Object -First 1
    if ($pthFile) {
        (Get-Content $pthFile.FullName) -replace '#import site', 'import site' | Set-Content $pthFile.FullName
    }

    # Install pip
    $getPip = Join-Path $env:TEMP "get-pip.py"
    Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $getPip -UseBasicParsing
    $sysPython = Join-Path $pythonDir "python.exe"
    & $sysPython $getPip --no-warn-script-location 2>&1 | Out-Null

    # Create venv
    Write-Host "  Creating virtual environment..."
    & $sysPython -m venv $venvDir 2>&1 | Out-Null

    if (-not (Test-Path $pythonExe)) {
        Write-Fatal "Failed to create Python virtual environment"
    }
}
else {
    Write-Host "  Python venv already exists — skipping"
}

# ---------------------------------------------------------------------------
# Step 2: Clone TRELLIS.2
# ---------------------------------------------------------------------------

Write-Status -Step "Cloning TRELLIS.2 repository" -Progress 20

$repoDir = Join-Path $InstallDir "trellis-repo"
if (-not (Test-Path (Join-Path $repoDir ".git"))) {
    if (Test-Path $repoDir) { Remove-Item $repoDir -Recurse -Force }
    Write-Host "  Cloning TRELLIS.2 (--recursive)..."
    & git clone --recursive --depth 1 $TRELLIS_REPO_URL $repoDir 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fatal "Failed to clone TRELLIS.2 repository"
    }
}
else {
    Write-Host "  TRELLIS.2 repo exists — pulling latest..."
    Push-Location $repoDir
    & git pull --ff-only 2>&1 | Out-Null
    Pop-Location
}

# ---------------------------------------------------------------------------
# Step 3: Install PyTorch
# ---------------------------------------------------------------------------

Write-Status -Step "Installing PyTorch (CUDA)" -Progress 35

& $pipExe install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu124 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: CUDA PyTorch install failed, trying CPU fallback..." -ForegroundColor Yellow
    & $pipExe install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cpu 2>&1
}

# ---------------------------------------------------------------------------
# Step 4: Install dependencies
# ---------------------------------------------------------------------------

Write-Status -Step "Installing Python dependencies" -Progress 50

# Worker deps
$workerReqs = Join-Path $PSScriptRoot "..\requirements.txt"
if (Test-Path $workerReqs) {
    & $pipExe install -r $workerReqs 2>&1
}
else {
    & $pipExe install fastapi uvicorn python-multipart huggingface-hub Pillow 2>&1
}

# TRELLIS deps (basic)
Write-Status -Step "Installing TRELLIS dependencies" -Progress 55
$basicDeps = @(
    "imageio", "imageio-ffmpeg", "tqdm", "easydict", "ninja",
    "trimesh", "zstandard", "opencv-python-headless", "transformers",
    "pandas", "lpips", "gradio==6.0.1", "tensorboard", "kornia", "timm"
)
& $pipExe install @basicDeps 2>&1

# utils3d from git
& $pipExe install "git+https://github.com/EasternJournalist/utils3d.git@9a4eb15e4e43e41e0e0b75c4cdfea1de66bbab1f" 2>&1

# Install TRELLIS repo if pyproject.toml exists
$pyproject = Join-Path $repoDir "pyproject.toml"
if (Test-Path $pyproject) {
    Write-Status -Step "Installing TRELLIS package" -Progress 62
    Push-Location $repoDir
    & $pipExe install -e . 2>&1
    Pop-Location
}

# CUDA extensions (best-effort)
Write-Status -Step "Building CUDA extensions (may take a while)" -Progress 65
$extensions = @(
    @{ name = "flash-attn"; install = "flash-attn==2.7.3" },
    @{ name = "nvdiffrast"; repo = "https://github.com/NVlabs/nvdiffrast.git" },
    @{ name = "nvdiffrec"; repo = "https://github.com/JeffreyXiang/nvdiffrec.git" },
    @{ name = "CuMesh"; repo = "https://github.com/JeffreyXiang/CuMesh.git" },
    @{ name = "FlexGEMM"; repo = "https://github.com/JeffreyXiang/FlexGEMM.git" }
)

$extDir = Join-Path $InstallDir "_ext_build"
New-Item -ItemType Directory -Path $extDir -Force | Out-Null

foreach ($ext in $extensions) {
    Write-Host "  Building $($ext.name)..." -NoNewline
    try {
        if ($ext.repo) {
            $cloneDir = Join-Path $extDir $ext.name
            if (-not (Test-Path (Join-Path $cloneDir ".git"))) {
                & git clone --depth 1 $ext.repo $cloneDir 2>&1 | Out-Null
            }
            Push-Location $cloneDir
            & $pipExe install . 2>&1 | Out-Null
            Pop-Location
        }
        else {
            & $pipExe install $ext.install 2>&1 | Out-Null
        }
        Write-Host " OK" -ForegroundColor Green
    }
    catch {
        Write-Host " SKIPPED (non-critical)" -ForegroundColor Yellow
    }
}

# o-voxel from submodule
$oVoxelDir = Join-Path $repoDir "extensions\o-voxel"
if (Test-Path (Join-Path $oVoxelDir "setup.py")) {
    Write-Host "  Building o-voxel..." -NoNewline
    try {
        Push-Location $oVoxelDir
        & $pipExe install . 2>&1 | Out-Null
        Pop-Location
        Write-Host " OK" -ForegroundColor Green
    }
    catch {
        Write-Host " SKIPPED" -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------------------------
# Step 5: Download weights
# ---------------------------------------------------------------------------

if (-not $SkipWeights) {
    Write-Status -Step "Downloading model weights (~15 GB)" -Progress 75

    $weightsDir = Join-Path $InstallDir "weights"
    New-Item -ItemType Directory -Path $weightsDir -Force | Out-Null

    $downloadScript = @"
from huggingface_hub import snapshot_download
import os
target = os.environ.get('TRELLIS_WEIGHTS', r'$weightsDir')
print(f'Downloading to {target}...')
snapshot_download(
    repo_id='microsoft/TRELLIS.2-4B',
    local_dir=target,
    ignore_patterns=['*.md', '*.txt', '.gitattributes'],
)
print('Done')
"@

    $env:TRELLIS_WEIGHTS = $weightsDir
    & $pythonExe -c $downloadScript 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: Weight download failed. You can retry later." -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------------------------
# Step 6: Copy worker files
# ---------------------------------------------------------------------------

Write-Status -Step "Copying worker files" -Progress 92

$workerSrc = Split-Path $PSScriptRoot -Parent
$workerDest = Join-Path $InstallDir "worker"
if (-not (Test-Path $workerDest)) { New-Item -ItemType Directory -Path $workerDest -Force | Out-Null }

Copy-Item (Join-Path $workerSrc "worker.py") $workerDest -Force
Copy-Item (Join-Path $workerSrc "jobs.py") $workerDest -Force
Copy-Item (Join-Path $workerSrc "trellis_bridge.py") $workerDest -Force
if (Test-Path (Join-Path $workerSrc "ui")) {
    Copy-Item (Join-Path $workerSrc "ui") (Join-Path $workerDest "ui") -Recurse -Force
}

# ---------------------------------------------------------------------------
# Step 7: Create start script
# ---------------------------------------------------------------------------

Write-Status -Step "Creating launcher" -Progress 95

$launchScript = @"
@echo off
cd /d "$workerDest"
set TRELLIS_REPO=$repoDir
set TRELLIS_WEIGHTS=$weightsDir
set WORKER_PORT=$Port
set JOBS_DIR=$InstallDir\jobs
"$pythonExe" worker.py
pause
"@

$launchBat = Join-Path $InstallDir "Start-Worker.bat"
[System.IO.File]::WriteAllText($launchBat, $launchScript)

# ---------------------------------------------------------------------------
# Step 8: Register as service (optional)
# ---------------------------------------------------------------------------

if (-not $NoService) {
    $servicePath = Join-Path $PSScriptRoot "register-service.ps1"
    if (Test-Path $servicePath) {
        Write-Status -Step "Registering Windows service" -Progress 97
        & powershell -ExecutionPolicy Bypass -File $servicePath -InstallDir $InstallDir -Port $Port 2>&1
    }
}

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------

$doneStatus = @{
    installing = $false
    progress   = 100
    step       = "complete"
    lastError  = ""
    version    = $WORKER_VERSION
    gpu        = $gpu.Name
    vramGB     = $vramGB
    port       = $Port
} | ConvertTo-Json
[System.IO.File]::WriteAllText($StatusFile, $doneStatus)

Write-Host "`n  Installation complete!" -ForegroundColor Green
Write-Host "  Start worker: $launchBat"
Write-Host "  Dashboard:    http://localhost:$Port/ui"
Write-Host "  Worker URL:   http://<this-pc-ip>:$Port`n"

# Auto-start
Write-Host "  Starting worker..." -ForegroundColor Cyan
Start-Process $launchBat
