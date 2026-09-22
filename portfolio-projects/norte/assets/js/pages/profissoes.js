/* ============================================================
   NORTE — Catálogo de profissões
   Para quem ainda não sabe o nome do que procura: navega por
   área, filtra por formação exigida e ordena por salário,
   demanda ou facilidade de entrada.
   ============================================================ */

import { qs, qsa, debounce, observarAnimacoes } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import {
  escapeHtml, dinheiroCompacto, num, pct, plural, norm, realcar,
} from '../utils/format.js';
import {
  profissoesVisiveis, todasRegioes, vagasAtivas, state, salarioNaRegiao,
} from '../services/store.js';
import { AREAS, AREA_POR_ID } from '../data/profissoes.js';
import { vazio } from '../components/ui.js';
import { montarUrl, ir } from '../router.js';

const ORDENS = [
  { id: 'demanda', nome: 'Mais procuradas' },
  { id: 'salario', nome: 'Maior salário' },
  { id: 'vagas', nome: 'Mais vagas abertas' },
  { id: 'facil', nome: 'Mais fáceis de entrar' },
  { id: 'cresce', nome: 'Que mais crescem' },
  { id: 'az', nome: 'Ordem alfabética' },
];

const FORMACOES = [
  { id: 'opcional', nome: 'Sem exigir diploma' },
  { id: 'tecnica', nome: 'Formação técnica' },
  { id: 'recomendada', nome: 'Graduação recomendada' },
  { id: 'necessaria', nome: 'Graduação obrigatória' },
];

export function paginaProfissoes(raiz, params, query) {
  const estado = {
    termo: query.q || '',
    area: query.a || '',
    regiao: query.r || 'qualquer',
    formacoes: query.f ? query.f.split(',').filter(Boolean) : [],
    ordem: ORDENS.some(o => o.id === query.o) ? query.o : 'demanda',
  };

  // Contagem de vagas por profissao, calculada uma vez
  const vagasPorProfissao = {};
  vagasAtivas().forEach(v => {
    vagasPorProfissao[v.profissaoId] = (vagasPorProfissao[v.profissaoId] || 0) + 1;
  });

  const vagasNaRegiao = (profissaoId) => {
    if (estado.regiao === 'qualquer') return vagasPorProfissao[profissaoId] || 0;
    return vagasAtivas().filter(v =>
      v.profissaoId === profissaoId &&
      (v.regiaoId === estado.regiao || v.regiaoId === 'remoto')
    ).length;
  };

  raiz.innerHTML = `
    <div class="shell" style="padding-block:var(--sp-10) var(--sp-6)">
      <p class="sobrancelha">${num(profissoesVisiveis().length)} profissões mapeadas</p>
      <h1 style="font-size:var(--fs-3xl);letter-spacing:-0.035em;max-width:20ch">
        Explore carreiras e descubra qual combina com você
      </h1>
      <p class="lead" style="margin-top:var(--sp-4)">
        Cada profissão traz salário por nível, demanda real, o que estudar
        e o caminho completo até chegar lá.
      </p>

      <div class="linha" style="gap:var(--sp-3);flex-wrap:wrap;margin-top:var(--sp-7)">
        <label class="campo-icone" style="flex:1;min-width:min(280px,100%)">
          <span class="so-leitor">Buscar profissão</span>
          ${icon.lupa({ size: 17 })}
          <input type="search" class="input" data-termo placeholder="Buscar por nome, área ou habilidade"
                 value="${escapeHtml(estado.termo)}" autocomplete="off">
        </label>

        <label class="linha" style="gap:var(--sp-2)">
          <span class="so-leitor">Região</span>
          <select class="select" data-regiao style="min-width:180px">
            <option value="qualquer">Todo o país</option>
            ${todasRegioes().map(r => `
              <option value="${r.id}" ${r.id === estado.regiao ? 'selected' : ''}>${escapeHtml(r.nome)}</option>`).join('')}
          </select>
        </label>

        <label class="linha" style="gap:var(--sp-2)">
          <span class="so-leitor">Ordenar por</span>
          <select class="select" data-ordem style="min-width:190px">
            ${ORDENS.map(o => `
              <option value="${o.id}" ${o.id === estado.ordem ? 'selected' : ''}>${o.nome}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="res-chips" style="margin-top:var(--sp-5)" data-areas>${htmlAreas()}</div>

      <div class="res-chips" style="margin-bottom:var(--sp-2)">
        ${FORMACOES.map(f => `
          <button type="button" class="etiqueta ${estado.formacoes.includes(f.id) ? 'is-on' : ''}"
                  data-formacao="${f.id}" aria-pressed="${estado.formacoes.includes(f.id)}">
            ${icon.chapeu({ size: 12 })} ${f.nome}
          </button>`).join('')}
      </div>
    </div>

    <div class="shell" style="padding-bottom:var(--sp-20)">
      <div class="res-barra">
        <p class="res-contagem"><b data-total>0</b> <span data-total-txt>profissões</span></p>
        <button type="button" class="btn btn--fantasma btn--sm" data-limpar>Limpar filtros</button>
      </div>
      <div data-lista></div>
    </div>`;

  function htmlAreas() {
    const todas = `
      <button type="button" class="etiqueta ${!estado.area ? 'is-on' : ''}" data-area=""
              aria-pressed="${!estado.area}">Todas as áreas</button>`;
    return todas + AREAS.map(a => {
      const n = profissoesVisiveis().filter(p => p.area === a.id).length;
      if (!n) return '';
      return `
      <button type="button" class="etiqueta ${estado.area === a.id ? 'is-on' : ''}"
              data-area="${a.id}" aria-pressed="${estado.area === a.id}">
        <span style="color:${a.cor}">${icon[a.icone]({ size: 13 })}</span>
        ${escapeHtml(a.nome)}
        <span style="color:var(--txt-fraco);font-variant-numeric:tabular-nums">${n}</span>
      </button>`;
    }).join('');
  }

  /* ---------------- Filtro e ordenação ---------------- */
  function filtrar() {
    const t = norm(estado.termo);
    let lista = profissoesVisiveis();

    if (estado.area) lista = lista.filter(p => p.area === estado.area);
    if (estado.formacoes.length) lista = lista.filter(p => estado.formacoes.includes(p.formacao.exigencia));

    if (t) {
      lista = lista.filter(p =>
        norm(p.nome).includes(t) ||
        (p.sinonimos || []).some(s => norm(s).includes(t)) ||
        norm(AREA_POR_ID[p.area]?.nome || '').includes(t) ||
        p.hardSkills.some(s => norm(s).includes(t)) ||
        norm(p.resumo).includes(t)
      );
    }

    // Com região escolhida, só faz sentido mostrar quem tem vaga lá
    if (estado.regiao !== 'qualquer') lista = lista.filter(p => vagasNaRegiao(p.id) > 0);

    const indice = estado.regiao === 'qualquer' ? 1 : (todasRegioes().find(r => r.id === estado.regiao)?.indice || 1);

    const copia = [...lista];
    switch (estado.ordem) {
      case 'salario': copia.sort((a, b) => b.salario.media - a.salario.media); break;
      case 'vagas': copia.sort((a, b) => vagasNaRegiao(b.id) - vagasNaRegiao(a.id)); break;
      case 'facil': copia.sort((a, b) => a.dificuldade - b.dificuldade || b.demanda - a.demanda); break;
      case 'cresce': copia.sort((a, b) => b.crescimento - a.crescimento); break;
      case 'az': copia.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); break;
      default: copia.sort((a, b) => b.demanda - a.demanda);
    }

    return { lista: copia, indice };
  }

  function sincronizarUrl() {
    history.replaceState(null, '', montarUrl('/profissoes', {
      q: estado.termo,
      a: estado.area,
      r: estado.regiao !== 'qualquer' ? estado.regiao : '',
      f: estado.formacoes.join(','),
      o: estado.ordem !== 'demanda' ? estado.ordem : '',
    }));
  }

  function desenhar() {
    const { lista } = filtrar();
    sincronizarUrl();

    qs('[data-total]', raiz).textContent = num(lista.length);
    qs('[data-total-txt]', raiz).textContent =
      lista.length === 1 ? 'profissão encontrada' : 'profissões encontradas';

    const alvo = qs('[data-lista]', raiz);

    if (!lista.length) {
      alvo.innerHTML = vazio({
        icone: 'lupa',
        titulo: 'Nenhuma profissão com esses filtros',
        texto: estado.regiao !== 'qualquer'
          ? 'Talvez não haja vagas dessa área nessa região. Tente "Todo o país".'
          : 'Tente outro termo ou limpe os filtros.',
        acao: '<button type="button" class="btn btn--primario" data-limpar style="margin-top:var(--sp-5)">Limpar filtros</button>',
      });
      return;
    }

    alvo.innerHTML = `<div class="res-grade res-grade--2">${lista.map(cartao).join('')}</div>`;
    observarAnimacoes(alvo);
  }

  function cartao(p) {
    const a = AREA_POR_ID[p.area];
    const nVagas = vagasNaRegiao(p.id);
    const sal = salarioNaRegiao(p, estado.regiao);
    const salvo = (state.salvos.profissoes || []).includes(p.id);

    return `
    <a class="cartao cartao--pad" href="#/profissao/${p.id}" style="display:grid;gap:var(--sp-4);align-content:start">
      <span class="linha" style="gap:var(--sp-3);align-items:flex-start">
        <span class="prof-capa__ic" style="color:${a?.cor || 'var(--acento)'};width:42px;height:42px;flex-shrink:0">
          ${icon[a?.icone || 'maleta']({ size: 20 })}
        </span>
        <span style="flex:1;min-width:0">
          <span style="display:block;font-family:var(--fonte-display);font-weight:600;font-size:var(--fs-md);color:var(--txt-forte)">
            ${realcar(p.nome, estado.termo)}
          </span>
          <span style="display:block;font-size:var(--fs-xs);color:var(--txt-fraco);margin-top:2px">
            ${escapeHtml(a?.nome || '')} · ${escapeHtml(p.formacao.rotulo)}
          </span>
        </span>
        ${salvo ? `<span class="selo selo--marca">${icon.marcador({ size: 11, fill: 'currentColor' })} Salva</span>` : ''}
      </span>

      <span style="font-size:var(--fs-sm);color:var(--txt-suave);line-height:var(--lh-normal)">
        ${escapeHtml(p.resumo)}
      </span>

      <span style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-3);padding-top:var(--sp-3);border-top:1px solid var(--bd-sutil)">
        <span class="stat">
          <span class="stat__n" style="font-size:var(--fs-base)">${dinheiroCompacto(sal.media)}</span>
          <span class="stat__l">salário médio</span>
        </span>
        <span class="stat">
          <span class="stat__n" style="font-size:var(--fs-base)">${num(nVagas)}</span>
          <span class="stat__l">${nVagas === 1 ? 'vaga aberta' : 'vagas abertas'}</span>
        </span>
        <span class="stat">
          <span class="stat__n" style="font-size:var(--fs-base);color:${p.crescimento >= 10 ? 'var(--verde-600)' : 'var(--txt-forte)'}">
            ${p.crescimento > 0 ? '+' : ''}${pct(p.crescimento)}
          </span>
          <span class="stat__l">ao ano</span>
        </span>
      </span>
    </a>`;
  }

  /* ---------------- Interação ---------------- */
  const buscarComAtraso = debounce(desenhar, 200);

  qs('[data-termo]', raiz).addEventListener('input', (e) => {
    estado.termo = e.target.value;
    buscarComAtraso();
  });

  qs('[data-regiao]', raiz).addEventListener('change', (e) => {
    estado.regiao = e.target.value;
    desenhar();
  });

  qs('[data-ordem]', raiz).addEventListener('change', (e) => {
    estado.ordem = e.target.value;
    desenhar();
  });

  raiz.addEventListener('click', (e) => {
    const areaBtn = e.target.closest('[data-area]');
    if (areaBtn) {
      estado.area = areaBtn.dataset.area;
      qs('[data-areas]', raiz).innerHTML = htmlAreas();
      desenhar();
      return;
    }

    const formBtn = e.target.closest('[data-formacao]');
    if (formBtn) {
      const id = formBtn.dataset.formacao;
      const i = estado.formacoes.indexOf(id);
      if (i >= 0) estado.formacoes.splice(i, 1);
      else estado.formacoes.push(id);
      const ligado = estado.formacoes.includes(id);
      formBtn.classList.toggle('is-on', ligado);
      formBtn.setAttribute('aria-pressed', String(ligado));
      desenhar();
      return;
    }

    if (e.target.closest('[data-limpar]')) {
      estado.termo = '';
      estado.area = '';
      estado.regiao = 'qualquer';
      estado.formacoes = [];
      estado.ordem = 'demanda';
      qs('[data-termo]', raiz).value = '';
      qs('[data-regiao]', raiz).value = 'qualquer';
      qs('[data-ordem]', raiz).value = 'demanda';
      qs('[data-areas]', raiz).innerHTML = htmlAreas();
      qsa('[data-formacao]', raiz).forEach(b => {
        b.classList.remove('is-on');
        b.setAttribute('aria-pressed', 'false');
      });
      desenhar();
    }
  });

  desenhar();
  document.title = 'Todas as profissões | NORTE';
  return () => {};
}
