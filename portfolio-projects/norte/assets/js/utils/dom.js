/* ============================================================
   NORTE — Utilidades de DOM
   ============================================================ */

export const qs = (sel, raiz = document) => raiz.querySelector(sel);
export const qsa = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

/** Cria um elemento a partir de HTML */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** Delegacao de evento: sobrevive a redesenho do conteudo */
export function delegate(raiz, evento, seletor, fn) {
  const handler = (e) => {
    const alvo = e.target.closest(seletor);
    if (alvo && raiz.contains(alvo)) fn(e, alvo);
  };
  raiz.addEventListener(evento, handler);
  return () => raiz.removeEventListener(evento, handler);
}

/** Revela elementos [data-anim] conforme entram na tela */
export function observarAnimacoes(raiz = document) {
  const itens = qsa('[data-anim]:not(.vis)', raiz);
  if (!itens.length) return;

  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    itens.forEach(i => i.classList.add('vis'));
    return;
  }

  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
      if (!entrada.isIntersecting) return;
      const n = entrada.target.dataset.anim;
      if (n) entrada.target.style.setProperty('--atraso', n);
      entrada.target.classList.add('vis');
      obs.unobserve(entrada.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  itens.forEach(i => obs.observe(i));
}

/* Trava a rolagem sem deixar a pagina "pular" pela largura da barra */
let travas = 0;
export function travarScroll(travar) {
  if (travar) {
    travas++;
    if (travas === 1) {
      const larguraBarra = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = larguraBarra > 0 ? `${larguraBarra}px` : '';
      document.body.classList.add('travado');
    }
  } else {
    travas = Math.max(0, travas - 1);
    if (travas === 0) {
      document.body.classList.remove('travado');
      document.body.style.paddingRight = '';
    }
  }
}

const FOCAVEIS = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Prende o foco dentro de um container (modal, gaveta) */
export function prenderFoco(container) {
  const anterior = document.activeElement;

  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const focaveis = qsa(FOCAVEIS, container).filter(n => n.offsetParent !== null);
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault(); ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault(); primeiro.focus();
    }
  };

  container.addEventListener('keydown', onKey);

  requestAnimationFrame(() => {
    const alvo = qs('[data-foco-inicial]', container) || qsa(FOCAVEIS, container)[0];
    alvo?.focus();
  });

  return () => {
    container.removeEventListener('keydown', onKey);
    if (anterior && document.contains(anterior)) anterior.focus();
  };
}

export function debounce(fn, ms = 260) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function throttle(fn, ms = 120) {
  let ultimo = 0;
  let agendado;
  return (...args) => {
    const agora = Date.now();
    const espera = ms - (agora - ultimo);
    if (espera <= 0) {
      ultimo = agora;
      fn(...args);
    } else if (!agendado) {
      agendado = setTimeout(() => {
        ultimo = Date.now();
        agendado = null;
        fn(...args);
      }, espera);
    }
  };
}

/** Rola ate um elemento respeitando o header fixo */
export function rolarAte(alvo, extra = 20) {
  if (!alvo) return;
  const header = getComputedStyle(document.documentElement).getPropertyValue('--header-h');
  const offset = parseInt(header, 10) || 68;
  const y = alvo.getBoundingClientRect().top + window.scrollY - offset - extra;
  window.scrollTo({ top: y, behavior: 'smooth' });
}
