; Bjorq 3D Worker — Inno Setup Script
; Builds Bjorq3DWorkerSetup.exe
;
; Prerequisites on build machine:
;   - Inno Setup 6+ (https://jrsoftware.org/isinfo.php)
;   - The trellis-worker/ directory
;
; Build:  iscc Bjorq3DWorker.iss

[Setup]
AppName=Bjorq 3D Worker
AppVersion=2.5.4
AppPublisher=Bjorq
AppPublisherURL=https://github.com/n1bman/bjorq-asset-wizard
DefaultDirName={commonpf}\Bjorq3DWorker
DefaultGroupName=Bjorq 3D Worker
OutputDir=..\..\dist\windows
OutputBaseFilename=Bjorq3DWorkerSetup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin
UninstallDisplayIcon={app}\worker.py
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "service"; Description: "Run Bjorq 3D Worker in the background and start it with Windows"; Flags: unchecked

[Files]
; Worker Python files
Source: "..\worker.py"; DestDir: "{app}\worker"; Flags: ignoreversion
Source: "..\jobs.py"; DestDir: "{app}\worker"; Flags: ignoreversion
Source: "..\trellis_bridge.py"; DestDir: "{app}\worker"; Flags: ignoreversion
Source: "..\requirements.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\ui\*"; DestDir: "{app}\worker\ui"; Flags: ignoreversion recursesubdirs
; Windows scripts
Source: "install.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "start-worker.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "stop-worker.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "register-service.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "healthcheck.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "cleanup.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion

[Icons]
; Use {sysnative} to ensure 64-bit PowerShell even on 32-bit Inno Setup process
Name: "{group}\Start Bjorq 3D Worker"; Filename: "{sysnative}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NoExit -File ""{app}\scripts\start-worker.ps1"" -InstallDir ""{commonappdata}\Bjorq3DWorker"""; WorkingDir: "{app}"; Comment: "Start the 3D generation worker"
Name: "{group}\Stop Bjorq 3D Worker"; Filename: "{sysnative}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NoExit -File ""{app}\scripts\stop-worker.ps1"" -InstallDir ""{commonappdata}\Bjorq3DWorker"""; WorkingDir: "{app}"; Comment: "Stop the worker and background service"
Name: "{group}\Enable Background Service"; Filename: "{sysnative}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NoExit -File ""{app}\scripts\register-service.ps1"" -InstallDir ""{commonappdata}\Bjorq3DWorker"""; WorkingDir: "{app}"; Comment: "Install the worker as a Windows service"
Name: "{group}\Disable Background Service"; Filename: "{sysnative}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NoExit -File ""{app}\scripts\stop-worker.ps1"" -InstallDir ""{commonappdata}\Bjorq3DWorker"" -RemoveService"; WorkingDir: "{app}"; Comment: "Remove the Windows service and stop the worker"
Name: "{group}\Worker Dashboard"; Filename: "http://localhost:8080/ui"
Name: "{group}\Uninstall Bjorq 3D Worker"; Filename: "{uninstallexe}"

[Run]
; Run install.ps1 via 64-bit PowerShell after setup extracts files
Filename: "{sysnative}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\install.ps1"" -InstallDir ""{commonappdata}\Bjorq3DWorker"" -NoService"; StatusMsg: "Installing TRELLIS.2 environment (this may take 15-30 minutes)..."; Flags: runhidden waituntilterminated
Filename: "{sysnative}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NoExit -File ""{app}\scripts\start-worker.ps1"" -InstallDir ""{commonappdata}\Bjorq3DWorker"""; Description: "Launch Bjorq 3D Worker now"; Flags: nowait postinstall skipifsilent unchecked
Filename: "{sysnative}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NoExit -File ""{app}\scripts\register-service.ps1"" -InstallDir ""{commonappdata}\Bjorq3DWorker"""; Description: "Enable background service and start with Windows"; Flags: nowait postinstall skipifsilent unchecked; Tasks: service

[UninstallRun]
Filename: "{sysnative}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\cleanup.ps1"" -InstallDir ""{commonappdata}\Bjorq3DWorker"""; Flags: runhidden waituntilterminated

[UninstallDelete]
Type: filesandordirs; Name: "{commonappdata}\Bjorq3DWorker"

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
  // Check for NVIDIA GPU
  if not FileExists(ExpandConstant('{sys}\nvidia-smi.exe')) then
  begin
    if MsgBox('NVIDIA GPU driver not detected. The worker requires an NVIDIA GPU with CUDA support.' + #13#10 + #13#10 + 'Continue anyway?', mbConfirmation, MB_YESNO) = IDNO then
      Result := False;
  end;
end;
