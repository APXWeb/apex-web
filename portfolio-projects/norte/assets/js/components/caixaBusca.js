/* ============================================================
   NORTE — Caixa de busca com sugestao
   Dois campos ligados (profissao e regiao) que se comportam como
   um controle so: seta navega, Enter escolhe, Esc fecha.
   ============================================================ */

import { qs, qsa, el, delegate, debounce } from '../utils/dom.js';
import { icon } from './icons.js';
import { escapeHtml, realcar, plural } from '../utils/format.js';
import { sugerirProfissoes, sugerirRegioes } from '../services/busca.js';
import { acharProfissao, acharRegiao, vagasDaProfissao, state } from '../services/store.js';
import { AREA_POR_ID } from '../data/profissoes.js';
import { modal } from './ui.js';
import { ir, montarUrl } from '../router.js';

let seq = 0;

/**
 * Monta o HTML da caixa. Depois de inserir no DOM, chame ativar().
 * @param {object} o { tamanho: 'grande'|'media'|'compacta', profissaoId, regiaoId, autoFoco }
 */
export function caixaBusca(o = {}) {
  const id = `cb${++seq}`;
  const prof = o.profissaoId ? acharProfissao(o.profissaoId) : null;
  const reg = o.regiaoId ? acharRegiao(o.regiaoId) : null;
  const tam = o.tamanho || 'grande';

  return `
  <div class="cbusca cbusca--${tam}" data-cbusca="${id}">
    <div class="cbusca__campos">
      <div class="cbusca__campo" data-campo="prof">
        <label class="cbusca__rot" for="${id}-prof">Qual profissão você procura?</label>
        <div class="cbusca__entrada">
          <span class="cbusca__ic">${icon.lupa({ size: 18 })}</span>
          <input type="text" id="${id}-prof" class="cbusca__input" data-input="prof"
                 placeholder="Ex.: Designer, Enfermeiro, Eletricista"
                 autocomplete="off" role="combobox" aria-expanded="false"
                 aria-controls="${id}-lista-prof" aria-autocomplete="list"
                 value="${prof ? escapeHtml(prof.nome) : ''}"
                 ${o.autoFoco ? 'data-foco-inicial' : ''}>
          <button type="button" class="cbusca__limpar" data-limpar="prof"
                  aria-label="Limpar profissão" ${prof ? '' : 'hidden'}>
            ${icon.fechar({ size: 14 })}
          </button>
        </div>
        <input type="hidden" data-valor="prof" value="${prof ? escapeHtml(prof.id) : ''}">
        <ul class="cbusca__lista" id="${id}-lista-prof" data-lista="prof" role="listbox"
            aria-label="Sugestões de profissão" hidden></ul>
      </div>

      <span class="cbusca__divisor" aria-hidden="true"></span>

      <div class="cbusca__campo" data-campo="reg">
        <label class="cbusca__rot" for="${id}-reg">Onde você quer trabalhar?</label>
        <div class="cbusca__entrada">
          <span class="cbusca__ic">${icon.local({ size: 18 })}</span>
          <input type="text" id="${id}-reg" class="cbusca__input" data-input="reg"
                 placeholder="Cidade, estado ou remoto"
                 autocomplete="off" role="combobox" aria-expanded="false"
                 aria-controls="${id}-lista-reg" aria-autocomplete="list"
                 value="${reg ? escapeHtml(reg.nome) : ''}">
          <button type="button" class="cbusca__limpar" data-limpar="reg"
                  aria-label="Limpar região" ${reg ? '' : 'hidden'}>
            ${icon.fechar({ size: 14 })}
          </button>
        </div>
        <input type="hidden" data-valor="reg" value="${reg ? escapeHtml(reg.id) : ''}">
        <ul class="cbusca__lista" id="${id}-lista-reg" data-lista="reg" role="listbox"
            aria-label="Sugestões de região" hidden></ul>
      </div>

      <button type="button" class="btn btn--primario cbusca__acao" data-buscar>
        ${icon.lupa({ size: 18 })}
        <span>Encontrar oportunidades</span>
      </button>
    </div>
    <p class="cbusca__erro" data-erro role="alert" hidden></p>
  </div>`;
}

/**
 * Liga o comportamento da caixa ja inserida no DOM.
 * @param {HTMLElement} raiz elemento que contem a caixa
 * @param {object} o { aoBuscar(profissaoId, regiaoId) }
 */
export function ativarBusca(raiz, o = {}) {
  const caixa = qs('[data-cbusca]', raiz) || raiz;
  if (!caixa || caixa.dataset.ligada === '1') return () => {};
  caixa.dataset.ligada = '1';

  const campos = {
    prof: {
      input: qs('[data-input="prof"]', caixa),
      valor: qs('[data-valor="prof"]', caixa),
      lista: qs('[data-lista="prof"]', caixa),
      limpar: qs('[data-limpar="prof"]', caixa),
      sugerir: sugerirProfissoes,
      render: itemProfissao,
      idDe: (x) => x.id,
      nomeDe: (x) => x.nome,
    },
    reg: {
      input: qs('[data-input="reg"]', caixa),
      valor: qs('[data-valor="reg"]', caixa),
      lista: qs('[data-lista="reg"]', caixa),
      limpar: qs('[data-limpar="reg"]', caixa),
      sugerir: sugerirRegioes,
      render: itemRegiao,
      idDe: (x) => x.id,
      nomeDe: (x) => x.nome,
    },
  };

  const erro = qs('[data-erro]', caixa);
  let ativo = null;   // qual campo esta com a lista aberta
  let indice = -1;
  let itens = [];

  function abrir(chave) {
    const c = campos[chave];
    itens = c.sugerir(c.input.value, 7);
    indice = -1;

    if (!itens.length) { fechar(chave); return; }

    c.lista.innerHTML = itens
      .map((x, i) => c.render(x, c.input.value, i, `${c.lista.id}-o${i}`))
      .join('');
    c.lista.hidden = false;
    c.input.setAttribute('aria-expanded', 'true');
    caixa.classList.add('aberta');
    ativo = chave;
  }

  function fechar(chave) {
    const c = campos[chave];
    c.lista.hidden = true;
    c.lista.innerHTML = '';
    c.input.setAttribute('aria-expanded', 'false');
    c.input.removeAttribute('aria-activedescendant');
    if (ativo === chave) { ativo = null; indice = -1; itens = []; }
    if (campos.prof.lista.hidden && campos.reg.lista.hidden) {
      caixa.classList.remove('aberta');
    }
  }

  function marcar(chave, novo) {
    const c = campos[chave];
    const opcoes = qsa('[role="option"]', c.lista);
    if (!opcoes.length) return;
    indice = (novo + opcoes.length) % opcoes.length;
    opcoes.forEach((li, i) => {
      const sel = i === indice;
      li.setAttribute('aria-selected', String(sel));
      li.classList.toggle('marcado', sel);
      if (sel) {
        c.input.setAttribute('aria-activedescendant', li.id);
        li.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function escolher(chave, item) {
    const c = campos[chave];
    c.input.value = c.nomeDe(item);
    c.valor.value = c.idDe(item);
    c.limpar.hidden = false;
    esconderErro();
    fechar(chave);
    // Fluxo natural: escolheu a profissao, agora falta o lugar
    if (chave === 'prof' && !campos.reg.valor.value) campos.reg.input.focus();
    else if (chave === 'reg') qs('[data-buscar]', caixa)?.focus();
  }

  function mostrarErro(msg) {
    erro.textContent = msg;
    erro.hidden = false;
    caixa.classList.add('com-erro');
  }

  function esconderErro() {
    erro.hidden = true;
    caixa.classList.remove('com-erro');
  }

  Object.entries(campos).forEach(([chave, c]) => {
    const atualizar = debounce(() => abrir(chave), 90);

    c.input.addEventListener('input', () => {
      c.valor.value = '';
      c.limpar.hidden = !c.input.value;
      esconderErro();
      atualizar();
    });

    c.input.addEventListener('focus', () => abrir(chave));

    c.input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (c.lista.hidden) abrir(chave); else marcar(chave, indice + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(chave, indice - 1); }
      else if (e.key === 'Enter') {
        if (!c.lista.hidden && indice >= 0 && itens[indice]) {
          e.preventDefault();
          escolher(chave, itens[indice]);
        } else if (!c.lista.hidden && itens.length && !c.valor.value) {
          // Enter sem escolher nada pega a primeira sugestao
          e.preventDefault();
          escolher(chave, itens[0]);
        } else {
          e.preventDefault();
          buscar();
        }
      } else if (e.key === 'Escape') {
        fechar(chave);
      } else if (e.key === 'Tab') {
        fechar(chave);
      }
    });

    c.lista.addEventListener('mousedown', (e) => {
      // mousedown antes do blur, senao a lista fecha antes do clique
      const li = e.target.closest('[role="option"]');
      if (!li) return;
      e.preventDefault();
      escolher(chave, itens[Number(li.dataset.i)]);
    });

    c.limpar.addEventListener('click', () => {
      c.input.value = '';
      c.valor.value = '';
      c.limpar.hidden = true;
      c.input.focus();
      abrir(chave);
    });
  });

  function resolverCampo(chave) {
    const c = campos[chave];
    if (c.valor.value) return c.valor.value;
    if (!c.input.value.trim()) return '';
    // Digitou sem escolher: aceita a melhor sugestao
    const achados = c.sugerir(c.input.value, 1);
    if (achados.length) {
      c.valor.value = c.idDe(achados[0]);
      c.input.value = c.nomeDe(achados[0]);
      return c.valor.value;
    }
    return '';
  }

  function buscar() {
    const profId = resolverCampo('prof');
    const regId = resolverCampo('reg') || 'qualquer';

    if (!profId) {
      mostrarErro('Escolha uma profissão para começar. Se não souber o nome exato, digite parte dele.');
      campos.prof.input.focus();
      return;
    }

    fechar('prof'); fechar('reg');
    esconderErro();

    if (o.aoBuscar) o.aoBuscar(profId, regId);
    else ir(montarUrl('/buscar', { p: profId, r: regId }));
  }

  qs('[data-buscar]', caixa).addEventListener('click', buscar);

  const aoClicarFora = (e) => {
    if (!caixa.contains(e.target)) { fechar('prof'); fechar('reg'); }
  };
  document.addEventListener('click', aoClicarFora);

  return () => document.removeEventListener('click', aoClicarFora);
}

/* ---------------- Itens da lista ---------------- */
function itemProfissao(p, termo, i, id) {
  const area = AREA_POR_ID[p.area];
  const vagas = vagasDaProfissao(p.id).length;
  return `
    <li class="cbusca__item" role="option" id="${id}" data-i="${i}" aria-selected="false">
      <span class="cbusca__item-ic" style="color:${area?.cor || 'var(--acento)'}">
        ${icon[area?.icone || 'maleta']({ size: 17 })}
      </span>
      <span class="cbusca__item-txt">
        <span class="cbusca__item-n">${realcar(p.nome, termo)}</span>
        <span class="cbusca__item-s">${escapeHtml(area?.nome || '')} · ${plural(vagas, 'oportunidade')}</span>
      </span>
      <span class="cbusca__item-seta">${icon.seta({ size: 15 })}</span>
    </li>`;
}

function itemRegiao(r, termo, i, id) {
  const remoto = r.id === 'remoto';
  return `
    <li class="cbusca__item" role="option" id="${id}" data-i="${i}" aria-selected="false">
      <span class="cbusca__item-ic">${(remoto ? icon.raio : icon.local)({ size: 17 })}</span>
      <span class="cbusca__item-txt">
        <span class="cbusca__item-n">${realcar(r.nome, termo)}</span>
        <span class="cbusca__item-s">${escapeHtml(remoto ? 'Vagas em qualquer lugar do país' : r.resumo?.slice(0, 58) + '…')}</span>
      </span>
      <span class="cbusca__item-seta">${icon.seta({ size: 15 })}</span>
    </li>`;
}

/* ---------------- Busca rapida (atalho /) ---------------- */
export function abrirBuscaRapida() {
  if (qs('[data-busca-rapida-modal]')) return;

  const recentes = state.historico.slice(0, 4);
  const m = modal({
    titulo: 'Buscar oportunidades',
    sub: 'Escolha a profissão e onde você quer trabalhar',
    tamanho: 'lg',
    conteudo: `
      <div data-busca-rapida-modal>
        ${caixaBusca({ tamanho: 'media', autoFoco: true })}
        ${recentes.length ? `
          <div class="brapida__recentes">
            <p class="brapida__titulo">${icon.relogio({ size: 14 })} Buscas recentes</p>
            <div class="brapida__chips">
              ${recentes.map(h => `
                <a class="etiqueta" href="${montarUrl('/buscar', { p: h.profissaoId, r: h.regiaoId })}">
                  ${escapeHtml(h.profissao)} · ${escapeHtml(h.regiao)}
                </a>`).join('')}
            </div>
          </div>` : ''}
      </div>`,
  });

  ativarBusca(m.node, {
    aoBuscar: (p, r) => {
      m.fechar();
      ir(montarUrl('/buscar', { p, r }));
    },
  });

  delegate(m.node, 'click', '.etiqueta', () => m.fechar());
}
