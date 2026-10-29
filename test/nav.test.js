import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NAV_SCRIPT } from '../lib/nav.js';

test('script de navegação é JavaScript válido para injetar na página', () => {
  assert.doesNotThrow(() => new Function(NAV_SCRIPT));
});

test('script expõe window.__pctv.handle e não instala duas vezes', () => {
  const window = {};
  const run = new Function('window', 'addEventListener', NAV_SCRIPT);
  run(window, () => {});
  assert.equal(typeof window.__pctv?.handle, 'function');

  const primeiro = window.__pctv;
  run(window, () => {});
  assert.equal(window.__pctv, primeiro);
});

test('no launcher (modo nativo) as teclas passam direto', () => {
  const window = { __pctvNative: true };
  new Function('window', 'addEventListener', NAV_SCRIPT)(window, () => {});
  for (const tecla of ['up', 'down', 'left', 'right', 'ok', 'back']) {
    assert.equal(window.__pctv.handle(tecla), 'native');
  }
});
