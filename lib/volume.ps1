# Teclas de volume para quem roda o Lume do codigo sem o Lume.exe (npm run compilar gera o .exe).
# Le codigos de tecla do stdin: 173 mudo, 174 abaixar, 175 aumentar.
Add-Type -Namespace W -Name K -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);'
while (($l = [Console]::In.ReadLine()) -ne $null) {
  $k = 0
  if (-not [byte]::TryParse($l.Trim(), [ref]$k) -or $k -lt 173 -or $k -gt 175) { continue }
  [W.K]::keybd_event($k, 0, 0, [UIntPtr]::Zero)
  [W.K]::keybd_event($k, 0, 2, [UIntPtr]::Zero)
}
