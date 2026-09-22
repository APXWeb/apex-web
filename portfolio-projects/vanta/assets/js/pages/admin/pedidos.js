/* ============================================================
   VANTA Admin — Pedidos
   ============================================================ */

import { qs, qsa, delegate, debounce } from '../../utils/dom.js';
import { icon } from '../../components/icons.js';
import { arteProduto } from '../../components/media.js';
import { money, num, escapeHtml, norm, dataCurta, dataLonga, haQuantoTempo, somaDias } from '../../utils/format.js';
import { state, mudarStatusPedido, subscribe, acharPedido, ORDER_STATUS } from '../../services/store.js';
import { toast, modal, vazio } from '../../components/ui.js';

export function secaoPedidos(corpo, acoes) {
  const f = { q: '', status: '', ord: 'data', dir: -1 };

  function pintarAcoes() {
    const cont = {};
    Object.keys(ORDER_STATUS).forEach(k => {
      cont[k] = state.pedidos.filter(p => p.status === k).length;
    });
    acoes.innerHTML = `
      <div class="segmented" role="group" aria-label="Filtrar por status">
        <button type="button" data-st="" aria-pressed="${f.status === ''}">Todos (${num(state.pedidos.length)})</button>
        ${Object.entries(ORDER_STATUS).filter(([k]) => k !== 'cancelado').map(([k, v]) =>
          `<button type="button" data-st="${k}" aria-pressed="${f.status === k}">${v.label} (${cont[k]})</button>`).join('')}
      </div>`;
  }

  function filtrados() {
    let l = [...state.pedidos];
    if (f.q) l = l.filter(p => norm(`${p.id} ${p.cliente} ${p.email}`).includes(norm(f.q)));
    if (f.status) l = l.filter(p => p.status === f.status);
    return l.sort((a, b) => {
      const va = a[f.ord], vb = b[f.ord];
      if (typeof va === 'string') return va.localeCompare(vb) * f.dir;
      return (va - vb) * f.dir;
    });
  }

  function pintar() {
    const lista = filtrados();
    const receita = lista.filter(p => p.status !== 'cancelado').reduce((s, p) => s + p.total, 0);

    corpo.innerHTML = `
      <div class="panel">
        <div class="admin-tabela-topo">
          <div class="input-group search-mini">
            <span class="input-group__icon">${icon.busca({ size: 16 })}</span>
            <input type="search" class="input" placeholder="Buscar por número, cliente ou e-mail"
                   value="${escapeHtml(f.q)}" data-busca style="min-height:40px">
          </div>
          <span class="dim" style="font-size:var(--fs-sm);margin-left:auto">
            ${num(lista.length)} pedidos · ${money(receita)}
          </span>
        </div>

        <div class="panel__body panel__body--flush tabela-cards">
          ${lista.length ? `
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th data-ord="id" aria-sort="${f.ord === 'id' ? (f.dir === 1 ? 'ascending' : 'descending') : 'none'}">
                      Pedido<span class="sort-ind">↕</span></th>
                    <th>Cliente</th>
                    <th>Itens</th>
                    <th class="num" data-ord="total" aria-sort="${f.ord === 'total' ? (f.dir === 1 ? 'ascending' : 'descending') : 'none'}">
                      Valor<span class="sort-ind">↕</span></th>
                    <th>Pagamento</th>
                    <th data-ord="data" aria-sort="${f.ord === 'data' ? (f.dir === 1 ? 'ascending' : 'descending') : 'none'}">
                      Data<span class="sort-ind">↕</span></th>
                    <th style="width:150px">Status</th>
                    <th style="text-align:right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${lista.slice(0, 60).map(p => `
                    <tr data-id="${p.id}">
                      <td class="cel-destaque cell-strong tabular" data-rotulo="Pedido">${escapeHtml(p.id)}</td>
                      <td data-rotulo="Cliente">
                        <span class="cell-strong" style="display:block">${escapeHtml(p.cliente)}</span>
                        <span class="dim" style="font-size:var(--fs-xs)">${escapeHtml(p.email)}</span>
                      </td>
                      <td data-rotulo="Itens">
                        <div class="row" style="gap:4px">
                          ${p.itens.slice(0, 3).map(i =>
                            `<span class="prod-cel__art" style="width:30px;height:30px">${arteProduto(i, { mini: true })}</span>`).join('')}
                          ${p.itens.length > 3 ? `<span class="dim" style="font-size:var(--fs-xs)">+${p.itens.length - 3}</span>` : ''}
                        </div>
                      </td>
                      <td class="num cell-strong" data-rotulo="Valor">${money(p.total)}</td>
                      <td data-rotulo="Pagamento">${escapeHtml(p.pagamento)}</td>
                      <td class="dim" data-rotulo="Data">${dataCurta(p.data)}</td>
                      <td data-rotulo="Status">
                        <select class="status-select st-${p.status}" data-status="${p.id}"
                                aria-label="Status do pedido ${escapeHtml(p.id)}">
                          ${Object.entries(ORDER_STATUS).map(([k, v]) =>
                            `<option value="${k}" ${p.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}
                        </select>
                      </td>
                      <td data-rotulo="Ações">
                        <div class="acoes-cel">
                          <button type="button" class="btn-icon btn-icon--sm" data-ver="${p.id}"
                                  aria-label="Ver detalhes do pedido ${escapeHtml(p.id)}">
                            ${icon.olho({ size: 16 })}
                          </button>
                        </div>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
            ${lista.length > 60 ? `<p class="dim" style="padding:16px;text-align:center;font-size:var(--fs-sm)">
              Exibindo os 60 pedidos mais recentes de ${num(lista.length)}.</p>` : ''}
          ` : vazio({
            icone: 'caixa',
            titulo: 'Nenhum pedido encontrado',
            texto: 'Ajuste a busca ou o filtro de status.',
          })}
        </div>
      </div>`;
  }

  const buscarDebounced = debounce(pintar, 240);
  delegate(corpo, 'input', '[data-busca]', (e, i) => { f.q = i.value; buscarDebounced(); });

  delegate(acoes, 'click', '[data-st]', (e, b) => {
    f.status = b.dataset.st;
    pintarAcoes();
    pintar();
  });

  delegate(corpo, 'click', 'th[data-ord]', (e, th) => {
    const campo = th.dataset.ord;
    if (f.ord === campo) f.dir *= -1; else { f.ord = campo; f.dir = 1; }
    pintar();
  });

  delegate(corpo, 'change', '[data-status]', (e, sel) => {
    const id = sel.dataset.status;
    const novo = sel.value;
    const r = mudarStatusPedido(id, novo);
    if (!r.ok) return;
    toast({
      titulo: 'Status atualizado',
      msg: `${id}: ${ORDER_STATUS[novo].label}`,
      tipo: 'success',
      duracao: 4200,
      acao: { label: 'Desfazer', onClick: () => mudarStatusPedido(id, r.anterior) },
    });
  });

  delegate(corpo, 'click', '[data-ver]', (e, b) => abrirPedido(b.dataset.ver));

  const desassinar = subscribe((ev) => {
    if (['pedidos', 'reset'].includes(ev)) { pintarAcoes(); pintar(); }
  });

  pintarAcoes();
  pintar();
  return () => desassinar();
}

/* ---------- Detalhe do pedido ---------- */
function abrirPedido(id) {
  const p = acharPedido(id);
  if (!p) return;

  const st = ORDER_STATUS[p.status] || { label: p.status, tone: 'neutral', passo: 0 };
  const etapas = [
    ['confirmado', 'Confirmado', 'checkCirculo'],
    ['preparando', 'Em preparação', 'caixa'],
    ['enviado', 'Enviado', 'caminhao'],
    ['entregue', 'Entregue', 'local'],
  ];

  modal({
    titulo: `Pedido ${p.id}`,
    sub: `${p.cliente} · ${dataLonga(p.data)}`,
    tamanho: 'lg',
    id: 'ped',
    conteudo: `
      <div class="stack stack--lg">
        <div class="row row--between" style="flex-wrap:wrap;gap:12px">
          <span class="badge badge--${st.tone}"><span class="badge__dot"></span> ${st.label}</span>
          <span class="dim" style="font-size:var(--fs-sm)">${haQuantoTempo(p.data)}</span>
        </div>

        ${p.status !== 'cancelado' ? `
          <div class="timeline">
            ${etapas.map(([chave, titulo, ic], i) => {
              const passo = ORDER_STATUS[chave].passo;
              const feito = st.passo > passo;
              const atual = st.passo === passo;
              return `
                <div class="tl-item ${feito ? 'is-done' : atual ? 'is-atual' : ''}">
                  <span class="tl-dot">${icon[ic]({ size: 16 })}</span>
                  <div>
                    <p class="tl-t">${titulo}</p>
                    ${feito || atual ? `<p class="tl-d">${dataCurta(somaDias(p.data, i))}</p>` : '<p class="tl-d">Pendente</p>'}
                  </div>
                </div>`;
            }).join('')}
          </div>` : `
          <p class="badge badge--danger" style="align-self:start">
            <span class="badge__dot"></span> Pedido cancelado
          </p>`}

        <section>
          <h3 style="font-size:var(--fs-base);margin-bottom:12px">Itens</h3>
          <ul class="cart-list">
            ${p.itens.map(i => `
              <li class="cart-item">
                <span class="cart-item__art">${arteProduto(i, { mini: true })}</span>
                <div class="cart-item__body">
                  <p class="cart-item__name">${escapeHtml(i.nome)}</p>
                  <p class="cart-item__meta">${i.qtd} × ${money(i.preco)}</p>
                </div>
                <span class="cart-item__price price">${money(i.preco * i.qtd)}</span>
              </li>`).join('')}
          </ul>
        </section>

        <div class="det-grid">
          <section>
            <h3 style="font-size:var(--fs-base);margin-bottom:12px">Entrega</h3>
            <dl class="det-lista">
              <div class="det-linha"><dt>Endereço</dt><dd>${escapeHtml(p.endereco)}</dd></div>
              <div class="det-linha"><dt>Previsão</dt><dd>${dataLonga(p.entregaPrevista)}</dd></div>
              <div class="det-linha"><dt>E-mail</dt><dd>${escapeHtml(p.email)}</dd></div>
            </dl>
          </section>
          <section>
            <h3 style="font-size:var(--fs-base);margin-bottom:12px">Pagamento</h3>
            <dl class="tot">
              <div class="tot__row"><dt>Subtotal</dt><dd class="price">${money(p.subtotal)}</dd></div>
              ${p.desconto ? `<div class="tot__row tot__row--ok"><dt>Desconto</dt><dd class="price">-${money(p.desconto)}</dd></div>` : ''}
              <div class="tot__row"><dt>Frete</dt><dd class="price">${p.frete === 0 ? '<span class="tot__free">Grátis</span>' : money(p.frete)}</dd></div>
              <div class="tot__row tot__row--total"><dt>Total</dt><dd class="price">${money(p.total)}</dd></div>
            </dl>
            <p class="dim" style="font-size:var(--fs-sm);margin-top:10px">via ${escapeHtml(p.pagamento)}</p>
          </section>
        </div>
      </div>`,
    rodape: `<button type="button" class="btn btn--secondary" data-fechar>Fechar</button>`,
  });
}
