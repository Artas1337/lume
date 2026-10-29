// Fecha o Lume que estiver rodando (servidor e janela da TV).
// O instalador usa antes de atualizar ou desinstalar, para nenhum arquivo ficar em uso.
const PORTA = Number(process.env.PORT) || 7777;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  await fetch(`http://127.0.0.1:${PORTA}/api/sair`, { method: 'POST', signal: AbortSignal.timeout(3000) });
  for (let i = 0; i < 20; i++) {
    await sleep(250);
    try {
      await fetch(`http://127.0.0.1:${PORTA}/api/apps`, { signal: AbortSignal.timeout(500) });
    } catch {
      break;
    }
  }
  await sleep(1000);   // tempo para o Edge soltar os arquivos do perfil
} catch {
  // Lume não estava aberto
}
