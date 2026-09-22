/* ============================================================
   VANTA — Carrinho lateral
   ============================================================ */

import { qs, delegate, el } from '../utils/dom.js';
import { icon } from './icons.js';
import { money, escapeHtml } from '../utils/format.js';
import { arteProduto } from './media.js';
import {
  totais, alterarQtd, removerDoCarrinho, restaurarNoCarrinho, subscribe, FRETE_GRATIS_ACIMA,
} from '../services/store.js';
import { drawer, toast, vazio } from './ui.js';

let aberto = null;

export function abrirCarrinho() {
  if (aberto) return;

  const d = drawer({
    titulo: 'Seu carrinho',
    conteudo: '<div data-carrinho-corpo></div>',
    rodape: '<div data-carrinho-rodape></div>',
    aoFechar: () => { desassinar(); aberto = null; },
  });

  aberto = d;
  const corpo = qs('[data-carrinho-corpo]', d.node);
  const rodape = qs('[data-carrinho-rodape]', d.node);

  function pintar() {
    const t = totais();

    if (!t.itens.length) {
      corpo.innerHTML = vazio({
        icone: 'sacola',
        titulo: 'Seu carrinho está vazio',
        texto: 'Explore o catálogo e adicione o que fizer sentido para o seu setup.',
        acao: `<a href="#/catalogo" class="btn btn--primary" data-fechar>Ver produtos</a>`,
      });
      rodape.innerHTML = '';
      return;
    }

    const falta = t.faltaParaFreteGratis;
    const progresso = Math.min(100, (t.subtotal / FRETE_GRATIS_ACIMA) * 100);

    corpo.innerHTML = `
      <div class="frete-meta">
        ${falta > 0
          ? `<p class="frete-meta__txt">Faltam <strong>${money(falta)}</strong> para o frete grátis</p>`
          : `<p class="frete-meta__txt frete-meta__txt--ok">${icon.checkCirculo({ size: 15 })} Você ganhou frete grátis</p>`}
        <div class="progress"><div class="progress__bar" style="width:${progresso}%"></div></div>
      </div>

      <ul class="cart-list">
        ${t.itens.map(i => `
          <li class="cart-item" data-linha="${i.produtoId}|${i.cor}">
            <a class="cart-item__art" href="#/produto/${i.produto.id}" data-fechar>
              ${arteProduto(i.produto, { cor: i.cor, mini: true })}
            </a>
            <div class="cart-item__body">
              <p class="cart-item__name">${escapeHtml(i.produto.nome)}</p>
              <p class="cart-item__meta">${escapeHtml(i.produto.marca)}</p>
              <div class="cart-item__row">
                <div class="qty">
                  <button type="button" class="qty__btn" data-menos aria-label="Diminuir quantidade">${icon.menos({ size: 15 })}</button>
                  <span class="qty__n tabular" aria-live="polite">${i.qtd}</span>
                  <button type="button" class="qty__btn" data-mais aria-label="Aumentar quantidade">${icon.mais({ size: 15 })}</button>
                </div>
                <span class="cart-item__price price">${money(i.subtotal)}</span>
              </div>
            </div>
            <button type="button" class="btn-icon btn-icon--sm cart-item__del" data-remover
                    aria-label="Remover ${escapeHtml(i.produto.nome)}">${icon.lixeira({ size: 16 })}</button>
          </li>`).join('')}
      </ul>`;

    rodape.innerHTML = `
      <dl class="tot">
        <div class="tot__row"><dt>Subtotal</dt><dd class="price">${money(t.subtotal)}</dd></div>
        ${t.descontoCupom ? `<div class="tot__row tot__row--ok"><dt>Cupom ${escapeHtml(t.cupom.codigo)}</dt><dd class="price">-${money(t.descontoCupom)}</dd></div>` : ''}
        <div class="tot__row"><dt>Frete</dt><dd class="price">${t.frete === 0 ? '<span class="tot__free">Grátis</span>' : money(t.frete)}</dd></div>
        <div class="tot__row tot__row--total"><dt>Total</dt><dd class="price">${money(t.total)}</dd></div>
      </dl>
      <a href="#/checkout" class="btn btn--primary btn--block btn--lg" data-fechar>Finalizar compra</a>
      <a href="#/carrinho" class="btn btn--ghost btn--block" data-fechar style="margin-top:8px">Ver carrinho completo</a>`;
  }

  delegate(d.node, 'click', '[data-menos],[data-mais],[data-remover]', (e, botao) => {
    const linha = botao.closest('[data-linha]');
    if (!linha) return;
    const [produtoId, cor] = linha.dataset.linha.split('|');
    const t = totais();
    const item = t.itens.find(i => i.produtoId === produtoId && String(i.cor) === cor);
    if (!item) return;

    if (botao.hasAttribute('data-remover')) {
      const r = removerDoCarrinho(produtoId, item.cor);
      if (r.ok) {
        toast({
          titulo: 'Item removido',
          msg: item.produto.nome,
          tipo: 'info',
          acao: { label: 'Desfazer', onClick: () => restaurarNoCarrinho(r.removido) },
        });
      }
      return;
    }

    const delta = botao.hasAttribute('data-mais') ? 1 : -1;
    const r = alterarQtd(produtoId, item.cor, item.qtd + delta);
    if (!r.ok && r.motivo) toast({ titulo: 'Quantidade máxima', msg: r.motivo, tipo: 'info' });
  });

  const desassinar = subscribe(pintar);
  pintar();
}
