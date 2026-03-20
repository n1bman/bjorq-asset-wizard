#Requires -Version 5.1
<#
.SYNOPSIS
    Start the Bjorq 3D Worker
#>

param(
    [string]$InstallDir = "C:\ProgramData\Bjorq3DWorker",
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

$workerDir = Join-Path $InstallDir "worker"
$pythonExe = Join-Path $InstallDir "venv\Scripts\python.exe"
$repoDir = Join-Path $InstallDir "trellis-repo"
$weightsDir = Join-Path $InstallDir "weights"

if (-not (Test-Path $pythonExe)) {
    Write-Host "ERROR: Worker not installed. Run install.ps1 first." -ForegroundColor Red
    exit 1
}

$env:TRELLIS_REPO = $repoDir
$env:TRELLIS_WEIGHTS = $weightsDir
$env:WORKER_PORT = $Port
$env:JOBS_DIR = Join-Path $InstallDir "jobs"

Write-Host "Starting Bjorq 3D Worker on port $Port..." -ForegroundColor Green
Write-Host "Dashboard: http://localhost:$Port/ui"
Write-Host "Press Ctrl+C to stop.`n"

Push-Location $workerDir
& $pythonExe worker.py
Pop-Location
