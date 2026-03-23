#Requires -Version 5.1

param(
    [string]$InstallDir = "C:\ProgramData\Bjorq3DWorker",
    [int]$Port = 8080
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$script:InstallDir = $InstallDir
$script:Port = $Port
$script:StartScript = Join-Path $PSScriptRoot "start-worker.ps1"
$script:StopScript = Join-Path $PSScriptRoot "stop-worker.ps1"
$script:RegisterScript = Join-Path $PSScriptRoot "register-service.ps1"
$script:InstallScript = Join-Path $PSScriptRoot "install.ps1"
$script:LogFile = Join-Path $InstallDir "install.log"
$script:StatusFile = Join-Path $InstallDir "status.json"

function Invoke-DetachedPowerShell {
    param([string]$Arguments, [string]$WindowStyle = "Normal")

    Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" `
        -ArgumentList $Arguments `
        -WindowStyle $WindowStyle | Out-Null
}

function Get-InstallStatus {
    $status = [ordered]@{
        Installed = $false
        Service = "Not installed"
        Listener = "Stopped"
        LastError = ""
        ApiVersion = "-"
        WorkerUrl = ('http://localhost:' + $Port + '/ui')
        LastLog = ""
    }

    $pythonPathFile = Join-Path $InstallDir "python-path.txt"
    if (Test-Path $pythonPathFile) {
        $pythonExe = (Get-Content $pythonPathFile -Raw).Trim()
        if ($pythonExe -and (Test-Path $pythonExe)) {
            $status.Installed = $true
        }
    }

    $service = Get-Service -Name "Bjorq3DWorker" -ErrorAction SilentlyContinue
    if ($service) {
        $status.Service = $service.Status.ToString()
    }

    try {
        $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if ($listener) {
            $status.Listener = ('Running on port ' + $Port)
        }
    } catch { }

    if (Test-Path $StatusFile) {
        try {
            $json = Get-Content $StatusFile -Raw | ConvertFrom-Json
            if ($json.version) { $status.ApiVersion = [string]$json.version }
            if ($json.lastError) { $status.LastError = [string]$json.lastError }
        } catch { }
    }

    try {
        $api = Invoke-RestMethod -Uri ('http://localhost:' + $Port + '/status') -TimeoutSec 2 -ErrorAction Stop
        if ($api.version) { $status.ApiVersion = [string]$api.version }
        if ($api.lastError) { $status.LastError = [string]$api.lastError }
        $status.Listener = "Connected"
    } catch { }

    if (Test-Path $LogFile) {
        $tail = Get-Content $LogFile -Tail 18 -ErrorAction SilentlyContinue
        if ($tail) {
            $status.LastLog = ($tail -join [Environment]::NewLine)
        }
    }

    return [pscustomobject]$status
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "Bjorq 3D Worker Manager"
$form.Size = New-Object System.Drawing.Size(900, 680)
$form.StartPosition = "CenterScreen"

$title = New-Object System.Windows.Forms.Label
$title.Text = "Bjorq 3D Worker"
$title.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(20, 18)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Start, stop, repair, and monitor the local TRELLIS.2 worker from one place."
$subtitle.AutoSize = $true
$subtitle.Location = New-Object System.Drawing.Point(22, 54)
$form.Controls.Add($subtitle)

$statusBox = New-Object System.Windows.Forms.GroupBox
$statusBox.Text = "Status"
$statusBox.Location = New-Object System.Drawing.Point(20, 88)
$statusBox.Size = New-Object System.Drawing.Size(840, 118)
$form.Controls.Add($statusBox)

$installedLabel = New-Object System.Windows.Forms.Label
$installedLabel.AutoSize = $true
$installedLabel.Location = New-Object System.Drawing.Point(16, 28)
$statusBox.Controls.Add($installedLabel)

$serviceLabel = New-Object System.Windows.Forms.Label
$serviceLabel.AutoSize = $true
$serviceLabel.Location = New-Object System.Drawing.Point(16, 52)
$statusBox.Controls.Add($serviceLabel)

$listenerLabel = New-Object System.Windows.Forms.Label
$listenerLabel.AutoSize = $true
$listenerLabel.Location = New-Object System.Drawing.Point(16, 76)
$statusBox.Controls.Add($listenerLabel)

$versionLabel = New-Object System.Windows.Forms.Label
$versionLabel.AutoSize = $true
$versionLabel.Location = New-Object System.Drawing.Point(420, 28)
$statusBox.Controls.Add($versionLabel)

$errorLabel = New-Object System.Windows.Forms.Label
$errorLabel.AutoSize = $false
$errorLabel.Location = New-Object System.Drawing.Point(420, 52)
$errorLabel.Size = New-Object System.Drawing.Size(390, 44)
$statusBox.Controls.Add($errorLabel)

$buttonBox = New-Object System.Windows.Forms.GroupBox
$buttonBox.Text = "Actions"
$buttonBox.Location = New-Object System.Drawing.Point(20, 218)
$buttonBox.Size = New-Object System.Drawing.Size(840, 130)
$form.Controls.Add($buttonBox)

function Add-Button {
    param([string]$Text, [int]$X, [int]$Y, [scriptblock]$OnClick)
    $button = New-Object System.Windows.Forms.Button
    $button.Text = $Text
    $button.Size = New-Object System.Drawing.Size(190, 34)
    $button.Location = New-Object System.Drawing.Point($X, $Y)
    $button.Add_Click($OnClick)
    $buttonBox.Controls.Add($button)
    return $button
}

$null = Add-Button -Text "Start Worker Console" -X 18 -Y 28 -OnClick {
    Invoke-DetachedPowerShell -Arguments "-ExecutionPolicy Bypass -NoExit -File `"$script:StartScript`" -InstallDir `"$script:InstallDir`" -Port $script:Port" -WindowStyle "Minimized"
}
$null = Add-Button -Text "Stop Worker" -X 220 -Y 28 -OnClick {
    & $script:StopScript -InstallDir $script:InstallDir -Port $script:Port
}
$null = Add-Button -Text "Open Dashboard" -X 422 -Y 28 -OnClick {
    Start-Process "http://localhost:$script:Port/ui"
}
$null = Add-Button -Text "Open Install Log" -X 624 -Y 28 -OnClick {
    if (Test-Path $script:LogFile) { Start-Process "notepad.exe" $script:LogFile }
}
$null = Add-Button -Text "Repair / Reinstall" -X 18 -Y 74 -OnClick {
    Invoke-DetachedPowerShell -Arguments "-ExecutionPolicy Bypass -STA -WindowStyle Hidden -File `"$script:InstallScript`" -InstallDir `"$script:InstallDir`" -Port $script:Port -InteractiveUi -AutoInstallBuildTools" -WindowStyle "Hidden"
}
$null = Add-Button -Text "Enable Service" -X 220 -Y 74 -OnClick {
    Invoke-DetachedPowerShell -Arguments "-ExecutionPolicy Bypass -NoExit -File `"$script:RegisterScript`" -InstallDir `"$script:InstallDir`" -Port $script:Port"
}
$null = Add-Button -Text "Disable Service" -X 422 -Y 74 -OnClick {
    Invoke-DetachedPowerShell -Arguments "-ExecutionPolicy Bypass -NoExit -File `"$script:StopScript`" -InstallDir `"$script:InstallDir`" -Port $script:Port -RemoveService"
}
$null = Add-Button -Text "Refresh Status" -X 624 -Y 74 -OnClick {
    $script:RefreshTimer.Stop()
    $script:RefreshTimer.Start()
}

$logBox = New-Object System.Windows.Forms.GroupBox
$logBox.Text = "Recent log output"
$logBox.Location = New-Object System.Drawing.Point(20, 362)
$logBox.Size = New-Object System.Drawing.Size(840, 262)
$form.Controls.Add($logBox)

$logText = New-Object System.Windows.Forms.TextBox
$logText.Multiline = $true
$logText.ReadOnly = $true
$logText.ScrollBars = "Vertical"
$logText.Font = New-Object System.Drawing.Font("Consolas", 9)
$logText.Location = New-Object System.Drawing.Point(16, 28)
$logText.Size = New-Object System.Drawing.Size(808, 214)
$logBox.Controls.Add($logText)

$footer = New-Object System.Windows.Forms.Label
$footer.Text = "SmartScreen warning note: Windows still requires Authenticode signing to fully trust the installer."
$footer.AutoSize = $true
$footer.Location = New-Object System.Drawing.Point(20, 632)
$form.Controls.Add($footer)

function Refresh-StatusView {
    $status = Get-InstallStatus
    $installedLabel.Text = "Installed: " + ($(if ($status.Installed) { "Yes" } else { "No" }))
    $serviceLabel.Text = "Background service: $($status.Service)"
    $listenerLabel.Text = "Worker state: $($status.Listener)"
    $versionLabel.Text = "Worker version: $($status.ApiVersion)"
    $errorLabel.Text = if ($status.LastError) { "Last error: $($status.LastError)" } else { "Last error: none" }
    $logText.Text = if ($status.LastLog) { $status.LastLog } else { "No install log found yet." }
}

$script:RefreshTimer = New-Object System.Windows.Forms.Timer
$script:RefreshTimer.Interval = 3000
$script:RefreshTimer.Add_Tick({ Refresh-StatusView })
$script:RefreshTimer.Start()

Refresh-StatusView
[void]$form.ShowDialog()

