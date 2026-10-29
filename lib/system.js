import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Teclas virtuais de volume do Windows
const VK = { up: 175, down: 174, mute: 173 };

// Um processo auxiliar fica aberto lendo códigos de tecla do stdin.
// Abrir um processo por clique custava ~0,5 s e acumulava fila ao segurar o botão.
// Instalado: Lume.exe --volume. Rodando do código sem compilar o Lume.exe: lib/volume.ps1.
function comando() {
  const exe = path.join(ROOT, 'Lume.exe');
  if (existsSync(exe)) return [exe, ['--volume']];
  return ['powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'lib', 'volume.ps1')]];
}

let proc = null;

function keyProcess() {
  if (proc && proc.exitCode === null && !proc.killed) return proc;
  const [arquivo, args] = comando();
  proc = spawn(arquivo, args, { windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] });
  proc.on('error', () => { proc = null; });
  return proc;
}

keyProcess();

export function volume(dir) {
  const code = VK[dir];
  if (code) keyProcess().stdin.write(`${code}\n`);
}
