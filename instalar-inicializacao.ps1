# Cria atalho na pasta Inicializar do Windows para o Lume abrir junto com o sistema.
# Para remover: apague "Lume.lnk" em shell:startup
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'Lume.lnk'
$s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$s.TargetPath = 'wscript.exe'
$s.Arguments = "`"$dir\iniciar-oculto.vbs`""
$s.WorkingDirectory = $dir
if (Test-Path "$dir\lume.ico") { $s.IconLocation = "$dir\lume.ico,0" }
$s.Save()
Write-Host "Lume vai iniciar com o Windows ($lnk)"
