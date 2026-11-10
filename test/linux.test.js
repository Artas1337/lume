import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharNavegador } from '../lib/navegador.js';
import { comandoVolumeLinux } from '../lib/system.js';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const existeEm = (...caminhos) => (c) => caminhos.includes(c);

test('Linux: prefere Chrome/Edge (com Widevine) ao Chromium', () => {
  const env = { PATH: '/usr/local/bin:/usr/bin' };
  const existe = existeEm('/usr/bin/chromium', '/usr/bin/google-chrome');
  assert.equal(acharNavegador({ plataforma: 'linux', env, existe }), '/usr/bin/google-chrome');
  assert.equal(acharNavegador({ plataforma: 'linux', env, existe: existeEm('/usr/bin/chromium') }), '/usr/bin/chromium');
  assert.equal(acharNavegador({ plataforma: 'linux', env, existe: () => false }), null);
});

test('LUME_NAVEGADOR escolhe o navegador à mão', () => {
  assert.equal(acharNavegador({ plataforma: 'linux', env: { LUME_NAVEGADOR: '/opt/x/brave' }, existe: () => false }), '/opt/x/brave');
});

test('Windows continua usando o Edge', () => {
  const env = { 'ProgramFiles(x86)': 'C:\\PF86', ProgramFiles: 'C:\\PF', LOCALAPPDATA: 'C:\\L' };
  const edge = 'C:\\PF\\Microsoft\\Edge\\Application\\msedge.exe';
  assert.equal(acharNavegador({ plataforma: 'win32', env, existe: existeEm(edge) }), edge);
});

test('Linux: volume usa pactl, depois wpctl, depois amixer', () => {
  const env = { PATH: '/usr/bin' };
  assert.deepEqual(comandoVolumeLinux('up', { env, existe: existeEm('/usr/bin/pactl', '/usr/bin/amixer') }),
    ['/usr/bin/pactl', ['set-sink-volume', '@DEFAULT_SINK@', '+5%']]);
  assert.equal(comandoVolumeLinux('mute', { env, existe: existeEm('/usr/bin/wpctl') })[0], '/usr/bin/wpctl');
  assert.equal(comandoVolumeLinux('down', { env, existe: existeEm('/usr/bin/amixer') })[0], '/usr/bin/amixer');
  assert.equal(comandoVolumeLinux('down', { env, existe: () => false }), null);
  assert.equal(comandoVolumeLinux('qualquer', { env, existe: () => true }), null);
});

// Abre o Lume de verdade, com o navegador do sistema em modo headless (roda no CI do GitHub, em Ubuntu)
const podeAbrir = process.platform === 'linux' && acharNavegador();
test('Lume abre no Linux e mostra o launcher', { skip: podeAbrir ? false : 'só no Linux com Chrome, Edge ou Chromium', timeout: 60_000 }, async () => {
  const porta = 7790;
  const temp = await mkdtemp(path.join(os.tmpdir(), 'lume-linux-'));
  const servidor = spawn(process.execPath, ['server.js'], {
    cwd: RAIZ,
    stdio: 'ignore',
    env: {
      ...process.env,
      PORT: String(porta),
      PCTV_HEADLESS: '1',
      PCTV_PROFILE: path.join(temp, 'perfil'),
      PCTV_DADOS: path.join(temp, 'dados'),
      LUME_SEM_SANDBOX: '1',
    },
  });
  const saiu = new Promise((r) => servidor.on('exit', r));
  try {
    let launcher;
    for (let i = 0; i < 60 && !launcher; i++) {
      await sleep(500);
      try {
        const paginas = await (await fetch('http://127.0.0.1:9333/json/list')).json();
        launcher = paginas.find((p) => p.type === 'page' && p.url.startsWith(`http://localhost:${porta}/`) && p.title === 'Lume');
      } catch {}
    }
    assert.ok(launcher, 'o navegador deveria abrir o launcher do Lume');
    const apps = await (await fetch(`http://localhost:${porta}/api/apps`)).json();
    assert.ok(apps.length > 0);
    await fetch(`http://127.0.0.1:${porta}/api/sair`, { method: 'POST' });
    await Promise.race([saiu, sleep(5000)]);
  } finally {
    servidor.kill();
    await rm(temp, { recursive: true, force: true }).catch(() => {});
  }
});
