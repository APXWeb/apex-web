/* ============================================================
   VANTA Admin — Configurações da loja
   ============================================================ */

import { qs, delegate } from '../../utils/dom.js';
import { icon } from '../../components/icons.js';
import { money, num, escapeHtml } from '../../utils/format.js';
import { state, subscribe, salvarConfig, FRETE_GRATIS_ACIMA } from '../../services/store.js';
import { toast, confirmar } from '../../components/ui.js';
import { ir } from '../../router.js';

export function secaoConfig(corpo, acoes) {
  acoes.innerHTML = '';

  function pintar() {
    const totalProdutos = state.produtos.length;
    const publicados = state.produtos.filter(p => p.publicado).length;

    corpo.innerHTML = `
      <div class="chart-grid">
        <section class="panel col-7">
          <header class="panel__head"><h2 class="panel__title">Dados da loja</h2></header>
          <div class="panel__body">
            <form class="form-grid" data-form-loja novalidate>
              <div class="field span-2">
                <label class="field__label" for="cf-nome">Nome da loja</label>
                <input type="text" id="cf-nome" class="input" value="VANTA" readonly>
                <p class="field__hint">Demonstração: o nome da marca é fixo neste projeto.</p>
              </div>
              <div class="field">
                <label class="field__label" for="cf-email">E-mail de contato</label>
                <input type="email" id="cf-email" class="input" value="contato@vanta.com.br">
              </div>
              <div class="field">
                <label class="field__label" for="cf-tel">Telefone</label>
                <input type="tel" id="cf-tel" class="input" value="(11) 4000-0000">
              </div>
              <div class="field">
                <label class="field__label" for="cf-frete">Frete grátis a partir de (R$)</label>
                <input type="number" id="cf-frete" class="input" value="${(FRETE_GRATIS_ACIMA / 100).toFixed(2)}" step="10">
                <p class="field__hint">Regra usada no carrinho e nos cards de produto.</p>
              </div>
              <div class="field">
                <label class="field__label" for="cf-pix">Desconto no PIX (%)</label>
                <input type="number" id="cf-pix" class="input" value="8" min="0" max="30">
              </div>
              <div class="span-2 row" style="justify-content:flex-end;padding-top:8px">
                <button type="submit" class="btn btn--primary">Salvar configurações</button>
              </div>
            </form>
          </div>
        </section>

        <section class="panel col-5">
          <header class="panel__head"><h2 class="panel__title">Resumo do catálogo</h2></header>
          <div class="panel__body">
            <dl class="det-lista">
              <div class="det-linha"><dt>Produtos cadastrados</dt><dd class="tabular">${num(totalProdutos)}</dd></div>
              <div class="det-linha"><dt>Publicados na loja</dt><dd class="tabular">${num(publicados)}</dd></div>
              <div class="det-linha"><dt>Categorias</dt><dd class="tabular">${num(state.categorias.length)}</dd></div>
              <div class="det-linha"><dt>Clientes</dt><dd class="tabular">${num(state.clientes.length)}</dd></div>
              <div class="det-linha"><dt>Pedidos</dt><dd class="tabular">${num(state.pedidos.length)}</dd></div>
              <div class="det-linha"><dt>Avaliações</dt><dd class="tabular">${num(state.avaliacoes.length)}</dd></div>
              <div class="det-linha"><dt>Promoções</dt><dd class="tabular">${num(state.promocoes.length)}</dd></div>
              <div class="det-linha"><dt>Cupons</dt><dd class="tabular">${num(state.cupons.length)}</dd></div>
            </dl>
          </div>
        </section>

        <section class="panel col-12">
          <header class="panel__head">
            <div>
              <h2 class="panel__title">Sobre esta demonstração</h2>
              <p class="dim" style="font-size:var(--fs-xs)">Como o projeto funciona por baixo</p>
            </div>
          </header>
          <div class="panel__body stack">
            <p class="muted" style="font-size:var(--fs-base);max-width:76ch;line-height:var(--lh-relaxed)">
              A VANTA é uma loja fictícia criada pela APX Web para demonstrar um sistema completo
              de marketplace. Tudo roda no navegador: não há servidor, banco de dados nem cobrança real.
              As alterações que você faz aqui (cadastrar produto, mudar estoque, criar promoção,
              alterar status de pedido) são gravadas no armazenamento local e valem de verdade
              na vitrine, inclusive depois de recarregar a página.
            </p>

            <div class="trust" style="border-bottom:0">
              ${[
                ['caixa', `${num(totalProdutos)} produtos`, 'Catálogo com dados completos'],
                ['pessoas', `${num(state.clientes.length)} clientes`, 'Base fictícia com histórico'],
                ['grafico', '365 dias de série', 'Métricas para o dashboard'],
                ['escudo', 'Sem backend', 'Tudo client-side, zero dependência'],
              ].map(([ic, t, d]) => `
                <div class="trust__item">
                  <span class="trust__icon">${icon[ic]({ size: 19 })}</span>
                  <div><p class="trust__t">${t}</p><p class="trust__d">${d}</p></div>
                </div>`).join('')}
            </div>

            <hr class="rule">

            <div class="row row--between" style="flex-wrap:wrap;gap:16px">
              <div>
                <p style="font-size:var(--fs-base);font-weight:600">Restaurar dados originais</p>
                <p class="dim" style="font-size:var(--fs-sm)">
                  Desfaz todas as alterações e volta ao catálogo inicial.
                </p>
              </div>
              <button type="button" class="btn btn--danger" data-resetar>
                ${icon.retorno({ size: 16 })} Restaurar tudo
              </button>
            </div>
          </div>
        </section>
      </div>`;
  }

  delegate(corpo, 'submit', '[data-form-loja]', (e) => {
    e.preventDefault();
    toast({
      titulo: 'Configurações salvas',
      msg: 'As preferências da loja foram atualizadas.',
      tipo: 'success',
    });
  });

  delegate(corpo, 'click', '[data-resetar]', async () => {
    const ok = await confirmar({
      titulo: 'Restaurar dados originais',
      msg: 'Todos os produtos criados, alterações de estoque, promoções e pedidos desta sessão serão perdidos.',
      confirmarLabel: 'Restaurar tudo',
    });
    if (!ok) return;
    const { resetarTudo } = await import('../../services/store.js');
    resetarTudo();
    toast({ titulo: 'Dados restaurados', msg: 'A loja voltou ao estado inicial.', tipo: 'success' });
    ir('/admin/overview');
  });

  const desassinar = subscribe((ev) => { if (ev === 'reset') pintar(); });
  pintar();
  return () => desassinar();
}
