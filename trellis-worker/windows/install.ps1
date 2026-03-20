#Requires -Version 5.1
<#
.SYNOPSIS
    Bjorq 3D Worker — Windows Installer
.DESCRIPTION
    Installs everything needed to run the Bjorq 3D Worker on Windows:
    1. Micromamba (primary) or full Python 3.11 (fallback)
    2. TRELLIS.2 repository (recursive clone)
    3. PyTorch with CUDA support
    4. Python dependencies
    5. Model weights (~15 GB)
    6. Windows Firewall rule for worker port
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

$ProgressPreference = "SilentlyContinue"

$MICROMAMBA_VERSION = "2.0.5"
$MICROMAMBA_URL = "https://github.com/mamba-org/micromamba-releases/releases/download/$MICROMAMBA_VERSION/micromamba-win-64"
$MICROMAMBA_URL_LATEST = "https://github.com/mamba-org/micromamba-releases/releases/latest/download/micromamba-win-64"
$PYTHON_VERSION = "3.11.9"
$PYTHON_INSTALLER_URL = "https://www.python.org/ftp/python/$PYTHON_VERSION/python-$PYTHON_VERSION-amd64.exe"
$TRELLIS_REPO_URL = "https://github.com/microsoft/TRELLIS.2.git"
$WORKER_VERSION = "2.5.1"

$StatusFile = Join-Path $InstallDir "status.json"
$LogFile = Join-Path $InstallDir "install.log"
$PythonPathFile = Join-Path $InstallDir "python-path.txt"

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

function Invoke-Tool {
    <#
    .SYNOPSIS
        Run an external command, check exit code only (ignore stderr warnings).
        Returns $true on success, $false on failure.
    #>
    param(
        [string]$Exe,
        [string[]]$Arguments,
        [switch]$Fatal,
        [string]$FatalMessage = ""
    )
    # Temporarily allow non-zero exit without PS terminating
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & $Exe @Arguments 2>&1 | ForEach-Object {
            $line = $_.ToString()
            Add-Content -Path $LogFile -Value $line
            # Show stdout but suppress noisy pip stderr warnings
            if ($_ -is [System.Management.Automation.ErrorRecord]) {
                # stderr — log only, don't display unless it's important
                if ($line -match "error|fatal|cannot|denied") {
                    Write-Host "  STDERR: $line" -ForegroundColor Yellow
                }
            } else {
                Write-Host "  $line"
            }
        }
    } catch {
        Add-Content -Path $LogFile -Value "Exception running ${Exe}: $_"
    }
    $ErrorActionPreference = $prevEAP

    if ($LASTEXITCODE -ne 0) {
        $errMsg = if ($FatalMessage) { $FatalMessage } else { "$Exe failed with exit code $LASTEXITCODE" }
        Add-Content -Path $LogFile -Value $errMsg
        if ($Fatal) { Write-Fatal $errMsg }
        return $false
    }
    return $true
}

function Find-NvidiaSmi {
    <# Resolve nvidia-smi across common locations #>
    # 1. PATH
    try {
        $cmd = Get-Command nvidia-smi -ErrorAction Stop
        return $cmd.Source
    } catch {}
    # 2. System32
    $sys32 = Join-Path $env:SystemRoot "System32\nvidia-smi.exe"
    if (Test-Path $sys32) { return $sys32 }
    # 3. NVIDIA NVSMI
    $nvsmi = "C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe"
    if (Test-Path $nvsmi) { return $nvsmi }
    return $null
}

function Test-NvidiaGpu {
    $nvSmi = Find-NvidiaSmi
    if (-not $nvSmi) { return $null }
    try {
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $nvArgs = @("--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits")
        $output = & $nvSmi @nvArgs 2>$null
        $ErrorActionPreference = $prevEAP
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
    Write-Fatal "No NVIDIA GPU detected. Install the latest NVIDIA driver first: https://www.nvidia.com/Download/index.aspx"
}

$vramGB = [math]::Round($gpu.VramMB / 1024)
Write-Host "  GPU: $($gpu.Name) ($($vramGB) GB VRAM, driver $($gpu.Driver))" -ForegroundColor Green
if ($vramGB -lt 8) {
    Write-Host "  WARNING: Very low VRAM ($vramGB GB). Generation will likely fail with OOM." -ForegroundColor Red
    Write-Host "  12 GB+ recommended, 24 GB+ ideal." -ForegroundColor Yellow
} elseif ($vramGB -lt 12) {
    Write-Host "  WARNING: Low VRAM ($vramGB GB). Generation may be slow or fail on complex models." -ForegroundColor Yellow
    Write-Host "  24 GB+ recommended for best results." -ForegroundColor Yellow
}

# Check git
Write-Status -Step "Checking git" -Progress 5
$gitExe = $null
try {
    $gitExe = (Get-Command git -ErrorAction Stop).Source
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $gitVer = & $gitExe @("--version") 2>$null
    $ErrorActionPreference = $prevEAP
    Write-Host "  Git: $gitVer ($gitExe)"
}
catch {
    Write-Fatal "Git is not installed. Download from https://git-scm.com/download/win and restart this installer."
}

# ---------------------------------------------------------------------------
# Step 1: Python runtime (micromamba primary, full Python fallback)
# ---------------------------------------------------------------------------

Write-Status -Step "Setting up Python runtime" -Progress 10

$pythonExe = $null
$pipExe = $null
$runtimeStrategy = "none"

# --- Strategy A: micromamba ---
$mambaDir = Join-Path $InstallDir "bin"
$mambaExe = Join-Path $mambaDir "micromamba.exe"
$envDir = Join-Path $InstallDir "env"

if (Test-Path (Join-Path $envDir "python.exe")) {
    Write-Host "  Micromamba env already exists - skipping"
    $pythonExe = Join-Path $envDir "python.exe"
    $pipExe = Join-Path $envDir "Scripts\pip.exe"
    $runtimeStrategy = "micromamba"
}
elseif (Test-Path (Join-Path $InstallDir "venv\Scripts\python.exe")) {
    Write-Host "  Python venv already exists - skipping"
    $pythonExe = Join-Path $InstallDir "venv\Scripts\python.exe"
    $pipExe = Join-Path $InstallDir "venv\Scripts\pip.exe"
    $runtimeStrategy = "full-python"
}
else {
    # Try micromamba first
    Write-Host "  Trying micromamba (primary strategy)..."
    $mambaOk = $false
    try {
        New-Item -ItemType Directory -Path $mambaDir -Force | Out-Null
        Write-Host "  Downloading micromamba v$MICROMAMBA_VERSION..."
        try {
            Invoke-WebRequest -Uri $MICROMAMBA_URL -OutFile $mambaExe -UseBasicParsing
        }
        catch {
            Write-Host "  Pinned version failed, trying latest..." -ForegroundColor Yellow
            Invoke-WebRequest -Uri $MICROMAMBA_URL_LATEST -OutFile $mambaExe -UseBasicParsing
        }

        if (Test-Path $mambaExe) {
            Write-Host "  Creating conda environment with Python 3.11..."
            $env:MAMBA_ROOT_PREFIX = Join-Path $InstallDir "mamba-root"
            $mambaOk = Invoke-Tool -Exe $mambaExe -Arguments @("create", "-p", $envDir, "python=3.11", "pip", "-y", "-c", "conda-forge")
            if ($mambaOk -and (Test-Path (Join-Path $envDir "python.exe"))) {
                $pythonExe = Join-Path $envDir "python.exe"
                $pipExe = Join-Path $envDir "Scripts\pip.exe"
                $runtimeStrategy = "micromamba"
                Write-Host "  Micromamba environment created successfully" -ForegroundColor Green
            } else {
                $mambaOk = $false
            }
        }
    }
    catch {
        Write-Host "  Micromamba setup failed: $_" -ForegroundColor Yellow
    }

    # --- Strategy B: Full Python installer fallback ---
    if (-not $mambaOk) {
        Write-Host "  Falling back to full Python installer..." -ForegroundColor Yellow
        Write-Status -Step "Downloading Python $PYTHON_VERSION (fallback)" -Progress 12

        $pythonInstallerPath = Join-Path $env:TEMP "python-installer.exe"
        try {
            Invoke-WebRequest -Uri $PYTHON_INSTALLER_URL -OutFile $pythonInstallerPath -UseBasicParsing
        }
        catch {
            Write-Fatal "Failed to download Python installer from $PYTHON_INSTALLER_URL"
        }

        $pythonInstallDir = Join-Path $InstallDir "python"
        Write-Host "  Installing Python $PYTHON_VERSION to $pythonInstallDir..."
        $installerArgs = @(
            "/quiet",
            "InstallAllUsers=0",
            "TargetDir=$pythonInstallDir",
            "Include_pip=1",
            "Include_test=0",
            "PrependPath=0",
            "Include_launcher=0"
        )
        Start-Process -FilePath $pythonInstallerPath -ArgumentList $installerArgs -Wait -NoNewWindow
        Remove-Item $pythonInstallerPath -Force -ErrorAction SilentlyContinue

        $sysPython = Join-Path $pythonInstallDir "python.exe"
        if (-not (Test-Path $sysPython)) {
            Write-Fatal "Python installation failed. Neither micromamba nor the Python installer succeeded."
        }

        # Create venv
        Write-Host "  Creating virtual environment..."
        Invoke-Tool -Exe $sysPython -Arguments @("-m", "venv", (Join-Path $InstallDir "venv")) -Fatal -FatalMessage "Failed to create Python virtual environment"

        $pythonExe = Join-Path $InstallDir "venv\Scripts\python.exe"
        $pipExe = Join-Path $InstallDir "venv\Scripts\pip.exe"

        if (-not (Test-Path $pythonExe)) {
            Write-Fatal "Failed to create Python virtual environment"
        }

        $runtimeStrategy = "full-python"
        Write-Host "  Python venv created successfully (fallback)" -ForegroundColor Green
    }
}

# Write chosen path so other scripts can find it
[System.IO.File]::WriteAllText($PythonPathFile, $pythonExe)
Write-Host "  Runtime strategy: $runtimeStrategy"
Write-Host "  Python: $pythonExe"
Add-Content -Path $LogFile -Value "Runtime strategy: $runtimeStrategy  Python: $pythonExe"

# ---------------------------------------------------------------------------
# Step 2: Clone TRELLIS.2
# ---------------------------------------------------------------------------

Write-Status -Step "Cloning TRELLIS.2 repository" -Progress 20

$repoDir = Join-Path $InstallDir "trellis-repo"
if (-not (Test-Path (Join-Path $repoDir ".git"))) {
    if (Test-Path $repoDir) { Remove-Item $repoDir -Recurse -Force }
    Write-Host "  Cloning TRELLIS.2 (--recursive)..."
    Invoke-Tool -Exe $gitExe -Arguments @("clone", "--recursive", "--depth", "1", $TRELLIS_REPO_URL, $repoDir) -Fatal -FatalMessage "Failed to clone TRELLIS.2 repository"
}
else {
    Write-Host "  TRELLIS.2 repo exists - pulling latest..."
    Push-Location $repoDir
    Invoke-Tool -Exe $gitExe -Arguments @("pull", "--ff-only")
    Pop-Location
}

# ---------------------------------------------------------------------------
# Step 3: Install PyTorch
# ---------------------------------------------------------------------------

Write-Status -Step "Installing PyTorch (CUDA)" -Progress 35

$torchOk = Invoke-Tool -Exe $pipExe -Arguments @("install", "torch==2.6.0", "torchvision==0.21.0", "--index-url", "https://download.pytorch.org/whl/cu124")
if (-not $torchOk) {
    Write-Host "  WARNING: CUDA PyTorch install failed, trying CPU fallback..." -ForegroundColor Yellow
    Invoke-Tool -Exe $pipExe -Arguments @("install", "torch==2.6.0", "torchvision==0.21.0", "--index-url", "https://download.pytorch.org/whl/cpu")
}

# ---------------------------------------------------------------------------
# Step 4: Install dependencies
# ---------------------------------------------------------------------------

Write-Status -Step "Installing Python dependencies" -Progress 50

# Worker deps
$workerReqs = Join-Path $PSScriptRoot "..\requirements.txt"
if (Test-Path $workerReqs) {
    Invoke-Tool -Exe $pipExe -Arguments @("install", "-r", $workerReqs)
}
else {
    Invoke-Tool -Exe $pipExe -Arguments @("install", "fastapi", "uvicorn[standard]", "python-multipart", "huggingface-hub", "Pillow")
}

# TRELLIS deps (basic -- matches official setup.sh --basic)
Write-Status -Step "Installing TRELLIS dependencies" -Progress 55
Invoke-Tool -Exe $pipExe -Arguments @(
    "install",
    "imageio", "imageio-ffmpeg", "tqdm", "easydict", "ninja",
    "trimesh", "zstandard", "opencv-python-headless", "transformers",
    "pandas", "lpips", "gradio==6.0.1", "tensorboard", "kornia", "timm"
)

# utils3d from git
Invoke-Tool -Exe $pipExe -Arguments @("install", "git+https://github.com/EasternJournalist/utils3d.git@9a4eb15e4e43e41e0e0b75c4cdfea1de66bbab1f")

# Install TRELLIS repo if pyproject.toml exists
$pyproject = Join-Path $repoDir "pyproject.toml"
if (Test-Path $pyproject) {
    Write-Status -Step "Installing TRELLIS package" -Progress 62
    Push-Location $repoDir
    Invoke-Tool -Exe $pipExe -Arguments @("install", "-e", ".")
    Pop-Location
}

# CUDA extensions (best-effort — never fatal)
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
    if ($ext.repo) {
        $cloneDir = Join-Path $extDir $ext.name
        if (-not (Test-Path (Join-Path $cloneDir ".git"))) {
            $cloneOk = Invoke-Tool -Exe $gitExe -Arguments @("clone", "--depth", "1", $ext.repo, $cloneDir)
            if (-not $cloneOk) { Write-Host " SKIPPED (clone failed)" -ForegroundColor Yellow; continue }
        }
        Push-Location $cloneDir
        $buildOk = Invoke-Tool -Exe $pipExe -Arguments @("install", ".")
        Pop-Location
        if ($buildOk) { Write-Host " OK" -ForegroundColor Green } else { Write-Host " SKIPPED (build failed)" -ForegroundColor Yellow }
    }
    else {
        $buildOk = Invoke-Tool -Exe $pipExe -Arguments @("install", $ext.install)
        if ($buildOk) { Write-Host " OK" -ForegroundColor Green } else { Write-Host " SKIPPED (non-critical)" -ForegroundColor Yellow }
    }
}

# o-voxel from submodule
$oVoxelDir = Join-Path $repoDir "extensions\o-voxel"
if (Test-Path (Join-Path $oVoxelDir "setup.py")) {
    Write-Host "  Building o-voxel..." -NoNewline
    Push-Location $oVoxelDir
    $oOk = Invoke-Tool -Exe $pipExe -Arguments @("install", ".")
    Pop-Location
    if ($oOk) { Write-Host " OK" -ForegroundColor Green } else { Write-Host " SKIPPED" -ForegroundColor Yellow }
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
    $dlOk = Invoke-Tool -Exe $pythonExe -Arguments @("-c", $downloadScript)
    if (-not $dlOk) {
        Write-Host "  WARNING: Weight download failed. You can retry later." -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------------------------
# Step 6: Copy worker files
# ---------------------------------------------------------------------------

Write-Status -Step "Copying worker files" -Progress 90

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
# Step 7: Windows Firewall rule
# ---------------------------------------------------------------------------

Write-Status -Step "Configuring Windows Firewall" -Progress 93

try {
    $ruleName = "Bjorq 3D Worker (TCP $Port)"
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if (-not $existing) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
        Write-Host "  Firewall rule created: allow inbound TCP $Port" -ForegroundColor Green
    } else {
        Write-Host "  Firewall rule already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "  WARNING: Could not create firewall rule (run as admin?): $_" -ForegroundColor Yellow
    Add-Content -Path $LogFile -Value "Firewall rule failed: $_"
}

# ---------------------------------------------------------------------------
# Step 8: Create launcher
# ---------------------------------------------------------------------------

Write-Status -Step "Creating launcher" -Progress 95

$weightsDir = Join-Path $InstallDir "weights"
$launchScript = @"
@echo off
cd /d "$workerDest"
set TRELLIS_REPO=$repoDir
set TRELLIS_WEIGHTS=$weightsDir
set WORKER_PORT=$Port
set WORKER_HOST=0.0.0.0
set JOBS_DIR=$InstallDir\jobs
echo Starting Bjorq 3D Worker on port $Port...
echo Dashboard: http://localhost:$Port/ui
echo.
"$pythonExe" worker.py
echo.
echo Worker stopped. Press any key to close...
pause > nul
"@

$launchBat = Join-Path $InstallDir "Start-Worker.bat"
[System.IO.File]::WriteAllText($launchBat, $launchScript)

# ---------------------------------------------------------------------------
# Step 9: Register as service (optional)
# ---------------------------------------------------------------------------

if (-not $NoService) {
    $servicePath = Join-Path $PSScriptRoot "register-service.ps1"
    if (Test-Path $servicePath) {
        Write-Status -Step "Registering Windows service" -Progress 97
        Invoke-Tool -Exe "powershell" -Arguments @("-ExecutionPolicy", "Bypass", "-File", $servicePath, "-InstallDir", $InstallDir, "-Port", "$Port")
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
    runtimeStrategy = $runtimeStrategy
} | ConvertTo-Json
[System.IO.File]::WriteAllText($StatusFile, $doneStatus)

Write-Host "`n  Installation complete!" -ForegroundColor Green
Write-Host "  Runtime: $runtimeStrategy"
Write-Host "  Start worker: $launchBat"
Write-Host "  Dashboard:    http://localhost:$Port/ui"
Write-Host "  Worker URL:   http://<this-pc-ip>:$Port`n"

# Auto-start
Write-Host "  Starting worker..." -ForegroundColor Cyan
Start-Process $launchBat
