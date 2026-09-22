/* ============================================================
   VANTA — Header da vitrine (busca inteligente, carrinho, conta)
   ============================================================ */

import { qs, qsa, el, delegate, debounce } from '../utils/dom.js';
import { icon } from './icons.js';
import { escapeHtml, money, norm } from '../utils/format.js';
import { arteProduto } from './media.js';
import {
  state, subscribe, qtdCarrinho, produtosVisiveis, precoVigente, produtosFavoritos,
} from '../services/store.js';
import { ir, rotaAtual } from '../router.js';
import { abrirCarrinho } from './cartDrawer.js';

const CATS_MENU = [
  ['cozinha', 'Cozinha'], ['casa', 'Casa'], ['bebe', 'Bebê'], ['brinquedos', 'Brinquedos'],
  ['viagem', 'Viagem'], ['fitness', 'Fitness'], ['beleza', 'Beleza'], ['info', 'Informática'],
  ['audio', 'Áudio'],
];

export function montarHeader() {
  const header = el(`
    <header class="site-header">
      <div class="shell header-top">
        <button type="button" class="btn-icon nav-toggle" aria-label="Abrir menu" aria-expanded="false">
          ${icon.menu()}
        </button>

        <a href="#/" class="brand" aria-label="VANTA, página inicial">
          <span class="brand__mark" aria-hidden="true">V</span>
          <span class="brand__word">VANTA</span>
        </a>

        <div class="search" role="search">
          <span class="search__icon">${icon.busca({ size: 18 })}</span>
          <input type="search" class="search__input" id="busca-global"
                 placeholder="Buscar produtos, marcas e categorias"
                 autocomplete="off" role="combobox" aria-expanded="false"
                 aria-controls="sugestoes" aria-label="Buscar no catálogo">
          <button type="button" class="btn-icon btn-icon--sm search__clear" hidden aria-label="Limpar busca">
            ${icon.fechar({ size: 15 })}
          </button>
          <div class="suggest" id="sugestoes" role="listbox" hidden></div>
        </div>

        <nav class="header-actions" aria-label="Ações da conta">
          <a href="#/favoritos" class="header-btn" aria-label="Favoritos">
            ${icon.coracao({ size: 20 })}
            <span>Favoritos</span>
            <span class="header-btn__count" data-contador-fav hidden>0</span>
          </a>
          <a href="#/conta" class="header-btn" aria-label="Minha conta">
            ${icon.usuario({ size: 20 })}
            <span>Conta</span>
          </a>
          <button type="button" class="header-btn" data-abrir-carrinho aria-label="Abrir carrinho">
            ${icon.carrinho({ size: 20 })}
            <span>Carrinho</span>
            <span class="header-btn__count" data-contador-carrinho hidden>0</span>
          </button>
        </nav>
      </div>

      <nav class="header-nav" aria-label="Categorias">
        <div class="shell">
          <ul class="header-nav__list">
            <li><a class="header-nav__link" href="#/catalogo">Todos os produtos</a></li>
            ${CATS_MENU.map(([id, nome]) =>
              `<li><a class="header-nav__link" href="#/catalogo?cat=${id}" data-cat="${id}">${nome}</a></li>`).join('')}
            <li class="header-nav__promo">${icon.raio({ size: 14 })} Frete grátis acima de R$ 250</li>
          </ul>
        </div>
      </nav>
    </header>`);

  ligarBusca(header);
  ligarMenuMobile(header);

  qs('[data-abrir-carrinho]', header).addEventListener('click', abrirCarrinho);

  const atualizar = () => atualizarContadores(header);
  subscribe(atualizar);
  atualizar();

  return header;
}

/* ---------- Contadores ---------- */
let ultimoCarrinho = -1;

function atualizarContadores(header) {
  const nCarrinho = qtdCarrinho();
  const nFav = state.favoritos.length;

  const bc = qs('[data-contador-carrinho]', header);
  bc.textContent = nCarrinho;
  bc.hidden = nCarrinho === 0;
  if (ultimoCarrinho >= 0 && nCarrinho > ultimoCarrinho) {
    bc.classList.remove('is-bump');
    void bc.offsetWidth;          // reinicia a animacao
    bc.classList.add('is-bump');
  }
  ultimoCarrinho = nCarrinho;

  const bf = qs('[data-contador-fav]', header);
  bf.textContent = nFav;
  bf.hidden = nFav === 0;
}

/* ---------- Busca com sugestoes ---------- */
function ligarBusca(header) {
  const input = qs('.search__input', header);
  const caixa = qs('.suggest', header);
  const limpar = qs('.search__clear', header);
  let indiceAtivo = -1;

  function fechar() {
    caixa.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    indiceAtivo = -1;
  }

  function buscar(termo) {
    const t = norm(termo).trim();
    if (t.length < 2) return { produtos: [], categorias: [] };

    const produtos = produtosVisiveis()
      .map(p => {
        const alvo = norm(`${p.nome} ${p.marca} ${p.resumo}`);
        const i = alvo.indexOf(t);
        return i < 0 ? null : { p, peso: i === 0 ? 0 : 1 };
      })
      .filter(Boolean)
      .sort((a, b) => a.peso - b.peso || b.p.vendidos - a.p.vendidos)
      .slice(0, 6)
      .map(x => x.p);

    const categorias = CATS_MENU
      .filter(([, nome]) => norm(nome).includes(t))
      .slice(0, 3);

    return { produtos, categorias };
  }

  function render(termo) {
    const { produtos, categorias } = buscar(termo);

    if (!produtos.length && !categorias.length) {
      if (norm(termo).trim().length < 2) { fechar(); return; }
      caixa.innerHTML = `
        <p class="suggest__group">Sem resultados</p>
        <p style="padding:0 16px 16px;font-size:var(--fs-sm);color:var(--text-tertiary)">
          Nada encontrado para "${escapeHtml(termo)}". Tente outro termo.
        </p>`;
      caixa.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    caixa.innerHTML = `
      ${categorias.length ? `<p class="suggest__group">Categorias</p>` : ''}
      ${categorias.map(([id, nome]) => `
        <button type="button" class="suggest__item" role="option" aria-selected="false" data-go="#/catalogo?cat=${id}">
          <span class="suggest__art" style="display:grid;place-items:center">${icon.etiqueta({ size: 18 })}</span>
          <span><span class="suggest__name">${escapeHtml(nome)}</span></span>
        </button>`).join('')}

      ${produtos.length ? `<p class="suggest__group">Produtos</p>` : ''}
      ${produtos.map(p => {
        const pr = precoVigente(p);
        return `
        <button type="button" class="suggest__item" role="option" aria-selected="false" data-go="#/produto/${p.id}">
          <span class="suggest__art">${arteProduto(p, { mini: true })}</span>
          <span style="flex:1;min-width:0">
            <span class="suggest__name">${escapeHtml(p.nome)}</span>
            <span class="suggest__meta">${escapeHtml(p.marca)}</span>
          </span>
          <span class="price" style="font-weight:600">${money(pr.preco)}</span>
        </button>`;
      }).join('')}

      <button type="button" class="suggest__item" role="option" aria-selected="false"
              data-go="#/catalogo?q=${encodeURIComponent(termo)}" style="border-top:1px solid var(--border-subtle)">
        <span class="suggest__art" style="display:grid;place-items:center">${icon.busca({ size: 18 })}</span>
        <span class="suggest__name">Ver todos os resultados para "${escapeHtml(termo)}"</span>
      </button>`;

    caixa.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    indiceAtivo = -1;
  }

  const renderDebounced = debounce(render, 160);

  input.addEventListener('input', () => {
    limpar.hidden = !input.value;
    renderDebounced(input.value);
  });

  input.addEventListener('focus', () => { if (input.value.length >= 2) render(input.value); });

  input.addEventListener('keydown', (e) => {
    const itens = qsa('.suggest__item', caixa);

    if (e.key === 'Escape') { fechar(); input.blur(); return; }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (indiceAtivo >= 0 && itens[indiceAtivo]) {
        location.hash = itens[indiceAtivo].dataset.go.slice(1);
      } else if (input.value.trim()) {
        ir('/catalogo', { q: input.value.trim() });
      }
      fechar();
      input.blur();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!itens.length) return;
      e.preventDefault();
      indiceAtivo = e.key === 'ArrowDown'
        ? (indiceAtivo + 1) % itens.length
        : (indiceAtivo - 1 + itens.length) % itens.length;
      itens.forEach((it, i) => {
        it.classList.toggle('is-active', i === indiceAtivo);
        it.setAttribute('aria-selected', String(i === indiceAtivo));
      });
      itens[indiceAtivo].scrollIntoView({ block: 'nearest' });
    }
  });

  limpar.addEventListener('click', () => {
    input.value = '';
    limpar.hidden = true;
    fechar();
    input.focus();
  });

  delegate(caixa, 'click', '[data-go]', (e, alvo) => {
    location.hash = alvo.dataset.go.slice(1);
    fechar();
    input.blur();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search')) fechar();
  });
}

/* ---------- Menu mobile ---------- */
function ligarMenuMobile(header) {
  const botao = qs('.nav-toggle', header);
  botao.addEventListener('click', async () => {
    const { drawer } = await import('./ui.js');
    const favs = produtosFavoritos().length;
    drawer({
      titulo: 'Navegar',
      lado: 'left',
      conteudo: `
        <nav class="menu-mobile">
          <a href="#/catalogo" class="menu-mobile__link">Todos os produtos</a>
          <p class="menu-mobile__group">Categorias</p>
          ${CATS_MENU.map(([id, nome]) =>
            `<a href="#/catalogo?cat=${id}" class="menu-mobile__link">${nome}</a>`).join('')}
          <hr class="rule" style="margin:16px 0">
          <a href="#/conta" class="menu-mobile__link">Minha conta</a>
          <a href="#/favoritos" class="menu-mobile__link">Favoritos ${favs ? `<span class="badge badge--neutral">${favs}</span>` : ''}</a>
          <a href="#/conta/pedidos" class="menu-mobile__link">Meus pedidos</a>
          <hr class="rule" style="margin:16px 0">
          <a href="#/admin" class="menu-mobile__link">${icon.painel({ size: 17 })} Painel administrativo</a>
        </nav>`,
    });
    // Fecha o drawer ao escolher um destino
    setTimeout(() => {
      qsa('.menu-mobile__link').forEach(a =>
        a.addEventListener('click', () => qs('.drawer [data-fechar]')?.click()));
    }, 40);
  });
}

/** Marca a categoria ativa na barra de navegacao */
export function marcarNavAtiva() {
  const { path, query } = rotaAtual();
  qsa('.header-nav__link').forEach(a => {
    const cat = a.dataset.cat;
    const ativo = cat ? (path.startsWith('/catalogo') && query.cat === cat)
                      : (path === '/catalogo' && !query.cat);
    a.classList.toggle('is-active', ativo);
  });
}
