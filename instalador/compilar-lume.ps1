# Compila o Lume.exe (abre o app sem janela e controla o volume) com o csc que vem no Windows.
# Uso: powershell -File instalador\compilar-lume.ps1 [-Pasta <destino>]   (padrao: raiz do projeto)
param([string]$Pasta = (Split-Path $PSScriptRoot -Parent))

$ErrorActionPreference = 'Stop'
$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { throw 'Compilador do .NET Framework (csc.exe) nao encontrado.' }

$ico = Join-Path $Pasta 'lume.ico'
if (-not (Test-Path $ico)) { & "$PSScriptRoot\gerar-icone.ps1" -Saida $ico }

& $csc /nologo /target:winexe /optimize+ /codepage:65001 "/win32icon:$ico" "/out:$(Join-Path $Pasta 'Lume.exe')" "$PSScriptRoot\lume.cs"
if ($LASTEXITCODE) { throw 'Falha ao compilar o Lume.exe' }
Write-Host "OK  $(Join-Path $Pasta 'Lume.exe')"
