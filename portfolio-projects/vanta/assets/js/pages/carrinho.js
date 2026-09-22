/* ============================================================
   VANTA — Carrinho (pagina completa)
   ============================================================ */

import { qs, delegate, observarAnimacoes } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { arteProduto } from '../components/media.js';
import { money, escapeHtml, num } from '../utils/format.js';
import { miniProduto } from '../components/productCard.js';
import {
  totais, alterarQtd, removerDoCarrinho, restaurarNoCarrinho, aplicarCupom, removerCupom,
  subscribe, state, maisVendidos, FRETE_GRATIS_ACIMA,
} from '../services/store.js';
import { toast, vazio } from '../components/ui.js';

export function paginaCarrinho(root) {
  root.innerHTML = `
    <div class="shell">
      <nav class="crumbs" aria-label="Você está em">
        <a href="#/">Início</a>
        <span class="crumbs__sep">${icon.chevronR({ size: 13 })}</span>
        <span aria-current="page">Carrinho</span>
      </nav>
      <div data-conteudo></div>
    </div>`;

  const alvo = qs('[data-conteudo]', root);

  function pintar() {
    const t = totais();

    if (!t.itens.length) {
      alvo.innerHTML = `
        ${vazio({
          icone: 'sacola',
          titulo: 'Seu carrinho está vazio',
          texto: 'Quando encontrar algo que goste, adicione aqui para finalizar a compra.',
          acao: `<a href="#/catalogo" class="btn btn--primary btn--lg">Explorar catálogo</a>`,
        })}
        <section class="section section--tight">
          <header class="section-head">
            <div>
              <span class="eyebrow eyebrow--accent">Sugestões</span>
              <h2 class="section-head__title">Os mais vendidos da loja</h2>
            </div>
          </header>
          <div class="rail">${maisVendidos(6).map(miniProduto).join('')}</div>
        </section>`;
      return;
    }

    const progresso = Math.min(100, (t.subtotal / FRETE_GRATIS_ACIMA) * 100);

    alvo.innerHTML = `
      <h1 style="font-size:var(--fs-2xl);margin-bottom:8px">Carrinho</h1>
      <p class="muted" style="margin-bottom:28px">
        ${num(t.qtd)} ${t.qtd === 1 ? 'item' : 'itens'} no total
      </p>

      <div class="cart-layout">
        <div>
          <div class="frete-meta">
            ${t.faltaParaFreteGratis > 0
              ? `<p class="frete-meta__txt">Faltam <strong>${money(t.faltaParaFreteGratis)}</strong> para o frete grátis</p>`
              : `<p class="frete-meta__txt frete-meta__txt--ok">${icon.checkCirculo({ size: 15 })} Você ganhou frete grátis nesta compra</p>`}
            <div class="progress"><div class="progress__bar" style="width:${progresso}%"></div></div>
          </div>

          <ul class="cart-list">
            ${t.itens.map(i => `
              <li class="cart-item" data-linha="${i.produtoId}|${i.cor}">
                <a class="cart-item__art" href="#/produto/${i.produto.id}">
                  ${arteProduto(i.produto, { cor: i.cor, mini: true })}
                </a>
                <div class="cart-item__body">
                  <a href="#/produto/${i.produto.id}" class="cart-item__name">${escapeHtml(i.produto.nome)}</a>
                  <p class="cart-item__meta">
                    ${escapeHtml(i.produto.marca)}
                    ${i.precoDe ? ` · <span style="color:var(--accent)">${Math.round((1 - i.preco / i.precoDe) * 100)}% OFF</span>` : ''}
                  </p>
                  <div class="cart-item__row">
                    <div class="qty">
                      <button type="button" class="qty__btn" data-menos aria-label="Diminuir quantidade">${icon.menos({ size: 15 })}</button>
                      <span class="qty__n tabular" aria-live="polite">${i.qtd}</span>
                      <button type="button" class="qty__btn" data-mais aria-label="Aumentar quantidade">${icon.mais({ size: 15 })}</button>
                    </div>
                    <span>
                      ${i.qtd > 1 ? `<span class="dim" style="font-size:var(--fs-xs)">${money(i.preco)} cada · </span>` : ''}
                      <span class="cart-item__price price">${money(i.subtotal)}</span>
                    </span>
                  </div>
                </div>
                <button type="button" class="btn-icon btn-icon--sm cart-item__del" data-remover
                        aria-label="Remover ${escapeHtml(i.produto.nome)}">${icon.lixeira({ size: 16 })}</button>
              </li>`).join('')}
          </ul>

          <div class="row row--between" style="padding-top:24px;flex-wrap:wrap;gap:12px">
            <a href="#/catalogo" class="btn btn--ghost">${icon.chevronL({ size: 16 })} Continuar comprando</a>
          </div>
        </div>

        <aside class="resumo-card" aria-label="Resumo do pedido">
          <h2 style="font-size:var(--fs-lg)">Resumo</h2>

          ${t.cupom ? `
            <div class="cupom-aplicado">
              <span>${icon.etiqueta({ size: 15 })} <strong>${escapeHtml(t.cupom.codigo)}</strong> — ${escapeHtml(t.cupom.desc)}</span>
              <button type="button" class="btn-icon btn-icon--sm" data-tirar-cupom aria-label="Remover cupom">
                ${icon.fechar({ size: 14 })}
              </button>
            </div>` : `
            <form class="cupom-form" data-cupom novalidate>
              <label class="sr-only" for="cupom">Código do cupom</label>
              <input type="text" id="cupom" class="input" placeholder="Cupom de desconto" autocomplete="off">
              <button type="submit" class="btn btn--secondary">Aplicar</button>
            </form>
            <p class="dim" style="font-size:var(--fs-xs);margin-top:-8px">
              Experimente <strong style="color:var(--accent)">VANTA10</strong> ou <strong style="color:var(--accent)">PRIMEIRA</strong>
            </p>`}

          <hr class="rule">

          <dl class="tot">
            <div class="tot__row"><dt>Subtotal</dt><dd class="price">${money(t.subtotal)}</dd></div>
            ${t.economiaPromo ? `<div class="tot__row tot__row--ok"><dt>Descontos do catálogo</dt><dd class="price">-${money(t.economiaPromo)}</dd></div>` : ''}
            ${t.descontoCupom ? `<div class="tot__row tot__row--ok"><dt>Cupom ${escapeHtml(t.cupom.codigo)}</dt><dd class="price">-${money(t.descontoCupom)}</dd></div>` : ''}
            <div class="tot__row"><dt>Frete</dt><dd class="price">${t.frete === 0 ? '<span class="tot__free">Grátis</span>' : money(t.frete)}</dd></div>
            <div class="tot__row tot__row--total"><dt>Total</dt><dd class="price">${money(t.total)}</dd></div>
          </dl>

          <p class="dim" style="font-size:var(--fs-sm);text-align:center">
            ou <strong style="color:var(--text-primary)">${money(Math.round(t.total * 0.92))}</strong> à vista no PIX
          </p>

          <a href="#/checkout" class="btn btn--primary btn--lg btn--block">Finalizar compra</a>

          <div class="stack stack--sm" style="font-size:var(--fs-xs);color:var(--text-tertiary)">
            <span class="row" style="gap:8px">${icon.escudo({ size: 14 })} Compra protegida e dados criptografados</span>
            <span class="row" style="gap:8px">${icon.retorno({ size: 14 })} 30 dias para devolver sem custo</span>
          </div>
        </aside>
      </div>

      <section class="section section--tight">
        <header class="section-head">
          <div>
            <span class="eyebrow eyebrow--accent">Combina com o seu carrinho</span>
            <h2 class="section-head__title">Você também pode gostar</h2>
          </div>
        </header>
        <div class="rail">${maisVendidos(6).map(miniProduto).join('')}</div>
      </section>`;

    observarAnimacoes(alvo);
  }

  /* ---------- Acoes ---------- */
  delegate(root, 'click', '[data-menos],[data-mais],[data-remover]', (e, botao) => {
    const linha = botao.closest('[data-linha]');
    if (!linha) return;
    const [produtoId, cor] = linha.dataset.linha.split('|');
    const item = totais().itens.find(i => i.produtoId === produtoId && String(i.cor) === cor);
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
    if (!r.ok && r.motivo) toast({ titulo: 'Estoque insuficiente', msg: r.motivo, tipo: 'info' });
  });

  delegate(root, 'submit', '[data-cupom]', (e) => {
    e.preventDefault();
    const campo = qs('#cupom', root);
    const r = aplicarCupom(campo.value);
    if (!r.ok) {
      campo.setAttribute('aria-invalid', 'true');
      toast({ titulo: 'Cupom não aplicado', msg: r.motivo, tipo: 'danger' });
      return;
    }
    toast({ titulo: 'Cupom aplicado', msg: r.cupom.desc, tipo: 'success' });
  });

  delegate(root, 'click', '[data-tirar-cupom]', () => {
    removerCupom();
    toast({ titulo: 'Cupom removido', tipo: 'info', duracao: 2400 });
  });

  const desassinar = subscribe(pintar);
  pintar();

  return () => desassinar();
}
