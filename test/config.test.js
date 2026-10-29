import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { criarConfig, validar, publico } from '../lib/config.js';

test('nome é limpo e limitado a 30 caracteres', () => {
  assert.deepEqual(validar({ nome: '  Arthur   Martins ' }, {}), { nome: 'Arthur Martins' });
  assert.equal(validar({ nome: 'x'.repeat(50) }, {}).nome.length, 30);
});

test('só aceita papéis de parede conhecidos', () => {
  assert.deepEqual(validar({ fundo: 'oceano' }, {}), { fundo: 'oceano' });
  assert.deepEqual(validar({ fundo: 'qualquer' }, {}), {});
});

test('"imagem" só vale depois de enviar uma imagem', () => {
  assert.deepEqual(validar({ fundo: 'imagem' }, { imagem: null }), {});
  assert.deepEqual(validar({ fundo: 'imagem' }, { imagem: 'papel.jpg' }), { fundo: 'imagem' });
});

test('salva e carrega de novo do disco', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pctv-config-'));
  try {
    await criarConfig(dir).salvar({ nome: 'Arthur', fundo: 'noite' });
    const lida = await criarConfig(dir).carregar();
    assert.equal(lida.nome, 'Arthur');
    assert.equal(lida.fundo, 'noite');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('a versão pública não expõe o arquivo da imagem', () => {
  assert.deepEqual(publico({ nome: 'A', fundo: 'imagem', imagem: 'papel.jpg', versao: 3 }),
    { nome: 'A', fundo: 'imagem', temImagem: true, versao: 3 });
});
