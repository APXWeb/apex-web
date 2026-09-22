/* ============================================================
   VANTA — Primitivos de UI: toast, modal, drawer, confirmacao
   ============================================================ */

import { el, qs, travarScroll, prenderFoco, proximoFrame } from '../utils/dom.js';
import { icon } from './icons.js';
import { escapeHtml } from '../utils/format.js';

/* ---------------- TOAST ---------------- */
let regiao = null;

function regiaoToast() {
  if (!regiao) {
    regiao = el(`<div class="toast-region" role="status" aria-live="polite" aria-atomic="false"></div>`);
    document.body.appendChild(regiao);
  }
  return regiao;
}

const ICONE_TOAST = {
  success: icon.checkCirculo, danger: icon.alerta, info: icon.info, accent: icon.carrinho,
};

/**
 * @param {object} o
 * @param {string} o.titulo
 * @param {string} [o.msg]
 * @param {'success'|'danger'|'info'|'accent'} [o.tipo]
 * @param {{label:string, onClick:Function}} [o.acao]  ex.: desfazer
 * @param {number} [o.duracao]
 */
export function toast({ titulo, msg = '', tipo = 'accent', acao = null, duracao = 4200 }) {
  const node = el(`
    <div class="toast toast--${tipo}">
      <span class="toast__icon">${(ICONE_TOAST[tipo] || icon.info)({ size: 20 })}</span>
      <div class="toast__body">
        <p class="toast__title">${escapeHtml(titulo)}</p>
        ${msg ? `<p class="toast__msg">${escapeHtml(msg)}</p>` : ''}
        ${acao ? `<button type="button" class="toast__action">${escapeHtml(acao.label)}</button>` : ''}
      </div>
      <button type="button" class="btn-icon btn-icon--sm" aria-label="Dispensar aviso">${icon.fechar({ size: 16 })}</button>
    </div>`);

  const sair = () => {
    if (!node.isConnected) return;
    node.classList.add('is-leaving');
    node.addEventListener('animationend', () => node.remove(), { once: true });
    setTimeout(() => node.remove(), 500);
  };

  qs('.btn-icon', node).addEventListener('click', sair);

  if (acao) {
    qs('.toast__action', node).addEventListener('click', () => { acao.onClick(); sair(); });
  }

  regiaoToast().appendChild(node);
  const t = setTimeout(sair, duracao);
  node.addEventListener('pointerenter', () => clearTimeout(t));
  return sair;
}

/* ---------------- MODAL ---------------- */
/**
 * Abre um modal. Retorna { fechar, node }.
 * O conteudo pode ser string de HTML ou elemento.
 */
export function modal({ titulo, sub = '', conteudo, rodape = '', tamanho = '', aoFechar = null, id = '' }) {
  const backdrop = el(`
    <div class="modal-backdrop">
      <div class="modal ${tamanho ? 'modal--' + tamanho : ''}" role="dialog" aria-modal="true"
           aria-labelledby="mdl-t-${id || 'x'}">
        <header class="modal__head">
          <div>
            <h2 class="modal__title" id="mdl-t-${id || 'x'}">${escapeHtml(titulo)}</h2>
            ${sub ? `<p class="modal__sub">${escapeHtml(sub)}</p>` : ''}
          </div>
          <button type="button" class="btn-icon" data-fechar aria-label="Fechar">${icon.fechar()}</button>
        </header>
        <div class="modal__body"></div>
        ${rodape ? `<footer class="modal__foot">${rodape}</footer>` : ''}
      </div>
    </div>`);

  const corpo = qs('.modal__body', backdrop);
  if (typeof conteudo === 'string') corpo.innerHTML = conteudo;
  else if (conteudo) corpo.appendChild(conteudo);

  document.body.appendChild(backdrop);
  travarScroll(true);

  const focoAnterior = document.activeElement;
  const soltarFoco = prenderFoco(qs('.modal', backdrop));

  function fechar() {
    backdrop.classList.remove('is-open');
    travarScroll(false);
    soltarFoco();
    document.removeEventListener('keydown', onEsc);
    setTimeout(() => {
      backdrop.remove();
      if (focoAnterior && focoAnterior.focus) focoAnterior.focus();
      if (aoFechar) aoFechar();
    }, 220);
  }

  function onEsc(e) { if (e.key === 'Escape') fechar(); }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-fechar]')) fechar();
  });
  document.addEventListener('keydown', onEsc);

  proximoFrame().then(() => backdrop.classList.add('is-open'));

  return { fechar, node: backdrop, corpo };
}

/** Confirmacao para acoes destrutivas */
export function confirmar({ titulo, msg, confirmarLabel = 'Confirmar', perigo = true }) {
  return new Promise((resolve) => {
    const m = modal({
      titulo,
      conteudo: `<p class="muted">${escapeHtml(msg)}</p>`,
      rodape: `
        <button type="button" class="btn btn--ghost" data-no>Cancelar</button>
        <button type="button" class="btn ${perigo ? 'btn--danger' : 'btn--primary'}" data-sim>${escapeHtml(confirmarLabel)}</button>`,
      aoFechar: () => resolve(false),
    });
    qs('[data-no]', m.node).addEventListener('click', () => m.fechar());
    qs('[data-sim]', m.node).addEventListener('click', () => {
      resolve(true);
      m.node.dataset.resolvido = '1';
      m.fechar();
    });
  });
}

/* ---------------- DRAWER ---------------- */
export function drawer({ titulo, conteudo, rodape = '', lado = 'right', aoFechar = null }) {
  const backdrop = el(`<div class="drawer-backdrop"></div>`);
  const painel = el(`
    <aside class="drawer ${lado === 'left' ? 'drawer--left' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(titulo)}">
      <header class="drawer__head">
        <h2 class="panel__title">${escapeHtml(titulo)}</h2>
        <button type="button" class="btn-icon" data-fechar aria-label="Fechar">${icon.fechar()}</button>
      </header>
      <div class="drawer__body"></div>
      ${rodape ? `<footer class="drawer__foot"></footer>` : ''}
    </aside>`);

  const corpo = qs('.drawer__body', painel);
  if (typeof conteudo === 'string') corpo.innerHTML = conteudo;
  else if (conteudo) corpo.appendChild(conteudo);

  const pe = qs('.drawer__foot', painel);
  if (pe && rodape) {
    if (typeof rodape === 'string') pe.innerHTML = rodape;
    else pe.appendChild(rodape);
  }

  document.body.append(backdrop, painel);
  travarScroll(true);

  const focoAnterior = document.activeElement;
  const soltarFoco = prenderFoco(painel);

  function fechar() {
    backdrop.classList.remove('is-open');
    painel.classList.remove('is-open');
    travarScroll(false);
    soltarFoco();
    document.removeEventListener('keydown', onEsc);
    setTimeout(() => {
      backdrop.remove(); painel.remove();
      if (focoAnterior && focoAnterior.focus) focoAnterior.focus();
      if (aoFechar) aoFechar();
    }, 400);
  }

  function onEsc(e) { if (e.key === 'Escape') fechar(); }

  backdrop.addEventListener('click', fechar);
  painel.addEventListener('click', (e) => { if (e.target.closest('[data-fechar]')) fechar(); });
  document.addEventListener('keydown', onEsc);

  proximoFrame().then(() => {
    backdrop.classList.add('is-open');
    painel.classList.add('is-open');
  });

  return { fechar, node: painel, corpo, rodapeEl: pe };
}

/* ---------------- ESTADO VAZIO ---------------- */
export function vazio({ icone = 'vazio', titulo, texto, acao = '' }) {
  return `
    <div class="empty">
      <span class="empty__icon">${(icon[icone] || icon.vazio)({ size: 28 })}</span>
      <h3 class="empty__title">${escapeHtml(titulo)}</h3>
      <p class="empty__text">${escapeHtml(texto)}</p>
      ${acao}
    </div>`;
}

/* ---------------- SKELETON ---------------- */
export const skelCard = () => `
  <div class="card card--tight">
    <div class="skel skel--thumb"></div>
    <div class="stack stack--sm" style="margin-top:14px">
      <div class="skel skel--text skel--line-40"></div>
      <div class="skel skel--title skel--line-80"></div>
      <div class="skel skel--text skel--line-60"></div>
    </div>
  </div>`;

export const skelGrid = (n = 8) =>
  `<div class="grid-auto">${Array.from({ length: n }, skelCard).join('')}</div>`;

export const skelLinhas = (n = 6) =>
  Array.from({ length: n }, () => `
    <div class="row" style="padding:16px;gap:16px;border-bottom:1px solid var(--border-subtle)">
      <div class="skel" style="width:44px;height:44px;border-radius:10px;flex-shrink:0"></div>
      <div class="stack stack--sm" style="flex:1">
        <div class="skel skel--text skel--line-40"></div>
        <div class="skel skel--text skel--line-60"></div>
      </div>
    </div>`).join('');
