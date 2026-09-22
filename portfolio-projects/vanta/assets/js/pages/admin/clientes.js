/* ============================================================
   VANTA Admin — Clientes e Avaliações
   ============================================================ */

import { qs, delegate, debounce } from '../../utils/dom.js';
import { icon } from '../../components/icons.js';
import { arteProduto } from '../../components/media.js';
import { estrelas } from '../../components/productCard.js';
import {
  money, num, escapeHtml, norm, dataCurta, dataLonga, haQuantoTempo, iniciais,
} from '../../utils/format.js';
import { state, subscribe, acharProduto, ORDER_STATUS } from '../../services/store.js';
import { modal, vazio, toast } from '../../components/ui.js';

/* ============================================================
   CLIENTES
   ============================================================ */
export function secaoClientes(corpo, acoes) {
  const f = { q: '', ord: 'gasto', dir: -1, status: '' };

  acoes.innerHTML = `
    <div class="segmented" role="group" aria-label="Filtrar clientes">
      <button type="button" data-cs="" aria-pressed="true">Todos</button>
      <button type="button" data-cs="ativo" aria-pressed="false">Ativos</button>
      <button type="button" data-cs="inativo" aria-pressed="false">Inativos</button>
    </div>`;

  function filtrados() {
    let l = [...state.clientes];
    if (f.q) l = l.filter(c => norm(`${c.nome} ${c.email} ${c.cidade}`).includes(norm(f.q)));
    if (f.status) l = l.filter(c => c.status === f.status);
    return l.sort((a, b) => {
      const va = a[f.ord], vb = b[f.ord];
      if (typeof va === 'string') return (va || '').localeCompare(vb || '') * f.dir;
      return ((va || 0) - (vb || 0)) * f.dir;
    });
  }

  function pintar() {
    const lista = filtrados();
    const receita = lista.reduce((s, c) => s + c.gasto, 0);
    const ticket = lista.length ? Math.round(receita / Math.max(1, lista.reduce((s, c) => s + c.pedidos, 0))) : 0;

    corpo.innerHTML = `
      <div class="stat-grid">
        <article class="stat">
          <div class="stat__head"><span class="stat__l">Clientes</span>
            <span class="stat__ico">${icon.pessoas({ size: 16 })}</span></div>
          <p class="stat__v">${num(state.clientes.length)}</p>
        </article>
        <article class="stat">
          <div class="stat__head"><span class="stat__l">Receita da base</span>
            <span class="stat__ico">${icon.raio({ size: 16 })}</span></div>
          <p class="stat__v">${money(receita)}</p>
        </article>
        <article class="stat">
          <div class="stat__head"><span class="stat__l">Ticket médio</span>
            <span class="stat__ico">${icon.etiqueta({ size: 16 })}</span></div>
          <p class="stat__v">${money(ticket)}</p>
        </article>
        <article class="stat">
          <div class="stat__head"><span class="stat__l">Ativos</span>
            <span class="stat__ico">${icon.checkCirculo({ size: 16 })}</span></div>
          <p class="stat__v">${num(state.clientes.filter(c => c.status === 'ativo').length)}</p>
        </article>
      </div>

      <div class="panel">
        <div class="admin-tabela-topo">
          <div class="input-group search-mini">
            <span class="input-group__icon">${icon.busca({ size: 16 })}</span>
            <input type="search" class="input" placeholder="Buscar por nome, e-mail ou cidade"
                   value="${escapeHtml(f.q)}" data-busca style="min-height:40px">
          </div>
          <span class="dim" style="font-size:var(--fs-sm);margin-left:auto">${num(lista.length)} clientes</span>
        </div>

        <div class="panel__body panel__body--flush tabela-cards">
          ${lista.length ? `
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th data-ord="nome">Cliente<span class="sort-ind">↕</span></th>
                    <th>Local</th>
                    <th class="num" data-ord="pedidos">Pedidos<span class="sort-ind">↕</span></th>
                    <th class="num" data-ord="gasto">Total gasto<span class="sort-ind">↕</span></th>
                    <th data-ord="ultimaCompra">Última compra<span class="sort-ind">↕</span></th>
                    <th data-ord="desde">Cliente desde<span class="sort-ind">↕</span></th>
                    <th>Status</th>
                    <th style="text-align:right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${lista.map(c => `
                    <tr>
                      <td class="cel-destaque" data-rotulo="Cliente">
                        <div class="prod-cel">
                          <span class="avatar">${iniciais(c.nome)}</span>
                          <span style="min-width:0">
                            <span class="prod-cel__n">${escapeHtml(c.nome)}</span>
                            <span class="prod-cel__sku" style="font-family:var(--font-body)">${escapeHtml(c.email)}</span>
                          </span>
                        </div>
                      </td>
                      <td data-rotulo="Local">${escapeHtml(c.cidade)}/${escapeHtml(c.uf)}</td>
                      <td class="num" data-rotulo="Pedidos">${num(c.pedidos)}</td>
                      <td class="num cell-strong" data-rotulo="Total gasto">${money(c.gasto)}</td>
                      <td class="dim" data-rotulo="Última compra">${c.ultimaCompra ? haQuantoTempo(c.ultimaCompra) : '—'}</td>
                      <td class="dim" data-rotulo="Cliente desde">${dataCurta(c.desde)}</td>
                      <td data-rotulo="Status">
                        <span class="badge badge--${c.status === 'ativo' ? 'success' : 'neutral'}">
                          <span class="badge__dot"></span> ${c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td data-rotulo="Ações">
                        <div class="acoes-cel">
                          <button type="button" class="btn-icon btn-icon--sm" data-ver-cliente="${c.id}"
                                  aria-label="Ver ficha de ${escapeHtml(c.nome)}">${icon.olho({ size: 16 })}</button>
                        </div>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>` : vazio({
              icone: 'pessoas',
              titulo: 'Nenhum cliente encontrado',
              texto: 'Ajuste a busca ou o filtro.',
            })}
        </div>
      </div>`;
  }

  const buscarDebounced = debounce(pintar, 240);
  delegate(corpo, 'input', '[data-busca]', (e, i) => { f.q = i.value; buscarDebounced(); });

  delegate(acoes, 'click', '[data-cs]', (e, b) => {
    f.status = b.dataset.cs;
    qs('.segmented', acoes).querySelectorAll('button').forEach(x =>
      x.setAttribute('aria-pressed', String(x.dataset.cs === f.status)));
    pintar();
  });

  delegate(corpo, 'click', 'th[data-ord]', (e, th) => {
    const campo = th.dataset.ord;
    if (f.ord === campo) f.dir *= -1; else { f.ord = campo; f.dir = 1; }
    pintar();
  });

  delegate(corpo, 'click', '[data-ver-cliente]', (e, b) => abrirCliente(b.dataset.verCliente));

  const desassinar = subscribe((ev) => { if (ev === 'reset') pintar(); });
  pintar();
  return () => desassinar();
}

function abrirCliente(id) {
  const c = state.clientes.find(x => x.id === id);
  if (!c) return;

  const pedidos = state.pedidos.filter(p => p.clienteId === c.id);
  const avaliacoes = state.avaliacoes.filter(r => r.clienteId === c.id);

  modal({
    titulo: c.nome,
    sub: `Cliente desde ${dataLonga(c.desde)}`,
    tamanho: 'lg',
    id: 'cli',
    conteudo: `
      <div class="stack stack--lg">
        <div class="row" style="gap:16px">
          <span class="avatar avatar--lg">${iniciais(c.nome)}</span>
          <div style="flex:1;min-width:0">
            <p style="font-size:var(--fs-base)">${escapeHtml(c.email)}</p>
            <p class="dim" style="font-size:var(--fs-sm)">${escapeHtml(c.telefone)}</p>
          </div>
          <span class="badge badge--${c.status === 'ativo' ? 'success' : 'neutral'}">
            <span class="badge__dot"></span> ${c.status === 'ativo' ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        <div class="kpi-row">
          <div class="kpi"><p class="kpi__l">Pedidos</p><p class="kpi__v">${num(c.pedidos)}</p></div>
          <div class="kpi"><p class="kpi__l">Total gasto</p><p class="kpi__v">${money(c.gasto)}</p></div>
          <div class="kpi"><p class="kpi__l">Ticket médio</p>
            <p class="kpi__v">${money(c.pedidos ? Math.round(c.gasto / c.pedidos) : 0)}</p></div>
          <div class="kpi"><p class="kpi__l">Avaliações</p><p class="kpi__v">${num(avaliacoes.length)}</p></div>
        </div>

        <section>
          <h3 style="font-size:var(--fs-base);margin-bottom:12px">Endereço</h3>
          <p class="muted" style="font-size:var(--fs-base);line-height:1.7">
            ${escapeHtml(c.endereco)}<br>
            ${escapeHtml(c.cidade)}/${escapeHtml(c.uf)} · CEP ${escapeHtml(c.cep)}
          </p>
        </section>

        <section>
          <h3 style="font-size:var(--fs-base);margin-bottom:12px">
            Histórico de pedidos (${num(pedidos.length)})
          </h3>
          ${pedidos.length ? `
            <div class="table-wrap">
              <table class="table" style="min-width:0">
                <tbody>
                  ${pedidos.slice(0, 8).map(p => {
                    const st = ORDER_STATUS[p.status] || { label: p.status, tone: 'neutral' };
                    return `
                    <tr>
                      <td class="cell-strong tabular">${escapeHtml(p.id)}</td>
                      <td class="dim">${dataCurta(p.data)}</td>
                      <td><span class="badge badge--${st.tone}"><span class="badge__dot"></span> ${st.label}</span></td>
                      <td class="num cell-strong">${money(p.total)}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>` : '<p class="muted">Nenhum pedido registrado.</p>'}
        </section>
      </div>`,
    rodape: `<button type="button" class="btn btn--secondary" data-fechar>Fechar</button>`,
  });
}

/* ============================================================
   AVALIAÇÕES
   ============================================================ */
export function secaoAvaliacoes(corpo, acoes) {
  const f = { nota: 0, q: '' };

  acoes.innerHTML = `
    <div class="segmented" role="group" aria-label="Filtrar por nota">
      <button type="button" data-nt="0" aria-pressed="true">Todas</button>
      ${[5, 4, 3, 2, 1].map(n => `<button type="button" data-nt="${n}" aria-pressed="false">${n}★</button>`).join('')}
    </div>`;

  function pintar() {
    let lista = [...state.avaliacoes].sort((a, b) => b.data.localeCompare(a.data));
    if (f.nota) lista = lista.filter(r => r.nota === f.nota);
    if (f.q) lista = lista.filter(r => norm(`${r.cliente} ${r.titulo} ${r.texto}`).includes(norm(f.q)));

    const media = state.avaliacoes.length
      ? state.avaliacoes.reduce((s, r) => s + r.nota, 0) / state.avaliacoes.length
      : 0;
    const dist = [5, 4, 3, 2, 1].map(n => ({
      n, qtd: state.avaliacoes.filter(r => r.nota === n).length,
    }));
    const maxDist = Math.max(1, ...dist.map(d => d.qtd));

    corpo.innerHTML = `
      <div class="chart-grid">
        <section class="panel col-4">
          <header class="panel__head"><h2 class="panel__title">Nota geral</h2></header>
          <div class="panel__body">
            <div class="notas-media">
              <p class="notas-media__n">${media.toFixed(1).replace('.', ',')}</p>
              <div style="display:flex;justify-content:center;margin:10px 0">${estrelas(media, 18)}</div>
              <p class="dim" style="font-size:var(--fs-sm)">${num(state.avaliacoes.length)} avaliações</p>
            </div>
            <div class="notas-barras" style="margin-top:20px">
              ${dist.map(d => `
                <div class="notas-barra">
                  <span>${d.n} ${d.n === 1 ? 'estrela' : 'estrelas'}</span>
                  <span class="notas-barra__trilho">
                    <span class="notas-barra__fill" style="width:${(d.qtd / maxDist) * 100}%"></span>
                  </span>
                  <span class="notas-barra__n">${d.qtd}</span>
                </div>`).join('')}
            </div>
          </div>
        </section>

        <section class="panel col-8">
          <div class="admin-tabela-topo">
            <div class="input-group search-mini" style="max-width:none">
              <span class="input-group__icon">${icon.busca({ size: 16 })}</span>
              <input type="search" class="input" placeholder="Buscar nas avaliações"
                     value="${escapeHtml(f.q)}" data-busca style="min-height:40px">
            </div>
            <span class="dim" style="font-size:var(--fs-sm)">${num(lista.length)} resultados</span>
          </div>
          <div class="panel__body" style="max-height:640px;overflow-y:auto">
            ${lista.length ? lista.slice(0, 30).map(r => {
              const p = acharProduto(r.produtoId);
              return `
                <article class="review">
                  <div class="review__head">
                    <span class="avatar">${iniciais(r.cliente)}</span>
                    <div style="flex:1;min-width:0">
                      <p class="review__nome">${escapeHtml(r.cliente)}</p>
                      <p class="review__data">${haQuantoTempo(r.data)}
                        ${r.verificada ? '· <span style="color:var(--success)">compra verificada</span>' : ''}</p>
                    </div>
                    ${estrelas(r.nota, 14)}
                  </div>
                  ${p ? `
                    <a href="#/produto/${p.id}" class="row" style="gap:10px;margin-bottom:10px">
                      <span class="prod-cel__art" style="width:34px;height:34px">${arteProduto(p, { mini: true })}</span>
                      <span class="dim" style="font-size:var(--fs-sm)">${escapeHtml(p.nome)}</span>
                    </a>` : ''}
                  <p class="review__titulo">${escapeHtml(r.titulo)}</p>
                  <p class="review__texto">${escapeHtml(r.texto)}</p>
                </article>`;
            }).join('') : vazio({
              icone: 'comentario',
              titulo: 'Nenhuma avaliação encontrada',
              texto: 'Ajuste a busca ou o filtro de nota.',
            })}
          </div>
        </section>
      </div>`;
  }

  const buscarDebounced = debounce(pintar, 240);
  delegate(corpo, 'input', '[data-busca]', (e, i) => { f.q = i.value; buscarDebounced(); });

  delegate(acoes, 'click', '[data-nt]', (e, b) => {
    f.nota = Number(b.dataset.nt);
    qs('.segmented', acoes).querySelectorAll('button').forEach(x =>
      x.setAttribute('aria-pressed', String(Number(x.dataset.nt) === f.nota)));
    pintar();
  });

  const desassinar = subscribe((ev) => { if (ev === 'reset') pintar(); });
  pintar();
  return () => desassinar();
}
