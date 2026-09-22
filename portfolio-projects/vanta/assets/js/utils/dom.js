/* VANTA — Auxiliares de DOM */

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Cria elemento a partir de uma string de HTML */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** Delegacao de evento: um listener no container serve para N filhos */
export function delegate(root, evento, seletor, fn) {
  root.addEventListener(evento, (e) => {
    const alvo = e.target.closest(seletor);
    if (alvo && root.contains(alvo)) fn(e, alvo);
  });
}

/** Revela elementos [data-anim] conforme entram na tela */
let observer = null;
export function observarAnimacoes(root = document) {
  const alvos = qsa('[data-anim]:not(.is-in)', root);
  if (!alvos.length) return;

  const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduz || !('IntersectionObserver' in window)) {
    alvos.forEach(a => a.classList.add('is-in'));
    return;
  }

  if (!observer) {
    observer = new IntersectionObserver((entradas) => {
      entradas.forEach(entrada => {
        if (!entrada.isIntersecting) return;
        const atraso = Number(entrada.target.dataset.anim) || 0;
        entrada.target.style.transitionDelay = `${atraso * 55}ms`;
        entrada.target.classList.add('is-in');
        observer.unobserve(entrada.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  }

  alvos.forEach(a => observer.observe(a));
}

/** Trava o scroll do fundo quando um modal/drawer abre */
let travas = 0;
export function travarScroll(travar) {
  travas = Math.max(0, travas + (travar ? 1 : -1));
  const trava = travas > 0;
  if (trava) {
    const barra = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = barra > 0 ? `${barra}px` : '';
  } else {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

/** Mantem o foco dentro de um container (modal/drawer) */
export function prenderFoco(container) {
  const focaveis = () => qsa(
    'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    container
  ).filter(e => e.offsetParent !== null);

  function onKey(e) {
    if (e.key !== 'Tab') return;
    const lista = focaveis();
    if (!lista.length) return;
    const primeiro = lista[0];
    const ultimo = lista[lista.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault(); ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault(); primeiro.focus();
    }
  }

  container.addEventListener('keydown', onKey);
  const alvo = focaveis()[0];
  if (alvo) requestAnimationFrame(() => alvo.focus());
  return () => container.removeEventListener('keydown', onKey);
}

export function debounce(fn, ms = 220) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Aguarda o proximo frame (usado para disparar transicoes CSS) */
export const proximoFrame = () =>
  new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
