/* ============================================================
   NORTE — Guia da carreira
   Responde, numa pagina so: o que a pessoa faz, quanto ganha,
   onde tem vaga, o que precisa estudar e como chegar la.

   As abas do topo sao ancoras reais: rolam ate a secao e se
   marcam sozinhas conforme a pessoa rola.
   ============================================================ */

import { qs, qsa, rolarAte, observarAnimacoes, throttle } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import {
  escapeHtml, dinheiro, dinheiroCompacto, num, pct, plural, duracaoMeses,
} from '../utils/format.js';
import {
  acharProfissao, acharRegiao, alternarSalvo, estaSalvo, state,
  salarioNaRegiao, vagasDaProfissao, todasRegioes,
} from '../services/store.js';
import { profissoesParecidas } from '../services/busca.js';
import { AREA_POR_ID } from '../data/profissoes.js';
import { graficoLinha, graficoDonut, ranking, ativarGraficos, corDado } from '../components/graficos.js';
import { vagaCard, ligarSalvarVaga } from '../components/vagaCard.js';
import { toast } from '../components/ui.js';
import { montarUrl } from '../router.js';
import { paginaNaoEncontrada } from './naoEncontrada.js';

const SECOES = [
  { id: 'visao', nome: 'Visão geral' },
  { id: 'salario', nome: 'Salário' },
  { id: 'mercado', nome: 'Mercado' },
  { id: 'formacao', nome: 'Formação' },
  { id: 'habilidades', nome: 'Habilidades' },
  { id: 'roteiro', nome: 'Como chegar lá' },
  { id: 'vagas', nome: 'Oportunidades' },
];

const NIVEL_ROTULO = { junior: 'Júnior', pleno: 'Pleno', senior: 'Sênior' };
const DIFICULDADE = ['muito acessível', 'acessível', 'exige preparo', 'exigente', 'muito exigente'];
const COR_EXIGENCIA = {
  necessaria: 'selo--erro',
  recomendada: 'selo--aviso',
  tecnica: 'selo--info',
  opcional: 'selo--ok',
};

export function paginaProfissao(raiz, params) {
  const prof = acharProfissao(params.id);
  if (!prof) return paginaNaoEncontrada(raiz);

  const area = AREA_POR_ID[prof.area];
  const vagas = vagasDaProfissao(prof.id);
  const parecidas = profissoesParecidas(prof, 4);

  // A regiao preferida do perfil da o recorte local sem perguntar nada
  let regiaoId = state.perfil.regiaoPreferida || 'qualquer';
  let regiao = regiaoDe(regiaoId);
  let desligarGraficos = null;

  function regiaoDe(id) {
    return acharRegiao(id) || { id: 'qualquer', cidade: 'todo o país', nome: 'Todo o país', indice: 1 };
  }

  /* ---------------- Capa ---------------- */
  function htmlCapa() {
    const salvo = estaSalvo('profissoes', prof.id);
    const sal = salarioNaRegiao(prof, regiaoId);

    return `
    <header class="prof-capa">
      <div class="prof-capa__grade shell">
        <div>
          <a class="btn btn--fantasma btn--sm" href="#/profissoes" style="margin-bottom:var(--sp-4)">
            ${icon.setaEsq({ size: 15 })} Todas as profissões
          </a>
          <span class="prof-capa__ic" style="color:${area?.cor || 'var(--acento)'}">
            ${icon[area?.icone || 'maleta']({ size: 26 })}
          </span>
          <p class="sobrancelha" style="margin-top:var(--sp-4)">${escapeHtml(area?.nome || '')}</p>
          <h1 class="prof-titulo">${escapeHtml(prof.nome)}</h1>
          <p class="prof-resumo">${escapeHtml(prof.resumo)}</p>

          <div class="prof-marcas">
            <span class="selo selo--neutro">${icon.chapeu({ size: 12 })} ${escapeHtml(prof.formacao.rotulo)}</span>
            <span class="selo selo--neutro">${icon.raio({ size: 12 })} ${pct(prof.remotoPct)} remoto</span>
            <span class="selo ${prof.crescimento >= 10 ? 'selo--ok' : 'selo--neutro'}">
              ${icon.tendencia({ size: 12 })} ${prof.crescimento > 0 ? '+' : ''}${pct(prof.crescimento)} ao ano
            </span>
            <span class="selo selo--neutro">${icon.escada({ size: 12 })} Dificuldade ${prof.dificuldade}/5</span>
          </div>

          <div class="prof-acoes">
            <a class="btn btn--primario" data-link-busca href="${montarUrl('/buscar', { p: prof.id, r: regiaoId })}">
              ${icon.lupa({ size: 17 })} Ver ${plural(vagas.length, 'oportunidade')}
            </a>
            <a class="btn btn--contorno" href="${montarUrl('/comparar', { a: prof.id })}">
              ${icon.comparar({ size: 17 })} Comparar
            </a>
            <button type="button" class="btn btn--fantasma" data-salvar aria-pressed="${salvo}">
              <span data-salvar-ic>${icon.marcador({ size: 17, fill: salvo ? 'currentColor' : 'none' })}</span>
              <span data-salvar-txt>${salvo ? 'Salva' : 'Salvar'}</span>
            </button>
          </div>
        </div>

        <aside class="prof-painel">
          <p class="campo__dica">
            Salário médio ${regiaoId === 'qualquer' ? 'no país' : 'em ' + escapeHtml(regiao.cidade)}
          </p>
          <p class="prof-painel__valor" data-painel-valor>${dinheiro(sal.media)}</p>

          <label class="campo" style="margin-block:var(--sp-4)">
            <span class="so-leitor">Região de referência</span>
            <select class="select" data-regiao>
              <option value="qualquer" ${regiaoId === 'qualquer' ? 'selected' : ''}>Todo o país</option>
              ${todasRegioes().map(r => `
                <option value="${r.id}" ${r.id === regiaoId ? 'selected' : ''}>${escapeHtml(r.nome)}</option>`).join('')}
            </select>
          </label>

          <dl data-painel-linhas>${htmlPainelLinhas(sal)}</dl>
        </aside>
      </div>
    </header>`;
  }

  function htmlPainelLinhas(sal) {
    return `
      <div class="prof-painel__linha">
        <dt>${icon.escada({ size: 13 })} Começando</dt><dd>${dinheiro(sal.junior)}</dd>
      </div>
      <div class="prof-painel__linha">
        <dt>${icon.escada({ size: 13 })} Pleno</dt><dd>${dinheiro(sal.pleno)}</dd>
      </div>
      <div class="prof-painel__linha">
        <dt>${icon.escada({ size: 13 })} Sênior</dt><dd>${dinheiro(sal.senior)}</dd>
      </div>
      <div class="prof-painel__linha">
        <dt>${icon.pulso({ size: 13 })} Demanda</dt><dd>${prof.demanda}/100</dd>
      </div>
      <div class="prof-painel__linha">
        <dt>${icon.relogio({ size: 13 })} Tempo de formação</dt>
        <dd>${duracaoMeses(prof.formacao.tempoMeses) || 'Variável'}</dd>
      </div>`;
  }

  /* ---------------- Seções ---------------- */
  const secao = (id, titulo, numero, conteudo) => `
    <section class="prof-secao" id="sec-${id}">
      <h2 class="prof-secao__t"><span>${numero}</span> ${escapeHtml(titulo)}</h2>
      ${conteudo}
    </section>`;

  function htmlVisao() {
    return secao('visao', `O que faz um ${prof.nome.toLowerCase()}`, '01', `
      <p class="prof-texto">${escapeHtml(prof.descricao)}</p>

      <div class="skills-grade" style="margin-top:var(--sp-8)">
        <div>
          <p class="filtro-bloco__t">Responsabilidades</p>
          <ul class="lista-check">
            ${prof.responsabilidades.map(r => `
              <li><span>${icon.ok({ size: 16 })}</span> ${escapeHtml(r)}</li>`).join('')}
          </ul>
        </div>
        <div>
          <p class="filtro-bloco__t">Como é o dia a dia</p>
          <ul class="lista-check">
            ${prof.diaADia.map(d => `
              <li><span>${icon.relogio({ size: 16 })}</span> ${escapeHtml(d)}</li>`).join('')}
          </ul>
        </div>
      </div>

      <div style="margin-top:var(--sp-8)">
        <p class="filtro-bloco__t">Onde essa pessoa trabalha</p>
        <div class="skill-lista">
          ${prof.ondeTrabalha.map(o => `
            <span class="skill">${icon.predio({ size: 14 })} ${escapeHtml(o)}</span>`).join('')}
        </div>
      </div>`);
  }

  function htmlGraficoSalario() {
    const indice = regiaoDe(regiaoId).indice || 1;
    const evolucao = prof.evolucao.map(e => ({
      rotulo: e.rotulo,
      valor: Math.round(e.valor * indice),
    }));

    return graficoLinha(evolucao, {
      titulo: 'Como o salário cresce com o tempo',
      sub: `Estimativa ${regiaoId === 'qualquer' ? 'nacional' : 'para ' + regiao.cidade} · valor mensal bruto`,
      fmt: dinheiroCompacto,
      rotuloX: 'Tempo de carreira',
      nome: 'Salário',
      cor: 'var(--dado-1)',
    });
  }

  function htmlSalarioCards(sal) {
    const itens = [
      { l: 'Entrando na área', v: sal.junior, e: 'até 2 anos de experiência' },
      { l: 'Pleno', v: sal.pleno, e: '2 a 5 anos', destaque: true },
      { l: 'Sênior', v: sal.senior, e: 'acima de 5 anos' },
      { l: 'Teto observado', v: sal.max, e: 'especialista ou liderança' },
    ];
    return itens.map(i => `
      <div class="salario-card ${i.destaque ? 'destaque' : ''}">
        <p class="salario-card__l">${i.l}</p>
        <p class="salario-card__v">${dinheiro(i.v)}</p>
        <p class="salario-card__e">${i.e}</p>
      </div>`).join('');
  }

  function htmlSalario() {
    const sal = salarioNaRegiao(prof, regiaoId);
    return secao('salario', 'Quanto ganha', '02', `
      <div class="salario-grade" data-salario-cards>${htmlSalarioCards(sal)}</div>

      <div class="cartao cartao--pad" style="margin-top:var(--sp-6)" data-graf-salario>
        ${htmlGraficoSalario()}
      </div>

      <p class="campo__dica" style="margin-top:var(--sp-4)">
        Os valores são uma referência de mercado para esta demonstração e variam
        conforme porte da empresa, setor e negociação.
      </p>`);
  }

  function htmlMercado() {
    const porRegiao = todasRegioes()
      .map(r => ({
        rotulo: r.nome,
        valor: vagas.filter(v => v.regiaoId === r.id).length,
        href: montarUrl('/buscar', { p: prof.id, r: r.id }),
      }))
      .filter(x => x.valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);

    const modelos = [
      { rotulo: 'Remoto', valor: prof.modelos.remoto, cor: corDado(0) },
      { rotulo: 'Híbrido', valor: prof.modelos.hibrido, cor: corDado(1) },
      { rotulo: 'Presencial', valor: prof.modelos.presencial, cor: corDado(2) },
    ];

    return secao('mercado', 'Como está o mercado', '03', `
      <div class="res-stats" style="margin-top:0">
        <div class="res-stat">
          <p class="res-stat__l">${icon.pulso({ size: 13 })} Índice de demanda</p>
          <p class="res-stat__v">${prof.demanda}<span style="font-size:var(--fs-sm);color:var(--txt-fraco)">/100</span></p>
          <div class="barra barra--fina" style="margin-top:var(--sp-2)">
            <span style="width:${prof.demanda}%"></span>
          </div>
        </div>
        <div class="res-stat">
          <p class="res-stat__l">${icon.tendencia({ size: 13 })} Crescimento anual</p>
          <p class="res-stat__v">${prof.crescimento > 0 ? '+' : ''}${pct(prof.crescimento)}</p>
          <p class="res-stat__e">projeção de novas vagas</p>
        </div>
        <div class="res-stat">
          <p class="res-stat__l">${icon.maleta({ size: 13 })} Vagas na plataforma</p>
          <p class="res-stat__v">${num(vagas.length)}</p>
          <p class="res-stat__e">${plural(vagas.filter(v => v.diasPublicada <= 7).length, 'nova')} nesta semana</p>
        </div>
        <div class="res-stat">
          <p class="res-stat__l">${icon.escada({ size: 13 })} Dificuldade de entrada</p>
          <p class="res-stat__v">${prof.dificuldade}<span style="font-size:var(--fs-sm);color:var(--txt-fraco)">/5</span></p>
          <p class="res-stat__e">${DIFICULDADE[prof.dificuldade - 1] || ''}</p>
        </div>
      </div>

      <div class="skills-grade" style="margin-top:var(--sp-8)">
        <div class="cartao cartao--pad">
          <p class="graf__titulo" style="margin-bottom:var(--sp-4)">Onde estão as vagas</p>
          ${porRegiao.length
            ? ranking(porRegiao, { fmt: (v) => plural(v, 'vaga') })
            : '<p class="campo__dica">Nenhuma vaga aberta no momento.</p>'}
        </div>
        <div class="cartao cartao--pad">
          ${graficoDonut(modelos, {
            titulo: 'Modelo de trabalho',
            sub: 'proporção típica das vagas desta profissão',
            tamanho: 190,
            centro: pct(prof.modelos.remoto),
            centroSub: 'remoto',
            fmt: (v) => pct(v),
          })}
        </div>
      </div>`);
  }

  function htmlFormacao() {
    return secao('formacao', 'O que você precisa estudar', '04', `
      <div class="cartao cartao--pad">
        <div class="linha" style="gap:var(--sp-3);flex-wrap:wrap">
          <span class="selo ${COR_EXIGENCIA[prof.formacao.exigencia] || 'selo--neutro'}">
            ${icon.chapeu({ size: 12 })} ${escapeHtml(prof.formacao.rotulo)}
          </span>
          <span class="selo selo--neutro">
            ${icon.relogio({ size: 12 })} ${duracaoMeses(prof.formacao.tempoMeses) || 'tempo variável'} de preparo
          </span>
        </div>
        <p class="prof-texto" style="margin-top:var(--sp-4)">${escapeHtml(prof.formacao.detalhe)}</p>
      </div>

      <div class="skills-grade" style="margin-top:var(--sp-8)">
        <div>
          <p class="filtro-bloco__t">Cursos que abrem porta</p>
          <div class="curso-lista">
            ${prof.cursos.map(c => `
              <div class="curso">
                <span class="curso__ic">${icon.livro({ size: 17 })}</span>
                <span style="flex:1;min-width:0">
                  <span class="curso__n">${escapeHtml(c.nome)}</span>
                  <span class="curso__s">${escapeHtml(c.tipo)} · ${escapeHtml(c.duracao)}</span>
                </span>
              </div>`).join('')}
          </div>
        </div>
        <div>
          <p class="filtro-bloco__t">Certificações valorizadas</p>
          ${prof.certificacoes.length ? `
            <div class="curso-lista">
              ${prof.certificacoes.map(c => `
                <div class="curso">
                  <span class="curso__ic">${icon.medalha({ size: 17 })}</span>
                  <span style="flex:1;min-width:0">
                    <span class="curso__n">${escapeHtml(c)}</span>
                    <span class="curso__s">diferencial no currículo</span>
                  </span>
                </div>`).join('')}
            </div>`
            : '<p class="campo__dica">Esta profissão não depende de certificação formal.</p>'}
        </div>
      </div>`);
  }

  function htmlHabilidades() {
    const sal = salarioNaRegiao(prof, regiaoId);
    return secao('habilidades', 'Habilidades e ferramentas', '05', `
      <div class="skills-grade">
        <div>
          <p class="filtro-bloco__t">Técnicas (o que você precisa saber fazer)</p>
          <div class="skill-lista">
            ${prof.hardSkills.map(s => `<span class="skill skill--hard">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>
        <div>
          <p class="filtro-bloco__t">Comportamentais (o que o time espera de você)</p>
          <div class="skill-lista">
            ${prof.softSkills.map(s => `<span class="skill">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>
      </div>

      <div style="margin-top:var(--sp-8)">
        <p class="filtro-bloco__t">Ferramentas do dia a dia</p>
        <div class="skill-lista">
          ${prof.ferramentas.map(f => `
            <span class="skill">${icon.ajustes({ size: 13 })} ${escapeHtml(f)}</span>`).join('')}
        </div>
      </div>

      <h3 style="font-size:var(--fs-lg);margin-top:var(--sp-10);margin-bottom:var(--sp-4)">
        O que se espera em cada nível
      </h3>
      <div class="exp-grade" data-exp-cards>${htmlExpCards(sal)}</div>`);
  }

  function htmlExpCards(sal) {
    return ['junior', 'pleno', 'senior'].map((n, i) => `
      <div class="exp-card">
        <p class="exp-card__n">
          <span style="color:${corDado(i)}">${icon.escada({ size: 16 })}</span> ${NIVEL_ROTULO[n]}
        </p>
        <p class="exp-card__t">${escapeHtml(prof.experiencia[n])}</p>
        <p class="exp-card__s">${dinheiro(sal[n])}<span style="font-size:var(--fs-xs);color:var(--txt-fraco);font-weight:400">/mês</span></p>
      </div>`).join('');
  }

  function htmlRoteiro() {
    return secao('roteiro', `Como chegar a ${prof.nome.toLowerCase()}`, '06', `
      <p class="prof-texto" style="margin-bottom:var(--sp-8)">
        Um caminho possível, do zero até a senioridade. Cada etapa abre com um clique.
        Os tempos são médias: quem já trabalha na área costuma pular etapas.
      </p>

      <ol class="roteiro" data-roteiro>
        ${prof.roteiro.map((e, i) => `
          <li class="roteiro__etapa ${i === 0 ? 'aberta' : ''}">
            <div class="roteiro__coluna">
              <span class="roteiro__bola">${e.ordem}</span>
              ${i < prof.roteiro.length - 1 ? '<span class="roteiro__linha"></span>' : ''}
            </div>
            <button type="button" class="roteiro__conteudo" aria-expanded="${i === 0}"
                    aria-controls="etapa-${i}">
              <span class="roteiro__fase">${escapeHtml(e.fase)}</span>
              <span class="roteiro__titulo">${escapeHtml(e.titulo)}</span>
              <span class="roteiro__desc" id="etapa-${i}" ${i === 0 ? '' : 'hidden'}>${escapeHtml(e.descricao)}</span>
              <span class="roteiro__dur">${icon.relogio({ size: 12 })} ${escapeHtml(e.duracao)}</span>
            </button>
          </li>`).join('')}
      </ol>`);
  }

  function htmlVagas() {
    const destaques = [...vagas]
      .sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) || a.diasPublicada - b.diasPublicada)
      .slice(0, 4);

    return secao('vagas', 'Oportunidades abertas agora', '07', destaques.length ? `
      <div class="res-grade res-grade--2">
        ${destaques.map(v => vagaCard(v)).join('')}
      </div>
      <div class="linha" style="justify-content:center;margin-top:var(--sp-7)">
        <a class="btn btn--primario" data-link-busca href="${montarUrl('/buscar', { p: prof.id, r: regiaoId })}">
          Ver todas as ${num(vagas.length)} oportunidades ${icon.chevronR({ size: 16 })}
        </a>
      </div>`
      : '<p class="campo__dica">Nenhuma vaga aberta para esta profissão no momento.</p>');
  }

  function htmlParecidas() {
    if (!parecidas.length) return '';
    return `
    <section class="prof-secao">
      <h2 class="prof-secao__t"><span>08</span> Profissões parecidas</h2>
      <div class="res-grade res-grade--2">
        ${parecidas.map(p => {
          const a = AREA_POR_ID[p.area];
          return `
          <a class="cartao cartao--pad" href="#/profissao/${p.id}" style="display:grid;gap:var(--sp-3)">
            <span class="linha" style="gap:var(--sp-3)">
              <span class="prof-capa__ic" style="color:${a?.cor || 'var(--acento)'};width:38px;height:38px">
                ${icon[a?.icone || 'maleta']({ size: 18 })}
              </span>
              <span>
                <span style="display:block;font-weight:600;color:var(--txt-forte)">${escapeHtml(p.nome)}</span>
                <span style="display:block;font-size:var(--fs-xs);color:var(--txt-fraco)">${escapeHtml(a?.nome || '')}</span>
              </span>
            </span>
            <span style="font-size:var(--fs-sm);color:var(--txt-suave);line-height:var(--lh-normal)">
              ${escapeHtml(p.resumo)}
            </span>
            <span class="linha" style="gap:var(--sp-4);font-size:var(--fs-xs);color:var(--txt-fraco)">
              <span>${icon.moeda({ size: 12 })} ${dinheiroCompacto(p.salario.media)}</span>
              <span>${icon.pulso({ size: 12 })} demanda ${p.demanda}/100</span>
            </span>
          </a>`;
        }).join('')}
      </div>
    </section>`;
  }

  /* ---------------- Montagem ---------------- */
  raiz.innerHTML = `
    ${htmlCapa()}
    <div class="prof-abas">
      <div class="shell">
        <div class="abas" role="tablist" aria-label="Seções do guia">
          ${SECOES.map((s, i) => `
            <button type="button" class="aba" role="tab" data-secao="${s.id}"
                    aria-selected="${i === 0}">${s.nome}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="shell">
      ${htmlVisao()}
      ${htmlSalario()}
      ${htmlMercado()}
      ${htmlFormacao()}
      ${htmlHabilidades()}
      ${htmlRoteiro()}
      ${htmlVagas()}
      ${htmlParecidas()}
    </div>`;

  desligarGraficos = ativarGraficos(raiz);

  /* ---------------- Comportamento ---------------- */
  // Trocar a regiao redesenha so o que depende do lugar
  qs('[data-regiao]', raiz)?.addEventListener('change', (e) => {
    regiaoId = e.target.value;
    regiao = regiaoDe(regiaoId);
    const sal = salarioNaRegiao(prof, regiaoId);

    qs('[data-painel-valor]', raiz).textContent = dinheiro(sal.media);
    qs('[data-painel-linhas]', raiz).innerHTML = htmlPainelLinhas(sal);
    qs('[data-salario-cards]', raiz).innerHTML = htmlSalarioCards(sal);
    qs('[data-exp-cards]', raiz).innerHTML = htmlExpCards(sal);

    desligarGraficos?.();
    qs('[data-graf-salario]', raiz).innerHTML = htmlGraficoSalario();
    desligarGraficos = ativarGraficos(raiz);

    qsa('[data-link-busca]', raiz).forEach(a => {
      a.href = montarUrl('/buscar', { p: prof.id, r: regiaoId });
    });

    toast(`Referência ajustada para ${regiao.cidade}`, { tipo: 'info', duracao: 2600 });
  });

  // Salvar a profissao
  qs('[data-salvar]', raiz)?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const virou = alternarSalvo('profissoes', prof.id);
    btn.setAttribute('aria-pressed', String(virou));
    qs('[data-salvar-ic]', btn).innerHTML = icon.marcador({ size: 17, fill: virou ? 'currentColor' : 'none' });
    qs('[data-salvar-txt]', btn).textContent = virou ? 'Salva' : 'Salvar';
    toast(virou ? `${prof.nome} salva no seu painel` : `${prof.nome} removida`, {
      tipo: virou ? 'ok' : 'info',
    });
  });

  // Roteiro em acordeao
  qs('[data-roteiro]', raiz)?.addEventListener('click', (e) => {
    const botao = e.target.closest('.roteiro__conteudo');
    if (!botao) return;
    const etapa = botao.closest('.roteiro__etapa');
    const desc = qs('.roteiro__desc', botao);
    const abrindo = !etapa.classList.contains('aberta');
    etapa.classList.toggle('aberta', abrindo);
    botao.setAttribute('aria-expanded', String(abrindo));
    desc.hidden = !abrindo;
  });

  // As abas sao ancoras reais
  raiz.addEventListener('click', (e) => {
    const aba = e.target.closest('[data-secao]');
    if (!aba) return;
    const alvo = qs(`#sec-${aba.dataset.secao}`, raiz);
    if (alvo) rolarAte(alvo, 56);
  });

  const abas = qsa('[data-secao]', raiz);
  const alturaHeader = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10
  ) || 68;

  const marcarAba = throttle(() => {
    const limite = window.scrollY + alturaHeader + 130;
    let ativa = SECOES[0].id;
    SECOES.forEach(s => {
      const n = qs(`#sec-${s.id}`, raiz);
      if (n && n.offsetTop <= limite) ativa = s.id;
    });
    abas.forEach(a => {
      const sel = a.dataset.secao === ativa;
      a.setAttribute('aria-selected', String(sel));
      if (sel) a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }, 140);

  window.addEventListener('scroll', marcarAba, { passive: true });
  marcarAba();

  const desligarFav = ligarSalvarVaga(raiz, (id, btn) => {
    const virou = alternarSalvo('vagas', id);
    btn.classList.toggle('is-on', virou);
    btn.setAttribute('aria-pressed', String(virou));
    btn.innerHTML = icon.marcador({ size: 16, fill: virou ? 'currentColor' : 'none' });
    toast(virou ? 'Vaga salva' : 'Vaga removida', { tipo: virou ? 'ok' : 'info' });
  });

  observarAnimacoes(raiz);
  document.title = `${prof.nome}: salário, mercado e carreira | NORTE`;

  return () => {
    window.removeEventListener('scroll', marcarAba);
    desligarGraficos?.();
    desligarFav?.();
  };
}
