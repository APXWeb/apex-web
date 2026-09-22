/* ============================================================
   VANTA — Midia de produto
   O catalogo usa fotografia real. Produtos criados dentro do
   admin nao tem foto, entao caem na ilustracao vetorial. Este
   modulo e a unica porta de entrada para "a imagem do produto",
   para que nenhuma tela precise saber qual dos dois e o caso.
   ============================================================ */

import { productArt, FINISHES } from '../data/artwork.js';
import { PRODUCT_BY_ID } from '../data/catalog.js';
import { escapeHtml } from '../utils/format.js';

const DIR = 'assets/img/produtos/';

const NOME_FINISH = {
  graphite: 'Grafite', midnight: 'Meia-noite', silver: 'Prata', sand: 'Areia',
  volt: 'Volt', iris: 'Íris', cyan: 'Ciano', rose: 'Rosé', ivory: 'Marfim', forest: 'Floresta',
};

/* Aceita o produto inteiro, um item de carrinho ou um item de pedido
   (que guarda so o produtoId) e devolve sempre o produto de verdade. */
export function produtoDe(x) {
  if (!x) return null;
  if (x.fotos || x.specs) return x;
  return PRODUCT_BY_ID[x.produtoId] || PRODUCT_BY_ID[x.id] || x;
}

/* Normaliza as cores: no catalogo com foto cada cor e um objeto com
   suas proprias imagens; no fallback vetorial e so o nome do acabamento. */
export function coresDe(p) {
  const cores = p?.cores;
  if (!Array.isArray(cores) || !cores.length) return [];
  if (typeof cores[0] === 'object') return cores;
  return cores.map(f => ({
    id: f,
    nome: NOME_FINISH[f] || f,
    hex: FINISHES[f]?.body,
    finish: f,
  }));
}

export function nomeCor(p, corId) {
  const c = coresDe(p).find(c => c.id === corId);
  return c ? c.nome : (NOME_FINISH[corId] || corId || '');
}

/* Lista de "slides" da galeria: fotos da cor escolhida, fotos do
   produto, ou um slide por acabamento quando nao ha fotografia. */
export function galeriaDe(p, corId) {
  const cores = coresDe(p);
  const cor = cores.find(c => c.id === corId);

  if (p?.fotos?.length || cor?.fotos?.length) {
    const fotos = cor?.fotos?.length ? cor.fotos : p.fotos;
    return fotos.map(slug => ({ foto: slug }));
  }

  const base = cores.length ? cores : [{ id: p?.finish || 'graphite' }];
  return base.map(c => ({ finish: c.finish || c.id }));
}

export function fotoTag(slug, alt, { mini = false, eager = false, sizes } = {}) {
  const g = `${DIR}${slug}.webp`;
  const s = `${DIR}${slug}-sm.webp`;
  const responsivo = mini
    ? `src="${s}"`
    : `src="${g}" srcset="${s} 360w, ${g} 900w" sizes="${sizes || '(max-width: 760px) 45vw, 320px'}"`;
  const lado = mini ? 360 : 900;
  return `<img class="pfoto" ${responsivo} alt="${escapeHtml(alt || '')}"
    loading="${eager ? 'eager' : 'lazy'}" decoding="async" width="${lado}" height="${lado}">`;
}

export function arteDeSlide(slide, p, opts = {}) {
  if (slide?.foto) return fotoTag(slide.foto, opts.alt || p?.nome, opts);
  return productArt(p?.art || 'headphones', slide?.finish || p?.finish || 'graphite');
}

/**
 * Imagem de um produto em qualquer tela.
 * @param {object} x      produto, item de carrinho ou item de pedido
 * @param {object} [opts] { cor, indice, mini, eager, sizes, alt }
 */
export function arteProduto(x, opts = {}) {
  const p = produtoDe(x);
  if (!p) return productArt('headphones', 'graphite');
  const cor = opts.cor !== undefined ? opts.cor : x?.cor;
  const slides = galeriaDe(p, cor);
  const slide = slides[opts.indice || 0] || slides[0];
  return arteDeSlide(slide, p, opts);
}

/** Capa (primeira imagem) em tamanho reduzido, para listas densas. */
export function miniArte(x, opts = {}) {
  return arteProduto(x, { ...opts, mini: true });
}
