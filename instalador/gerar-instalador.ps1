# Gera dist\Lume-Instalador.exe com o Inno Setup.
# O instalador leva tudo pronto: o app, as dependencias, o Node.js oficial e o Lume.exe.
# Nada e baixado nem executado por script na hora de instalar.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$raiz = Split-Path $PSScriptRoot -Parent
$dist = "$raiz\dist"
$tmp = Join-Path ([IO.Path]::GetTempPath()) 'lume-build'
$app = "$tmp\app"
$cache = Join-Path ([IO.Path]::GetTempPath()) 'lume-node-cache'
$versao = (Get-Content "$raiz\package.json" -Raw | ConvertFrom-Json).version

$iscc = @("$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe", "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) { throw 'Inno Setup nao encontrado. Instale com: winget install JRSoftware.InnoSetup' }

Remove-Item -Recurse -Force $tmp, $dist -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $app, $dist, $cache | Out-Null

Write-Host '>> Copiando o app'
foreach ($i in 'server.js', 'apps.json', 'package.json', 'package-lock.json', 'LICENSE', 'README.md', 'lib', 'public') {
  Copy-Item "$raiz\$i" $app -Recurse
}
Remove-Item "$app\lib\volume.ps1"   # o instalado usa o Lume.exe para o volume

Write-Host '>> Instalando dependencias de producao'
Push-Location $app
npm ci --omit=dev --no-fund --no-audit
if ($LASTEXITCODE) { throw 'npm ci falhou' }
Pop-Location

Write-Host '>> Icone e Lume.exe'
& "$PSScriptRoot\gerar-icone.ps1" -Saida "$app\lume.ico"
& "$PSScriptRoot\compilar-lume.ps1" -Pasta $app

Write-Host '>> Node.js oficial (LTS, conferido pelo SHA-256 de nodejs.org)'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$versoes = Invoke-RestMethod 'https://nodejs.org/dist/index.json'   # guardar antes de filtrar (PowerShell 5.1)
$lts = $versoes | Where-Object { $_.lts -and $_.files -contains 'win-x64-zip' } | Select-Object -First 1
$nome = "node-$($lts.version)-win-x64"
$zip = "$cache\$nome.zip"
if (-not (Test-Path $zip)) { Invoke-WebRequest "https://nodejs.org/dist/$($lts.version)/$nome.zip" -OutFile $zip -UseBasicParsing }
$somas = (Invoke-WebRequest "https://nodejs.org/dist/$($lts.version)/SHASUMS256.txt" -UseBasicParsing).Content
$linha = ($somas -split "`n") | Where-Object { $_.Trim().EndsWith(" $nome.zip") } | Select-Object -First 1
if (-not $linha -or (Get-FileHash $zip -Algorithm SHA256).Hash -ne ($linha.Trim() -split '\s+')[0].ToUpper()) {
  Remove-Item $zip
  throw 'O Node.js baixado nao bate com o hash oficial'
}
Expand-Archive $zip -DestinationPath $tmp -Force
New-Item -ItemType Directory -Force "$app\node" | Out-Null
Copy-Item "$tmp\$nome\node.exe", "$tmp\$nome\LICENSE" "$app\node"

Write-Host '>> Gerando o instalador'
& $iscc /Qp "/DAppVersion=$versao" "/DAppDir=$app" "/DOutDir=$dist" "$PSScriptRoot\lume.iss"
if ($LASTEXITCODE) { throw 'Inno Setup falhou' }
$exe = "$dist\Lume-Instalador.exe"
Write-Host "OK  $exe ($([math]::Round((Get-Item $exe).Length / 1MB, 1)) MB, Node $($lts.version))" -ForegroundColor Green
