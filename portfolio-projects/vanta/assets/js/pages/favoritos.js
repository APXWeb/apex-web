/* VANTA — Favoritos */

import { qs, observarAnimacoes } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { cardProduto, miniProduto } from '../components/productCard.js';
import { num } from '../utils/format.js';
import { produtosFavoritos, subscribe, maisVendidos } from '../services/store.js';
import { vazio } from '../components/ui.js';

export function paginaFavoritos(root) {
  root.innerHTML = `
    <div class="shell">
      <nav class="crumbs" aria-label="Você está em">
        <a href="#/">Início</a>
        <span class="crumbs__sep">${icon.chevronR({ size: 13 })}</span>
        <span aria-current="page">Favoritos</span>
      </nav>
      <div data-conteudo></div>
    </div>`;

  const alvo = qs('[data-conteudo]', root);

  function pintar() {
    const lista = produtosFavoritos();

    if (!lista.length) {
      alvo.innerHTML = `
        ${vazio({
          icone: 'coracao',
          titulo: 'Nenhum favorito ainda',
          texto: 'Toque no coração dos produtos que te interessarem para guardá-los aqui.',
          acao: `<a href="#/catalogo" class="btn btn--primary btn--lg">Explorar catálogo</a>`,
        })}
        <section class="section section--tight">
          <header class="section-head">
            <div>
              <span class="eyebrow eyebrow--accent">Para começar</span>
              <h2 class="section-head__title">Os mais vendidos</h2>
            </div>
          </header>
          <div class="rail">${maisVendidos(6).map(miniProduto).join('')}</div>
        </section>`;
      return;
    }

    alvo.innerHTML = `
      <h1 style="font-size:var(--fs-2xl);margin-bottom:8px">Favoritos</h1>
      <p class="muted" style="margin-bottom:32px">
        ${num(lista.length)} ${lista.length === 1 ? 'produto salvo' : 'produtos salvos'}
      </p>
      <div class="grid-produtos" style="padding-bottom:80px">
        ${lista.map((p, i) => `<div data-anim="${i}">${cardProduto(p)}</div>`).join('')}
      </div>`;

    observarAnimacoes(alvo);
  }

  const desassinar = subscribe((evento) => {
    if (evento === 'favoritos') pintar();
  });

  pintar();
  return () => desassinar();
}
