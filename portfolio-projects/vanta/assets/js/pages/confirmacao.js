/* ============================================================
   VANTA — Pedido confirmado (com linha do tempo)
   ============================================================ */

import { qs, delegate } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { arteProduto } from '../components/media.js';
import { money, escapeHtml, num, dataLonga, dataMedia, somaDias } from '../utils/format.js';
import { acharPedido, ORDER_STATUS } from '../services/store.js';
import { toast, vazio } from '../components/ui.js';

const ETAPAS_TL = [
  ['confirmado', 'Pedido confirmado', 'Recebemos seu pedido e o pagamento está aprovado.', 'checkCirculo'],
  ['preparando', 'Em preparação', 'Separando os itens no centro de distribuição.', 'caixa'],
  ['enviado', 'A caminho', 'Objeto despachado, com código de rastreio enviado por e-mail.', 'caminhao'],
  ['entregue', 'Entregue', 'Pedido entregue no endereço informado.', 'local'],
];

export function paginaConfirmacao(root, id) {
  const pedido = acharPedido(id);

  if (!pedido) {
    root.innerHTML = `
      <div class="shell section">
        ${vazio({
          icone: 'vazio',
          titulo: 'Pedido não encontrado',
          texto: 'Confira o número do pedido ou veja a lista na sua conta.',
          acao: `<a href="#/conta/pedidos" class="btn btn--primary">Meus pedidos</a>`,
        })}
      </div>`;
    return () => {};
  }

  const passoAtual = ORDER_STATUS[pedido.status]?.passo ?? 1;
  const cancelado = pedido.status === 'cancelado';

  root.innerHTML = `
    <div class="shell">
      <div class="pedido-hero">
        <span class="pedido-hero__check">${icon.checkCirculo({ size: 36 })}</span>
        <h1 style="font-size:var(--fs-3xl)">Pedido confirmado</h1>
        <p class="lede" style="text-align:center">
          Obrigado, ${escapeHtml(pedido.cliente.split(' ')[0])}. Enviamos a confirmação para
          <strong style="color:var(--text-primary)">${escapeHtml(pedido.email)}</strong>.
        </p>
        <p class="pedido-num">${escapeHtml(pedido.id)}</p>
        <div class="row" style="gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px">
          <button type="button" class="btn btn--secondary btn--sm" data-copiar="${escapeHtml(pedido.id)}">
            ${icon.copiar({ size: 15 })} Copiar número
          </button>
          <a href="#/conta/pedidos" class="btn btn--ghost btn--sm">Ver meus pedidos</a>
        </div>
      </div>

      <div class="det-grid" style="padding-bottom:80px">
        <div class="stack stack--lg">
          <!-- Linha do tempo -->
          <section class="panel">
            <header class="panel__head">
              <h2 class="panel__title">Acompanhe seu pedido</h2>
              <span class="badge badge--${ORDER_STATUS[pedido.status]?.tone || 'neutral'}">
                <span class="badge__dot"></span> ${ORDER_STATUS[pedido.status]?.label || pedido.status}
              </span>
            </header>
            <div class="panel__body">
              ${cancelado ? `
                <p class="muted">Este pedido foi cancelado. Se você não solicitou o cancelamento, fale com o suporte.</p>
              ` : `
                <div class="timeline">
                  ${ETAPAS_TL.map(([chave, titulo, desc, ic], i) => {
                    const passoEtapa = ORDER_STATUS[chave].passo;
                    const feito = passoAtual > passoEtapa;
                    const atual = passoAtual === passoEtapa;
                    return `
                      <div class="tl-item ${feito ? 'is-done' : atual ? 'is-atual' : ''}">
                        <span class="tl-dot">${icon[ic]({ size: 17 })}</span>
                        <div>
                          <p class="tl-t">${titulo}</p>
                          <p class="tl-d">${desc}</p>
                          ${feito || atual ? `<p class="tl-d" style="color:var(--text-secondary);margin-top:4px">
                            ${dataMedia(somaDias(pedido.data, i))}</p>` : ''}
                        </div>
                      </div>`;
                  }).join('')}
                </div>

                <div class="buybox__entrega" style="margin-top:24px">
                  <div class="buybox__linha">
                    ${icon.caminhao({ size: 17 })}
                    <span>Previsão de entrega: <strong>${dataLonga(pedido.entregaPrevista)}</strong></span>
                  </div>
                  <div class="buybox__linha">
                    ${icon.local({ size: 17 })}
                    <span>${escapeHtml(pedido.endereco)}</span>
                  </div>
                </div>
              `}
            </div>
          </section>

          <!-- Itens -->
          <section class="panel">
            <header class="panel__head">
              <h2 class="panel__title">Itens do pedido</h2>
              <span class="dim" style="font-size:var(--fs-sm)">
                ${num(pedido.itens.reduce((s, i) => s + i.qtd, 0))} itens
              </span>
            </header>
            <div class="panel__body">
              <ul class="cart-list">
                ${pedido.itens.map(i => `
                  <li class="cart-item">
                    <a class="cart-item__art" href="#/produto/${i.produtoId}">
                      ${arteProduto(i, { mini: true })}
                    </a>
                    <div class="cart-item__body">
                      <a href="#/produto/${i.produtoId}" class="cart-item__name">${escapeHtml(i.nome)}</a>
                      <p class="cart-item__meta">Quantidade: ${i.qtd}</p>
                    </div>
                    <span class="cart-item__price price">${money(i.preco * i.qtd)}</span>
                  </li>`).join('')}
              </ul>
            </div>
          </section>
        </div>

        <!-- Resumo -->
        <aside class="resumo-card">
          <h2 style="font-size:var(--fs-lg)">Resumo</h2>
          <dl class="det-lista">
            <div class="det-linha"><dt>Data</dt><dd>${dataLonga(pedido.data)}</dd></div>
            <div class="det-linha"><dt>Pagamento</dt><dd>${escapeHtml(pedido.pagamento)}</dd></div>
            <div class="det-linha"><dt>Pedido</dt><dd class="tabular">${escapeHtml(pedido.id)}</dd></div>
          </dl>

          <hr class="rule">

          <dl class="tot">
            <div class="tot__row"><dt>Subtotal</dt><dd class="price">${money(pedido.subtotal)}</dd></div>
            ${pedido.desconto ? `<div class="tot__row tot__row--ok"><dt>Desconto</dt><dd class="price">-${money(pedido.desconto)}</dd></div>` : ''}
            <div class="tot__row"><dt>Frete</dt>
              <dd class="price">${pedido.frete === 0 ? '<span class="tot__free">Grátis</span>' : money(pedido.frete)}</dd></div>
            <div class="tot__row tot__row--total"><dt>Total</dt><dd class="price">${money(pedido.total)}</dd></div>
          </dl>

          <a href="#/catalogo" class="btn btn--primary btn--block">Continuar comprando</a>
          <a href="#/conta/pedidos" class="btn btn--ghost btn--block">Ver todos os pedidos</a>
        </aside>
      </div>
    </div>`;

  delegate(root, 'click', '[data-copiar]', async (e, b) => {
    const texto = b.dataset.copiar;
    try {
      await navigator.clipboard.writeText(texto);
      toast({ titulo: 'Número copiado', msg: texto, tipo: 'success', duracao: 2400 });
    } catch {
      // Sem permissao de area de transferencia: mostra o valor para copiar a mao
      toast({ titulo: 'Copie o número', msg: texto, tipo: 'info' });
    }
  });

  return () => {};
}
