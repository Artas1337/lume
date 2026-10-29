import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';
import { Tv } from './lib/tv.js';
import { volume } from './lib/system.js';

const PORT = Number(process.env.PORT) || 7777;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const tv = new Tv({
  launcherUrl: `http://localhost:${PORT}/`,
  profileDir: process.env.PCTV_PROFILE || path.join(ROOT, '.perfil-edge'),
  headless: process.env.PCTV_HEADLESS === '1',
});

// IP do PC na rede local, para o celular acessar
function lanIp() {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  return ips.find((ip) => ip.startsWith('192.168.')) || ips[0] || 'localhost';
}

async function sendFile(res, file) {
  const body = await readFile(file);
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(body);
}

function sendJson(res, data) {
  res.writeHead(200, { 'Content-Type': MIME['.json'] });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (pathname === '/api/apps') return await sendFile(res, path.join(ROOT, 'apps.json'));
    if (pathname === '/api/info') {
      const remoteUrl = `http://${lanIp()}:${PORT}/remote`;
      const qr = await QRCode.toDataURL(remoteUrl, { margin: 1, width: 320 });
      return sendJson(res, { remoteUrl, qr });
    }
    const name = pathname === '/' ? 'launcher.html' : pathname === '/remote' ? 'remote.html' : pathname.slice(1);
    const file = path.join(PUBLIC, name);
    if (!file.startsWith(PUBLIC + path.sep)) throw new Error('fora de public');
    await sendFile(res, file);
  } catch {
    res.writeHead(404).end('não encontrado');
  }
});

async function handle(m) {
  switch (m.t) {
    case 'key': return tv.key(m.k);
    case 'text': return tv.text(String(m.s ?? ''));
    case 'move': return tv.move(Number(m.dx) || 0, Number(m.dy) || 0);
    case 'click': return tv.click();
    case 'scroll': return tv.scroll(Number(m.dy) || 0);
    case 'home': return tv.home();
    case 'vol': return volume(m.v);
  }
}

const wss = new WebSocketServer({ server, path: '/ws' });
// O ws repassa os erros do servidor HTTP; quem trata é o server.on('error') abaixo
wss.on('error', () => {});
wss.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    try { await handle(msg); } catch (err) { console.error(`[${msg.t}]`, err.message); }
  });
});

// Atalho clicado com o PC-TV já rodando: só garante que a tela da TV está aberta
server.on('error', async (err) => {
  if (err.code !== 'EADDRINUSE') throw err;
  try { await tv.start(); } catch (e) { console.error('Falha ao abrir o Edge:', e.message); }
  process.exit(0);
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`PC-TV rodando. Controle no celular: http://${lanIp()}:${PORT}/remote`);
  try { await tv.start(); } catch (err) { console.error('Falha ao abrir o Edge:', err.message); }
});
