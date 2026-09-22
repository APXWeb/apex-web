/* ============================================================
   VANTA — Cartao de produto
   Densidade comercial no padrao de marketplace: preco em
   destaque, parcelamento, frete, selo social e estoque.
   Duas variantes: grade e lista.
   ============================================================ */

import { arteProduto } from './media.js';
import { money, parcelas, escapeHtml, num } from '../utils/format.js';
import { precoVigente, ehFavorito, FRETE_GRATIS_ACIMA, produtosVisiveis } from '../services/store.js';
import { icon } from './icons.js';

/** Estrelas em duas camadas: cinza embaixo, dourado por cima recortado
    na proporcao exata da nota. Funciona para qualquer fracao. */
export function estrelas(nota, tamanho = 13) {
  const cinco = (cor) => Array.from({ length: 5 }, () =>
    `<span style="color:${cor};display:inline-flex">${icon.estrela({ size: tamanho, fill: true })}</span>`).join('');
  const pct = Math.max(0, Math.min(100, (nota / 5) * 100));
  return `
    <span class="stars" style="--sw:${tamanho}px" aria-hidden="true">
      <span class="stars__base">${cinco('var(--ink-600)')}</span>
      <span class="stars__fill" style="width:${pct}%">${cinco('var(--amber-500)')}</span>
    </span>`;
}

export function blocoAvaliacao(p, tamanho = 13) {
  if (!p.avaliacoes) {
    return `<span class="rating"><span class="rating__count">Sem avaliações ainda</span></span>`;
  }
  return `
    <span class="rating" aria-label="Nota ${String(p.nota).replace('.', ',')} de 5, ${p.avaliacoes} avaliações">
      ${estrelas(p.nota, tamanho)}
      <span class="rating__count">${String(p.nota).replace('.', ',')} <span class="dim">(${num(p.avaliacoes)})</span></span>
    </span>`;
}

/* "Mais vendido" so faz sentido se for raro: usamos o corte dos 12%
   melhores do catalogo, calculado uma vez e reaproveitado. */
let _corteTop = null;
function corteMaisVendidos() {
  if (_corteTop === null) {
    const vendas = produtosVisiveis().map(p => p.vendidos).sort((a, b) => b - a);
    _corteTop = vendas[Math.floor(vendas.length * 0.12)] ?? Infinity;
  }
  return _corteTop;
}

/** Selos sobre a imagem — no maximo dois, para nao poluir */
function selos(p, precos) {
  const out = [];
  if (p.vendidos >= corteMaisVendidos()) out.push(`<span class="pcard__flag pcard__flag--top">${icon.medalha({ size: 12 })} Mais vendido</span>`);
  else if (p.novo) out.push(`<span class="pcard__flag pcard__flag--new">Novo</span>`);
  if (precos.de && precos.de > precos.preco) {
    const off = Math.round((1 - precos.preco / precos.de) * 100);
    out.push(`<span class="pcard__flag pcard__flag--off">${off}% OFF</span>`);
  }
  return out.length ? `<div class="pcard__flags">${out.join('')}</div>` : '';
}

function avisoEstoque(p) {
  if (p.estoque === 0) return `<p class="pcard__stock pcard__stock--out">${icon.alerta({ size: 12 })} Sem estoque</p>`;
  if (p.estoque <= 5) return `<p class="pcard__stock pcard__stock--low">${icon.fogo({ size: 12 })} Últimas ${p.estoque} unidades</p>`;
  return '';
}

/**
 * Cartao em grade.
 * @param {object} p produto
 * @param {object} [opts] { compacto:boolean }
 */
export function cardProduto(p, opts = {}) {
  const pr = precoVigente(p);
  const par = parcelas(pr.preco);
  const fav = ehFavorito(p.id);
  const freteGratis = pr.preco >= FRETE_GRATIS_ACIMA;
  const semEstoque = p.estoque === 0;

  return `
  <article class="pcard ${semEstoque ? 'is-out' : ''} ${opts.compacto ? 'pcard--compacto' : ''}" data-produto="${p.id}">
    <a class="pcard__media" href="#/produto/${p.id}" aria-label="${escapeHtml(p.nome)}">
      ${selos(p, pr)}
      <div class="pcard__art">${arteProduto(p, { sizes: '(max-width: 700px) 45vw, 280px' })}</div>
    </a>

    <button type="button" class="pcard__fav ${fav ? 'is-on' : ''}" data-fav="${p.id}"
            aria-pressed="${fav}" aria-label="${fav ? 'Remover' : 'Adicionar'} ${escapeHtml(p.nome)} dos favoritos">
      ${icon.coracao({ size: 17, fill: fav })}
    </button>

    <div class="pcard__body">
      <p class="pcard__brand">${escapeHtml(p.marca)}</p>
      <h3 class="pcard__title"><a href="#/produto/${p.id}">${escapeHtml(p.nome)}</a></h3>
      ${blocoAvaliacao(p)}

      <div class="pcard__price">
        ${pr.de && pr.de > pr.preco ? `<span class="pcard__was">${money(pr.de)}</span>` : ''}
        <span class="pcard__now price">${money(pr.preco)}</span>
      </div>

      <p class="pcard__inst">em <strong>${par.n}x ${money(par.valor)}</strong> sem juros</p>
      ${freteGratis ? `<p class="pcard__ship">${icon.caminhao({ size: 13 })} Frete grátis</p>` : ''}
      ${avisoEstoque(p)}
    </div>

    <div class="pcard__action">
      <button type="button" class="btn btn--primary btn--sm btn--block" data-add="${p.id}" ${semEstoque ? 'disabled' : ''}>
        ${semEstoque ? 'Indisponível' : 'Adicionar ao carrinho'}
      </button>
    </div>
  </article>`;
}

/** Linha em lista — mais informacao por item, como na busca do marketplace */
export function linhaProduto(p) {
  const pr = precoVigente(p);
  const par = parcelas(pr.preco);
  const fav = ehFavorito(p.id);
  const freteGratis = pr.preco >= FRETE_GRATIS_ACIMA;
  const semEstoque = p.estoque === 0;
  const off = pr.de && pr.de > pr.preco ? Math.round((1 - pr.preco / pr.de) * 100) : 0;

  return `
  <article class="prow ${semEstoque ? 'is-out' : ''}" data-produto="${p.id}">
    <a class="prow__media" href="#/produto/${p.id}" aria-label="${escapeHtml(p.nome)}">
      ${selos(p, pr)}
      <div class="pcard__art">${arteProduto(p, { sizes: '(max-width: 700px) 30vw, 200px' })}</div>
    </a>

    <div class="prow__body">
      <p class="pcard__brand">${escapeHtml(p.marca)}</p>
      <h3 class="prow__title"><a href="#/produto/${p.id}">${escapeHtml(p.nome)}</a></h3>
      ${blocoAvaliacao(p)}
      <p class="prow__resumo">${escapeHtml(p.resumo)}</p>
      <ul class="prow__specs">
        ${(p.specs || []).slice(0, 3).map(([k, v]) =>
          `<li><span class="dim">${escapeHtml(k)}:</span> ${escapeHtml(v)}</li>`).join('')}
      </ul>
    </div>

    <div class="prow__buy">
      <button type="button" class="prow__fav ${fav ? 'is-on' : ''}" data-fav="${p.id}"
              aria-pressed="${fav}" aria-label="${fav ? 'Remover dos' : 'Adicionar aos'} favoritos">
        ${icon.coracao({ size: 17, fill: fav })}
      </button>
      <div class="prow__price">
        ${pr.de && pr.de > pr.preco ? `<span class="pcard__was">${money(pr.de)}</span>` : ''}
        <span class="pcard__now price">${money(pr.preco)}</span>
        ${off ? `<span class="pcard__off">${off}% OFF</span>` : ''}
      </div>
      <p class="pcard__inst">em <strong>${par.n}x ${money(par.valor)}</strong> sem juros</p>
      ${freteGratis ? `<p class="pcard__ship">${icon.caminhao({ size: 13 })} Frete grátis</p>` : ''}
      ${avisoEstoque(p)}
      <button type="button" class="btn btn--primary btn--sm btn--block" data-add="${p.id}" ${semEstoque ? 'disabled' : ''}>
        ${semEstoque ? 'Indisponível' : 'Adicionar'}
      </button>
      <a class="btn btn--outline btn--sm btn--block" href="#/produto/${p.id}">Ver detalhes</a>
    </div>
  </article>`;
}

/** Item compacto para trilhos horizontais (destaques, relacionados) */
export function miniProduto(p) {
  const pr = precoVigente(p);
  const par = parcelas(pr.preco);
  return `
  <a class="pmini" href="#/produto/${p.id}">
    <div class="pmini__art">${arteProduto(p, { sizes: '180px' })}</div>
    <div class="pmini__body">
      <p class="pmini__title">${escapeHtml(p.nome)}</p>
      ${blocoAvaliacao(p, 11)}
      <p class="pmini__price price">${money(pr.preco)}</p>
      <p class="pcard__inst">${par.n}x ${money(par.valor)}</p>
    </div>
  </a>`;
}
