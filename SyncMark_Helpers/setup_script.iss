; Script pour Inno Setup pour créer l'installateur de SyncMark

[Setup]
; NOTE: Les GUID doivent être uniques pour chaque application.
; Vous pouvez en générer de nouveaux sur https://www.guidgenerator.com/
AppId={{C1234567-ABCD-1234-ABCD-1234567890AB}}
AppName=SyncMark
AppVersion=1.0
AppPublisher=Votre Nom
DefaultDirName={autopf}\SyncMark
DefaultGroupName=SyncMark
DisableProgramGroupPage=yes
OutputDir=.\installer
OutputBaseFilename=SyncMark_Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Files]
; IMPORTANT: Placez ce script à côté du dossier 'dist' créé par PyInstaller.
; Nous utilisons maintenant un seul exécutable pour le service d'arrière-plan.
Source: "dist\SyncMarkHost.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\SyncMarkSettings.exe"; DestDir: "{app}"; Flags: ignoreversion

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

; --- Enregistrement de l'hôte de messagerie natif ---
; Crée la clé pour que les navigateurs basés sur Chromium (Chrome, Edge, Opera) puissent trouver le manifeste
Root: HKCU; Subkey: "Software\Google\Chrome\NativeMessagingHosts\com.syncmark.host"; \
    ValueType: string; ValueName: ""; ValueData: "{app}\com.syncmark.host.json"; \
    Flags: uninsdeletekey

; Crée la clé pour que Firefox puisse trouver le manifeste
Root: HKCU; Subkey: "Software\Mozilla\NativeMessagingHosts\com.syncmark.host"; \
    ValueType: string; ValueName: ""; ValueData: "{app}\com.syncmark.host.json"; \
    Flags: uninsdeletekey

[Code]
// Cette section crée le fichier manifeste JSON dynamiquement après l'installation
// pour s'assurer que le chemin d'accès au programme est toujours correct.

procedure CurStepChanged(CurStep: TSetupStep);
var
  ManifestPath: string;
  ManifestLines: TArrayOfString;
begin
  if CurStep = ssPostInstall then
  begin
    // Définit le chemin complet du fichier manifeste
    ManifestPath := ExpandConstant('{app}\com.syncmark.host.json');
    
    // CORRECTION: La taille du tableau doit être 7 pour avoir des indices de 0 à 6.
    SetArrayLength(ManifestLines, 7);
    ManifestLines[0] := '{';
    ManifestLines[1] := '  "name": "com.syncmark.host",';
    ManifestLines[2] := '  "description": "Programme compagnon pour SyncMark",';
    // Utilise une fonction pour échapper les backslashes dans le chemin
    ManifestLines[3] := '  "path": "' + StringChange(ExpandConstant('{app}\SyncMarkHost.exe'), '\', '\\') + '",';
    ManifestLines[4] := '  "type": "stdio",';
    // IMPORTANT: N'oubliez pas de remplacer l'ID ci-dessous !
    ManifestLines[5] := '  "allowed_origins": ["chrome-extension://ID_DE_VOTRE_EXTENSION/"]';
    ManifestLines[6] := '}';
    
    // Sauvegarde le contenu dans le fichier
    SaveStringsToFile(ManifestPath, ManifestLines, False);
  end;
end;

[UninstallDelete]
; Supprime les fichiers de configuration et de log lors de la désinstallation
Type: files; Name: "{userdocs}\SyncMark\*"
