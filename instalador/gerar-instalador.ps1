# Gera dist\Lume-Instalador.exe com o IExpress (vem no Windows).
# O .exe leva o app e as dependencias; o Node.js e baixado de nodejs.org na hora de instalar.
# (Nome sem "setup"/"install" para o Windows nao pedir administrador sem necessidade.)
$ErrorActionPreference = 'Stop'
$raiz = Split-Path $PSScriptRoot -Parent
$dist = "$raiz\dist"
$tmp = Join-Path ([IO.Path]::GetTempPath()) 'pctv-build'   # caminho sem espacos para o IExpress
$app = "$tmp\app"
$pacote = "$tmp\pacote"

Remove-Item -Recurse -Force $tmp, $dist -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $app, $pacote, $dist | Out-Null

Write-Host '>> Copiando o app'
$itens = 'server.js', 'apps.json', 'package.json', 'package-lock.json', 'LICENSE', 'README.md',
  'iniciar-oculto.vbs', 'criar-atalho.ps1', 'instalar-inicializacao.ps1', 'lib', 'public'
foreach ($i in $itens) { Copy-Item "$raiz\$i" $app -Recurse }
Copy-Item "$PSScriptRoot\desinstalar.ps1" $app

Write-Host '>> Instalando dependencias de producao'
Push-Location $app
npm ci --omit=dev --no-fund --no-audit
if ($LASTEXITCODE) { throw 'npm ci falhou' }
Pop-Location

Write-Host '>> Compactando'
Compress-Archive "$app\*" "$pacote\app.zip"
Copy-Item "$PSScriptRoot\instalar.ps1", "$PSScriptRoot\setup.cmd" $pacote

Write-Host '>> Gerando o .exe'
$exe = "$tmp\Lume-Instalador.exe"
@"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=%PostInstallCmd%
AdminQuietInstCmd=%AdminQuietInstCmd%
UserQuietInstCmd=%UserQuietInstCmd%
SourceFiles=SourceFiles
[Strings]
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=$exe
FriendlyName=Lume by Art Code
AppLaunched=cmd /c setup.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
FILE0="app.zip"
FILE1="instalar.ps1"
FILE2="setup.cmd"
[SourceFiles]
SourceFiles0=$pacote\
[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=
"@ | Set-Content "$tmp\pctv.sed" -Encoding ASCII

Start-Process iexpress.exe -ArgumentList '/N', '/Q', "$tmp\pctv.sed" -Wait -NoNewWindow
if (-not (Test-Path $exe)) { throw 'IExpress nao gerou o instalador' }
Copy-Item $exe $dist
Write-Host "OK  $dist\Lume-Instalador.exe ($([math]::Round((Get-Item $exe).Length / 1MB, 2)) MB)" -ForegroundColor Green
