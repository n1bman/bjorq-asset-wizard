#Requires -Version 5.1
<#
.SYNOPSIS
    Cleanup script for uninstalling Bjorq 3D Worker.
#>

param(
    [string]$InstallDir = "C:\ProgramData\Bjorq3DWorker",
    [int]$Port = 8080
)

$ErrorActionPreference = "Continue"
$scriptDir = Split-Path $MyInvocation.MyCommand.Path -Parent
$stopScript = Join-Path $scriptDir "stop-worker.ps1"

Write-Host "Cleaning up Bjorq 3D Worker..." -ForegroundColor Yellow

if (Test-Path $stopScript) {
    & $stopScript -InstallDir $InstallDir -Port $Port -RemoveService
}

try {
    $ruleName = "Bjorq 3D Worker (TCP $Port)"
    Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
}
catch { }

Write-Host "Cleanup finished. Remaining files in $InstallDir will be removed by the uninstaller." -ForegroundColor Green
