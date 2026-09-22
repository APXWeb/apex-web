/* ============================================================
   NORTE — Home
   ============================================================ */

import { qs, delegate, observarAnimacoes } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { caixaBusca, ativarBusca } from '../components/caixaBusca.js';
import { vagaCard, ligarSalvarVaga } from '../components/vagaCard.js';
import { toast } from '../components/ui.js';
import {
  state, vagasAtivas, profissoesVisiveis, alternarSalvo, estaSalvo,
  acharProfissao, acharRegiao,
} from '../services/store.js';
import { recomendadasParaMim } from '../services/busca.js';
import { AREAS } from '../data/profissoes.js';
import { REGIOES } from '../data/regioes.js';
import { num, compacto, dinheiro, escapeHtml, plural, pct } from '../utils/format.js';
import { montarUrl } from '../router.js';

const ATALHOS = [
  ['front-end', 'sp-sp'],
  ['analista-dados', 'sp-sp'],
  ['enfermeiro', 'mg-bh'],
  ['eletricista', 'go-goi'],
  ['ux-designer', 'remoto'],
];

export function paginaHome(raiz) {
  const vagas = vagasAtivas();
  const profs = profissoesVisiveis();

  const porArea = {};
  profs.forEach(p => { porArea[p.area] = (porArea[p.area] || 0) + 1; });
  const vagasPorArea = {};
  vagas.forEach(v => { vagasPorArea[v.area] = (vagasPorArea[v.area] || 0) + 1; });
  const maxVagasArea = Math.max(1, ...Object.values(vagasPorArea));

  const emAlta = [...profs].sort((a, b) => (b.demanda + b.crescimento * 2) - (a.demanda + a.crescimento * 2)).slice(0, 8);
  const recomendadas = recomendadasParaMim(4);
  const recentes = state.historico.slice(0, 3);

  const salarioMedio = Math.round(
    profs.reduce((s, p) => s + p.salario.media, 0) / (profs.length || 1)
  );

  raiz.innerHTML = `
  <!-- ============ HERO ============ -->
  <section class="hero">
    <div class="shell hero__grade">
      <span class="sobrancelha" data-anim>
        ${icon.bussola({ size: 13 })} Profissão + região = o seu próximo passo
      </span>

      <h1 class="hero__titulo" data-anim="1">
        Encontre oportunidades <em>perto de você.</em>
      </h1>

      <p class="hero__sub" data-anim="2">
        Diga o que você quer fazer e onde quer trabalhar. A gente mostra quem está
        contratando, quanto paga e o caminho até chegar lá.
      </p>

      <div class="hero__busca" data-anim="3" data-busca-hero>
        ${caixaBusca({ tamanho: 'grande' })}
      </div>

      <div class="hero__atalhos" data-anim="4">
        <span class="hero__atalho-rot">Buscas frequentes:</span>
        ${ATALHOS.map(([p, r]) => {
          const prof = acharProfissao(p);
          const reg = acharRegiao(r);
          if (!prof || !reg) return '';
          return `<a class="etiqueta" href="${montarUrl('/buscar', { p, r })}">
            ${escapeHtml(prof.nome)} <span class="fraco">em ${escapeHtml(reg.cidade)}</span>
          </a>`;
        }).join('')}
      </div>

      <div class="hero__numeros" data-anim="5">
        <div class="hero__num">
          <p class="hero__num-n">${compacto(vagas.length)}</p>
          <p class="hero__num-l">oportunidades abertas</p>
        </div>
        <div class="hero__num">
          <p class="hero__num-n">${num(profs.length)}</p>
          <p class="hero__num-l">profissões mapeadas</p>
        </div>
        <div class="hero__num">
          <p class="hero__num-n">${num(REGIOES.length)}</p>
          <p class="hero__num-l">regiões cobertas</p>
        </div>
        <div class="hero__num">
          <p class="hero__num-n">${num(state.empresas.length)}</p>
          <p class="hero__num-l">empresas contratando</p>
        </div>
      </div>
    </div>
  </section>

  ${recentes.length ? `
  <!-- ============ CONTINUAR ============ -->
  <section class="shell" style="padding-bottom:var(--sp-10)">
    <div class="secao__topo" style="margin-bottom:var(--sp-5)">
      <div>
        <span class="sobrancelha">${icon.relogio({ size: 13 })} Continue de onde parou</span>
      </div>
      <a href="#/perfil/historico" class="btn btn--fantasma btn--sm">
        Ver histórico ${icon.chevronR({ size: 14 })}
      </a>
    </div>
    <div class="alta-grade">
      ${recentes.map(h => `
        <a class="alta-item" href="${montarUrl('/buscar', { p: h.profissaoId, r: h.regiaoId })}">
          <span class="alta-item__pos">${icon.lupa({ size: 15 })}</span>
          <span class="alta-item__txt">
            <span class="alta-item__n cortar">${escapeHtml(h.profissao)}</span>
            <span class="alta-item__s cortar">${escapeHtml(h.regiao)}</span>
          </span>
          <span class="alta-item__v">
            <b>${num(h.total)}</b>
            <span>vagas</span>
          </span>
        </a>`).join('')}
    </div>
  </section>` : ''}

  <!-- ============ AREAS ============ -->
  <section class="shell secao">
    <div class="secao__topo">
      <div>
        <span class="sobrancelha" data-anim>${icon.grade({ size: 13 })} Explore por área</span>
        <h2 class="titulo-secao" data-anim="1">Onde está o trabalho hoje</h2>
        <p class="lead" data-anim="2">
          Cada área reúne profissões com formação, rotina e mercado parecidos.
          Comece por uma e veja o que existe perto de você.
        </p>
      </div>
      <a href="#/profissoes" class="btn btn--contorno btn--sm" data-anim="2">
        Ver todas as profissões ${icon.chevronR({ size: 14 })}
      </a>
    </div>

    <div class="area-grade">
      ${AREAS.map((a, i) => {
        const nVagas = vagasPorArea[a.id] || 0;
        return `
        <a class="area-card" href="#/profissoes?area=${a.id}" data-anim="${Math.min(i, 6)}">
          <span class="area-card__ic" style="color:${a.cor}">${icon[a.icone]({ size: 20 })}</span>
          <span>
            <span class="area-card__n">${escapeHtml(a.nome)}</span>
            <span class="area-card__c">${plural(porArea[a.id] || 0, 'profissão', 'profissões')} · ${compacto(nVagas)} vagas</span>
          </span>
          <span class="area-card__barra">
            <i style="width:${Math.max(8, (nVagas / maxVagasArea) * 100)}%;background:${a.cor}"></i>
          </span>
        </a>`;
      }).join('')}
    </div>
  </section>

  <!-- ============ EM ALTA ============ -->
  <section class="shell secao" style="padding-top:0">
    <div class="secao__topo">
      <div>
        <span class="sobrancelha" data-anim>${icon.tendencia({ size: 13 })} Em alta agora</span>
        <h2 class="titulo-secao" data-anim="1">Profissões com mais procura</h2>
        <p class="lead" data-anim="2">
          Combinação de volume de vagas abertas e crescimento nos últimos doze meses.
        </p>
      </div>
    </div>

    <div class="alta-grade">
      ${emAlta.map((p, i) => `
        <a class="alta-item" href="#/profissao/${p.id}" data-anim="${Math.min(i, 6)}">
          <span class="alta-item__pos">${String(i + 1).padStart(2, '0')}</span>
          <span class="alta-item__txt">
            <span class="alta-item__n cortar">${escapeHtml(p.nome)}</span>
            <span class="alta-item__s">
              ${dinheiro(p.salario.media)}/mês ·
              <span style="color:var(--verde-600)">+${pct(p.crescimento)} ao ano</span>
            </span>
          </span>
          <span class="alta-item__v">
            <b>${compacto(vagas.filter(v => v.profissaoId === p.id).length)}</b>
            <span>vagas</span>
          </span>
        </a>`).join('')}
    </div>
  </section>

  <!-- ============ COMO FUNCIONA ============ -->
  <section class="shell secao" style="padding-top:0">
    <div class="secao__topo">
      <div>
        <span class="sobrancelha" data-anim>${icon.bussola({ size: 13 })} Como funciona</span>
        <h2 class="titulo-secao" data-anim="1">Três passos até uma decisão melhor</h2>
      </div>
    </div>

    <div class="passos">
      <article class="passo" data-anim>
        <span class="passo__n">01</span>
        <h3>Escolha profissão e região</h3>
        <p>
          Digite o que você quer fazer e onde. Não precisa saber o nome técnico:
          a busca entende sinônimos e habilidades.
        </p>
      </article>
      <article class="passo" data-anim="1">
        <span class="passo__n">02</span>
        <h3>Veja o mercado real daquele lugar</h3>
        <p>
          Quantas vagas existem, quem está contratando, quanto se paga, qual o
          modelo de trabalho mais comum e onde ficam as oportunidades no mapa.
        </p>
      </article>
      <article class="passo" data-anim="2">
        <span class="passo__n">03</span>
        <h3>Entenda o caminho até lá</h3>
        <p>
          Formação necessária, habilidades exigidas, quanto tempo leva e o que
          fazer em cada etapa, do primeiro curso ao nível sênior.
        </p>
      </article>
    </div>
  </section>

  <!-- ============ COMPARAR ============ -->
  <section class="shell secao" style="padding-top:0">
    <div class="faixa-escura" data-anim>
      <div class="faixa-escura__grade">
        <div>
          <span class="sobrancelha" style="color:var(--marca-300)">
            ${icon.comparar({ size: 13 })} Em dúvida entre dois caminhos?
          </span>
          <h2 class="titulo-secao" style="font-size:var(--fs-2xl)">
            Compare profissões lado a lado
          </h2>
          <p class="lead">
            Salário, demanda, tempo de formação, dificuldade de entrada e chance de
            trabalhar remoto. Sem ranking e sem resposta pronta: os dados de um lado,
            os do outro, e a decisão continua sendo sua.
          </p>
          <a href="#/comparar" class="btn btn--primario" style="margin-top:var(--sp-6)">
            Comparar profissões ${icon.seta({ size: 17 })}
          </a>
        </div>

        ${miniComparacao()}
      </div>
    </div>
  </section>

  ${recomendadas.length ? `
  <!-- ============ RECOMENDADAS ============ -->
  <section class="shell secao" style="padding-top:0" data-lista-vagas>
    <div class="secao__topo">
      <div>
        <span class="sobrancelha" data-anim>${icon.alvo({ size: 13 })} Para o seu perfil</span>
        <h2 class="titulo-secao" data-anim="1">Oportunidades que combinam com você</h2>
        <p class="lead" data-anim="2">
          Selecionadas a partir das suas áreas de interesse, região preferida e
          modelo de trabalho. Ajuste isso em preferências quando quiser.
        </p>
      </div>
      <a href="#/perfil/preferencias" class="btn btn--contorno btn--sm" data-anim="2">
        ${icon.ajustes({ size: 15 })} Ajustar preferências
      </a>
    </div>

    <div class="res-grade res-grade--2">
      ${recomendadas.map((v, i) => `<div data-anim="${Math.min(i, 4)}">${vagaCard(v)}</div>`).join('')}
    </div>
  </section>` : ''}

  <!-- ============ CHAMADA FINAL ============ -->
  <section class="shell secao" style="padding-top:0">
    <div class="cartao cartao--pad centro" data-anim
         style="padding-block:var(--sp-16);display:grid;justify-items:center;gap:var(--sp-5)">
      <span class="sobrancelha">${icon.sino({ size: 13 })} Não perca a vaga certa</span>
      <h2 style="font-size:var(--fs-2xl);max-width:20ch">
        Crie um alerta e saiba quando algo novo aparecer
      </h2>
      <p class="lead centro" style="margin-inline:auto">
        Escolha profissão, região, salário mínimo e modelo de trabalho.
        Avisamos assim que surgir uma oportunidade compatível.
      </p>
      <a href="#/perfil/alertas" class="btn btn--primario btn--lg">
        Criar meu alerta ${icon.seta({ size: 17 })}
      </a>
      <p class="fraco" style="font-size:var(--fs-xs)">
        Nesta demonstração os alertas funcionam localmente, no seu navegador.
      </p>
    </div>
  </section>`;

  /* ---------- Interacoes ---------- */
  const desligarBusca = ativarBusca(qs('[data-busca-hero]', raiz));

  const lista = qs('[data-lista-vagas]', raiz);
  if (lista) {
    ligarSalvarVaga(lista, (id, btn) => {
      const salvo = alternarSalvo('vagas', id);
      btn.classList.toggle('is-on', salvo);
      btn.setAttribute('aria-pressed', String(salvo));
      btn.innerHTML = icon.marcador({ size: 16, fill: salvo ? 'currentColor' : 'none' });
      toast(salvo ? 'Vaga salva' : 'Vaga removida dos salvos', {
        tipo: salvo ? 'ok' : 'info',
        acao: salvo ? { rotulo: 'Ver salvos', fn: () => { location.hash = '#/perfil/salvos'; } } : null,
      });
    });
  }

  observarAnimacoes(raiz);
  document.title = 'NORTE | Encontre o seu norte profissional';

  return () => desligarBusca();
}

/* Amostra estatica de comparacao, so para ilustrar a secao */
function miniComparacao() {
  const a = acharProfissao('front-end');
  const b = acharProfissao('ux-designer');
  if (!a || !b) return '';

  const linha = (rotulo, va, vb, fmt = (x) => x) => {
    const max = Math.max(va, vb) || 1;
    return `
      <div>
        <p class="mini-compara__rot">${escapeHtml(rotulo)}</p>
        <div class="mini-compara__linha">
          <span class="mini-compara__v">${fmt(va)}</span>
          <span></span>
          <span class="mini-compara__v mini-compara__v--dir">${fmt(vb)}</span>
        </div>
        <div class="mini-compara__linha" style="margin-top:6px">
          <span class="mini-compara__barra"><i style="width:${(va / max) * 100}%;background:var(--marca-400)"></i></span>
          <span></span>
          <span class="mini-compara__barra"><i style="width:${(vb / max) * 100}%;background:var(--teal-500)"></i></span>
        </div>
      </div>`;
  };

  return `
  <div class="mini-compara" aria-hidden="true">
    <div class="mini-compara__linha" style="margin-bottom:var(--sp-2)">
      <span class="mini-compara__v">${escapeHtml(a.nome)}</span>
      <span class="mini-compara__rot">vs</span>
      <span class="mini-compara__v mini-compara__v--dir">${escapeHtml(b.nome)}</span>
    </div>
    ${linha('Salário médio', a.salario.media, b.salario.media, dinheiro)}
    ${linha('Demanda', a.demanda, b.demanda, (x) => `${x}/100`)}
    ${linha('Vagas remotas', a.remotoPct, b.remotoPct, (x) => `${x}%`)}
  </div>`;
}
