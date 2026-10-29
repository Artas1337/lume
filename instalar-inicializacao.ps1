# Cria atalho na pasta Inicializar do Windows para o PC-TV abrir junto com o sistema.
# Para remover: apague "PC-TV.lnk" em shell:startup
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'PC-TV.lnk'
$s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$s.TargetPath = 'wscript.exe'
$s.Arguments = "`"$dir\iniciar-oculto.vbs`""
$s.WorkingDirectory = $dir
$s.Save()
Write-Host "PC-TV vai iniciar com o Windows ($lnk)"
