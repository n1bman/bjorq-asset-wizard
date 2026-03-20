#Requires -Version 5.1
<#
.SYNOPSIS
    Healthcheck for Bjorq 3D Worker
#>

param(
    [int]$Port = 8080,
    [int]$TimeoutSeconds = 30
)

$url = "http://localhost:$Port/status"
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)

Write-Host "Waiting for worker on port $Port..."

while ((Get-Date) -lt $deadline) {
    try {
        $response = Invoke-RestMethod -Uri $url -TimeoutSec 5 -ErrorAction Stop
        if ($response.ok -eq $true) {
            Write-Host "Worker is running!" -ForegroundColor Green
            Write-Host "  Version: $($response.version)"
            Write-Host "  GPU:     $($response.gpuName)"
            Write-Host "  VRAM:    $($response.vramGB) GB"
            exit 0
        }
    }
    catch { }

    Start-Sleep -Seconds 2
}

Write-Host "ERROR: Worker did not respond within $TimeoutSeconds seconds." -ForegroundColor Red
exit 1
