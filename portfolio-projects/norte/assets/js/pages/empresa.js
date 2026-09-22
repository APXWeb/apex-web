/* ============================================================
   NORTE — Perfil da empresa
   Quem é, como trabalha, o que oferece e quem já trabalhou lá.
   ============================================================ */

import { qs, qsa, observarAnimacoes } from '../utils/dom.js';
import { icon, estrelas } from '../components/icons.js';
import {
  escapeHtml, num, pct, plural, haQuantoTempo, dinheiroCompacto,
} from '../utils/format.js';
import {
  acharEmpresa, acharRegiao, acharProfissao, vagasDaEmpresa,
  avaliacoesDaEmpresa, alternarSalvo, estaSalvo,
} from '../services/store.js';
import { PORTES } from '../data/empresas.js';
import { AREA_POR_ID } from '../data/profissoes.js';
import { graficoDonut, ranking, ativarGraficos, corDado } from '../components/graficos.js';
import { vagaCard, ligarSalvarVaga, nomeModelo } from '../components/vagaCard.js';
import { toast } from '../components/ui.js';
import { montarUrl } from '../router.js';
import { paginaNaoEncontrada } from './naoEncontrada.js';

const POR_PAGINA_AVAL = 4;

export function paginaEmpresa(raiz, params) {
  const emp = acharEmpresa(params.id);
  if (!emp) return paginaNaoEncontrada(raiz);

  const vagas = vagasDaEmpresa(emp.id);
  const avaliacoes = avaliacoesDaEmpresa(emp.id);
  const sede = acharRegiao(emp.sede);
  let mostrarAvaliacoes = POR_PAGINA_AVAL;
  let filtroArea = '';

  // Distribuicao de notas: o histograma diz mais que a media sozinha
  const distribuicao = [5, 4, 3, 2, 1].map(n => ({
    nota: n,
    total: avaliacoes.filter(a => a.nota === n).length,
  }));

  const porProfissao = {};
  vagas.forEach(v => { porProfissao[v.profissaoId] = (porProfissao[v.profissaoId] || 0) + 1; });

  const porModelo = {};
  vagas.forEach(v => { porModelo[v.modelo] = (porModelo[v.modelo] || 0) + 1; });

  raiz.innerHTML = `
    ${htmlCapa()}
    <div class="shell" style="padding-block:var(--sp-10) var(--sp-20)">
      <div class="skills-grade" style="align-items:start">
        <div style="display:grid;gap:var(--sp-8)">
          ${htmlSobre()}
          ${htmlCultura()}
          ${htmlBeneficios()}
        </div>
        <div style="display:grid;gap:var(--sp-6)">
          ${htmlNumeros()}
          ${htmlModelos()}
        </div>
      </div>

      ${htmlVagas()}
      ${htmlAvaliacoes()}
    </div>`;

  function htmlCapa() {
    const salvo = estaSalvo('empresas', emp.id);
    return `
    <header class="emp-capa">
      <div class="shell">
        <a class="btn btn--fantasma btn--sm" href="#/empresas" style="margin-bottom:var(--sp-5)">
          ${icon.setaEsq({ size: 15 })} Todas as empresas
        </a>

        <div class="emp-capa__linha">
          <span class="logo-emp" style="background:${emp.cor};width:72px;height:72px;font-size:var(--fs-xl);border-radius:var(--r-md)"
                aria-hidden="true">${escapeHtml(emp.sigla)}</span>

          <div class="emp-capa__info">
            <h1 class="emp-nome">${escapeHtml(emp.nome)}</h1>
            <div class="emp-meta">
              <span>${icon.maleta({ size: 14 })} ${escapeHtml(emp.setor)}</span>
              <span>${icon.usuarios({ size: 14 })} ${num(emp.funcionarios)} pessoas · ${PORTES[emp.porte]?.rotulo || ''}</span>
              <span>${icon.local({ size: 14 })} ${escapeHtml(sede?.cidade || 'Brasil')}</span>
              <span>${icon.calendario({ size: 14 })} desde ${emp.fundacao}</span>
              ${emp.site ? `<span>${icon.externo({ size: 14 })} ${escapeHtml(emp.site)}</span>` : ''}
            </div>
            <div class="linha" style="gap:var(--sp-3);margin-top:var(--sp-4);flex-wrap:wrap">
              ${estrelas(emp.nota, 16)}
              <span style="font-weight:600;color:var(--txt-forte)">${String(emp.nota).replace('.', ',')}</span>
              <span style="font-size:var(--fs-sm);color:var(--txt-fraco)">
                ${plural(emp.totalAvaliacoes, 'avaliação', 'avaliações')}
              </span>
              <span class="selo selo--neutro">${icon.raio({ size: 12 })} ${nomeModelo(emp.modelo)}</span>
            </div>
          </div>

          <div class="linha" style="gap:var(--sp-3);flex-wrap:wrap">
            ${vagas.length ? `
              <a class="btn btn--primario" href="#vagas-empresa">
                ${icon.maleta({ size: 17 })} ${plural(vagas.length, 'vaga aberta', 'vagas abertas')}
              </a>` : ''}
            <button type="button" class="btn btn--contorno" data-salvar-emp aria-pressed="${salvo}">
              <span data-salvar-ic>${icon.marcador({ size: 17, fill: salvo ? 'currentColor' : 'none' })}</span>
              <span data-salvar-txt>${salvo ? 'Seguindo' : 'Seguir'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>`;
  }

  function htmlSobre() {
    return `
    <section>
      <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-4)">Sobre a empresa</h2>
      <p class="prof-texto">${escapeHtml(emp.descricao)}</p>
      <div class="skill-lista" style="margin-top:var(--sp-5)">
        ${emp.areas.map(id => `
          <span class="skill">
            <span style="color:${AREA_POR_ID[id]?.cor || 'var(--acento)'}">
              ${icon[AREA_POR_ID[id]?.icone || 'maleta']({ size: 13 })}
            </span>
            ${escapeHtml(AREA_POR_ID[id]?.nome || id)}
          </span>`).join('')}
      </div>
    </section>`;
  }

  function htmlCultura() {
    return `
    <section>
      <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-4)">Como se trabalha aqui</h2>
      <ul class="lista-check">
        ${emp.cultura.map(c => `
          <li><span>${icon.ok({ size: 16 })}</span> ${escapeHtml(c)}</li>`).join('')}
      </ul>
    </section>`;
  }

  function htmlBeneficios() {
    return `
    <section>
      <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-4)">Benefícios oferecidos</h2>
      <div class="skill-lista">
        ${emp.beneficios.map(b => `
          <span class="skill skill--hard">${icon.coracao({ size: 13 })} ${escapeHtml(b)}</span>`).join('')}
      </div>
    </section>`;
  }

  function htmlNumeros() {
    const comSalario = vagas.filter(v => v.salarioVisivel);
    const media = comSalario.length
      ? Math.round(comSalario.reduce((s, v) => s + (v.salarioMin + v.salarioMax) / 2, 0) / comSalario.length)
      : 0;

    return `
    <div class="painel">
      <div class="painel__topo"><p class="painel__titulo">Em números</p></div>
      <div class="painel__corpo" style="display:grid;gap:var(--sp-4)">
        <div class="kpi">
          <p class="kpi__l">${icon.maleta({ size: 13 })} Vagas abertas</p>
          <p class="kpi__n">${num(vagas.length)}</p>
        </div>
        <div class="kpi">
          <p class="kpi__l">${icon.moeda({ size: 13 })} Salário médio anunciado</p>
          <p class="kpi__n">${media ? dinheiroCompacto(media) : '—'}</p>
        </div>
        <div class="kpi">
          <p class="kpi__l">${icon.local({ size: 13 })} Regiões onde atua</p>
          <p class="kpi__n">${num(emp.regioes.length)}</p>
          <p class="res-stat__e">
            ${emp.regioes.map(id => escapeHtml(acharRegiao(id)?.cidade || id)).join(' · ')}
          </p>
        </div>
      </div>
    </div>`;
  }

  function htmlModelos() {
    const itens = Object.entries(porModelo).map(([id, n], i) => ({
      rotulo: nomeModelo(id), valor: n, cor: corDado(i),
    }));
    if (!itens.length) return '';

    const prof = Object.entries(porProfissao)
      .map(([id, n]) => ({
        rotulo: acharProfissao(id)?.nome || id,
        valor: n,
        href: montarUrl('/buscar', { p: id, r: emp.sede }),
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);

    return `
    <div class="painel">
      <div class="painel__topo"><p class="painel__titulo">Perfil das vagas</p></div>
      <div class="painel__corpo" style="display:grid;gap:var(--sp-6)">
        ${graficoDonut(itens, {
          tamanho: 168,
          centro: num(vagas.length),
          centroSub: 'vagas',
          fmt: (v) => plural(v, 'vaga'),
        })}
        ${prof.length ? `
          <div>
            <p class="filtro-bloco__t">Cargos mais procurados</p>
            ${ranking(prof, { fmt: (v) => plural(v, 'vaga') })}
          </div>` : ''}
      </div>
    </div>`;
  }

  function htmlVagas() {
    if (!vagas.length) {
      return `
      <section id="vagas-empresa" style="margin-top:var(--sp-12)">
        <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-4)">Vagas abertas</h2>
        <p class="campo__dica">Esta empresa não tem vagas publicadas no momento.</p>
      </section>`;
    }

    const areas = [...new Set(vagas.map(v => acharProfissao(v.profissaoId)?.area).filter(Boolean))];

    return `
    <section id="vagas-empresa" style="margin-top:var(--sp-12);scroll-margin-top:calc(var(--header-h) + 24px)">
      <div class="res-barra">
        <h2 style="font-size:var(--fs-xl)">
          ${plural(vagas.length, 'vaga aberta', 'vagas abertas')}
        </h2>
        ${areas.length > 1 ? `
          <div class="res-chips" style="margin:0" data-filtro-areas>
            <button type="button" class="etiqueta is-on" data-area-vaga="" aria-pressed="true">Todas</button>
            ${areas.map(id => `
              <button type="button" class="etiqueta" data-area-vaga="${id}" aria-pressed="false">
                ${escapeHtml(AREA_POR_ID[id]?.nome || id)}
              </button>`).join('')}
          </div>` : ''}
      </div>
      <div class="res-grade res-grade--2" data-vagas-lista>
        ${vagas.map(v => vagaCard(v)).join('')}
      </div>
    </section>`;
  }

  function htmlAvaliacoes() {
    if (!avaliacoes.length) return '';
    const maxDist = Math.max(...distribuicao.map(d => d.total), 1);
    const recomendam = avaliacoes.filter(a => a.recomenda).length;

    return `
    <section style="margin-top:var(--sp-12)">
      <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-6)">O que dizem quem trabalha lá</h2>

      <div class="skills-grade" style="align-items:start">
        <div class="cartao cartao--pad" style="display:grid;gap:var(--sp-5)">
          <div style="text-align:center">
            <p style="font-family:var(--fonte-display);font-size:var(--fs-4xl);font-weight:700;color:var(--txt-forte);line-height:1">
              ${String(emp.nota).replace('.', ',')}
            </p>
            <div style="margin-top:var(--sp-2)">${estrelas(emp.nota, 18)}</div>
            <p class="campo__dica" style="margin-top:var(--sp-2)">
              ${plural(emp.totalAvaliacoes, 'avaliação', 'avaliações')}
            </p>
          </div>

          <div style="display:grid;gap:var(--sp-2)">
            ${distribuicao.map(d => `
              <div class="linha" style="gap:var(--sp-3)">
                <span style="font-size:var(--fs-xs);color:var(--txt-fraco);width:34px">
                  ${d.nota} ${icon.estrela({ size: 10, fill: 'currentColor' })}
                </span>
                <span class="barra barra--fina" style="flex:1">
                  <span style="width:${(d.total / maxDist) * 100}%;background:var(--ambar-500)"></span>
                </span>
                <span style="font-size:var(--fs-xs);color:var(--txt-fraco);width:24px;text-align:right;font-variant-numeric:tabular-nums">
                  ${d.total}
                </span>
              </div>`).join('')}
          </div>

          <p style="text-align:center;font-size:var(--fs-sm);color:var(--txt-suave);padding-top:var(--sp-4);border-top:1px solid var(--bd-sutil)">
            <b style="color:var(--verde-600)">${pct((recomendam / avaliacoes.length) * 100)}</b>
            recomendam a empresa
          </p>
        </div>

        <div style="display:grid;gap:var(--sp-4)" data-avaliacoes>
          ${htmlListaAvaliacoes()}
        </div>
      </div>
    </section>`;
  }

  function htmlListaAvaliacoes() {
    const visiveis = avaliacoes.slice(0, mostrarAvaliacoes);
    return `
      ${visiveis.map(a => `
        <article class="aval-card">
          <div class="aval-card__topo">
            <span class="avatar" aria-hidden="true">${escapeHtml(a.autor.split(' ').map(x => x[0]).slice(0, 2).join(''))}</span>
            <span style="flex:1;min-width:0">
              <span class="aval-card__n">${escapeHtml(a.autor)}</span>
              <span class="aval-card__c">${escapeHtml(a.cargo)} · ${escapeHtml(a.tempoCasa)} de casa</span>
            </span>
            ${estrelas(a.nota, 13)}
          </div>
          <p class="aval-card__t">${escapeHtml(a.titulo)}</p>
          <p class="aval-card__x">${escapeHtml(a.texto)}</p>
          <div class="linha" style="gap:var(--sp-3);margin-top:var(--sp-4);font-size:var(--fs-xs);color:var(--txt-fraco)">
            <span class="selo ${a.recomenda ? 'selo--ok' : 'selo--neutro'}">
              ${a.recomenda ? icon.ok({ size: 11 }) : icon.menos({ size: 11 })}
              ${a.recomenda ? 'Recomenda' : 'Não recomenda'}
            </span>
            <span>${haQuantoTempo(a.data)}</span>
          </div>
        </article>`).join('')}

      ${mostrarAvaliacoes < avaliacoes.length ? `
        <button type="button" class="btn btn--contorno btn--bloco" data-mais-avaliacoes>
          Ver mais ${Math.min(POR_PAGINA_AVAL, avaliacoes.length - mostrarAvaliacoes)} avaliações
          <span style="color:var(--txt-fraco)">(${avaliacoes.length - mostrarAvaliacoes} restantes)</span>
        </button>` : ''}`;
  }

  /* ---------------- Interação ---------------- */
  const desligarGraficos = ativarGraficos(raiz);

  qs('[data-salvar-emp]', raiz)?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const virou = alternarSalvo('empresas', emp.id);
    btn.setAttribute('aria-pressed', String(virou));
    qs('[data-salvar-ic]', btn).innerHTML = icon.marcador({ size: 17, fill: virou ? 'currentColor' : 'none' });
    qs('[data-salvar-txt]', btn).textContent = virou ? 'Seguindo' : 'Seguir';
    toast(virou ? `Seguindo ${emp.nome}` : `Você parou de seguir ${emp.nome}`, {
      tipo: virou ? 'ok' : 'info',
      texto: virou ? 'As vagas desta empresa ganham prioridade nas recomendações.' : '',
    });
  });

  raiz.addEventListener('click', (e) => {
    const areaBtn = e.target.closest('[data-area-vaga]');
    if (areaBtn) {
      filtroArea = areaBtn.dataset.areaVaga;
      qsa('[data-area-vaga]', raiz).forEach(b => {
        const on = b.dataset.areaVaga === filtroArea;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      const filtradas = filtroArea
        ? vagas.filter(v => acharProfissao(v.profissaoId)?.area === filtroArea)
        : vagas;
      qs('[data-vagas-lista]', raiz).innerHTML = filtradas.map(v => vagaCard(v)).join('');
      return;
    }

    if (e.target.closest('[data-mais-avaliacoes]')) {
      mostrarAvaliacoes += POR_PAGINA_AVAL;
      qs('[data-avaliacoes]', raiz).innerHTML = htmlListaAvaliacoes();
    }
  });

  const desligarFav = ligarSalvarVaga(raiz, (id, btn) => {
    const virou = alternarSalvo('vagas', id);
    btn.classList.toggle('is-on', virou);
    btn.setAttribute('aria-pressed', String(virou));
    btn.innerHTML = icon.marcador({ size: 16, fill: virou ? 'currentColor' : 'none' });
    toast(virou ? 'Vaga salva' : 'Vaga removida', { tipo: virou ? 'ok' : 'info' });
  });

  observarAnimacoes(raiz);
  document.title = `${emp.nome}: vagas, cultura e avaliações | NORTE`;

  return () => {
    desligarGraficos?.();
    desligarFav?.();
  };
}
