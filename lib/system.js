import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- Windows: teclas virtuais de volume ----------
const VK = { up: 175, down: 174, mute: 173 };

// Um processo auxiliar fica aberto lendo códigos de tecla do stdin.
// Abrir um processo por clique custava ~0,5 s e acumulava fila ao segurar o botão.
// Instalado: Lume.exe --volume. Rodando do código sem compilar o Lume.exe: lib/volume.ps1.
function comandoWindows() {
  const exe = path.join(ROOT, 'Lume.exe');
  if (existsSync(exe)) return [exe, ['--volume']];
  return ['powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'lib', 'volume.ps1')]];
}

let proc = null;

function keyProcess() {
  if (proc && proc.exitCode === null && !proc.killed) return proc;
  const [arquivo, args] = comandoWindows();
  proc = spawn(arquivo, args, { windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] });
  proc.on('error', () => { proc = null; });
  return proc;
}

// ---------- Linux: PulseAudio/PipeWire (pactl), PipeWire puro (wpctl) ou ALSA (amixer) ----------
// Esses comandos terminam em milissegundos, então dá para chamar um por clique.
const LINUX = {
  pactl: {
    up: ['set-sink-volume', '@DEFAULT_SINK@', '+5%'],
    down: ['set-sink-volume', '@DEFAULT_SINK@', '-5%'],
    mute: ['set-sink-mute', '@DEFAULT_SINK@', 'toggle'],
  },
  wpctl: {
    up: ['set-volume', '-l', '1.0', '@DEFAULT_AUDIO_SINK@', '5%+'],
    down: ['set-volume', '@DEFAULT_AUDIO_SINK@', '5%-'],
    mute: ['set-mute', '@DEFAULT_AUDIO_SINK@', 'toggle'],
  },
  amixer: {
    up: ['-q', 'set', 'Master', '5%+'],
    down: ['-q', 'set', 'Master', '5%-'],
    mute: ['-q', 'set', 'Master', 'toggle'],
  },
};

export function comandoVolumeLinux(dir, { env = process.env, existe = existsSync } = {}) {
  const pastas = (env.PATH || '').split(':').filter(Boolean);
  for (const [programa, acoes] of Object.entries(LINUX)) {
    if (!acoes[dir]) return null;
    const caminho = pastas.map((p) => path.posix.join(p, programa)).find((c) => existe(c));
    if (caminho) return [caminho, acoes[dir]];
  }
  return null;
}

// Já deixa o processo pronto para o primeiro clique não demorar (nos testes não, para não prender o processo)
if (process.platform === 'win32' && !process.env.NODE_TEST_CONTEXT) keyProcess();

export function volume(dir) {
  if (process.platform === 'win32') {
    const code = VK[dir];
    if (code) keyProcess().stdin.write(`${code}\n`);
    return;
  }
  const comando = comandoVolumeLinux(dir);
  if (comando) spawn(comando[0], comando[1], { stdio: 'ignore' }).on('error', () => {});
}
