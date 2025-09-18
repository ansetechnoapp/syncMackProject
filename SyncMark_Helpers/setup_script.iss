; Script pour Inno Setup pour créer l'installateur de SyncMark

[Setup]
; NOTE: Les GUID doivent être uniques pour chaque application.
; Vous pouvez en générer de nouveaux sur https://www.guidgenerator.com/
AppId={{C1234567-ABCD-1234-ABCD-1234567890AB}}
AppName=SyncMark
AppVersion=2.0
AppPublisher=SyncMark Team
DefaultDirName={autopf}\SyncMark
DefaultGroupName=SyncMark
DisableProgramGroupPage=yes
OutputDir=.\installer
OutputBaseFilename=SyncMark_Setup_v2.0
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; IMPORTANT: Placez ce script à côté du dossier 'dist' créé par PyInstaller.
Source: "dist\SyncMarkHost.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\SyncMarkSettings.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "native_host_manifest.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "install_native_host.py"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Paramètres SyncMark"; Filename: "{app}\SyncMarkSettings.exe"
Name: "{commondesktop}\Paramètres SyncMark"; Filename: "{app}\SyncMarkSettings.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}";

[Registry]
; Lance SyncMarkHost.exe au démarrage de Windows pour l'utilisateur actuel
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
    ValueType: string; ValueName: "SyncMark"; ValueData: """{app}\SyncMarkHost.exe"""; \
    Flags: uninsdeletevalue

[Run]
; Installe automatiquement le Native Host après l'installation
Filename: "python"; Parameters: """{app}\install_native_host.py"" install"; \
    WorkingDir: "{app}"; StatusMsg: "Configuration du Native Messaging..."; \
    Flags: runhidden waituntilterminated

[Code]
// Cette section crée le fichier manifeste JSON dynamiquement après l'installation
procedure CurStepChanged(CurStep: TSetupStep);
var
  ManifestPath: String;
  ManifestContent: String;
begin
  if CurStep = ssPostInstall then
  begin
    // Chemin du fichier manifeste
    ManifestPath := ExpandConstant('{app}\com.syncmark.host.json');
    
    // Contenu du manifeste JSON
    ManifestContent := '{' + #13#10 +
      '  "name": "com.syncmark.host",' + #13#10 +
      '  "description": "SyncMark Native Host",' + #13#10 +
      '  "path": "' + StringChange(ExpandConstant('{app}\SyncMarkHost.exe'), '\', '\\') + '",' + #13#10 +
      '  "type": "stdio",' + #13#10 +
      '  "allowed_origins": [' + #13#10 +
      '    "chrome-extension://YOUR_EXTENSION_ID_HERE/"' + #13#10 +
      '  ]' + #13#10 +
      '}';
    
    // Sauvegarder le fichier
    SaveStringToFile(ManifestPath, ManifestContent, False);
  end;
end;

[UninstallDelete]
; Supprime les fichiers de configuration et de log lors de la désinstallation
Type: files; Name: "{userdocs}\SyncMark\*"
