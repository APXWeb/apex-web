/* ============================================================
   NORTE — Resultados da busca
   A tela central: profissao + regiao viram oportunidades reais
   com o contexto da carreira ao lado.

   Os filtros sao de verdade: cada mudanca refiltra a lista em
   memoria e redesenha so a parte que mudou. A URL guarda o
   estado, entao recarregar ou compartilhar o link preserva a
   busca inteira.
   ============================================================ */

import { qs, qsa, delegate, observarAnimacoes, rolarAte, debounce } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import {
  escapeHtml, dinheiro, dinheiroCompacto, num, plural, pct,
} from '../utils/format.js';
import {
  acharProfissao, acharRegiao, registrarBusca, alternarSalvo, estaSalvo,
  state, criarAlerta, salarioNaRegiao,
} from '../services/store.js';
import {
  FILTROS_PADRAO, baseDaBusca, aplicarFiltros, ordenar, ORDENS, estatisticas,
  beneficiosDisponiveis, empresasDisponiveis, contarFiltros, filtrosVazios,
} from '../services/busca.js';
import { NIVEIS_LISTA as NIVEIS, MODELOS, CONTRATOS, HORARIOS } from '../data/oportunidades.js';
import { AREA_POR_ID } from '../data/profissoes.js';
import { caixaBusca, ativarBusca } from '../components/caixaBusca.js';
import { vagaCard, ligarSalvarVaga, nomeModelo, nomeNivel } from '../components/vagaCard.js';
import { mapaOportunidades, ativarMapa } from '../components/mapa.js';
import { graficoDonut, ranking, medidor, ativarGraficos, corDado } from '../components/graficos.js';
import { toast, vazio, gaveta, esqueletoLista } from '../components/ui.js';
import { ir, montarUrl } from '../router.js';

const POR_PAGINA = 12;

const DISTANCIAS = [
  { v: 5, n: 'Até 5 km' },
  { v: 10, n: 'Até 10 km' },
  { v: 20, n: 'Até 20 km' },
  { v: 40, n: 'Até 40 km' },
];

const PRAZOS = [
  { v: 3, n: 'Últimos 3 dias' },
  { v: 7, n: 'Última semana' },
  { v: 15, n: 'Últimos 15 dias' },
  { v: 30, n: 'Último mês' },
];

/* ------------------------------------------------------------
   Serializacao dos filtros na URL
   Só o que fugiu do padrao entra, para o link nao virar um muro.
   ------------------------------------------------------------ */
function filtrosDaQuery(q) {
  const lista = (s) => (s ? String(s).split(',').filter(Boolean) : []);
  return {
    ...FILTROS_PADRAO,
    distancia: Number(q.dist) || 0,
    salarioMin: Number(q.sal) || 0,
    niveis: lista(q.niv),
    modelos: lista(q.mod),
    contratos: lista(q.con),
    horarios: lista(q.hor),
    beneficios: lista(q.ben).map(decodeURIComponent),
    empresas: lista(q.emp),
    soComSalario: q.cs === '1',
    publicadaAte: Number(q.dias) || 0,
    ordem: ORDENS.some(o => o.id === q.ord) ? q.ord : 'relevancia',
  };
}

function queryDosFiltros(f, extra = {}) {
  const q = { ...extra };
  if (f.distancia) q.dist = f.distancia;
  if (f.salarioMin) q.sal = f.salarioMin;
  if (f.niveis.length) q.niv = f.niveis.join(',');
  if (f.modelos.length) q.mod = f.modelos.join(',');
  if (f.contratos.length) q.con = f.contratos.join(',');
  if (f.horarios.length) q.hor = f.horarios.join(',');
  if (f.beneficios.length) q.ben = f.beneficios.map(encodeURIComponent).join(',');
  if (f.empresas.length) q.emp = f.empresas.join(',');
  if (f.soComSalario) q.cs = '1';
  if (f.publicadaAte) q.dias = f.publicadaAte;
  if (f.ordem !== 'relevancia') q.ord = f.ordem;
  return q;
}

/* ============================================================
   PAGINA
   ============================================================ */
export function paginaResultados(raiz, params, query) {
  const profissaoId = query.p || '';
  const regiaoId = query.r || 'qualquer';
  const prof = acharProfissao(profissaoId);

  if (!prof || !prof.publicada) return semProfissao(raiz, profissaoId);

  const regiao = acharRegiao(regiaoId) ||
    { id: 'qualquer', nome: 'Todo o país', cidade: 'Todo o país', uf: '' };

  const base = baseDaBusca(profissaoId, regiaoId);
  let filtros = filtrosDaQuery(query);
  let vista = query.v === 'mapa' ? 'mapa' : 'lista';
  let pagina = Math.max(1, Number(query.pag) || 1);

  // Opcoes de filtro saem do universo da busca, nao do catalogo
  // inteiro: nao adianta oferecer um filtro que zera tudo.
  const beneficios = beneficiosDisponiveis(base);
  const empresas = empresasDisponiveis(base);

  let atual = [];
  let desligarMapa = null;
  let desligarGraficos = null;
  let gavetaAberta = null;

  raiz.innerHTML = esqueleto(prof, regiao);

  // Um quadro para o esqueleto aparecer antes do trabalho pesado
  const timer = setTimeout(montar, 90);

  function montar() {
    raiz.innerHTML = `
      <div class="res-topo">
        <div class="shell">
          <div class="res-busca" data-busca>
            ${caixaBusca({ tamanho: 'compacta', profissaoId, regiaoId })}
          </div>
          <div data-cabeca></div>
        </div>
      </div>

      <div class="shell">
        <div class="res-layout">
          <aside class="res-filtros" data-filtros aria-label="Filtros"></aside>
          <div data-conteudo></div>
        </div>
      </div>`;

    ativarBusca(qs('[data-busca]', raiz), {
      aoBuscar: (p, r) => ir(montarUrl('/buscar', { p, r })),
    });

    desenhar(true);
    registrarBusca(profissaoId, regiaoId, base.length);
  }

  /* ---------- Recalculo central ---------- */
  function calcular() {
    atual = ordenar(aplicarFiltros(base, filtros), filtros.ordem);
    const maxPagina = Math.max(1, Math.ceil(atual.length / POR_PAGINA));
    if (pagina > maxPagina) pagina = maxPagina;
  }

  function sincronizarUrl() {
    const url = montarUrl('/buscar', queryDosFiltros(filtros, {
      p: profissaoId,
      r: regiaoId,
      v: vista === 'mapa' ? 'mapa' : '',
      pag: pagina > 1 ? pagina : '',
    }));
    // replace: refinar filtro nao deve encher o botao voltar
    history.replaceState(null, '', url);
  }

  function desenhar(completo = false) {
    calcular();
    sincronizarUrl();

    if (completo) {
      qs('[data-cabeca]', raiz).innerHTML = htmlCabeca(prof, regiao, base, atual);
      qs('[data-filtros]', raiz).innerHTML = htmlFiltros();
    }

    desligarMapa?.();
    desligarMapa = null;
    desligarGraficos?.();
    desligarGraficos = null;

    qs('[data-conteudo]', raiz).innerHTML = htmlConteudo();

    const alvoGraf = qs('[data-conteudo]', raiz);
    desligarGraficos = ativarGraficos(alvoGraf);

    if (vista === 'mapa') {
      desligarMapa = ativarMapa(alvoGraf, atual, {
        aoFiltrarBairro: (bairro) => {
          vista = 'lista';
          // Um bairro nao e filtro persistente: e um recorte pontual
          const soBairro = atual.filter(v => v.bairro === bairro);
          if (!soBairro.length) return;
          desenhar();
          const cartao = qs('[data-lista]', raiz);
          if (cartao) {
            cartao.innerHTML = soBairro.map(v => vagaCard(v)).join('');
            observarAnimacoes(cartao);
          }
          toast(`Mostrando ${plural(soBairro.length, 'oportunidade')} em ${bairro}`, {
            tipo: 'info',
            acao: { rotulo: 'Ver todas', fn: () => desenhar() },
          });
        },
      });
    }

    atualizarContagens();
    observarAnimacoes(qs('[data-conteudo]', raiz));
  }

  /** Quantas vagas cada opcao de filtro traria, mantendo o resto */
  function contarSe(campo, valor) {
    const teste = { ...filtros, [campo]: [...filtros[campo], valor] };
    return aplicarFiltros(base, teste).length;
  }

  function atualizarContagens() {
    qsa('[data-conta]', raiz).forEach(span => {
      const [campo, valor] = span.dataset.conta.split('|');
      const ja = filtros[campo]?.includes(valor);
      const n = ja
        ? aplicarFiltros(base, filtros).length
        : contarSe(campo, valor);
      span.textContent = num(n);
      const item = span.closest('.filtro-item');
      if (item) item.style.opacity = (!ja && n === 0) ? '0.42' : '';
    });

    const n = contarFiltros(filtros);
    qsa('[data-n-filtros]', raiz).forEach(b => {
      b.textContent = n ? String(n) : '';
      b.hidden = !n;
    });
  }

  /* ---------- HTML ---------- */
  /** Titulo da busca: responde "o que eu procurei e o que existe" */
  function htmlCabeca(prof, regiao, base, atual) {
    const est = estatisticas(base, profissaoId, regiaoId);
    const remotas = base.filter(v => v.modelo === 'remoto').length;
    const ondeTexto = regiaoId === 'qualquer'
      ? 'em todo o país'
      : regiaoId === 'remoto' ? 'para trabalho remoto' : `em ${regiao.cidade}`;

    return `
    <h1 class="res-titulo">
      ${num(base.length)} ${base.length === 1 ? 'oportunidade' : 'oportunidades'} de
      <b>${escapeHtml(prof.nome)}</b> ${escapeHtml(ondeTexto)}
    </h1>
    <p class="res-sub">
      ${est.salario.media
        ? `Salário médio de ${dinheiro(est.salario.media)} por mês`
        : `Referência de ${dinheiro(prof.salario.media)} por mês`}
      ${est.novasNaSemana ? ` · ${plural(est.novasNaSemana, 'nova')} nos últimos 7 dias` : ''}
      ${remotas ? ` · ${num(remotas)} ${remotas === 1 ? 'aceita' : 'aceitam'} trabalho remoto` : ''}
    </p>

    <div class="res-stats">
      <div class="res-stat">
        <p class="res-stat__l">${icon.moeda({ size: 13 })} Faixa salarial</p>
        <p class="res-stat__v" style="font-size:var(--fs-lg)">
          ${est.salario.min ? `${dinheiroCompacto(est.salario.min)} – ${dinheiroCompacto(est.salario.max)}` : "Não divulgada"}
        </p>
        <p class="res-stat__e">
          ${est.salario.semInformacao
            ? `${num(est.salario.semInformacao)} sem valor divulgado`
            : 'todas divulgam o valor'}
        </p>
      </div>

      <div class="res-stat">
        <p class="res-stat__l">${icon.pulso({ size: 13 })} Demanda relativa</p>
        <p class="res-stat__v" style="font-size:var(--fs-lg)">${est.demanda.rotulo}</p>
        <p class="res-stat__e">comparada às outras profissões daqui</p>
      </div>

      <div class="res-stat">
        <p class="res-stat__l">${icon.predio({ size: 13 })} Empresas contratando</p>
        <p class="res-stat__v">${num(est.topEmpresas.length)}</p>
        <p class="res-stat__e">
          ${est.topEmpresas[0] ? `${escapeHtml(est.topEmpresas[0].empresa.nome)} lidera` : '—'}
        </p>
      </div>

      <div class="res-stat">
        <p class="res-stat__l">${icon.raio({ size: 13 })} Modelo mais comum</p>
        <p class="res-stat__v" style="font-size:var(--fs-lg)">
          ${est.modeloMaisComum ? nomeModelo(est.modeloMaisComum) : '—'}
        </p>
        <p class="res-stat__e">
          ${est.modeloMaisComum ? `${pct((est.porModelo[est.modeloMaisComum] / base.length) * 100)} das vagas` : ''}
        </p>
      </div>

      ${est.topBairros.length ? `
        <div class="res-stat">
          <p class="res-stat__l">${icon.local({ size: 13 })} Bairro com mais vagas</p>
          <p class="res-stat__v" style="font-size:var(--fs-lg)">${escapeHtml(est.topBairros[0].nome)}</p>
          <p class="res-stat__e">${plural(est.topBairros[0].vagas, 'oportunidade')}</p>
        </div>` : ''}
    </div>`;
  }

  function htmlFiltros(paraGaveta = false) {
    const grupo = (campo, opcoes, titulo) => `
      <div class="filtro-bloco">
        <p class="filtro-bloco__t">${escapeHtml(titulo)}</p>
        <div class="filtro-lista">
          ${opcoes.map(o => `
            <label class="filtro-item">
              <span class="check">
                <input type="checkbox" data-f="${campo}" value="${escapeHtml(o.id)}"
                       ${filtros[campo].includes(o.id) ? 'checked' : ''}>
                <span>${escapeHtml(o.nome)}</span>
              </span>
              <span class="filtro-item__n" data-conta="${campo}|${escapeHtml(o.id)}">–</span>
            </label>`).join('')}
        </div>
      </div>`;

    const temLocal = base.some(v => v.regiaoId !== 'remoto');
    const maxSal = Math.max(...base.filter(v => v.salarioVisivel).map(v => v.salarioMax), 12000);
    const tetoSal = Math.ceil(maxSal / 1000) * 1000;

    return `
    ${paraGaveta ? '' : `
      <div class="linha" style="justify-content:space-between;margin-bottom:var(--sp-4)">
        <p class="filtro-bloco__t" style="margin:0">
          ${icon.filtro({ size: 15 })} Filtros
          <span class="selo selo--marca" data-n-filtros ${contarFiltros(filtros) ? '' : 'hidden'}>${contarFiltros(filtros) || ''}</span>
        </p>
        <button type="button" class="btn btn--fantasma btn--sm" data-limpar-tudo
                ${filtrosVazios(filtros) ? 'disabled' : ''}>Limpar</button>
      </div>`}

    <div class="filtro-bloco">
      <p class="filtro-bloco__t">Salário mínimo</p>
      <div class="filtro-faixa">
        <div class="filtro-faixa__v">
          <span data-rot-sal>${filtros.salarioMin ? dinheiro(filtros.salarioMin) : 'Qualquer valor'}</span>
          <span style="color:var(--txt-fraco);font-weight:400">${dinheiro(tetoSal)}</span>
        </div>
        <input type="range" data-f-salario min="0" max="${tetoSal}" step="500"
               value="${filtros.salarioMin}" aria-label="Salário mínimo mensal">
        <label class="check" style="font-size:var(--fs-sm)">
          <input type="checkbox" data-f-checkbox="soComSalario" ${filtros.soComSalario ? 'checked' : ''}>
          <span>Só vagas com salário divulgado</span>
        </label>
      </div>
    </div>

    ${temLocal ? `
      <div class="filtro-bloco">
        <p class="filtro-bloco__t">Distância do centro</p>
        <div class="filtro-lista">
          ${DISTANCIAS.map(d => `
            <label class="filtro-item">
              <span class="check">
                <input type="radio" name="dist${paraGaveta ? '-g' : ''}" data-f-dist value="${d.v}"
                       ${filtros.distancia === d.v ? 'checked' : ''}>
                <span>${d.n}</span>
              </span>
            </label>`).join('')}
          <label class="filtro-item">
            <span class="check">
              <input type="radio" name="dist${paraGaveta ? '-g' : ''}" data-f-dist value="0"
                     ${!filtros.distancia ? 'checked' : ''}>
              <span>Qualquer distância</span>
            </span>
          </label>
        </div>
        <p class="campo__dica" style="margin-top:var(--sp-2)">
          Vagas remotas continuam aparecendo.
        </p>
      </div>` : ''}

    ${grupo('niveis', NIVEIS, 'Nível de experiência')}
    ${grupo('modelos', MODELOS, 'Modelo de trabalho')}
    ${grupo('contratos', CONTRATOS, 'Tipo de contrato')}
    ${grupo('horarios', HORARIOS, 'Jornada')}

    ${beneficios.length ? `
      <div class="filtro-bloco">
        <p class="filtro-bloco__t">Benefícios</p>
        <div class="filtro-lista">
          ${beneficios.map(b => `
            <label class="filtro-item">
              <span class="check">
                <input type="checkbox" data-f="beneficios" value="${escapeHtml(b.nome)}"
                       ${filtros.beneficios.includes(b.nome) ? 'checked' : ''}>
                <span>${escapeHtml(b.nome)}</span>
              </span>
              <span class="filtro-item__n" data-conta="beneficios|${escapeHtml(b.nome)}">–</span>
            </label>`).join('')}
        </div>
      </div>` : ''}

    ${empresas.length > 1 ? `
      <div class="filtro-bloco">
        <p class="filtro-bloco__t">Empresa</p>
        <div class="filtro-lista">
          ${empresas.slice(0, 8).map(e => `
            <label class="filtro-item">
              <span class="check">
                <input type="checkbox" data-f="empresas" value="${escapeHtml(e.empresa.id)}"
                       ${filtros.empresas.includes(e.empresa.id) ? 'checked' : ''}>
                <span>${escapeHtml(e.empresa.nome)}</span>
              </span>
              <span class="filtro-item__n" data-conta="empresas|${escapeHtml(e.empresa.id)}">–</span>
            </label>`).join('')}
        </div>
      </div>` : ''}

    <div class="filtro-bloco">
      <p class="filtro-bloco__t">Publicada em</p>
      <div class="filtro-lista">
        ${PRAZOS.map(p => `
          <label class="filtro-item">
            <span class="check">
              <input type="radio" name="dias${paraGaveta ? '-g' : ''}" data-f-dias value="${p.v}"
                     ${filtros.publicadaAte === p.v ? 'checked' : ''}>
              <span>${p.n}</span>
            </span>
          </label>`).join('')}
        <label class="filtro-item">
          <span class="check">
            <input type="radio" name="dias${paraGaveta ? '-g' : ''}" data-f-dias value="0"
                   ${!filtros.publicadaAte ? 'checked' : ''}>
            <span>Qualquer data</span>
          </span>
        </label>
      </div>
    </div>`;
  }

  function htmlConteudo() {
    const est = estatisticas(atual, profissaoId, regiaoId);
    const chips = htmlChips();
    const inicio = (pagina - 1) * POR_PAGINA;
    const daPagina = atual.slice(inicio, inicio + POR_PAGINA);
    const totalPaginas = Math.ceil(atual.length / POR_PAGINA);

    return `
    ${htmlCarreira(est)}

    <div class="res-barra">
      <p class="res-contagem">
        <b>${num(atual.length)}</b>
        ${atual.length === 1 ? 'oportunidade encontrada' : 'oportunidades encontradas'}
        ${atual.length !== base.length ? `<span style="color:var(--txt-fraco)">de ${num(base.length)}</span>` : ''}
      </p>

      <div class="res-ferramentas">
        <button type="button" class="btn btn--contorno btn--sm filtros-mob-btn" data-abrir-filtros>
          ${icon.filtro({ size: 15 })} Filtros
          <span class="selo selo--marca" data-n-filtros ${contarFiltros(filtros) ? '' : 'hidden'}>${contarFiltros(filtros) || ''}</span>
        </button>

        <div class="segmentado" role="group" aria-label="Forma de visualizar">
          <button type="button" data-vista="lista" aria-pressed="${vista === 'lista'}">
            ${icon.lista({ size: 15 })} <span>Lista</span>
          </button>
          <button type="button" data-vista="mapa" aria-pressed="${vista === 'mapa'}">
            ${icon.mapa({ size: 15 })} <span>Mapa</span>
          </button>
        </div>

        <label class="linha" style="gap:var(--sp-2)">
          <span class="so-leitor">Ordenar por</span>
          <span style="font-size:var(--fs-sm);color:var(--txt-fraco)">${icon.ordenar({ size: 15 })}</span>
          <select class="select" data-ordem style="min-width:172px;height:40px">
            ${ORDENS.map(o => `<option value="${o.id}" ${filtros.ordem === o.id ? 'selected' : ''}>${o.nome}</option>`).join('')}
          </select>
        </label>
      </div>
    </div>

    ${chips}

    ${!atual.length ? htmlVazio() : vista === 'mapa' ? `
      ${mapaOportunidades(atual, { regiaoId, alturaClasse: 'mapa--alto' })}
      <p class="campo__dica" style="margin-top:var(--sp-3);text-align:center">
        Toque num marcador para ver as oportunidades daquele bairro.
      </p>
      ${htmlResumoMapa(est)}
    ` : `
      <div class="res-grade" data-lista>
        ${daPagina.map((v, i) => vagaCard(v)).join('')}
      </div>
      ${totalPaginas > 1 ? htmlPaginador(totalPaginas) : ''}
    `}`;
  }

  function htmlChips() {
    const chips = [];
    const add = (rotulo, campo, valor) =>
      chips.push(`
        <button type="button" class="etiqueta is-on" data-remover="${campo}|${escapeHtml(String(valor))}">
          ${escapeHtml(rotulo)} ${icon.fechar({ size: 12 })}
        </button>`);

    if (filtros.salarioMin) add(`A partir de ${dinheiro(filtros.salarioMin)}`, 'salarioMin', 0);
    if (filtros.soComSalario) add('Com salário divulgado', 'soComSalario', 0);
    if (filtros.distancia) add(`Até ${filtros.distancia} km`, 'distancia', 0);
    if (filtros.publicadaAte) add(PRAZOS.find(p => p.v === filtros.publicadaAte)?.n || '', 'publicadaAte', 0);
    filtros.niveis.forEach(v => add(nomeNivel(v), 'niveis', v));
    filtros.modelos.forEach(v => add(nomeModelo(v), 'modelos', v));
    filtros.contratos.forEach(v => add(CONTRATOS.find(c => c.id === v)?.nome || v, 'contratos', v));
    filtros.horarios.forEach(v => add(HORARIOS.find(h => h.id === v)?.nome || v, 'horarios', v));
    filtros.beneficios.forEach(v => add(v, 'beneficios', v));
    filtros.empresas.forEach(v => {
      const e = empresas.find(x => x.empresa.id === v);
      if (e) add(e.empresa.nome, 'empresas', v);
    });

    if (!chips.length) return '';
    return `
      <div class="res-chips">
        ${chips.join('')}
        <button type="button" class="etiqueta" data-limpar-tudo>Limpar tudo</button>
      </div>`;
  }

  function htmlVazio() {
    const sugestoes = [];
    if (filtros.salarioMin) sugestoes.push('baixar o salário mínimo');
    if (filtros.distancia) sugestoes.push('ampliar a distância');
    if (filtros.beneficios.length) sugestoes.push('pedir menos benefícios');
    if (filtros.publicadaAte) sugestoes.push('aceitar vagas mais antigas');

    return vazio({
      icone: 'lupa',
      titulo: base.length
        ? 'Nenhuma oportunidade com esses filtros'
        : `Ainda não há vagas de ${prof.nome} ${regiaoId === 'qualquer' ? 'no catálogo' : `em ${regiao.cidade}`}`,
      texto: base.length
        ? `Existem ${plural(base.length, 'oportunidade')} nesta busca. Tente ${sugestoes.length ? sugestoes.join(' ou ') : 'remover algum filtro'}.`
        : 'Crie um alerta e avisamos assim que aparecer a primeira. Enquanto isso, veja a carreira por inteiro.',
      acao: `
        <div class="linha" style="gap:var(--sp-3);flex-wrap:wrap;justify-content:center;margin-top:var(--sp-5)">
          ${base.length
            ? '<button type="button" class="btn btn--primario" data-limpar-tudo>Limpar filtros</button>'
            : '<button type="button" class="btn btn--primario" data-criar-alerta>Criar alerta</button>'}
          <a class="btn btn--contorno" href="#/profissao/${prof.id}">Ver a carreira</a>
        </div>`,
    });
  }

  function htmlPaginador(total) {
    const jan = [];
    const push = (n) => jan.push(n);
    push(1);
    for (let n = pagina - 1; n <= pagina + 1; n++) if (n > 1 && n < total) push(n);
    if (total > 1) push(total);
    const unicas = [...new Set(jan)].sort((a, b) => a - b);

    const botoes = [];
    unicas.forEach((n, i) => {
      if (i && n - unicas[i - 1] > 1) botoes.push('<span class="paginador__btn" aria-hidden="true" style="border:none">…</span>');
      botoes.push(`
        <button type="button" class="paginador__btn" data-pagina="${n}"
                ${n === pagina ? 'aria-current="page"' : ''}>${n}</button>`);
    });

    return `
    <nav class="paginador" aria-label="Paginação dos resultados">
      <button type="button" class="paginador__btn" data-pagina="${pagina - 1}"
              ${pagina === 1 ? 'disabled' : ''} aria-label="Página anterior">
        ${icon.chevronE({ size: 16 })}
      </button>
      ${botoes.join('')}
      <button type="button" class="paginador__btn" data-pagina="${pagina + 1}"
              ${pagina === total ? 'disabled' : ''} aria-label="Próxima página">
        ${icon.chevronR({ size: 16 })}
      </button>
    </nav>`;
  }

  /* ---------- Painel de carreira ---------- */
  function htmlCarreira(est) {
    const area = AREA_POR_ID[prof.area];
    const sal = salarioNaRegiao(prof, regiaoId);
    const salvo = estaSalvo('profissoes', prof.id);

    return `
    <section class="res-carreira" data-anim="0">
      <div class="res-carreira__topo">
        <span class="prof-capa__ic" style="color:${area?.cor || 'var(--acento)'};width:44px;height:44px;flex-shrink:0">
          ${icon[area?.icone || 'maleta']({ size: 22 })}
        </span>
        <div style="flex:1;min-width:0">
          <p style="font-weight:600;color:var(--txt-forte)">Sobre ser ${escapeHtml(prof.nome)}</p>
          <p style="font-size:var(--fs-xs);color:var(--txt-suave)">
            ${escapeHtml(area?.nome || '')} ·
            ${escapeHtml(prof.formacao?.rotulo || 'Formação variada')} ·
            ${pct(prof.modelos.remoto)} das vagas são remotas
          </p>
        </div>
        <button type="button" class="btn-icone btn-icone--contorno ${salvo ? 'is-on' : ''}"
                data-salvar-prof aria-pressed="${salvo}"
                aria-label="${salvo ? 'Remover' : 'Salvar'} ${escapeHtml(prof.nome)} dos favoritos">
          ${icon.marcador({ size: 17, fill: salvo ? 'currentColor' : 'none' })}
        </button>
      </div>

      <p style="font-size:var(--fs-sm);color:var(--txt-base);line-height:var(--lh-solto)">
        ${escapeHtml(prof.resumo)}
      </p>

      <div class="linha" style="gap:var(--sp-3);flex-wrap:wrap">
        <a class="btn btn--primario btn--sm" href="#/profissao/${prof.id}">
          ${icon.livro({ size: 15 })} Guia completo da carreira
        </a>
        <a class="btn btn--contorno btn--sm" href="${montarUrl('/comparar', { a: prof.id })}">
          ${icon.comparar({ size: 15 })} Comparar com outra
        </a>
        <button type="button" class="btn btn--fantasma btn--sm" data-criar-alerta>
          ${icon.sino({ size: 15 })} Avisar sobre novas vagas
        </button>
      </div>

      <div class="res-stats" style="margin-top:0">
        <div class="res-stat">
          <p class="res-stat__l">${icon.moeda({ size: 13 })} Salário médio aqui</p>
          <p class="res-stat__v">${est.salario.media ? dinheiro(est.salario.media) : dinheiro(sal.media)}</p>
          <p class="res-stat__e">
            ${est.salario.media
              ? `nas ${plural(est.total - est.salario.semInformacao, 'vaga')} com valor`
              : 'referência da profissão'}
          </p>
        </div>
        <div class="res-stat">
          <p class="res-stat__l">${icon.escada({ size: 13 })} Faixa nesta busca</p>
          <p class="res-stat__v" style="font-size:var(--fs-md)">
            ${est.salario.min ? `${dinheiro(est.salario.min)}<span style="color:var(--txt-fraco)"> a </span>${dinheiro(est.salario.max)}` : '—'}
          </p>
          <p class="res-stat__e">do júnior ao sênior</p>
        </div>
        <div class="res-stat">
          <p class="res-stat__l">${icon.tendencia({ size: 13 })} Demanda</p>
          <p class="res-stat__v" style="font-size:var(--fs-lg)">${est.demanda.rotulo}</p>
          <div class="barra barra--fina" style="margin-top:var(--sp-2)">
            <span style="width:${est.demanda.nivel * 25}%;background:${['var(--erro)', 'var(--aviso)', 'var(--dado-2)', 'var(--ok)'][est.demanda.nivel - 1]}"></span>
          </div>
        </div>
        <div class="res-stat">
          <p class="res-stat__l">${icon.calendario({ size: 13 })} Novas na semana</p>
          <p class="res-stat__v">${num(est.novasNaSemana)}</p>
          <p class="res-stat__e">publicadas nos últimos 7 dias</p>
        </div>
      </div>
    </section>`;
  }

  function htmlResumoMapa(est) {
    if (!est.topBairros.length) return '';
    return `
    <div class="cartao cartao--pad" style="margin-top:var(--sp-6)" data-anim="1">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:var(--sp-8)">
        <div>
          <p class="graf__titulo" style="margin-bottom:var(--sp-4)">Onde estão as oportunidades</p>
          ${ranking(est.topBairros.slice(0, 6).map(b => ({
            rotulo: b.nome, valor: b.vagas,
          })), { fmt: (v) => plural(v, 'vaga') })}
        </div>
        <div>
          ${graficoDonut(
            Object.entries(est.porModelo).map(([id, n], i) => ({
              rotulo: nomeModelo(id), valor: n, cor: corDado(i),
            })),
            {
              titulo: 'Modelo de trabalho',
              tamanho: 190,
              centro: num(est.total),
              centroSub: 'vagas',
              fmt: (v) => plural(v, 'vaga'),
            }
          )}
        </div>
      </div>
    </div>`;
  }

  /* ---------- Interacao ---------- */
  function mudarFiltro(fn, redesenhoCompleto = false) {
    fn();
    pagina = 1;
    desenhar(redesenhoCompleto);
    if (gavetaAberta) sincronizarGaveta();
  }

  function sincronizarGaveta() {
    const corpo = qs('.gaveta__corpo', gavetaAberta.node);
    if (corpo) corpo.innerHTML = htmlFiltros(true);
    const rodape = qs('[data-gaveta-total]', gavetaAberta.node);
    if (rodape) rodape.textContent = `Ver ${plural(atual.length, 'oportunidade')}`;
    atualizarContagens();
  }

  const alternarLista = (campo, valor, ligado) => {
    const lista = filtros[campo];
    const i = lista.indexOf(valor);
    if (ligado && i < 0) lista.push(valor);
    if (!ligado && i >= 0) lista.splice(i, 1);
  };

  // Delegacao no documento: a gaveta vive fora da raiz da pagina
  const onChange = (e) => {
    const alvo = e.target;
    if (!raiz.contains(alvo) && !gavetaAberta?.node.contains(alvo)) return;

    if (alvo.matches('[data-f]')) {
      mudarFiltro(() => alternarLista(alvo.dataset.f, alvo.value, alvo.checked));
    } else if (alvo.matches('[data-f-dist]')) {
      mudarFiltro(() => { filtros.distancia = Number(alvo.value); });
    } else if (alvo.matches('[data-f-dias]')) {
      mudarFiltro(() => { filtros.publicadaAte = Number(alvo.value); });
    } else if (alvo.matches('[data-f-checkbox]')) {
      mudarFiltro(() => { filtros[alvo.dataset.fCheckbox] = alvo.checked; });
    } else if (alvo.matches('[data-ordem]')) {
      mudarFiltro(() => { filtros.ordem = alvo.value; });
    }
  };

  // O range dispara muito: o rotulo acompanha na hora, a lista espera
  const refiltrarSalario = debounce(() => mudarFiltro(() => {}), 210);

  const onInput = (e) => {
    const alvo = e.target;
    if (!alvo.matches('[data-f-salario]')) return;
    if (!raiz.contains(alvo) && !gavetaAberta?.node.contains(alvo)) return;

    filtros.salarioMin = Number(alvo.value);
    const rot = alvo.closest('.filtro-faixa')?.querySelector('[data-rot-sal]');
    if (rot) rot.textContent = filtros.salarioMin ? dinheiro(filtros.salarioMin) : 'Qualquer valor';
    refiltrarSalario();
  };

  const onClick = (e) => {
    const alvo = e.target;
    const dentro = raiz.contains(alvo) || gavetaAberta?.node.contains(alvo);
    if (!dentro) return;

    const limpar = alvo.closest('[data-limpar-tudo]');
    if (limpar) {
      mudarFiltro(() => {
        const ordem = filtros.ordem;
        filtros = { ...FILTROS_PADRAO, niveis: [], modelos: [], contratos: [], horarios: [], beneficios: [], empresas: [], ordem };
      }, true);
      toast('Filtros limpos', { tipo: 'info' });
      return;
    }

    const remover = alvo.closest('[data-remover]');
    if (remover) {
      const [campo, valor] = remover.dataset.remover.split('|');
      mudarFiltro(() => {
        if (Array.isArray(filtros[campo])) alternarLista(campo, valor, false);
        else if (campo === 'soComSalario') filtros.soComSalario = false;
        else filtros[campo] = 0;
      }, true);
      return;
    }

    const btnVista = alvo.closest('[data-vista]');
    if (btnVista) {
      vista = btnVista.dataset.vista;
      desenhar();
      return;
    }

    const btnPag = alvo.closest('[data-pagina]');
    if (btnPag && !btnPag.disabled) {
      pagina = Number(btnPag.dataset.pagina);
      desenhar();
      rolarAte(qs('.res-barra', raiz), 12);
      return;
    }

    if (alvo.closest('[data-abrir-filtros]')) { abrirGaveta(); return; }
    if (alvo.closest('[data-criar-alerta]')) { novoAlerta(); return; }

    const btnProf = alvo.closest('[data-salvar-prof]');
    if (btnProf) {
      const virou = alternarSalvo('profissoes', prof.id);
      btnProf.classList.toggle('is-on', virou);
      btnProf.setAttribute('aria-pressed', String(virou));
      btnProf.innerHTML = icon.marcador({ size: 17, fill: virou ? 'currentColor' : 'none' });
      toast(virou ? `${prof.nome} salva` : `${prof.nome} removida`, {
        tipo: virou ? 'ok' : 'info',
        texto: virou ? 'Aparece no seu painel e influencia as recomendações.' : '',
      });
    }
  };

  function abrirGaveta() {
    gavetaAberta = gaveta({
      titulo: 'Filtros',
      lado: 'baixo',
      conteudo: htmlFiltros(true),
      rodape: `
        <button type="button" class="btn btn--contorno" data-limpar-tudo>Limpar</button>
        <button type="button" class="btn btn--primario" data-fechar data-gaveta-total>
          Ver ${plural(atual.length, 'oportunidade')}
        </button>`,
      aoFechar: () => { gavetaAberta = null; },
    });
    atualizarContagens();
  }

  function novoAlerta() {
    const ja = state.alertas.find(a => a.profissaoId === prof.id && a.regiaoId === regiaoId);
    if (ja) {
      toast('Você já tem um alerta para esta busca', {
        tipo: 'info',
        acao: { rotulo: 'Ver alertas', fn: () => ir('/perfil/alertas') },
      });
      return;
    }

    criarAlerta({
      profissaoId: prof.id,
      regiaoId,
      salarioMin: filtros.salarioMin,
      modelo: filtros.modelos.length === 1 ? filtros.modelos[0] : 'qualquer',
      nivel: filtros.niveis.length === 1 ? filtros.niveis[0] : 'qualquer',
      frequencia: 'diaria',
    });

    toast('Alerta criado', {
      tipo: 'ok',
      texto: `Avisaremos sobre novas vagas de ${prof.nome} em ${regiao.cidade}.`,
      acao: { rotulo: 'Gerenciar', fn: () => ir('/perfil/alertas') },
    });
  }

  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('click', onClick);

  const desligarFav = ligarSalvarVaga(raiz, (id, btn) => {
    const virou = alternarSalvo('vagas', id);
    btn.classList.toggle('is-on', virou);
    btn.setAttribute('aria-pressed', String(virou));
    btn.innerHTML = icon.marcador({ size: 16, fill: virou ? 'currentColor' : 'none' });
    toast(virou ? 'Vaga salva' : 'Vaga removida', {
      tipo: virou ? 'ok' : 'info',
      acao: virou ? { rotulo: 'Ver salvas', fn: () => ir('/perfil/salvos') } : null,
    });
  });

  document.title = `${prof.nome} em ${regiao.cidade} | NORTE`;

  return () => {
    clearTimeout(timer);
    document.removeEventListener('change', onChange);
    document.removeEventListener('input', onInput);
    document.removeEventListener('click', onClick);
    desligarFav?.();
    desligarMapa?.();
    desligarGraficos?.();
    gavetaAberta?.fechar();
  };
}

/* ------------------------------------------------------------
   Esqueleto enquanto calcula
   ------------------------------------------------------------ */
function esqueleto(prof, regiao) {
  return `
  <div class="res-topo">
    <div class="shell">
      <div class="esqueleto" style="height:68px;border-radius:var(--r-md)"></div>
    </div>
  </div>
  <div class="shell">
    <div class="res-layout">
      <aside class="res-filtros">
        ${Array.from({ length: 4 }, () => `
          <div class="filtro-bloco">
            <div class="esqueleto esqueleto--texto" style="width:52%"></div>
            <div style="margin-top:12px">
              <div class="esqueleto esqueleto--texto" style="width:86%"></div>
              <div class="esqueleto esqueleto--texto" style="width:72%;margin-top:8px"></div>
            </div>
          </div>`).join('')}
      </aside>
      <div>
        <div class="esqueleto" style="height:230px;border-radius:var(--r-md);margin-bottom:var(--sp-6)"></div>
        ${esqueletoLista(3)}
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------
   Busca sem profissao valida
   ------------------------------------------------------------ */
function semProfissao(raiz, tentativa) {
  raiz.innerHTML = `
  <div class="shell" style="padding-block:var(--sp-16) var(--sp-20)">
    <div style="max-width:720px;margin-inline:auto;text-align:center">
      <span class="vazio__icone">${icon.bussola({ size: 26 })}</span>
      <h1 style="font-size:var(--fs-2xl);margin-top:var(--sp-4)">
        ${tentativa ? 'Não encontramos essa profissão' : 'Comece escolhendo uma profissão'}
      </h1>
      <p class="lead centro" style="margin-inline:auto;margin-top:var(--sp-3)">
        Diga o que você faz (ou quer fazer) e onde você quer trabalhar.
        A partir daí mostramos as oportunidades e tudo sobre a carreira.
      </p>
      <div style="margin-top:var(--sp-7)" data-busca-erro>
        ${caixaBusca({ tamanho: 'media', autoFoco: true })}
      </div>
      <a class="btn btn--fantasma" href="#/profissoes" style="margin-top:var(--sp-5)">
        Ver todas as profissões ${icon.chevronR({ size: 15 })}
      </a>
    </div>
  </div>`;

  document.title = 'Buscar oportunidades | NORTE';
  const desligar = ativarBusca(qs('[data-busca-erro]', raiz));
  return () => desligar();
}
