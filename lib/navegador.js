import { existsSync } from 'node:fs';
import path from 'node:path';

// Navegadores baseados em Chromium que o Lume sabe controlar (todos falam o DevTools Protocol).

const WINDOWS = (env) => [
  `${env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
];

// Chrome, Edge e Brave vêm com o Widevine, que Netflix, Disney+ e Prime exigem; o Chromium em geral não
const LINUX = [
  'google-chrome', 'google-chrome-stable', 'microsoft-edge', 'microsoft-edge-stable',
  'brave-browser', 'chromium', 'chromium-browser',
];

// LUME_NAVEGADOR força um navegador específico (caminho completo)
export function acharNavegador({ plataforma = process.platform, env = process.env, existe = existsSync } = {}) {
  if (env.LUME_NAVEGADOR) return env.LUME_NAVEGADOR;
  if (plataforma === 'win32') return WINDOWS(env).find((p) => existe(p)) ?? null;
  const pastas = (env.PATH || '').split(':').filter(Boolean);
  for (const nome of LINUX) {
    for (const pasta of pastas) {
      const caminho = path.posix.join(pasta, nome);
      if (existe(caminho)) return caminho;
    }
  }
  return null;
}
