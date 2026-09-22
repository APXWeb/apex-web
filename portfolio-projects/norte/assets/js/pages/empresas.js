/* ============================================================
   NORTE — Lista de empresas
   Quem contrata, onde e para quais áreas.
   ============================================================ */

import { qs, qsa, debounce, observarAnimacoes } from '../utils/dom.js';
import { icon, estrelas } from '../components/icons.js';
import { escapeHtml, num, plural, norm, realcar } from '../utils/format.js';
import { state, vagasDaEmpresa, todasRegioes, estaSalvo } from '../services/store.js';
import { PORTES } from '../data/empresas.js';
import { AREAS, AREA_POR_ID } from '../data/profissoes.js';
import { vazio } from '../components/ui.js';
import { montarUrl } from '../router.js';

const ORDENS = [
  { id: 'vagas', nome: 'Mais vagas abertas' },
  { id: 'nota', nome: 'Melhor avaliadas' },
  { id: 'tamanho', nome: 'Maiores' },
  { id: 'az', nome: 'Ordem alfabética' },
];

export function paginaEmpresas(raiz, params, query) {
  const estado = {
    termo: query.q || '',
    area: query.a || '',
    regiao: query.r || '',
    porte: query.p || '',
    ordem: ORDENS.some(o => o.id === query.o) ? query.o : 'vagas',
  };

  const contagem = {};
  state.empresas.forEach(e => { contagem[e.id] = vagasDaEmpresa(e.id).length; });

  raiz.innerHTML = `
    <div class="shell" style="padding-block:var(--sp-10) var(--sp-6)">
      <p class="sobrancelha">${num(state.empresas.length)} empresas contratando</p>
      <h1 style="font-size:var(--fs-3xl);letter-spacing:-0.035em;max-width:22ch">
        Conheça quem está com vagas abertas
      </h1>
      <p class="lead" style="margin-top:var(--sp-4)">
        Porte, setor, benefícios, cultura e o que quem trabalha lá diz sobre a empresa.
      </p>

      <div class="linha" style="gap:var(--sp-3);flex-wrap:wrap;margin-top:var(--sp-7)">
        <label class="campo-icone" style="flex:1;min-width:min(260px,100%)">
          <span class="so-leitor">Buscar empresa</span>
          ${icon.lupa({ size: 17 })}
          <input type="search" class="input" data-termo placeholder="Nome da empresa ou setor"
                 value="${escapeHtml(estado.termo)}" autocomplete="off">
        </label>

        <label class="linha" style="gap:var(--sp-2)">
          <span class="so-leitor">Região</span>
          <select class="select" data-regiao style="min-width:170px">
            <option value="">Qualquer região</option>
            ${todasRegioes().map(r => `
              <option value="${r.id}" ${r.id === estado.regiao ? 'selected' : ''}>${escapeHtml(r.nome)}</option>`).join('')}
          </select>
        </label>

        <label class="linha" style="gap:var(--sp-2)">
          <span class="so-leitor">Porte</span>
          <select class="select" data-porte style="min-width:150px">
            <option value="">Qualquer porte</option>
            ${Object.entries(PORTES).map(([id, p]) => `
              <option value="${id}" ${id === estado.porte ? 'selected' : ''}>${p.rotulo} (${p.faixa})</option>`).join('')}
          </select>
        </label>

        <label class="linha" style="gap:var(--sp-2)">
          <span class="so-leitor">Ordenar por</span>
          <select class="select" data-ordem style="min-width:180px">
            ${ORDENS.map(o => `
              <option value="${o.id}" ${o.id === estado.ordem ? 'selected' : ''}>${o.nome}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="res-chips" style="margin-top:var(--sp-5)" data-areas>${htmlAreas()}</div>
    </div>

    <div class="shell" style="padding-bottom:var(--sp-20)">
      <div class="res-barra">
        <p class="res-contagem"><b data-total>0</b> <span data-total-txt>empresas</span></p>
        <button type="button" class="btn btn--fantasma btn--sm" data-limpar>Limpar filtros</button>
      </div>
      <div data-lista></div>
    </div>`;

  function htmlAreas() {
    const todas = `
      <button type="button" class="etiqueta ${!estado.area ? 'is-on' : ''}" data-area=""
              aria-pressed="${!estado.area}">Todas as áreas</button>`;
    return todas + AREAS.filter(a => state.empresas.some(e => e.areas.includes(a.id)))
      .map(a => `
        <button type="button" class="etiqueta ${estado.area === a.id ? 'is-on' : ''}"
                data-area="${a.id}" aria-pressed="${estado.area === a.id}">
          <span style="color:${a.cor}">${icon[a.icone]({ size: 13 })}</span> ${escapeHtml(a.nome)}
        </button>`).join('');
  }

  function filtrar() {
    const t = norm(estado.termo);
    let lista = [...state.empresas];

    if (estado.area) lista = lista.filter(e => e.areas.includes(estado.area));
    if (estado.regiao) lista = lista.filter(e => e.regioes.includes(estado.regiao));
    if (estado.porte) lista = lista.filter(e => e.porte === estado.porte);
    if (t) {
      lista = lista.filter(e =>
        norm(e.nome).includes(t) || norm(e.setor).includes(t) || norm(e.descricao).includes(t)
      );
    }

    switch (estado.ordem) {
      case 'nota': lista.sort((a, b) => b.nota - a.nota); break;
      case 'tamanho': lista.sort((a, b) => b.funcionarios - a.funcionarios); break;
      case 'az': lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); break;
      default: lista.sort((a, b) => (contagem[b.id] || 0) - (contagem[a.id] || 0));
    }
    return lista;
  }

  function sincronizarUrl() {
    history.replaceState(null, '', montarUrl('/empresas', {
      q: estado.termo, a: estado.area, r: estado.regiao, p: estado.porte,
      o: estado.ordem !== 'vagas' ? estado.ordem : '',
    }));
  }

  function desenhar() {
    const lista = filtrar();
    sincronizarUrl();

    qs('[data-total]', raiz).textContent = num(lista.length);
    qs('[data-total-txt]', raiz).textContent =
      lista.length === 1 ? 'empresa encontrada' : 'empresas encontradas';

    const alvo = qs('[data-lista]', raiz);

    if (!lista.length) {
      alvo.innerHTML = vazio({
        icone: 'predio',
        titulo: 'Nenhuma empresa com esses filtros',
        texto: 'Tente remover um filtro ou buscar por outro termo.',
        acao: '<button type="button" class="btn btn--primario" data-limpar style="margin-top:var(--sp-5)">Limpar filtros</button>',
      });
      return;
    }

    alvo.innerHTML = `<div class="res-grade res-grade--2">${lista.map(cartao).join('')}</div>`;
    observarAnimacoes(alvo);
  }

  function cartao(e) {
    const nVagas = contagem[e.id] || 0;
    const salvo = estaSalvo('empresas', e.id);

    return `
    <a class="cartao cartao--pad" href="#/empresa/${e.id}" style="display:grid;gap:var(--sp-4);align-content:start">
      <span class="linha" style="gap:var(--sp-3);align-items:flex-start">
        <span class="logo-emp" style="background:${e.cor}" aria-hidden="true">${escapeHtml(e.sigla)}</span>
        <span style="flex:1;min-width:0">
          <span style="display:block;font-family:var(--fonte-display);font-weight:600;font-size:var(--fs-md);color:var(--txt-forte)">
            ${realcar(e.nome, estado.termo)}
          </span>
          <span style="display:block;font-size:var(--fs-xs);color:var(--txt-fraco);margin-top:2px">
            ${escapeHtml(e.setor)} · ${PORTES[e.porte]?.rotulo || ''} · ${num(e.funcionarios)} pessoas
          </span>
        </span>
        ${salvo ? `<span class="selo selo--marca">${icon.marcador({ size: 11, fill: 'currentColor' })}</span>` : ''}
      </span>

      <span class="linha" style="gap:var(--sp-2)">
        ${estrelas(e.nota, 13)}
        <span style="font-size:var(--fs-sm);font-weight:600;color:var(--txt-forte)">${String(e.nota).replace('.', ',')}</span>
        <span style="font-size:var(--fs-xs);color:var(--txt-fraco)">(${num(e.totalAvaliacoes)} avaliações)</span>
      </span>

      <span style="font-size:var(--fs-sm);color:var(--txt-suave);line-height:var(--lh-normal)">
        ${escapeHtml(e.descricao.slice(0, 132))}${e.descricao.length > 132 ? '…' : ''}
      </span>

      <span class="linha" style="gap:var(--sp-2);flex-wrap:wrap">
        ${e.areas.slice(0, 3).map(id => `
          <span class="selo selo--neutro">${escapeHtml(AREA_POR_ID[id]?.nome || id)}</span>`).join('')}
        ${e.areas.length > 3 ? `<span class="selo selo--neutro">+${e.areas.length - 3}</span>` : ''}
      </span>

      <span class="linha" style="justify-content:space-between;padding-top:var(--sp-3);border-top:1px solid var(--bd-sutil)">
        <span style="font-size:var(--fs-sm);font-weight:600;color:${nVagas ? 'var(--txt-marca)' : 'var(--txt-fraco)'}">
          ${nVagas ? plural(nVagas, 'vaga aberta', 'vagas abertas') : 'Sem vagas no momento'}
        </span>
        <span style="color:var(--txt-fraco)">${icon.chevronR({ size: 15 })}</span>
      </span>
    </a>`;
  }

  /* ---------------- Interação ---------------- */
  const comAtraso = debounce(desenhar, 200);

  qs('[data-termo]', raiz).addEventListener('input', (e) => {
    estado.termo = e.target.value;
    comAtraso();
  });

  ['regiao', 'porte', 'ordem'].forEach(campo => {
    qs(`[data-${campo}]`, raiz).addEventListener('change', (e) => {
      estado[campo] = e.target.value;
      desenhar();
    });
  });

  raiz.addEventListener('click', (e) => {
    const areaBtn = e.target.closest('[data-area]');
    if (areaBtn) {
      estado.area = areaBtn.dataset.area;
      qs('[data-areas]', raiz).innerHTML = htmlAreas();
      desenhar();
      return;
    }
    if (e.target.closest('[data-limpar]')) {
      Object.assign(estado, { termo: '', area: '', regiao: '', porte: '', ordem: 'vagas' });
      qs('[data-termo]', raiz).value = '';
      qs('[data-regiao]', raiz).value = '';
      qs('[data-porte]', raiz).value = '';
      qs('[data-ordem]', raiz).value = 'vagas';
      qs('[data-areas]', raiz).innerHTML = htmlAreas();
      desenhar();
    }
  });

  desenhar();
  document.title = 'Empresas contratando | NORTE';
  return () => {};
}
