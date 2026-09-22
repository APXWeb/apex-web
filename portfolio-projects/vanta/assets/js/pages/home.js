/* ============================================================
   VANTA — Home
   ============================================================ */

import { icon } from '../components/icons.js';
import { cardProduto, miniProduto } from '../components/productCard.js';
import { productArt } from '../data/artwork.js';
import { arteProduto } from '../components/media.js';
import { money, num, compact, parcelas, escapeHtml } from '../utils/format.js';
import {
  produtosVisiveis, precoVigente, state, maisVendidos,
} from '../services/store.js';

function secao({ eyebrow, titulo, acao = '', conteudo, id = '' }) {
  return `
    <section class="section section--tight" ${id ? `id="${id}"` : ''}>
      <div class="shell">
        <header class="section-head">
          <div>
            <span class="eyebrow eyebrow--accent" data-anim>${eyebrow}</span>
            <h2 class="section-head__title" data-anim="1">${titulo}</h2>
          </div>
          ${acao}
        </header>
        ${conteudo}
      </div>
    </section>`;
}

export function paginaHome() {
  const produtos = produtosVisiveis();
  const destaques = produtos.filter(p => p.destaque).slice(0, 8);
  const novos = produtos.filter(p => p.novo).slice(0, 8);
  const ofertas = produtos.filter(p => precoVigente(p).de).sort((a, b) => {
    const da = 1 - precoVigente(a).preco / precoVigente(a).de;
    const db = 1 - precoVigente(b).preco / precoVigente(b).de;
    return db - da;
  }).slice(0, 8);
  const top = maisVendidos(8);

  const heroProduto = produtos.find(p => p.id === 'vn-140') || produtos[0];
  const heroPreco = precoVigente(heroProduto);
  const heroPar = parcelas(heroPreco.preco);

  const contagem = {};
  state.categorias.forEach(c => {
    contagem[c.id] = produtos.filter(p => p.cat === c.id).length;
  });

  const promoAtiva = state.promocoes.find(p => p.status === 'ativa' && p.tipo === 'percentual');

  return `
  <!-- ============ HERO ============ -->
  <section class="hero">
    <div class="shell hero__grid">
      <div>
        <span class="eyebrow eyebrow--accent" data-anim>
          ${icon.raio({ size: 13 })} Seleção para a casa toda
        </span>

        <h1 class="hero__title" data-anim="1">
          Tudo o que<br>a sua casa<br><em>usa todo dia</em>
        </h1>

        <p class="hero__sub" data-anim="2">
          Cozinha, casa, bebê, viagem, treino, beleza e tecnologia.
          Catálogo enxuto, escolhido item a item, com entrega para
          todo o Brasil e troca em 30 dias.
        </p>

        <div class="hero__cta" data-anim="3">
          <a href="#/catalogo" class="btn btn--primary btn--lg">
            Explorar catálogo ${icon.seta({ size: 18 })}
          </a>
          <a href="#/catalogo?promo=1" class="btn btn--outline btn--lg">Ver ofertas</a>
        </div>

        <div class="hero__stats" data-anim="4">
          <div>
            <p class="hero__stat-n">${num(produtos.length)}</p>
            <p class="hero__stat-l">produtos no catálogo</p>
          </div>
          <div>
            <p class="hero__stat-n">${state.categorias.length}</p>
            <p class="hero__stat-l">categorias</p>
          </div>
          <div>
            <p class="hero__stat-n">4,7</p>
            <p class="hero__stat-l">nota média da loja</p>
          </div>
          <div>
            <p class="hero__stat-n">${compact(state.pedidos.length * 87)}</p>
            <p class="hero__stat-l">pedidos entregues</p>
          </div>
        </div>
      </div>

      <div class="hero__show" data-anim="2">
        <div class="hero__show-art">
          <span class="hero__show-tag">${icon.medalha({ size: 14 })} Destaque da semana</span>
          ${arteProduto(heroProduto, { eager: true, sizes: '(max-width: 900px) 70vw, 420px' })}
        </div>
        <a class="hero__show-card" href="#/produto/${heroProduto.id}">
          <p class="pcard__brand">${escapeHtml(heroProduto.marca)}</p>
          <p style="font-size:var(--fs-base);font-weight:500;margin:4px 0 10px;line-height:1.35">
            ${escapeHtml(heroProduto.nome)}
          </p>
          <div class="pcard__price">
            ${heroPreco.de ? `<span class="pcard__was">${money(heroPreco.de)}</span>` : ''}
            <span class="pcard__now price">${money(heroPreco.preco)}</span>
          </div>
          <p class="pcard__inst">em <strong>${heroPar.n}x ${money(heroPar.valor)}</strong> sem juros</p>
          <p class="pcard__ship" style="margin-top:6px">${icon.caminhao({ size: 13 })} Frete grátis</p>
        </a>
      </div>
    </div>
  </section>

  <!-- ============ SELOS DE CONFIANCA ============ -->
  <div class="shell">
    <div class="trust">
      ${[
        ['caminhao', 'Frete grátis', 'Acima de R$ 250 para todo o Brasil'],
        ['retorno', '30 dias para trocar', 'Devolução gratuita, sem burocracia'],
        ['escudo', 'Garantia estendida', 'Até 36 meses direto com a VANTA'],
        ['cartao', 'Até 12x sem juros', 'Ou 8% de desconto no PIX'],
      ].map(([ic, t, d], i) => `
        <div class="trust__item" data-anim="${i}">
          <span class="trust__icon">${icon[ic]({ size: 20 })}</span>
          <div>
            <p class="trust__t">${t}</p>
            <p class="trust__d">${d}</p>
          </div>
        </div>`).join('')}
    </div>
  </div>

  <!-- ============ CATEGORIAS ============ -->
  ${secao({
    eyebrow: 'Navegue por categoria',
    titulo: 'Por onde você quer começar?',
    acao: `<a href="#/catalogo" class="btn btn--ghost btn--sm">Ver tudo ${icon.chevronR({ size: 15 })}</a>`,
    conteudo: `
      <div class="cat-grid">
        ${state.categorias.map((c, i) => `
          <a class="cat-card" href="#/catalogo?cat=${c.id}" data-anim="${i}">
            <div class="cat-card__art">${productArt(c.art, i % 2 ? 'graphite' : 'volt')}</div>
            <div>
              <p class="cat-card__n">${escapeHtml(c.nome)}</p>
              <p class="cat-card__c">${contagem[c.id]} ${contagem[c.id] === 1 ? 'produto' : 'produtos'}</p>
            </div>
            <span class="cat-card__go">Explorar ${icon.seta({ size: 14 })}</span>
          </a>`).join('')}
      </div>`,
  })}

  <!-- ============ DESTAQUES ============ -->
  ${secao({
    eyebrow: 'Selecionados pela VANTA',
    titulo: 'Em destaque agora',
    acao: `<a href="#/catalogo" class="btn btn--ghost btn--sm">Ver catálogo ${icon.chevronR({ size: 15 })}</a>`,
    conteudo: `<div class="grid-auto">${destaques.map((p, i) =>
      `<div data-anim="${i}">${cardProduto(p)}</div>`).join('')}</div>`,
  })}

  <!-- ============ BANNER PROMOCIONAL ============ -->
  <section class="section section--tight">
    <div class="shell">
      <div class="promo-banner" data-anim>
        <div>
          <span class="eyebrow eyebrow--accent">${icon.etiqueta({ size: 13 })} ${escapeHtml(promoAtiva?.nome || 'Campanha ativa')}</span>
          <h2 class="promo-banner__title" style="margin-top:14px">
            ${promoAtiva ? `${promoAtiva.valor}% de desconto na linha de ${escapeHtml(state.categorias.find(c => c.id === promoAtiva.categoria)?.nome || 'destaque')}` : 'Ofertas da semana'}
          </h2>
          <p class="lede" style="margin-top:14px;font-size:var(--fs-base)">
            ${escapeHtml(promoAtiva?.desc || 'Seleção de produtos com desconto por tempo limitado.')}
          </p>
          <div class="countdown" aria-label="Tempo restante da campanha">
            ${[['02', 'dias'], ['14', 'horas'], ['38', 'min'], ['12', 'seg']].map(([n, l]) => `
              <div class="countdown__box">
                <p class="countdown__n" data-cd="${l}">${n}</p>
                <p class="countdown__l">${l}</p>
              </div>`).join('')}
          </div>
          <a href="#/catalogo?promo=1" class="btn btn--primary btn--lg" style="margin-top:28px">
            Aproveitar ofertas ${icon.seta({ size: 17 })}
          </a>
        </div>
        <div class="promo-banner__art" aria-hidden="true">
          ${ofertas.slice(0, 4).map(p => `<div>${arteProduto(p, { mini: true })}</div>`).join('')}
        </div>
      </div>
    </div>
  </section>

  <!-- ============ MAIS VENDIDOS ============ -->
  ${secao({
    eyebrow: 'Os preferidos da loja',
    titulo: 'Mais vendidos',
    acao: `<a href="#/catalogo?ord=vendidos" class="btn btn--ghost btn--sm">Ver ranking ${icon.chevronR({ size: 15 })}</a>`,
    conteudo: `<div class="rail">${top.map(miniProduto).join('')}</div>`,
  })}

  <!-- ============ OFERTAS ============ -->
  ${secao({
    eyebrow: 'Preço reduzido',
    titulo: 'Ofertas em destaque',
    acao: `<a href="#/catalogo?promo=1" class="btn btn--ghost btn--sm">Todas as ofertas ${icon.chevronR({ size: 15 })}</a>`,
    conteudo: `<div class="grid-auto">${ofertas.slice(0, 4).map((p, i) =>
      `<div data-anim="${i}">${cardProduto(p)}</div>`).join('')}</div>`,
  })}

  <!-- ============ NOVIDADES ============ -->
  ${secao({
    eyebrow: 'Chegou agora',
    titulo: 'Novidades no catálogo',
    acao: `<a href="#/catalogo?novo=1" class="btn btn--ghost btn--sm">Ver novidades ${icon.chevronR({ size: 15 })}</a>`,
    conteudo: `<div class="grid-auto">${novos.slice(0, 4).map((p, i) =>
      `<div data-anim="${i}">${cardProduto(p)}</div>`).join('')}</div>`,
  })}
  `;
}

/** Contagem regressiva do banner (roda so enquanto a home esta na tela) */
export function ligarContagem(root) {
  const alvos = {
    dias: root.querySelector('[data-cd="dias"]'),
    horas: root.querySelector('[data-cd="horas"]'),
    min: root.querySelector('[data-cd="min"]'),
    seg: root.querySelector('[data-cd="seg"]'),
  };
  if (!alvos.seg) return () => {};

  let restante = 2 * 86400 + 14 * 3600 + 38 * 60 + 12;

  const pintar = () => {
    const d = Math.floor(restante / 86400);
    const h = Math.floor((restante % 86400) / 3600);
    const m = Math.floor((restante % 3600) / 60);
    const s = restante % 60;
    const p = (n) => String(n).padStart(2, '0');
    alvos.dias.textContent = p(d);
    alvos.horas.textContent = p(h);
    alvos.min.textContent = p(m);
    alvos.seg.textContent = p(s);
  };

  pintar();
  const t = setInterval(() => {
    restante = Math.max(0, restante - 1);
    pintar();
  }, 1000);

  return () => clearInterval(t);
}
