# PC-TV: o computador vira uma TV

Launcher de streaming em tela cheia, controlado pelo **celular como controle remoto**. Liga o PC na TV, abre o PC-TV e escolhe entre Netflix, YouTube, Prime Video, Disney+, HBO Max, Globoplay, Apple TV+, Paramount+, Crunchyroll, Pluto TV, Twitch e Spotify sem tocar no mouse.

![CI](https://github.com/Artas1337/pc-tv/actions/workflows/ci.yml/badge.svg)

### ⬇️ [Baixar o instalador para Windows](https://github.com/Artas1337/pc-tv/releases/latest/download/PC-TV-Instalador.exe)

Dois cliques no arquivo baixado e pronto. Se o Windows mostrar "O Windows protegeu o computador", clique em **Mais informações** → **Executar assim mesmo** (o programa não tem assinatura digital paga).

> Projeto de portfólio. Node.js puro no servidor, controle do navegador pelo Chrome DevTools Protocol e uma navegação "estilo TV" injetada em sites que não foram feitos para controle remoto.

## Funcionalidades

- **Controle remoto no celular**: escaneie o QR code da tela e use direcional, OK, Voltar, Início, play/pause e volume. Sem instalar app.
- **Touchpad e teclado** no celular para login e busca (dois dedos rolam a página)
- **Navegação por setas em qualquer site**: uma moldura marca o item selecionado e as setas pulam para o vizinho mais próximo naquela direção
- No player de vídeo as setas voltam ao normal (avançar, volume) e OK vira play/pause
- **Launcher animado**: aurora na cor do app focado, efeito de abertura em que o card cresce até ocupar a tela, sons discretos e descanso de tela com relógio
- **Personalização**: saudação com o seu nome ("Boa tarde, Arthur. O que vamos assistir hoje?") e papel de parede (5 temas ou uma foto do PC ou do celular), ajustados na própria TV ou na aba Ajustes do controle
- Volume do Windows pelo celular, sem atraso
- Atalho na área de trabalho e opção de iniciar junto com o Windows

## Decisões técnicas

| Problema | Solução |
|---|---|
| Netflix, Disney+ e Prime não navegam por setas no navegador | Script injetado em toda página (`Page.addScriptToEvaluateOnNewDocument`) faz **navegação espacial**: escolhe o elemento clicável mais próximo na direção, com peso maior para a mesma linha (direita/esquerda) e para a fileira seguinte (cima/baixo). |
| Teclas e cliques precisam chegar mesmo sem foco na janela | Eventos enviados pelo **DevTools Protocol** (`Input.dispatchKeyEvent`/`dispatchMouseEvent`), que o navegador trata como entrada real, mais `Emulation.setFocusEmulationEnabled`. |
| Carrosséis escondem itens fora da tela e quebram se rolados à força | Só entram na navegação itens inteiros na horizontal; para avançar o carrossel, a moldura passa pela seta do próprio site. |
| Modais (detalhes do filme) | A navegação fica presa dentro do `[role=dialog]` aberto; Voltar manda Esc para fechar. |
| Volume com atraso de ~0,5 s por clique | Um único PowerShell fica aberto lendo códigos de tecla do stdin e chama `keybd_event`, em vez de abrir um processo por clique. |
| Login dos streamings não pode se perder | Edge com perfil próprio (`--user-data-dir`) em vez de modo quiosque, que apaga os dados ao fechar. |
| Atalho clicado com o PC-TV já rodando | A segunda instância detecta `EADDRINUSE`, só reabre a tela da TV e sai. |
| Extensões do navegador abrindo abas próprias | Edge iniciado com `--disable-extensions` e o CDP ignora alvos `chrome-extension://`. |

## Stack

| Camada | Tecnologias |
|---|---|
| Servidor | Node.js (sem framework), `ws`, `qrcode` |
| Navegador | Microsoft Edge controlado via Chrome DevTools Protocol |
| Telas | HTML, CSS e JavaScript puros (`@property`, `color-mix`, Canvas, Web Audio) |
| Windows | PowerShell (`keybd_event`), VBScript para iniciar sem janela |
| Testes | `node:test` e CI no GitHub Actions |

## Como rodar

Requisitos: Windows, [Node.js](https://nodejs.org) 22+ e Microsoft Edge.

```bash
npm install
npm start
```

1. O Edge abre em tela cheia com o launcher.
2. No celular, no mesmo Wi-Fi, escaneie o QR code ou abra `http://IP-DO-PC:7777/remote`.
3. Na primeira vez, permita o Node no firewall em **redes privadas**.
4. Faça login em cada serviço uma vez (abas Touchpad e Teclado). O login fica salvo.

Atalho na área de trabalho e início com o Windows:

```powershell
powershell -ExecutionPolicy Bypass -File criar-atalho.ps1
powershell -ExecutionPolicy Bypass -File instalar-inicializacao.ps1
```

Para adicionar ou remover serviços, edite `apps.json`.

## Instalador

Para quem só quer usar: baixe o `.exe` em [Releases](https://github.com/Artas1337/pc-tv/releases/latest). Quem baixou o código pode dar dois cliques em `Instalar PC-TV.cmd`.

Para gerar o `.exe` de novo:

```powershell
powershell -ExecutionPolicy Bypass -File instalador\gerar-instalador.ps1
```

Gera `dist\PC-TV-Instalador.exe` com o IExpress do Windows. O instalador copia o app para `%LOCALAPPDATA%\Programs\PC-TV`, baixa o Node.js oficial (conferido pelo SHA-256 de nodejs.org), cria os atalhos e registra a desinstalação em Configurações → Aplicativos. Não pede administrador.

## Estrutura

```
server.js            HTTP + WebSocket (porta 7777)
lib/tv.js            abre o Edge e envia teclas/mouse via CDP (porta 9333, só localhost)
lib/nav.js           navegação espacial injetada nas páginas
lib/system.js        volume do Windows
public/launcher.html tela da TV
public/remote.html   controle do celular
lib/config.js        nome e papel de parede (salvos em dados/)
apps.json            lista de streamings
```

> Qualquer aparelho na mesma rede consegue abrir o controle. Use em rede doméstica.

## Licença

MIT © Arthur Martins
