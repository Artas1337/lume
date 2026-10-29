# Cria o atalho "Lume" na area de trabalho para quem roda o Lume direto do codigo.
# (Quem usa o Lume-Instalador.exe ja ganha o atalho na instalacao.)
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$icoPath = Join-Path $dir 'lume.ico'
if (-not (Test-Path $icoPath)) { & "$dir\instalador\gerar-icone.ps1" -Saida $icoPath }

# Atalho com o nome antigo (PC-TV) sai, para nao ficar duplicado
$desktop = [Environment]::GetFolderPath('Desktop')
Remove-Item (Join-Path $desktop 'PC-TV.lnk') -ErrorAction SilentlyContinue

$lnk = Join-Path $desktop 'Lume.lnk'
$s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$s.TargetPath = 'wscript.exe'
$s.Arguments = "`"$dir\iniciar-oculto.vbs`""
$s.WorkingDirectory = $dir
$s.IconLocation = "$icoPath,0"
$s.Description = 'Abrir Lume'
$s.Save()
Write-Host "Atalho criado: $lnk"
