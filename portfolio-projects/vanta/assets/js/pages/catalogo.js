/* ============================================================
   VANTA — Catalogo: busca, filtros, ordenacao e paginacao
   ============================================================ */

import { qs, qsa, delegate, observarAnimacoes, debounce } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { cardProduto, linhaProduto } from '../components/productCard.js';
import { money, num, norm, escapeHtml } from '../utils/format.js';
import { produtosVisiveis, precoVigente, state, subscribe } from '../services/store.js';
import { trocarQuery, ir } from '../router.js';
import { drawer, vazio, skelGrid } from '../components/ui.js';

const POR_PAGINA = 12;

const ORDENS = {
  relevancia: { label: 'Mais relevantes', fn: (a, b) => b.vendidos - a.vendidos },
  vendidos:   { label: 'Mais vendidos',   fn: (a, b) => b.vendidos - a.vendidos },
  menor:      { label: 'Menor preço',     fn: (a, b) => precoVigente(a).preco - precoVigente(b).preco },
  maior:      { label: 'Maior preço',     fn: (a, b) => precoVigente(b).preco - precoVigente(a).preco },
  nota:       { label: 'Melhor avaliados', fn: (a, b) => b.nota - a.nota || b.avaliacoes - a.avaliacoes },
  novos:      { label: 'Lançamentos',     fn: (a, b) => b.criadoEm.localeCompare(a.criadoEm) },
  desconto:   { label: 'Maior desconto',  fn: (a, b) => descontoDe(b) - descontoDe(a) },
};

function descontoDe(p) {
  const pr = precoVigente(p);
  return pr.de ? 1 - pr.preco / pr.de : 0;
}

/* Faixa de preco do catalogo inteiro, para calibrar o slider */
function faixaPrecos() {
  const precos = produtosVisiveis().map(p => precoVigente(p).preco);
  return { min: Math.min(...precos), max: Math.max(...precos) };
}

export function paginaCatalogo(root, query) {
  const faixa = faixaPrecos();

  // Filtros vivem na URL: recarregar ou compartilhar o link preserva o estado
  const f = {
    q: query.q || '',
    cat: query.cat || '',
    marca: query.marca || '',
    ord: query.ord || 'relevancia',
    vis: query.vis || 'grade',
    pmin: Number(query.pmin) || faixa.min,
    pmax: Number(query.pmax) || faixa.max,
    nota: Number(query.nota) || 0,
    promo: query.promo === '1',
    novo: query.novo === '1',
    disp: query.disp === '1',
    pag: Number(query.pag) || 1,
  };

  root.innerHTML = `
    <div class="shell">
      <nav class="crumbs" aria-label="Você está em">
        <a href="#/">Início</a>
        <span class="crumbs__sep">${icon.chevronR({ size: 13 })}</span>
        <span aria-current="page" data-crumb-atual>Catálogo</span>
      </nav>

      <div class="cat-layout">
        <aside class="filtros" aria-label="Filtros" data-filtros></aside>
        <div>
          <div data-toolbar></div>
          <div data-chips></div>
          <div data-resultados aria-live="polite" aria-busy="true">${skelGrid(8)}</div>
          <nav data-pager aria-label="Paginação" style="padding-top:40px"></nav>
        </div>
      </div>
    </div>`;

  const elFiltros = qs('[data-filtros]', root);
  const elToolbar = qs('[data-toolbar]', root);
  const elChips = qs('[data-chips]', root);
  const elResultados = qs('[data-resultados]', root);
  const elPager = qs('[data-pager]', root);
  const elCrumb = qs('[data-crumb-atual]', root);

  /* ---------- Filtragem ---------- */
  function filtrar() {
    let lista = produtosVisiveis();

    if (f.q) {
      const t = norm(f.q);
      lista = lista.filter(p => norm(`${p.nome} ${p.marca} ${p.resumo}`).includes(t));
    }
    if (f.cat) lista = lista.filter(p => p.cat === f.cat);
    if (f.marca) lista = lista.filter(p => p.marca === f.marca);
    if (f.nota) lista = lista.filter(p => p.nota >= f.nota);
    if (f.promo) lista = lista.filter(p => !!precoVigente(p).de);
    if (f.novo) lista = lista.filter(p => p.novo);
    if (f.disp) lista = lista.filter(p => p.estoque > 0);

    lista = lista.filter(p => {
      const v = precoVigente(p).preco;
      return v >= f.pmin && v <= f.pmax;
    });

    return lista.sort(ORDENS[f.ord]?.fn || ORDENS.relevancia.fn);
  }

  /* Contagem por opcao, calculada ignorando o proprio eixo do filtro */
  function contarPor(campo) {
    const base = produtosVisiveis().filter(p => {
      if (f.q && !norm(`${p.nome} ${p.marca}`).includes(norm(f.q))) return false;
      if (campo !== 'cat' && f.cat && p.cat !== f.cat) return false;
      if (campo !== 'marca' && f.marca && p.marca !== f.marca) return false;
      return true;
    });
    const mapa = {};
    base.forEach(p => {
      const chave = p[campo];
      mapa[chave] = (mapa[chave] || 0) + 1;
    });
    return mapa;
  }

  /* ---------- Render dos filtros ---------- */
  function pintarFiltros(destino) {
    const porCat = contarPor('cat');
    const porMarca = contarPor('marca');
    const marcas = [...new Set(produtosVisiveis().map(p => p.marca))].sort();

    const pctMin = ((f.pmin - faixa.min) / (faixa.max - faixa.min)) * 100;
    const pctMax = ((f.pmax - faixa.min) / (faixa.max - faixa.min)) * 100;

    destino.innerHTML = `
      <div class="filtro-bloco">
        <p class="filtro-bloco__t">Categoria</p>
        <div class="filtro-lista">
          <button type="button" class="filtro-item" data-f="cat" data-v="" aria-pressed="${!f.cat}">
            <span>Todas</span>
            <span class="filtro-item__n">${num(Object.values(porCat).reduce((a, b) => a + b, 0))}</span>
          </button>
          ${state.categorias.map(c => `
            <button type="button" class="filtro-item" data-f="cat" data-v="${c.id}" aria-pressed="${f.cat === c.id}">
              <span>${escapeHtml(c.nome)}</span>
              <span class="filtro-item__n">${num(porCat[c.id] || 0)}</span>
            </button>`).join('')}
        </div>
      </div>

      <div class="filtro-bloco">
        <p class="filtro-bloco__t">Preço</p>
        <div class="preco-range">
          <div class="preco-range__vals">
            <span>${money(f.pmin)}</span>
            <span>${money(f.pmax)}</span>
          </div>
          <div class="preco-range__slider">
            <div class="preco-range__trilho">
              <div class="preco-range__ativo" style="left:${pctMin}%;width:${Math.max(0, pctMax - pctMin)}%"></div>
            </div>
            <input type="range" min="${faixa.min}" max="${faixa.max}" step="1000" value="${f.pmin}"
                   data-range="pmin" aria-label="Preço mínimo">
            <input type="range" min="${faixa.min}" max="${faixa.max}" step="1000" value="${f.pmax}"
                   data-range="pmax" aria-label="Preço máximo">
          </div>
        </div>
      </div>

      <div class="filtro-bloco">
        <p class="filtro-bloco__t">Marca</p>
        <div class="filtro-lista">
          <button type="button" class="filtro-item" data-f="marca" data-v="" aria-pressed="${!f.marca}">
            <span>Todas</span>
          </button>
          ${marcas.map(m => `
            <button type="button" class="filtro-item" data-f="marca" data-v="${escapeHtml(m)}" aria-pressed="${f.marca === m}">
              <span>${escapeHtml(m)}</span>
              <span class="filtro-item__n">${num(porMarca[m] || 0)}</span>
            </button>`).join('')}
        </div>
      </div>

      <div class="filtro-bloco">
        <p class="filtro-bloco__t">Avaliação</p>
        <div class="filtro-lista">
          ${[4.5, 4, 3].map(n => `
            <button type="button" class="filtro-item" data-f="nota" data-v="${n}" aria-pressed="${f.nota === n}">
              <span style="display:flex;align-items:center;gap:6px">
                <span style="color:var(--amber-500);display:inline-flex">${icon.estrela({ size: 13, fill: true })}</span>
                ${String(n).replace('.', ',')} ou mais
              </span>
            </button>`).join('')}
        </div>
      </div>

      <div class="filtro-bloco">
        <p class="filtro-bloco__t">Outros</p>
        <label class="check"><input type="checkbox" data-f="promo" ${f.promo ? 'checked' : ''}> Em promoção</label>
        <label class="check"><input type="checkbox" data-f="novo" ${f.novo ? 'checked' : ''}> Novidades</label>
        <label class="check"><input type="checkbox" data-f="disp" ${f.disp ? 'checked' : ''}> Somente disponíveis</label>
      </div>

      <div class="filtro-bloco" style="border-bottom:0">
        <button type="button" class="btn btn--ghost btn--sm btn--block" data-limpar>Limpar filtros</button>
      </div>`;
  }

  /* ---------- Render da barra de ferramentas ---------- */
  function pintarToolbar(total) {
    elToolbar.innerHTML = `
      <div class="cat-toolbar">
        <p class="cat-toolbar__count">
          <strong>${num(total)}</strong> ${total === 1 ? 'produto encontrado' : 'produtos encontrados'}
          ${f.q ? ` para "<strong>${escapeHtml(f.q)}</strong>"` : ''}
        </p>
        <div class="cat-tools">
          <button type="button" class="btn btn--secondary btn--sm filtros-mobile-btn" data-abrir-filtros>
            ${icon.filtro({ size: 16 })} Filtros
          </button>

          <label class="sr-only" for="ordenar">Ordenar por</label>
          <select class="select" id="ordenar" data-ord style="min-height:40px;width:auto">
            ${Object.entries(ORDENS).map(([k, v]) =>
              `<option value="${k}" ${f.ord === k ? 'selected' : ''}>${v.label}</option>`).join('')}
          </select>

          <div class="segmented" role="group" aria-label="Formato de exibição">
            <button type="button" data-vis="grade" aria-pressed="${f.vis === 'grade'}" aria-label="Ver em grade">
              ${icon.grade({ size: 15 })}
            </button>
            <button type="button" data-vis="lista" aria-pressed="${f.vis === 'lista'}" aria-label="Ver em lista">
              ${icon.lista({ size: 15 })}
            </button>
          </div>
        </div>
      </div>`;
  }

  /* ---------- Chips dos filtros ativos ---------- */
  function pintarChips() {
    const ativos = [];
    if (f.q) ativos.push(['q', `Busca: ${f.q}`]);
    if (f.cat) ativos.push(['cat', state.categorias.find(c => c.id === f.cat)?.nome || f.cat]);
    if (f.marca) ativos.push(['marca', f.marca]);
    if (f.nota) ativos.push(['nota', `${String(f.nota).replace('.', ',')}+ estrelas`]);
    if (f.promo) ativos.push(['promo', 'Em promoção']);
    if (f.novo) ativos.push(['novo', 'Novidades']);
    if (f.disp) ativos.push(['disp', 'Disponíveis']);
    if (f.pmin > faixa.min || f.pmax < faixa.max) {
      ativos.push(['preco', `${money(f.pmin)} – ${money(f.pmax)}`]);
    }

    elChips.innerHTML = ativos.length ? `
      <div class="chips-ativos">
        ${ativos.map(([k, rotulo]) => `
          <button type="button" class="chip" data-tirar="${k}">
            ${escapeHtml(rotulo)}
            <span class="chip__remove">${icon.fechar({ size: 11 })}</span>
          </button>`).join('')}
        <button type="button" class="chip" data-limpar style="border-style:dashed">Limpar tudo</button>
      </div>` : '';
  }

  /* ---------- Render dos resultados ---------- */
  function pintarResultados() {
    const lista = filtrar();
    const total = lista.length;
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    if (f.pag > paginas) f.pag = paginas;
    const fatia = lista.slice((f.pag - 1) * POR_PAGINA, f.pag * POR_PAGINA);

    pintarToolbar(total);
    pintarChips();
    elCrumb.textContent = f.cat
      ? (state.categorias.find(c => c.id === f.cat)?.nome || 'Catálogo')
      : (f.q ? `Busca: ${f.q}` : 'Catálogo');

    if (!total) {
      elResultados.innerHTML = vazio({
        icone: 'busca',
        titulo: 'Nenhum produto encontrado',
        texto: 'Tente remover algum filtro ou buscar por outro termo.',
        acao: `<button type="button" class="btn btn--primary" data-limpar>Limpar filtros</button>`,
      });
      elPager.innerHTML = '';
      elResultados.setAttribute('aria-busy', 'false');
      return;
    }

    elResultados.innerHTML = f.vis === 'lista'
      ? `<div class="lista-produtos">${fatia.map((p, i) => `<div data-anim="${i}">${linhaProduto(p)}</div>`).join('')}</div>`
      : `<div class="grid-produtos">${fatia.map((p, i) => `<div data-anim="${i}">${cardProduto(p)}</div>`).join('')}</div>`;

    elResultados.setAttribute('aria-busy', 'false');
    observarAnimacoes(elResultados);
    pintarPager(paginas);
  }

  function pintarPager(paginas) {
    if (paginas <= 1) { elPager.innerHTML = ''; return; }

    const janela = [];
    for (let i = 1; i <= paginas; i++) {
      if (i === 1 || i === paginas || Math.abs(i - f.pag) <= 1) janela.push(i);
      else if (janela.at(-1) !== '…') janela.push('…');
    }

    elPager.innerHTML = `
      <div class="pager">
        <button type="button" class="pager__btn" data-pag="${f.pag - 1}" ${f.pag === 1 ? 'disabled' : ''}
                aria-label="Página anterior">${icon.chevronL({ size: 16 })}</button>
        ${janela.map(n => n === '…'
          ? `<span class="pager__btn" style="border:0;cursor:default">…</span>`
          : `<button type="button" class="pager__btn" data-pag="${n}" ${n === f.pag ? 'aria-current="page"' : ''}>${n}</button>`
        ).join('')}
        <button type="button" class="pager__btn" data-pag="${f.pag + 1}" ${f.pag === paginas ? 'disabled' : ''}
                aria-label="Próxima página">${icon.chevronR({ size: 16 })}</button>
      </div>`;
  }

  /* ---------- Sincroniza estado -> URL -> tela ---------- */
  function aplicar({ resetarPagina = true } = {}) {
    if (resetarPagina) f.pag = 1;
    trocarQuery({
      q: f.q, cat: f.cat, marca: f.marca, ord: f.ord === 'relevancia' ? '' : f.ord,
      vis: f.vis === 'grade' ? '' : f.vis,
      pmin: f.pmin > faixa.min ? f.pmin : '', pmax: f.pmax < faixa.max ? f.pmax : '',
      nota: f.nota || '', promo: f.promo ? '1' : '', novo: f.novo ? '1' : '',
      disp: f.disp ? '1' : '', pag: f.pag > 1 ? f.pag : '',
    });
    pintarFiltros(elFiltros);
    pintarResultados();
  }

  /* ---------- Eventos ---------- */
  function ligarFiltros(escopo) {
    delegate(escopo, 'click', '[data-f]', (e, botao) => {
      if (botao.tagName !== 'BUTTON') return;
      const campo = botao.dataset.f;
      const valor = botao.dataset.v;
      if (campo === 'nota') f.nota = f.nota === Number(valor) ? 0 : Number(valor);
      else f[campo] = f[campo] === valor ? '' : valor;
      aplicar();
    });

    delegate(escopo, 'change', 'input[type="checkbox"][data-f]', (e, input) => {
      f[input.dataset.f] = input.checked;
      aplicar();
    });

    // Dois controles na mesma faixa: nunca deixar o minimo passar do maximo
    const atualizarFaixa = debounce(() => aplicar(), 260);
    delegate(escopo, 'input', '[data-range]', (e, input) => {
      const qual = input.dataset.range;
      const valor = Number(input.value);
      if (qual === 'pmin') f.pmin = Math.min(valor, f.pmax - 1000);
      else f.pmax = Math.max(valor, f.pmin + 1000);

      // Feedback imediato, sem esperar o redesenho completo
      const vals = qsa('.preco-range__vals span', escopo);
      if (vals.length === 2) {
        vals[0].textContent = money(f.pmin);
        vals[1].textContent = money(f.pmax);
      }
      const ativo = qs('.preco-range__ativo', escopo);
      if (ativo) {
        const a = ((f.pmin - faixa.min) / (faixa.max - faixa.min)) * 100;
        const b = ((f.pmax - faixa.min) / (faixa.max - faixa.min)) * 100;
        ativo.style.left = `${a}%`;
        ativo.style.width = `${Math.max(0, b - a)}%`;
      }
      atualizarFaixa();
    });
  }

  ligarFiltros(elFiltros);

  delegate(root, 'click', '[data-limpar]', () => {
    Object.assign(f, {
      q: '', cat: '', marca: '', nota: 0, promo: false, novo: false, disp: false,
      pmin: faixa.min, pmax: faixa.max, pag: 1,
    });
    aplicar();
  });

  delegate(root, 'click', '[data-tirar]', (e, botao) => {
    const k = botao.dataset.tirar;
    if (k === 'preco') { f.pmin = faixa.min; f.pmax = faixa.max; }
    else if (k === 'nota') f.nota = 0;
    else if (['promo', 'novo', 'disp'].includes(k)) f[k] = false;
    else f[k] = '';
    aplicar();
  });

  delegate(root, 'change', '[data-ord]', (e, sel) => { f.ord = sel.value; aplicar(); });

  delegate(root, 'click', '[data-vis]', (e, botao) => {
    f.vis = botao.dataset.vis;
    aplicar({ resetarPagina: false });
  });

  delegate(root, 'click', '[data-pag]', (e, botao) => {
    if (botao.disabled) return;
    f.pag = Number(botao.dataset.pag);
    aplicar({ resetarPagina: false });
    qs('.cat-toolbar', root)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Filtros em gaveta no mobile
  delegate(root, 'click', '[data-abrir-filtros]', () => {
    const d = drawer({
      titulo: 'Filtros',
      lado: 'left',
      conteudo: '<div data-filtros-mobile></div>',
      rodape: `<button type="button" class="btn btn--primary btn--block" data-fechar>Ver resultados</button>`,
    });
    const alvo = qs('[data-filtros-mobile]', d.node);
    pintarFiltros(alvo);
    ligarFiltros(alvo);
    // Mantem a gaveta em sincronia quando um filtro muda
    const desassinar = subscribe(() => pintarFiltros(alvo));
    const fecharOriginal = d.fechar;
    d.node.addEventListener('click', (e) => { if (e.target.closest('[data-limpar]')) desassinar(); });
  });

  // Primeira pintura: mostra o esqueleto por um instante, como um catalogo real
  setTimeout(() => aplicar({ resetarPagina: false }), 90);

  return () => {};
}
