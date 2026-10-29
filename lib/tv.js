import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { NAV_SCRIPT } from './nav.js';

// Controla uma janela do Edge em tela cheia via Chrome DevTools Protocol (CDP).
// Teclas e mouse são injetados direto na página, sem depender do foco do Windows.

const CDP_PORT = 9333;
const EDGE_PATHS = [
  `${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
];

const KEYS = {
  up: { key: 'ArrowUp', code: 'ArrowUp', vk: 38 },
  down: { key: 'ArrowDown', code: 'ArrowDown', vk: 40 },
  left: { key: 'ArrowLeft', code: 'ArrowLeft', vk: 37 },
  right: { key: 'ArrowRight', code: 'ArrowRight', vk: 39 },
  ok: { key: 'Enter', code: 'Enter', vk: 13, text: '\r' },
  back: { key: 'Escape', code: 'Escape', vk: 27 },
  play: { key: ' ', code: 'Space', vk: 32, text: ' ' },
  backspace: { key: 'Backspace', code: 'Backspace', vk: 8 },
};

const NAV_KEYS = new Set(['up', 'down', 'left', 'right', 'ok', 'back']);

const sleep =(ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const cursorJs = (x, y) => `(() => {
  let c = document.getElementById('__pctv_cursor');
  if (!c) {
    c = document.createElement('div');
    c.id = '__pctv_cursor';
    c.style.cssText = 'position:fixed;left:0;top:0;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;' +
      'background:rgba(255,255,255,.92);border:3px solid rgba(0,0,0,.55);box-shadow:0 0 14px rgba(0,0,0,.5);' +
      'z-index:2147483647;pointer-events:none;transition:opacity .3s';
    document.documentElement.appendChild(c);
  }
  c.style.transform = 'translate(${x}px, ${y}px)';
  c.style.opacity = '1';
  clearTimeout(window.__pctvTimer);
  window.__pctvTimer = setTimeout(() => { c.style.opacity = '0'; }, 3000);
})()`;

export class Tv {
  constructor({ launcherUrl, profileDir, headless = false }) {
    this.launcherUrl = launcherUrl;
    this.profileDir = profileDir;
    this.headless = headless;
    this.ws = null;
    this.connecting = null;
    this.pending = new Map();
    this.nextId = 1;
    this.cursor = { x: 640, y: 360 };
    this.viewport = null;
  }

  async start() {
    if (!(await this.#debuggerUp())) this.#launchEdge();
    await this.#connect();
  }

  #launchEdge() {
    const exe = EDGE_PATHS.find((p) => existsSync(p));
    if (!exe) throw new Error('Microsoft Edge não encontrado');
    const args = [
      `--app=${this.launcherUrl}`,
      '--start-fullscreen',
      `--user-data-dir=${this.profileDir}`,
      `--remote-debugging-port=${CDP_PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-features=Translate',
    ];
    if (this.headless) args.push('--headless=new', '--window-size=1280,720');
    spawn(exe, args, { detached: true, stdio: 'ignore' }).unref();
  }

  async #debuggerUp() {
    try {
      return (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).ok;
    } catch {
      return false;
    }
  }

  async #findPage() {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      // Ignora abas de extensões (ex.: boas-vindas de VPN) e páginas internas
      const pages = list.filter((t) => t.type === 'page' && /^(https?:|about:blank)/.test(t.url));
      return pages.find((t) => t.url.startsWith(this.launcherUrl)) || pages[0];
    } catch {
      return null;
    }
  }

  async #connect() {
    for (let i = 0; i < 40; i++) {
      const target = await this.#findPage();
      if (target) return this.#open(target.webSocketDebuggerUrl);
      await sleep(500);
    }
    throw new Error('Edge não respondeu na porta de depuração');
  }

  #open(wsUrl) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.onopen = async () => {
        this.ws = ws;
        // Faz a página agir como focada mesmo se outra janela estiver na frente
        await this.#send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
        // Navegação por setas em toda página carregada daqui pra frente, e na atual
        await this.#send('Page.enable').catch(() => {});
        await this.#send('Page.addScriptToEvaluateOnNewDocument', { source: NAV_SCRIPT }).catch(() => {});
        await this.#send('Runtime.evaluate', { expression: NAV_SCRIPT }).catch(() => {});
        resolve();
      };
      ws.onerror = () => reject(new Error('falha ao conectar no CDP'));
      ws.onclose = () => {
        if (this.ws === ws) this.ws = null;
        for (const p of this.pending.values()) p.reject(new Error('CDP desconectado'));
        this.pending.clear();
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        const p = msg.id && this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
      };
    });
  }

  #send(method, params = {}) {
    const id = this.nextId++;
    const result = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params }));
    return result;
  }

  // Reabre o Edge se alguém fechou a janela
  async cmd(method, params) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.connecting ??= this.start().finally(() => { this.connecting = null; });
      await this.connecting;
    }
    return this.#send(method, params);
  }

  // Setas, OK e Voltar passam primeiro pela navegação injetada (lib/nav.js)
  async key(name) {
    if (NAV_KEYS.has(name)) {
      const { result } = await this.cmd('Runtime.evaluate', {
        expression: `window.__pctv ? window.__pctv.handle('${name}') : 'native'`,
        returnByValue: true,
      });
      const action = result?.value ?? 'native';
      if (action === 'done') return;
      if (action === 'play') return this.#press(KEYS.play);
      if (typeof action === 'object') {
        this.cursor = { x: action.x, y: action.y };
        return this.click();
      }
    }
    return this.#press(KEYS[name]);
  }

  async #press(k) {
    if (!k) return;
    const base = { key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk };
    await this.cmd('Input.dispatchKeyEvent', { type: k.text ? 'keyDown' : 'rawKeyDown', ...base, text: k.text });
    await this.cmd('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  }

  text(s) {
    if (s) return this.cmd('Input.insertText', { text: s });
  }

  home() {
    return this.cmd('Page.navigate', { url: this.launcherUrl });
  }

  // Fecha a janela do Edge da TV pela conexão do navegador (não da página)
  async fechar() {
    try {
      const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
      const ws = new WebSocket(webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
      ws.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
      await sleep(500);
      ws.close();
    } catch {
      // Edge já estava fechado
    }
  }

  async #size() {
    if (!this.viewport || Date.now() - this.viewport.at > 2000) {
      const { cssVisualViewport: v } = await this.cmd('Page.getLayoutMetrics');
      this.viewport = { w: v.clientWidth, h: v.clientHeight, at: Date.now() };
    }
    return this.viewport;
  }

  async move(dx, dy) {
    const { w, h } = await this.#size();
    const x = (this.cursor.x = clamp(this.cursor.x + dx, 0, w - 1));
    const y = (this.cursor.y = clamp(this.cursor.y + dy, 0, h - 1));
    await this.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await this.cmd('Runtime.evaluate', { expression: cursorJs(x, y) });
  }

  async click() {
    const { x, y } = this.cursor;
    await this.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await this.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }

  scroll(dy) {
    const { x, y } = this.cursor;
    return this.cmd('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy });
  }
}
