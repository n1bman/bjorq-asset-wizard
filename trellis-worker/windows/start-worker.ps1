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

# ---------------------------------------------------------------------------
# Resolve Python path (supports both micromamba env and venv)
# ---------------------------------------------------------------------------

$pythonPathFile = Join-Path $InstallDir "python-path.txt"
$pythonExe = $null

if (Test-Path $pythonPathFile) {
    $pythonExe = (Get-Content $pythonPathFile -Raw).Trim()
}

if (-not $pythonExe -or -not (Test-Path $pythonExe)) {
    # Try micromamba env first
    $envPython = Join-Path $InstallDir "env\python.exe"
    $venvPython = Join-Path $InstallDir "venv\Scripts\python.exe"

    if (Test-Path $envPython) {
        $pythonExe = $envPython
    }
    elseif (Test-Path $venvPython) {
        $pythonExe = $venvPython
    }
    else {
        Write-Host "ERROR: Worker not installed. Run install.ps1 first." -ForegroundColor Red
        Write-Host "  Checked:" -ForegroundColor Yellow
        Write-Host "    $pythonPathFile (not found or invalid)" -ForegroundColor Yellow
        Write-Host "    $envPython (not found)" -ForegroundColor Yellow
        Write-Host "    $venvPython (not found)" -ForegroundColor Yellow
        Write-Host "`nPress any key to close..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
}

$workerDir = Join-Path $InstallDir "worker"
$repoDir = Join-Path $InstallDir "trellis-repo"
$weightsDir = Join-Path $InstallDir "weights"

$env:TRELLIS_REPO = $repoDir
$env:TRELLIS_WEIGHTS = $weightsDir
$env:WORKER_PORT = $Port
$env:WORKER_HOST = "0.0.0.0"
$env:JOBS_DIR = Join-Path $InstallDir "jobs"

Write-Host "Starting Bjorq 3D Worker on port $Port..." -ForegroundColor Green
Write-Host "Python: $pythonExe"
Write-Host "Dashboard: http://localhost:$Port/ui"
Write-Host "Press Ctrl+C to stop.`n"

Push-Location $workerDir
& $pythonExe worker.py
Pop-Location

# If worker exits, keep window open
Write-Host "`nWorker stopped. Press any key to close..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
