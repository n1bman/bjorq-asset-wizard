#Requires -Version 5.1
<#
.SYNOPSIS
    Register Bjorq 3D Worker as a Windows Service using NSSM.
.DESCRIPTION
    Downloads nssm if not present and registers the worker as a service
    that starts automatically on boot.
#>

param(
    [string]$InstallDir = "C:\ProgramData\Bjorq3DWorker",
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$serviceName = "Bjorq3DWorker"

# ---------------------------------------------------------------------------
# Resolve Python path (supports both micromamba env and venv)
# ---------------------------------------------------------------------------

$pythonPathFile = Join-Path $InstallDir "python-path.txt"
$pythonExe = $null

if (Test-Path $pythonPathFile) {
    $pythonExe = (Get-Content $pythonPathFile -Raw).Trim()
}

if (-not $pythonExe -or -not (Test-Path $pythonExe)) {
    $envPython = Join-Path $InstallDir "env\python.exe"
    $venvPython = Join-Path $InstallDir "venv\Scripts\python.exe"

    if (Test-Path $envPython) {
        $pythonExe = $envPython
    }
    elseif (Test-Path $venvPython) {
        $pythonExe = $venvPython
    }
    else {
        Write-Host "ERROR: Worker not installed." -ForegroundColor Red
        exit 1
    }
}

$workerPy = Join-Path $InstallDir "worker\worker.py"

# Check for nssm
$nssmPath = Join-Path $InstallDir "nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "Downloading NSSM (service manager)..."
    $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $zipPath = Join-Path $env:TEMP "nssm.zip"
    Invoke-WebRequest -Uri $nssmUrl -OutFile $zipPath -UseBasicParsing

    $extractDir = Join-Path $env:TEMP "nssm-extract"
    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

    $nssmExe = Get-ChildItem $extractDir -Recurse -Filter "nssm.exe" |
        Where-Object { $_.DirectoryName -match "win64" } |
        Select-Object -First 1

    if (-not $nssmExe) {
        Write-Host "ERROR: Could not find nssm.exe in download" -ForegroundColor Red
        exit 1
    }

    Copy-Item $nssmExe.FullName $nssmPath -Force
    Remove-Item $zipPath -Force
    Remove-Item $extractDir -Recurse -Force
}

# Remove existing service if present
try {
    & $nssmPath stop $serviceName 2>$null | Out-Null
    & $nssmPath remove $serviceName confirm 2>$null | Out-Null
}
catch { }

# Install service
Write-Host "Registering service: $serviceName"
& $nssmPath install $serviceName $pythonExe $workerPy
& $nssmPath set $serviceName AppDirectory (Join-Path $InstallDir "worker")
& $nssmPath set $serviceName AppEnvironmentExtra `
    "TRELLIS_REPO=$(Join-Path $InstallDir 'trellis-repo')" `
    "TRELLIS_WEIGHTS=$(Join-Path $InstallDir 'weights')" `
    "WORKER_PORT=$Port" `
    "WORKER_HOST=0.0.0.0" `
    "JOBS_DIR=$(Join-Path $InstallDir 'jobs')"
& $nssmPath set $serviceName DisplayName "Bjorq 3D Worker"
& $nssmPath set $serviceName Description "TRELLIS.2 inference server for Bjorq Asset Wizard"
& $nssmPath set $serviceName Start SERVICE_AUTO_START
& $nssmPath set $serviceName AppStdout (Join-Path $InstallDir "service-stdout.log")
& $nssmPath set $serviceName AppStderr (Join-Path $InstallDir "service-stderr.log")

# Start
Write-Host "Starting service..."
& $nssmPath start $serviceName

Write-Host "Service '$serviceName' registered and started." -ForegroundColor Green
Write-Host "  Dashboard: http://localhost:$Port/ui"
