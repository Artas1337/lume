# Remove o PC-TV instalado: processos, atalhos, registro e a pasta (inclusive os logins salvos).
$dir = $PSScriptRoot

Write-Host ''
Write-Host '  PC-TV by Art Code  -  desinstalar' -ForegroundColor White
$resp = Read-Host "`n  Isso remove o PC-TV e os logins salvos dos streamings. Continuar? (S/N)"
if ($resp -notmatch '^[sS]') { exit 0 }

Get-CimInstance Win32_Process |
  Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine.Contains($dir) } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

foreach ($pasta in 'Desktop', 'Programs', 'Startup') {
  $lnk = Join-Path ([Environment]::GetFolderPath($pasta)) 'PC-TV.lnk'
  if (Test-Path $lnk) { Remove-Item $lnk -Force }
}
Remove-Item 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\PC-TV' -Recurse -Force -ErrorAction SilentlyContinue

# A pasta é apagada depois que este script termina, porque ele mesmo está dentro dela
Start-Process cmd.exe -ArgumentList "/c timeout /t 2 /nobreak >nul & rmdir /s /q `"$dir`"" -WindowStyle Hidden
Write-Host "`n  PC-TV removido." -ForegroundColor Green
Start-Sleep 2
