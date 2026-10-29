; Instalador do Lume (Inno Setup). Gerado por instalador\gerar-instalador.ps1, que passa
; AppVersion, AppDir (app pronto, com node.exe e Lume.exe) e OutDir.
; Instala só para o usuário atual, sem pedir administrador.

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{8F3B2C1A-5D4E-4F6A-9B7C-1E2D3F4A5B6C}
AppName=Lume
AppVersion={#AppVersion}
AppVerName=Lume {#AppVersion}
AppPublisher=Art Code
AppPublisherURL=https://github.com/Artas1337/lume
AppSupportURL=https://github.com/Artas1337/lume/issues
DefaultDirName={localappdata}\Programs\Lume
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir={#OutDir}
OutputBaseFilename=Lume-Instalador
SetupIconFile={#AppDir}\lume.ico
UninstallDisplayIcon={app}\Lume.exe
UninstallDisplayName=Lume
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
CloseApplications=no
VersionInfoVersion={#AppVersion}
VersionInfoCompany=Art Code
VersionInfoDescription=Instalador do Lume
VersionInfoProductName=Lume

[Languages]
Name: "ptbr"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na área de trabalho"; GroupDescription: "Atalhos:"
Name: "startup"; Description: "Abrir o Lume quando o Windows iniciar"; GroupDescription: "Atalhos:"; Flags: unchecked

[InstallDelete]
; Restos do instalador antigo (scripts), que o Lume.exe substituiu
Type: files; Name: "{app}\desinstalar.ps1"
Type: files; Name: "{app}\iniciar-oculto.vbs"
Type: files; Name: "{app}\criar-atalho.ps1"
Type: files; Name: "{app}\instalar-inicializacao.ps1"
Type: files; Name: "{userstartup}\Lume.lnk"

[Files]
Source: "{#AppDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Lume"; Filename: "{app}\Lume.exe"; WorkingDir: "{app}"
Name: "{autodesktop}\Lume"; Filename: "{app}\Lume.exe"; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{userstartup}\Lume"; Filename: "{app}\Lume.exe"; WorkingDir: "{app}"; Tasks: startup

[Run]
Filename: "{app}\Lume.exe"; Description: "Abrir o Lume agora"; Flags: postinstall nowait skipifsilent

[UninstallRun]
Filename: "{app}\node\node.exe"; Parameters: """{app}\lib\parar.js"""; WorkingDir: "{app}"; Flags: runhidden waituntilterminated; RunOnceId: "PararLume"

[UninstallDelete]
; Inclui os logins dos streamings, o nome e o papel de parede
Type: filesandordirs; Name: "{app}"

[Code]
// Fecha o Lume aberto antes de trocar os arquivos
procedure PararLume(Pasta: String);
var
  Codigo: Integer;
begin
  if FileExists(Pasta + '\node\node.exe') and FileExists(Pasta + '\lib\parar.js') then
    Exec(Pasta + '\node\node.exe', '"' + Pasta + '\lib\parar.js"', Pasta, SW_HIDE, ewWaitUntilTerminated, Codigo);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  PararLume(ExpandConstant('{app}'));
  Result := '';
end;

// O app se chamava PC-TV: traz os logins e as preferências e remove a instalação antiga
procedure MigrarPCTV();
var
  Antigo, Novo: String;
begin
  Antigo := ExpandConstant('{localappdata}\Programs\PC-TV');
  Novo := ExpandConstant('{app}');
  if not DirExists(Antigo) then Exit;
  if DirExists(Antigo + '\.perfil-edge') and not DirExists(Novo + '\.perfil-edge') then
    RenameFile(Antigo + '\.perfil-edge', Novo + '\.perfil-edge');
  if DirExists(Antigo + '\dados') and not DirExists(Novo + '\dados') then
    RenameFile(Antigo + '\dados', Novo + '\dados');
  DeleteFile(ExpandConstant('{userdesktop}\PC-TV.lnk'));
  DeleteFile(ExpandConstant('{userprograms}\PC-TV.lnk'));
  DeleteFile(ExpandConstant('{userstartup}\PC-TV.lnk'));
  RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\PC-TV');
  DelTree(Antigo, True, True, True);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    MigrarPCTV();
    // Registro do instalador antigo (scripts); o Inno Setup cria o seu próprio
    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\Lume');
  end;
end;
