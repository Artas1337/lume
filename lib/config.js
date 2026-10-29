import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Preferências do usuário (nome na saudação e papel de parede), guardadas em dados/config.json.
// Ficam fora do app para sobreviver a reinstalações.

export const FUNDOS = ['aurora', 'noite', 'por-do-sol', 'oceano', 'grafite', 'imagem'];
const PADRAO = { nome: '', fundo: 'aurora', imagem: null, versao: 0 };

export function criarConfig(dir) {
  const arquivo = path.join(dir, 'config.json');
  let atual = { ...PADRAO };
  return {
    async carregar() {
      try { atual = { ...PADRAO, ...JSON.parse(await readFile(arquivo, 'utf8')) }; } catch {}
      return atual;
    },
    get: () => atual,
    async salvar(mudancas) {
      atual = { ...atual, ...mudancas };
      await mkdir(dir, { recursive: true });
      await writeFile(arquivo, JSON.stringify(atual, null, 2));
      return atual;
    },
  };
}

// Aceita só o que a tela sabe mostrar; o resto da entrada é ignorado
export function validar(entrada, atual) {
  const saida = {};
  if (typeof entrada?.nome === 'string') saida.nome = entrada.nome.replace(/\s+/g, ' ').trim().slice(0, 30);
  if (FUNDOS.includes(entrada?.fundo) && (entrada.fundo !== 'imagem' || atual.imagem)) saida.fundo = entrada.fundo;
  return saida;
}

// O que vai para as telas (o nome do arquivo da imagem fica só no servidor)
export function publico(c) {
  return { nome: c.nome, fundo: c.fundo, temImagem: Boolean(c.imagem), versao: c.versao };
}
