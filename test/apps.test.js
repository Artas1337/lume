import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const apps = JSON.parse(await readFile(new URL('../apps.json', import.meta.url), 'utf8'));

test('apps.json tem os campos que o launcher usa', () => {
  assert.ok(apps.length > 0);
  for (const app of apps) {
    for (const campo of ['id', 'name', 'url', 'bg', 'color', 'accent']) {
      assert.equal(typeof app[campo], 'string', `${app.id ?? '?'}: falta "${campo}"`);
    }
  }
});

test('ids são únicos', () => {
  const ids = apps.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('todos os apps abrem por https', () => {
  for (const app of apps) assert.equal(new URL(app.url).protocol, 'https:', app.id);
});

test('cores de destaque são hexadecimais (usadas em color-mix no launcher)', () => {
  for (const app of apps) assert.match(app.accent, /^#[0-9a-f]{6}$/i, app.id);
});
