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
AppVersion=2.4.3
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
Source: "register-service.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "healthcheck.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion

[Icons]
Name: "{group}\Start Bjorq 3D Worker"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\start-worker.ps1"" -InstallDir ""{commonappdata}\Bjorq3DWorker"""; WorkingDir: "{app}"
Name: "{group}\Worker Dashboard"; Filename: "http://localhost:8080/ui"
Name: "{group}\Uninstall Bjorq 3D Worker"; Filename: "{uninstallexe}"

[Run]
; Run the full installer after setup extracts files
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\install.ps1"" -InstallDir ""{commonappdata}\Bjorq3DWorker"""; StatusMsg: "Installing TRELLIS.2 environment (this may take 15-30 minutes)..."; Flags: runhidden waituntilterminated

[UninstallRun]
; Stop and remove service
Filename: "powershell.exe"; Parameters: "-Command ""& nssm stop Bjorq3DWorker 2>$null; nssm remove Bjorq3DWorker confirm 2>$null"""; Flags: runhidden

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
