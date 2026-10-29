# Instalador do Lume: copia o app, baixa o Node.js oficial e cria os atalhos.
# Instala só para o usuário atual (sem administrador). Reinstalar mantém os logins salvos.
param(
  [string]$Pacote = $PSScriptRoot,
  [string]$Destino = "$env:LOCALAPPDATA\Programs\Lume",
  [switch]$Teste   # sem atalhos, sem registro, sem abrir e sem pausa
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # a barra de progresso deixa o download muito lento
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Passo($t) { Write-Host "`n>> $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "   OK  $t" -ForegroundColor Green }
function Pausar { if (-not $Teste) { Read-Host "`nPressione Enter para fechar" | Out-Null } }

Write-Host ''
Write-Host '  ==========================================' -ForegroundColor DarkGray
Write-Host '    Lume by Art Code  -  instalador' -ForegroundColor White
Write-Host '  ==========================================' -ForegroundColor DarkGray

try {
  # O app se chamava PC-TV: leva logins, preferências e o Node da instalação antiga para a nova
  $antigo = "$env:LOCALAPPDATA\Programs\PC-TV"
  $iniciavaComWindows = Test-Path (Join-Path ([Environment]::GetFolderPath('Startup')) 'PC-TV.lnk')
  if (-not $Teste -and (Test-Path $antigo) -and $antigo -ne $Destino) {
    Passo 'Trazendo seus dados do PC-TV (nome antigo do app)'
    Get-CimInstance Win32_Process |
      Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine.Contains($antigo) } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 800
    New-Item -ItemType Directory -Force $Destino | Out-Null
    foreach ($pasta in '.perfil-edge', 'dados', 'node') {
      if ((Test-Path "$antigo\$pasta") -and -not (Test-Path "$Destino\$pasta")) { Move-Item "$antigo\$pasta" "$Destino\$pasta" }
    }
    foreach ($local in 'Desktop', 'Programs', 'Startup') {
      Remove-Item (Join-Path ([Environment]::GetFolderPath($local)) 'PC-TV.lnk') -ErrorAction SilentlyContinue
    }
    Remove-Item 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\PC-TV' -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force $antigo -ErrorAction SilentlyContinue
    Ok 'logins, nome e papel de parede mantidos'
  }

  Passo 'Fechando o Lume, se estiver aberto'
  Get-CimInstance Win32_Process |
    Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine.Contains($Destino) } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 800
  Ok 'pronto'

  Passo 'Copiando os arquivos'
  New-Item -ItemType Directory -Force $Destino | Out-Null
  $codigo = Split-Path $Pacote -Parent
  if (Test-Path "$Pacote\app.zip") {
    # Rodando de dentro do Lume-Instalador.exe: o app já vem pronto, com dependências
    Expand-Archive -Path "$Pacote\app.zip" -DestinationPath $Destino -Force
  } elseif (Test-Path "$codigo\server.js") {
    # Rodando da pasta baixada do GitHub: copia o código; as dependências vêm depois do Node
    $itens = 'server.js', 'apps.json', 'package.json', 'package-lock.json', 'LICENSE', 'README.md',
      'iniciar-oculto.vbs', 'criar-atalho.ps1', 'instalar-inicializacao.ps1', 'lib', 'public'
    foreach ($i in $itens) { Copy-Item "$codigo\$i" $Destino -Recurse -Force }
    Copy-Item "$Pacote\desinstalar.ps1" $Destino -Force
  } else {
    throw 'Arquivos do Lume nao encontrados. Use o Lume-Instalador.exe ou rode este script de dentro da pasta "instalador" do projeto.'
  }
  Ok $Destino

  $node = "$Destino\node\node.exe"
  if (Test-Path $node) {
    Ok "Node.js ja instalado ($(& $node -v))"
  } else {
    Passo 'Baixando o Node.js oficial de nodejs.org (uns 30 MB)'
    $plataforma = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'win-arm64' } else { 'win-x64' }
    # Guardar antes de filtrar: no PowerShell 5.1 o Invoke-RestMethod não separa os itens no pipe
    $versoes = Invoke-RestMethod 'https://nodejs.org/dist/index.json'
    $lts = $versoes |
      Where-Object { $_.lts -and $_.files -contains "$plataforma-zip" } |
      Select-Object -First 1
    $nome = "node-$($lts.version)-$plataforma"
    $zip = Join-Path $env:TEMP "$nome.zip"
    Invoke-WebRequest "https://nodejs.org/dist/$($lts.version)/$nome.zip" -OutFile $zip -UseBasicParsing

    # Confere o arquivo contra a lista oficial de hashes antes de usar
    $somas = (Invoke-WebRequest "https://nodejs.org/dist/$($lts.version)/SHASUMS256.txt" -UseBasicParsing).Content
    $linha = ($somas -split "`n") | Where-Object { $_.Trim().EndsWith(" $nome.zip") } | Select-Object -First 1
    $esperado = if ($linha) { ($linha.Trim() -split '\s+')[0] } else { '' }
    if (-not $esperado -or (Get-FileHash $zip -Algorithm SHA256).Hash -ne $esperado.ToUpper()) {
      throw 'O download do Node.js veio corrompido. Rode o instalador de novo.'
    }

    Expand-Archive $zip -DestinationPath $env:TEMP -Force
    if (Test-Path "$Destino\node") { Remove-Item -Recurse -Force "$Destino\node" }
    Move-Item "$env:TEMP\$nome" "$Destino\node"
    Remove-Item $zip
    Ok "Node.js $($lts.version) (verificado)"
  }

  if (-not (Test-Path "$Destino\node_modules")) {
    Passo 'Instalando as dependencias'
    Push-Location $Destino
    try {
      & "$Destino\node\npm.cmd" ci --omit=dev --no-fund --no-audit --loglevel=error
      if ($LASTEXITCODE) { throw 'Nao consegui instalar as dependencias. Confira a internet e rode de novo.' }
    } finally { Pop-Location }
    Ok 'ws e qrcode'
  }

  if (-not $Teste) {
    Passo 'Criando atalhos'
    & "$Destino\criar-atalho.ps1" | Out-Null
    $menu = Join-Path ([Environment]::GetFolderPath('Programs')) 'Lume.lnk'
    $s = (New-Object -ComObject WScript.Shell).CreateShortcut($menu)
    $s.TargetPath = 'wscript.exe'
    $s.Arguments = "`"$Destino\iniciar-oculto.vbs`""
    $s.WorkingDirectory = $Destino
    $s.IconLocation = "$Destino\lume.ico,0"
    $s.Description = 'Abrir Lume'
    $s.Save()
    Ok 'area de trabalho e menu Iniciar'

    # Aparece em Configuracoes > Aplicativos, com opcao de desinstalar
    $chave = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Lume'
    New-Item -Force $chave | Out-Null
    $versao = (Get-Content "$Destino\package.json" -Raw | ConvertFrom-Json).version
    $textos = @{
      DisplayName = 'Lume'
      Publisher = 'Art Code'
      DisplayVersion = $versao
      InstallLocation = $Destino
      DisplayIcon = "$Destino\lume.ico"
      UninstallString = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$Destino\desinstalar.ps1`""
    }
    foreach ($k in $textos.Keys) { Set-ItemProperty $chave $k $textos[$k] }
    foreach ($k in 'NoModify', 'NoRepair') { New-ItemProperty $chave $k -Value 1 -PropertyType DWord -Force | Out-Null }
    Ok 'registrado em Configuracoes > Aplicativos'

    if ($iniciavaComWindows) { & "$Destino\instalar-inicializacao.ps1" | Out-Null }

    Start-Process wscript.exe "`"$Destino\iniciar-oculto.vbs`""
  }

  Write-Host "`n  PRONTO! O Lume esta instalado e abrindo." -ForegroundColor Green
  Write-Host '  - Abra de novo pelo atalho Lume na area de trabalho.' -ForegroundColor Gray
  Write-Host '  - Na primeira vez, o Windows pergunta sobre o firewall: permita em redes PRIVADAS.' -ForegroundColor Gray
  Write-Host '  - No celular (mesmo Wi-Fi), leia o QR code que aparece na tela.' -ForegroundColor Gray
  Pausar
} catch {
  Write-Host "`n   ERRO  $($_.Exception.Message)" -ForegroundColor Red
  Pausar
  exit 1
}
