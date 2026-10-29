import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';
import { Tv } from './lib/tv.js';
import { volume } from './lib/system.js';
import { criarConfig, validar, publico } from './lib/config.js';

const PORT = Number(process.env.PORT) || 7777;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DADOS = process.env.PCTV_DADOS || path.join(ROOT, 'dados');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const IMAGENS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const config = criarConfig(DADOS);
await config.carregar();

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

function lerCorpo(req, limite) {
  return new Promise((resolve, reject) => {
    const partes = [];
    let total = 0;
    req.on('data', (parte) => {
      total += parte.length;
      if (total > limite) {
        reject(Object.assign(new Error('arquivo grande demais'), { status: 413 }));
        req.destroy();
      } else partes.push(parte);
    });
    req.on('end', () => resolve(Buffer.concat(partes)));
    req.on('error', reject);
  });
}

// Avisa o launcher e os controles abertos para atualizarem nome e papel de parede na hora
function avisarConfig() {
  const msg = JSON.stringify({ t: 'config', config: publico(config.get()) });
  for (const cliente of wss.clients) if (cliente.readyState === 1) cliente.send(msg);
}

async function salvarImagem(tipo, corpo) {
  const arquivo = `papel${IMAGENS[tipo]}`;
  const antigo = config.get().imagem;
  await mkdir(DADOS, { recursive: true });
  await writeFile(path.join(DADOS, arquivo), corpo);
  if (antigo && antigo !== arquivo) await rm(path.join(DADOS, antigo), { force: true });
  await config.salvar({ imagem: arquivo, fundo: 'imagem', versao: Date.now() });
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
    if (pathname === '/api/config') {
      if (req.method === 'POST') {
        const entrada = JSON.parse((await lerCorpo(req, 10_000)).toString('utf8') || '{}');
        await config.salvar(validar(entrada, config.get()));
        avisarConfig();
      }
      return sendJson(res, publico(config.get()));
    }
    if (pathname === '/api/papel-de-parede' && req.method === 'POST') {
      const tipo = req.headers['content-type'];
      if (!IMAGENS[tipo]) return res.writeHead(415).end('envie uma imagem JPG, PNG ou WebP');
      await salvarImagem(tipo, await lerCorpo(req, 20 * 1024 * 1024));
      avisarConfig();
      return sendJson(res, publico(config.get()));
    }
    if (pathname === '/papel') {
      const { imagem } = config.get();
      if (!imagem) throw new Error('sem papel de parede');
      return await sendFile(res, path.join(DADOS, imagem));
    }
    const name = pathname === '/' ? 'launcher.html' : pathname === '/remote' ? 'remote.html' : pathname.slice(1);
    const file = path.join(PUBLIC, name);
    if (!file.startsWith(PUBLIC + path.sep)) throw new Error('fora de public');
    await sendFile(res, file);
  } catch (err) {
    if (err.status) return res.writeHead(err.status).end(err.message);
    if (err instanceof SyntaxError) return res.writeHead(400).end('JSON inválido');
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

// Atalho clicado com o Lume já rodando: só garante que a tela da TV está aberta
server.on('error', async (err) => {
  if (err.code !== 'EADDRINUSE') throw err;
  try { await tv.start(); } catch (e) { console.error('Falha ao abrir o Edge:', e.message); }
  process.exit(0);
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Lume rodando. Controle no celular: http://${lanIp()}:${PORT}/remote`);
  try { await tv.start(); } catch (err) { console.error('Falha ao abrir o Edge:', err.message); }
});
