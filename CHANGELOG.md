# Histórico de versões

Todas as versões ficam em [Releases](https://github.com/Artas1337/lume/releases).

## v0.3.1 (29/10/2026)

### Corrigido
- O Windows Defender bloqueava e apagava o instalador (`Program:Win32/Wacapew.A!ml`, um falso positivo). O instalador foi refeito do zero:
  - agora é feito com **Inno Setup**, com assistente em português;
  - já leva o app, o Node.js e as dependências dentro, sem baixar nada durante a instalação;
  - o `Lume.exe` (C#) abre o app sem janela e controla o volume, no lugar do VBScript e do PowerShell com comando codificado.
- O instalador fecha o Lume aberto antes de atualizar ou desinstalar (`/api/sair`, aceito só a partir do próprio PC).

## v0.3.0 (29/10/2026)

### Mudado
- **O PC-TV passou a se chamar Lume**, com símbolo novo: um ponto de luz com halo.
- Instalar por cima do PC-TV mantém os logins, o nome, o papel de parede e a opção de abrir com o Windows.

## v0.2.0 (29/10/2026)

### Adicionado
- Saudação com o seu nome: "Boa tarde, Arthur. O que vamos assistir hoje?".
- Papel de parede trocável: Aurora, Noite, Pôr do sol, Oceano, Grafite ou uma foto sua.
- Painel de Ajustes na TV (seta para cima a partir da primeira fileira de apps) e aba Ajustes no celular, com envio de foto da galeria.

## v0.1.0 (29/10/2026)

### Adicionado
- Launcher em tela cheia com 12 serviços de streaming, animações, sons e descanso de tela.
- Celular como controle remoto pelo QR code: direcional, touchpad, teclado e volume.
- Navegação por setas em sites que não foram feitos para controle remoto.
- Instalador para Windows e atalho na área de trabalho.
