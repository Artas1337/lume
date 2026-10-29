import { spawn } from 'node:child_process';

// Teclas virtuais de volume do Windows
const VK = { up: 175, down: 174, mute: 173 };

// Um único PowerShell fica aberto lendo códigos de tecla do stdin.
// Abrir um processo por clique custava ~0,5 s e acumulava fila ao segurar o botão.
const SCRIPT = `
Add-Type -Namespace W -Name K -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);'
while (($l = [Console]::In.ReadLine()) -ne $null) {
  $k = [byte]$l
  [W.K]::keybd_event($k, 0, 0, [UIntPtr]::Zero)
  [W.K]::keybd_event($k, 0, 2, [UIntPtr]::Zero)
}`;

let proc = null;

function keyProcess() {
  if (proc && proc.exitCode === null && !proc.killed) return proc;
  proc = spawn(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(SCRIPT, 'utf16le').toString('base64')],
    { windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] },
  );
  proc.on('error', () => { proc = null; });
  return proc;
}

keyProcess();

export function volume(dir) {
  const code = VK[dir];
  if (code) keyProcess().stdin.write(`${code}\n`);
}
