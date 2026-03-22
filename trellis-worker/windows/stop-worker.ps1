#Requires -Version 5.1
<#
.SYNOPSIS
    Stop Bjorq 3D Worker processes and optionally remove the Windows service.
#>

param(
    [string]$InstallDir = "C:\ProgramData\Bjorq3DWorker",
    [int]$Port = 8080,
    [switch]$RemoveService
)

$ErrorActionPreference = "Stop"
$serviceName = "Bjorq3DWorker"
$nssmPath = Join-Path $InstallDir "nssm.exe"

function Stop-ProcessSafe {
    param(
        [int]$ProcessId,
        [string]$Reason
    )

    try {
        $proc = Get-Process -Id $ProcessId -ErrorAction Stop
        Write-Host "Stopping PID $ProcessId ($($proc.ProcessName)) - $Reason" -ForegroundColor Yellow
        Stop-Process -Id $ProcessId -Force -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

function Stop-ServiceIfPresent {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if (-not $service) {
        return
    }

    if ($service.Status -ne "Stopped") {
        Write-Host "Stopping service $serviceName..." -ForegroundColor Yellow
        try {
            if (Test-Path $nssmPath) {
                & $nssmPath stop $serviceName | Out-Null
            }
        }
        catch { }

        try {
            Stop-Service -Name $serviceName -Force -ErrorAction Stop
        }
        catch { }
    }

    if ($RemoveService) {
        Write-Host "Removing service $serviceName..." -ForegroundColor Yellow
        try {
            if (Test-Path $nssmPath) {
                & $nssmPath remove $serviceName confirm | Out-Null
            }
        }
        catch { }

        try {
            sc.exe delete $serviceName | Out-Null
        }
        catch { }
    }
}

function Stop-WorkerProcesses {
    $seen = @{}

    try {
        $portOwners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid in $portOwners) {
            if (-not $seen.ContainsKey($pid)) {
                $seen[$pid] = $true
                Stop-ProcessSafe -ProcessId $pid -Reason "listening on port $Port" | Out-Null
            }
        }
    }
    catch { }

    try {
        $candidates = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
            Where-Object {
                $_.CommandLine -and (
                    $_.CommandLine -like "*$InstallDir*" -or
                    $_.CommandLine -like "*worker.py*" -or
                    $_.ExecutablePath -like "*$InstallDir*"
                )
            }

        foreach ($candidate in $candidates) {
            $pid = [int]$candidate.ProcessId
            if (-not $seen.ContainsKey($pid)) {
                $seen[$pid] = $true
                Stop-ProcessSafe -ProcessId $pid -Reason "matching worker command line" | Out-Null
            }
        }
    }
    catch { }
}

Stop-ServiceIfPresent
Stop-WorkerProcesses

Write-Host "Bjorq 3D Worker stopped." -ForegroundColor Green
