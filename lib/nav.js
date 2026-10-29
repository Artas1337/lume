// Navegação estilo TV injetada em todas as páginas (Netflix, Disney+, Prime...).
// Os sites não navegam por setas no navegador, então mantemos um "item selecionado"
// com moldura e movemos entre elementos clicáveis pela posição na tela.
// Dentro do player de vídeo as setas voltam a ser teclas normais (avançar, volume).

function install() {
  if (window.__pctv) return;

  const SEL = 'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="tab"], ' +
    '[role="menuitem"], [role="option"], [tabindex]:not([tabindex="-1"])';
  let cur = null;
  let ring = null;
  let raf = 0;

  function playerActive() {
    if (document.fullscreenElement) return true;
    if (/\/(watch|play|video)\//.test(location.pathname)) return true;
    const sdk = document.querySelector('[class*="webPlayerSDK"], [class*="atvwebplayersdk"]');
    return !!(sdk && sdk.getBoundingClientRect().height > innerHeight * 0.8);
  }

  function scope() {
    const dialogs = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog[open]')].filter((d) => {
      const r = d.getBoundingClientRect();
      return r.width > 50 && r.height > 50 && (!d.checkVisibility || d.checkVisibility());
    });
    return dialogs.at(-1) || document;
  }

  function usable(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || el.disabled) return false;
    if (r.width * r.height > innerWidth * innerHeight * 0.6) return false;
    // Só itens inteiros na horizontal: carrosséis escondem os de fora e rolar eles quebra o layout
    if (r.left < -2 || r.right > innerWidth + 2) return false;
    return !el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  }

  function candidates() {
    const all = [...scope().querySelectorAll(SEL)].filter(usable);
    const set = new Set(all);
    // Mantém só o elemento mais externo (ex.: card clicável com botão dentro)
    return all.filter((el) => {
      for (let p = el.parentElement; p; p = p.parentElement) if (set.has(p)) return false;
      return true;
    });
  }

  function hideRing() {
    if (ring) ring.style.display = 'none';
  }

  function paint() {
    if (!cur || !cur.isConnected) return hideRing();
    if (!ring) {
      ring = document.createElement('div');
      ring.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;border:4px solid #fff;' +
        'border-radius:10px;box-shadow:0 0 0 3px rgba(0,0,0,.55),0 0 26px rgba(255,255,255,.55);transition:all .12s ease-out';
    }
    if (!ring.isConnected) document.documentElement.appendChild(ring);
    const r = cur.getBoundingClientRect();
    Object.assign(ring.style, {
      display: 'block',
      left: `${r.left - 6}px`,
      top: `${r.top - 6}px`,
      width: `${r.width + 12}px`,
      height: `${r.height + 12}px`,
    });
  }

  function track(ms = 900) {
    const end = performance.now() + ms;
    cancelAnimationFrame(raf);
    const loop = () => {
      paint();
      if (performance.now() < end) raf = requestAnimationFrame(loop);
    };
    loop();
  }

  addEventListener('scroll', () => cur && paint(), true);

  function select(el) {
    cur = el;
    try { el.focus({ preventScroll: true }); } catch {}
    const r = el.getBoundingClientRect();
    if (r.top < 90 || r.bottom > innerHeight - 20) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    track();
  }

  function firstOnScreen(list) {
    const pos = (el) => el.getBoundingClientRect();
    const onScreen = list.filter((el) => pos(el).top >= 0 && pos(el).bottom <= innerHeight);
    return (onScreen.length ? onScreen : list).sort((a, b) => pos(a).top - pos(b).top || pos(a).left - pos(b).left)[0];
  }

  function move(dir) {
    const list = candidates();
    if (!list.length) return;
    if (!cur || !list.includes(cur)) {
      const ae = document.activeElement;
      if (ae && list.includes(ae)) cur = ae;
      else return select(firstOnScreen(list));
    }
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    let best = null;
    let bestScore = Infinity;
    for (const el of list) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2;
      const by = b.top + b.height / 2;
      let score;
      if (dir === 'right' || dir === 'left') {
        const ok = dir === 'right' ? b.left >= a.right - 8 || bx > a.right : b.right <= a.left + 8 || bx < a.left;
        if (!ok) continue;
        const gap = Math.max(0, dir === 'right' ? b.left - a.right : a.left - b.right);
        score = gap + Math.abs(by - ay) * 4;
      } else {
        const ok = dir === 'down' ? b.top >= a.bottom - 8 || by > a.bottom : b.bottom <= a.top + 8 || by < a.top;
        if (!ok) continue;
        const gap = Math.max(0, dir === 'down' ? b.top - a.bottom : a.top - b.bottom);
        const overlaps = b.left < a.right && b.right > a.left;
        score = gap * 2 + (overlaps ? 0 : Math.abs(bx - ax));
      }
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) select(best);
    else track(300);
  }

  // Retorna o que o servidor deve fazer:
  // 'native' = mandar a tecla normal, 'play' = espaço, 'done' = nada, {x,y} = clicar ali
  function handle(name) {
    if (window.__pctvNative) return 'native';
    const ae = document.activeElement;
    const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);

    if (playerActive()) {
      hideRing();
      if (name === 'ok') return 'play';
      if (name === 'back') { history.back(); return 'done'; }
      return 'native';
    }
    if (name === 'back') {
      if (scope() !== document) return 'native'; // Esc fecha o modal aberto
      history.back();
      return 'done';
    }
    if (name === 'ok') {
      if (!cur || !cur.isConnected) return 'native';
      const r = cur.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }
    if (typing && (name === 'left' || name === 'right')) return 'native';
    move(name);
    return 'done';
  }

  window.__pctv = { handle };
}

export const NAV_SCRIPT = `(${install.toString()})();`;
