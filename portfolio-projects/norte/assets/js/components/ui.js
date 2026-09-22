/* ============================================================
   NORTE — Pecas de interface compartilhadas
   toast, modal, gaveta, confirmacao, esqueleto e estado vazio.
   ============================================================ */

import { el, qs, travarScroll, prenderFoco } from '../utils/dom.js';
import { icon } from './icons.js';
import { escapeHtml } from '../utils/format.js';

/* ---------------- Toast ---------------- */
function caixaToasts() {
  let caixa = qs('.toasts');
  if (!caixa) {
    caixa = el('<div class="toasts" role="region" aria-label="Avisos"></div>');
    document.body.appendChild(caixa);
  }
  return caixa;
}

const ICONE_TOAST = { ok: icon.ok, erro: icon.erro, info: icon.info, aviso: icon.alerta };

/**
 * @param {string} titulo
 * @param {object} opts { texto, tipo: ok|erro|info|aviso, acao: {rotulo, fn}, duracao }
 */
export function toast(titulo, opts = {}) {
  const { texto = '', tipo = 'info', acao = null, duracao = 4200 } = opts;
  const caixa = caixaToasts();

  const node = el(`
    <div class="toast toast--${tipo}" role="status" aria-live="polite">
      <span class="toast__icone">${(ICONE_TOAST[tipo] || icon.info)({ size: 18 })}</span>
      <div class="toast__corpo">
        <p class="toast__titulo">${escapeHtml(titulo)}</p>
        ${texto ? `<p class="toast__texto">${escapeHtml(texto)}</p>` : ''}
      </div>
      ${acao ? `<button type="button" class="toast__acao">${escapeHtml(acao.rotulo)}</button>` : ''}
      <button type="button" class="toast__acao" data-fechar aria-label="Fechar aviso">${icon.fechar({ size: 15 })}</button>
    </div>`);

  caixa.appendChild(node);
  requestAnimationFrame(() => node.classList.add('aberto'));

  let saiu = false;
  const sair = () => {
    if (saiu) return;
    saiu = true;
    clearTimeout(timer);
    node.classList.add('saindo');
    setTimeout(() => node.remove(), 320);
  };

  if (acao) {
    node.querySelector('.toast__acao').addEventListener('click', () => { acao.fn(); sair(); });
  }
  node.querySelector('[data-fechar]').addEventListener('click', sair);

  const timer = setTimeout(sair, duracao);
  return sair;
}

/* ---------------- Modal ---------------- */
/**
 * @param {object} o { titulo, sub, conteudo, rodape, tamanho: ''|lg|xl, aoFechar }
 */
export function modal(o = {}) {
  const fundo = el(`
    <div class="modal-fundo" role="dialog" aria-modal="true"
         ${o.titulo ? `aria-label="${escapeHtml(o.titulo)}"` : ''}>
      <div class="modal ${o.tamanho ? `modal--${o.tamanho}` : ''}">
        ${o.titulo ? `
          <div class="modal__topo">
            <div>
              <h2 class="modal__titulo">${escapeHtml(o.titulo)}</h2>
              ${o.sub ? `<p class="modal__sub">${escapeHtml(o.sub)}</p>` : ''}
            </div>
            <button type="button" class="btn-icone" data-fechar aria-label="Fechar">
              ${icon.fechar({ size: 19 })}
            </button>
          </div>` : ''}
        <div class="modal__corpo">${o.conteudo || ''}</div>
        ${o.rodape ? `<div class="modal__rodape">${o.rodape}</div>` : ''}
      </div>
    </div>`);

  document.body.appendChild(fundo);
  travarScroll(true);
  const soltarFoco = prenderFoco(fundo);
  requestAnimationFrame(() => fundo.classList.add('aberto'));

  let fechado = false;
  const fechar = (motivo) => {
    if (fechado) return;
    fechado = true;
    fundo.classList.remove('aberto');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      fundo.remove();
      travarScroll(false);
      soltarFoco();
      o.aoFechar?.(motivo);
    }, 240);
  };

  const onKey = (e) => { if (e.key === 'Escape') fechar('esc'); };
  document.addEventListener('keydown', onKey);

  fundo.addEventListener('click', (e) => {
    if (e.target === fundo) fechar('fundo');
    if (e.target.closest('[data-fechar]')) fechar('botao');
  });

  return { node: fundo, fechar };
}

/** Confirmacao com promessa: await confirmar({...}) */
export function confirmar(o = {}) {
  return new Promise(resolve => {
    let respondeu = false;
    const m = modal({
      titulo: o.titulo || 'Tem certeza?',
      sub: o.sub,
      conteudo: `<p style="color:var(--txt-suave)">${escapeHtml(o.texto || '')}</p>`,
      rodape: `
        <button type="button" class="btn btn--contorno" data-nao>${escapeHtml(o.cancelar || 'Cancelar')}</button>
        <button type="button" class="btn ${o.perigo ? 'btn--perigo' : 'btn--primario'}" data-sim>
          ${escapeHtml(o.confirmar || 'Confirmar')}
        </button>`,
      aoFechar: () => { if (!respondeu) resolve(false); },
    });

    m.node.querySelector('[data-sim]').addEventListener('click', () => {
      respondeu = true; m.fechar(); resolve(true);
    });
    m.node.querySelector('[data-nao]').addEventListener('click', () => {
      respondeu = true; m.fechar(); resolve(false);
    });
  });
}

/* ---------------- Gaveta ---------------- */
/**
 * @param {object} o { titulo, conteudo, rodape, lado: 'direita'|'esquerda'|'baixo', aoFechar }
 */
export function gaveta(o = {}) {
  const lado = o.lado || 'direita';
  const fundo = el('<div class="gaveta-fundo"></div>');
  const painel = el(`
    <aside class="gaveta ${lado === 'esquerda' ? 'gaveta--esquerda' : ''} ${lado === 'baixo' ? 'gaveta--baixo' : ''}"
           role="dialog" aria-modal="true" ${o.titulo ? `aria-label="${escapeHtml(o.titulo)}"` : ''}>
      ${lado === 'baixo' ? '<div class="gaveta__alca"></div>' : ''}
      <div class="gaveta__topo">
        <h2 class="modal__titulo">${escapeHtml(o.titulo || '')}</h2>
        <button type="button" class="btn-icone" data-fechar aria-label="Fechar">
          ${icon.fechar({ size: 19 })}
        </button>
      </div>
      <div class="gaveta__corpo">${o.conteudo || ''}</div>
      ${o.rodape ? `<div class="gaveta__rodape">${o.rodape}</div>` : ''}
    </aside>`);

  document.body.append(fundo, painel);
  travarScroll(true);
  const soltarFoco = prenderFoco(painel);
  requestAnimationFrame(() => {
    fundo.classList.add('aberto');
    painel.classList.add('aberto');
  });

  let fechado = false;
  const fechar = (motivo) => {
    if (fechado) return;
    fechado = true;
    fundo.classList.remove('aberto');
    painel.classList.remove('aberto');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      fundo.remove(); painel.remove();
      travarScroll(false); soltarFoco();
      o.aoFechar?.(motivo);
    }, 380);
  };

  const onKey = (e) => { if (e.key === 'Escape') fechar('esc'); };
  document.addEventListener('keydown', onKey);
  fundo.addEventListener('click', () => fechar('fundo'));
  painel.addEventListener('click', (e) => {
    if (e.target.closest('[data-fechar]')) fechar('botao');
  });

  return { node: painel, fechar };
}

/* ---------------- Estado vazio ---------------- */
export function vazio({ titulo, texto, icone = 'vazio', acao = '' }) {
  return `
    <div class="vazio">
      <span class="vazio__icone">${(icon[icone] || icon.vazio)({ size: 26 })}</span>
      <h3 class="vazio__titulo">${escapeHtml(titulo)}</h3>
      ${texto ? `<p class="vazio__texto">${escapeHtml(texto)}</p>` : ''}
      ${acao}
    </div>`;
}

/* ---------------- Esqueletos ---------------- */
export const esqueletoLinhas = (n = 3) =>
  Array.from({ length: n }, (_, i) =>
    `<div class="esqueleto esqueleto--texto" style="width:${i === n - 1 ? 60 : 100}%"></div>`
  ).join('');

export const esqueletoCartaoVaga = () => `
  <div class="cartao cartao--pad">
    <div class="linha" style="gap:14px;align-items:flex-start">
      <div class="esqueleto esqueleto--circulo" style="width:46px;height:46px;border-radius:10px"></div>
      <div style="flex:1">
        <div class="esqueleto esqueleto--titulo" style="width:52%"></div>
        <div class="esqueleto esqueleto--texto" style="width:34%;margin-top:10px"></div>
      </div>
    </div>
    <div style="margin-top:18px">${esqueletoLinhas(2)}</div>
    <div class="linha" style="gap:8px;margin-top:16px">
      <div class="esqueleto" style="width:78px;height:26px;border-radius:999px"></div>
      <div class="esqueleto" style="width:64px;height:26px;border-radius:999px"></div>
      <div class="esqueleto" style="width:90px;height:26px;border-radius:999px"></div>
    </div>
  </div>`;

export const esqueletoLista = (n = 4) =>
  `<div class="pilha pilha--lg">${Array.from({ length: n }, esqueletoCartaoVaga).join('')}</div>`;

export const esqueletoStat = () => `
  <div class="cartao cartao--pad">
    <div class="esqueleto esqueleto--texto" style="width:46%"></div>
    <div class="esqueleto" style="width:70%;height:30px;margin-top:12px;border-radius:8px"></div>
  </div>`;
