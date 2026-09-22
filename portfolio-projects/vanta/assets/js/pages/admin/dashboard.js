/* ============================================================
   VANTA Admin — Overview, Analytics e Vendas
   ============================================================ */

import { qs, qsa, delegate } from '../../utils/dom.js';
import { icon } from '../../components/icons.js';
import { arteProduto } from '../../components/media.js';
import {
  money, num, compact, pct, escapeHtml, dataMedia, haQuantoTempo, dataLonga,
} from '../../utils/format.js';
import {
  resumoPeriodo, serieDoPeriodo, vendasPorCategoria, maisVendidos, estoqueBaixo,
  state, PERIODOS, ORDER_STATUS, subscribe,
} from '../../services/store.js';
import {
  graficoLinha, ligarGraficoLinha, graficoBarras, graficoRosca,
  sparkline, barrasHorizontais, medidor,
} from '../../components/charts.js';

/* Periodo selecionado, compartilhado entre as secoes do painel */
let periodo = '30d';

function seletorPeriodo() {
  return `
    <div class="segmented" role="group" aria-label="Período de análise">
      ${Object.entries(PERIODOS).map(([k, v]) =>
        `<button type="button" data-periodo="${k}" aria-pressed="${periodo === k}">${v.label}</button>`).join('')}
    </div>`;
}

function cartaoKPI({ rotulo, valor, delta, ref, ic, serie, cor = 'var(--data-1)' }) {
  const dir = delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';
  const seta = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '■';
  return `
    <article class="stat" data-anim>
      <div class="stat__head">
        <span class="stat__l">${escapeHtml(rotulo)}</span>
        <span class="stat__ico">${icon[ic]({ size: 16 })}</span>
      </div>
      <p class="stat__v">${escapeHtml(String(valor))}</p>
      <div class="stat__pe">
        <span class="delta delta--${dir}">${seta} ${pct(Math.abs(delta))}</span>
        <span class="stat__ref">${escapeHtml(ref)}</span>
      </div>
      ${serie ? `<div class="stat__spark">${sparkline(serie, cor)}</div>` : ''}
    </article>`;
}

/* ============================================================
   OVERVIEW
   ============================================================ */
export function secaoOverview(corpo, acoes) {
  acoes.innerHTML = `
    ${seletorPeriodo()}
    <button type="button" class="btn btn--secondary btn--sm" data-exportar>
      ${icon.exportar({ size: 15 })} Exportar
    </button>`;

  function pintar() {
    const r = resumoPeriodo(periodo);
    const cats = vendasPorCategoria();
    const top = maisVendidos(5);
    const baixo = estoqueBaixo().slice(0, 5);
    const recentes = state.pedidos.slice(0, 6);
    const ref = `vs. ${PERIODOS[periodo].label.toLowerCase()} anterior`;

    const serieReceita = r.atual.map(d => d.receita);
    const seriePedidos = r.atual.map(d => d.pedidos);

    corpo.innerHTML = `
      <div class="stat-grid">
        ${cartaoKPI({ rotulo: 'Receita', valor: money(r.receita), delta: r.delta.receita, ref, ic: 'raio', serie: serieReceita, cor: 'var(--data-1)' })}
        ${cartaoKPI({ rotulo: 'Pedidos', valor: num(r.pedidos), delta: r.delta.pedidos, ref, ic: 'caixa', serie: seriePedidos, cor: 'var(--data-2)' })}
        ${cartaoKPI({ rotulo: 'Ticket médio', valor: money(r.ticket), delta: r.delta.ticket, ref, ic: 'etiqueta', cor: 'var(--data-3)' })}
        ${cartaoKPI({ rotulo: 'Novos clientes', valor: num(r.novos), delta: r.delta.novos, ref, ic: 'pessoas', cor: 'var(--data-4)' })}
        ${cartaoKPI({ rotulo: 'Conversão', valor: pct(r.conv, 2), delta: r.delta.conv, ref, ic: 'grafico', cor: 'var(--data-6)' })}
        ${cartaoKPI({ rotulo: 'Unidades vendidas', valor: num(r.unidades), delta: r.delta.pedidos, ref, ic: 'sacola', cor: 'var(--data-5)' })}
      </div>

      <div class="chart-grid">
        <section class="panel col-8">
          <header class="panel__head">
            <div>
              <h2 class="panel__title">Receita ao longo do tempo</h2>
              <p class="dim" style="font-size:var(--fs-xs)">Comparação com o período anterior</p>
            </div>
          </header>
          <div class="panel__body" data-grafico-receita></div>
        </section>

        <section class="panel col-4">
          <header class="panel__head"><h2 class="panel__title">Vendas por categoria</h2></header>
          <div class="panel__body">
            ${graficoRosca(
              cats.slice(0, 6).map((c, i) => ({
                nome: c.nome, valor: c.valor, cor: `var(--data-${(i % 6) + 1})`,
              })),
              { titulo: 'Participação por categoria', centroValor: compact(cats.reduce((s, c) => s + c.unidades, 0)), centroRotulo: 'unidades' }
            )}
            <div class="chart-legend" style="justify-content:center">
              ${cats.slice(0, 6).map((c, i) => `
                <span class="row" style="gap:6px">
                  <span class="legend-key" style="background:var(--data-${(i % 6) + 1})"></span>
                  ${escapeHtml(c.nome)}
                </span>`).join('')}
            </div>
          </div>
        </section>

        <section class="panel col-5">
          <header class="panel__head">
            <h2 class="panel__title">Mais vendidos</h2>
            <a href="#/admin/produtos" class="btn btn--ghost btn--sm">Ver todos</a>
          </header>
          <div class="panel__body">
            ${barrasHorizontais(
              top.map(p => ({ nome: p.nome.split('—')[0].trim(), valor: p.vendidos })),
              { formato: (v) => `${num(v)} un.` }
            )}
          </div>
        </section>

        <section class="panel col-7">
          <header class="panel__head">
            <h2 class="panel__title">Pedidos recentes</h2>
            <a href="#/admin/pedidos" class="btn btn--ghost btn--sm">Ver todos ${icon.chevronR({ size: 14 })}</a>
          </header>
          <div class="panel__body panel__body--flush">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Pedido</th><th>Cliente</th><th>Status</th><th class="num">Valor</th><th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentes.map(p => {
                    const st = ORDER_STATUS[p.status] || { label: p.status, tone: 'neutral' };
                    return `
                    <tr>
                      <td class="cell-strong tabular">${escapeHtml(p.id)}</td>
                      <td>${escapeHtml(p.cliente)}</td>
                      <td><span class="badge badge--${st.tone}"><span class="badge__dot"></span> ${st.label}</span></td>
                      <td class="num cell-strong">${money(p.total)}</td>
                      <td class="dim">${haQuantoTempo(p.data)}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section class="panel col-6">
          <header class="panel__head">
            <h2 class="panel__title">Meta do período</h2>
          </header>
          <div class="panel__body stack stack--lg">
            ${medidor({ valor: r.receita, meta: Math.round(r.receita * 1.18), rotulo: 'Receita' })}
            ${medidor({ valor: r.pedidos, meta: Math.round(r.pedidos * 1.1), formato: num, rotulo: 'Pedidos' })}
            ${medidor({ valor: r.novos, meta: Math.round(r.novos * 1.3), formato: num, rotulo: 'Novos clientes' })}
          </div>
        </section>

        <section class="panel col-6">
          <header class="panel__head">
            <h2 class="panel__title">Estoque crítico</h2>
            <a href="#/admin/estoque" class="btn btn--ghost btn--sm">Gerenciar</a>
          </header>
          <div class="panel__body panel__body--flush">
            ${baixo.length ? `
              <div class="table-wrap">
                <table class="table" style="min-width:0">
                  <tbody>
                    ${baixo.map(p => `
                      <tr>
                        <td>
                          <div class="prod-cel">
                            <span class="prod-cel__art">${arteProduto(p, { mini: true })}</span>
                            <span style="min-width:0">
                              <span class="prod-cel__n">${escapeHtml(p.nome)}</span>
                              <span class="prod-cel__sku">${escapeHtml(p.sku)}</span>
                            </span>
                          </div>
                        </td>
                        <td class="num">
                          <span class="badge badge--${p.estoque === 0 ? 'danger' : 'warning'}">
                            ${p.estoque} un.
                          </span>
                        </td>
                      </tr>`).join('')}
                  </tbody>
                </table>
              </div>` : `
              <p class="muted" style="padding:32px;text-align:center">Nenhum produto em nível crítico.</p>`}
          </div>
        </section>
      </div>`;

    // Grafico de receita: atual vs. anterior
    const alvoGrafico = qs('[data-grafico-receita]', corpo);
    const series = [
      { nome: 'Período atual', cor: 'var(--data-1)', dados: r.atual.map(d => ({ x: d.data, y: d.receita })) },
      { nome: 'Período anterior', cor: 'var(--data-2)', dados: r.anterior.map((d, i) => ({ x: r.atual[i]?.data || d.data, y: d.receita })) },
    ].filter(s => s.dados.length);

    alvoGrafico.innerHTML = graficoLinha(series, { titulo: 'Receita', altura: 280 }) + `
      <div class="chart-legend">
        ${series.map(s => `
          <span class="row" style="gap:6px">
            <span class="legend-key" style="background:${s.cor}"></span>${s.nome}
          </span>`).join('')}
      </div>`;
    ligarGraficoLinha(alvoGrafico, series);
  }

  ligarPeriodo(acoes, pintar);
  delegate(acoes, 'click', '[data-exportar]', () => exportarCSV());
  pintar();
  return () => {};
}

/* ============================================================
   ANALYTICS
   ============================================================ */
export function secaoAnalytics(corpo, acoes) {
  acoes.innerHTML = seletorPeriodo();

  function pintar() {
    const r = resumoPeriodo(periodo);
    const cats = vendasPorCategoria();
    const ref = `vs. período anterior`;

    // Agrupa por dia da semana para ver o padrao de compra
    const porDiaSemana = [0, 1, 2, 3, 4, 5, 6].map(dow => {
      const dias = r.atual.filter(d => new Date(d.data + 'T12:00:00').getDay() === dow);
      const soma = dias.reduce((s, d) => s + d.receita, 0);
      return {
        rotulo: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dow],
        valor: dias.length ? Math.round(soma / dias.length) : 0,
      };
    });
    const melhorDia = [...porDiaSemana].sort((a, b) => b.valor - a.valor)[0];
    porDiaSemana.forEach(d => { d.destaque = d.rotulo === melhorDia.rotulo; d.cor = d.destaque ? 'var(--data-1)' : 'var(--ink-600)'; });

    corpo.innerHTML = `
      <div class="stat-grid">
        ${cartaoKPI({ rotulo: 'Visitantes', valor: num(r.visitantes), delta: r.delta.visitantes, ref, ic: 'olho', serie: r.atual.map(d => d.visitantes), cor: 'var(--data-3)' })}
        ${cartaoKPI({ rotulo: 'Taxa de conversão', valor: pct(r.conv, 2), delta: r.delta.conv, ref, ic: 'grafico', cor: 'var(--data-6)' })}
        ${cartaoKPI({ rotulo: 'Ticket médio', valor: money(r.ticket), delta: r.delta.ticket, ref, ic: 'etiqueta', cor: 'var(--data-4)' })}
        ${cartaoKPI({ rotulo: 'Receita por visitante', valor: money(Math.round(r.receita / (r.visitantes || 1))), delta: r.delta.receita - r.delta.visitantes, ref, ic: 'raio', cor: 'var(--data-1)' })}
      </div>

      <div class="chart-grid">
        <section class="panel col-12">
          <header class="panel__head">
            <div>
              <h2 class="panel__title">Visitantes e pedidos</h2>
              <p class="dim" style="font-size:var(--fs-xs)">Volume de tráfego contra conversão em pedido</p>
            </div>
          </header>
          <div class="panel__body" data-grafico-trafego></div>
        </section>

        <section class="panel col-6">
          <header class="panel__head">
            <h2 class="panel__title">Receita média por dia da semana</h2>
          </header>
          <div class="panel__body">
            ${graficoBarras(porDiaSemana, { titulo: 'Receita por dia da semana', formato: money, altura: 250 })}
            <p class="dim" style="font-size:var(--fs-sm);text-align:center;margin-top:8px">
              ${escapeHtml(melhorDia.rotulo)} é o dia mais forte, com média de ${money(melhorDia.valor)}
            </p>
          </div>
        </section>

        <section class="panel col-6">
          <header class="panel__head">
            <h2 class="panel__title">Funil de conversão</h2>
          </header>
          <div class="panel__body">
            ${(() => {
              const visitas = r.visitantes;
              const produto = Math.round(visitas * 0.42);
              const carrinho = Math.round(visitas * 0.11);
              const checkout = Math.round(visitas * 0.052);
              const compra = r.pedidos;
              const etapas = [
                ['Visitou a loja', visitas],
                ['Viu um produto', produto],
                ['Adicionou ao carrinho', carrinho],
                ['Iniciou o checkout', checkout],
                ['Concluiu a compra', compra],
              ];
              return `
                <div class="hbar">
                  ${etapas.map(([nome, v], i) => `
                    <div class="hbar__item">
                      <div class="hbar__top">
                        <span class="hbar__n">${nome}</span>
                        <span class="hbar__v">${num(v)}
                          <span class="dim" style="font-weight:400">(${pct(v / visitas * 100, 1)})</span></span>
                      </div>
                      <div class="hbar__trilho">
                        <div class="hbar__fill" style="width:${(v / visitas) * 100}%;background:var(--data-${i + 1})"></div>
                      </div>
                    </div>`).join('')}
                </div>`;
            })()}
          </div>
        </section>

        <section class="panel col-12">
          <header class="panel__head">
            <h2 class="panel__title">Desempenho por categoria</h2>
          </header>
          <div class="panel__body panel__body--flush">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Categoria</th><th class="num">Receita</th><th class="num">Unidades</th>
                    <th class="num">Ticket médio</th><th style="width:180px">Participação</th>
                  </tr>
                </thead>
                <tbody>
                  ${(() => {
                    const total = cats.reduce((s, c) => s + c.valor, 0) || 1;
                    return cats.map((c, i) => `
                      <tr>
                        <td class="cell-strong">${escapeHtml(c.nome)}</td>
                        <td class="num cell-strong">${money(c.valor)}</td>
                        <td class="num">${num(c.unidades)}</td>
                        <td class="num">${money(c.unidades ? Math.round(c.valor / c.unidades) : 0)}</td>
                        <td>
                          <div class="row" style="gap:10px">
                            <span class="hbar__trilho" style="flex:1">
                              <span class="hbar__fill" style="display:block;width:${(c.valor / total) * 100}%;background:var(--data-${(i % 6) + 1})"></span>
                            </span>
                            <span class="tabular" style="font-size:var(--fs-xs);min-width:44px;text-align:right">
                              ${pct(c.valor / total * 100, 1)}
                            </span>
                          </div>
                        </td>
                      </tr>`).join('');
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>`;

    const alvo = qs('[data-grafico-trafego]', corpo);
    const series = [
      { nome: 'Visitantes', cor: 'var(--data-3)', dados: r.atual.map(d => ({ x: d.data, y: d.visitantes })) },
      { nome: 'Pedidos', cor: 'var(--data-1)', dados: r.atual.map(d => ({ x: d.data, y: d.pedidos * 40 })) },
    ];
    alvo.innerHTML = graficoLinha(series, { titulo: 'Visitantes e pedidos', altura: 280, formato: num }) + `
      <div class="chart-legend">
        <span class="row" style="gap:6px"><span class="legend-key" style="background:var(--data-3)"></span>Visitantes</span>
        <span class="row" style="gap:6px"><span class="legend-key" style="background:var(--data-1)"></span>Pedidos (escala ampliada)</span>
      </div>`;
    ligarGraficoLinha(alvo, [
      { nome: 'Visitantes', cor: 'var(--data-3)', dados: r.atual.map(d => ({ x: d.data, y: d.visitantes })) },
      { nome: 'Pedidos', cor: 'var(--data-1)', dados: r.atual.map(d => ({ x: d.data, y: d.pedidos })) },
    ], { formato: num });
  }

  ligarPeriodo(acoes, pintar);
  pintar();
  return () => {};
}

/* ============================================================
   VENDAS
   ============================================================ */
export function secaoVendas(corpo, acoes) {
  acoes.innerHTML = `
    ${seletorPeriodo()}
    <button type="button" class="btn btn--secondary btn--sm" data-exportar>
      ${icon.exportar({ size: 15 })} Exportar CSV
    </button>`;

  function pintar() {
    const r = resumoPeriodo(periodo);
    const cats = vendasPorCategoria();
    const validos = state.pedidos.filter(p => p.status !== 'cancelado');
    const cancelados = state.pedidos.filter(p => p.status === 'cancelado');

    const porPagamento = {};
    validos.forEach(p => { porPagamento[p.pagamento] = (porPagamento[p.pagamento] || 0) + p.total; });
    const pagamentos = Object.entries(porPagamento)
      .map(([nome, valor], i) => ({ nome, valor, cor: `var(--data-${(i % 6) + 1})` }))
      .sort((a, b) => b.valor - a.valor);

    const receitaTotal = validos.reduce((s, p) => s + p.total, 0);
    const taxaCancelamento = (cancelados.length / (state.pedidos.length || 1)) * 100;

    corpo.innerHTML = `
      <div class="stat-grid">
        ${cartaoKPI({ rotulo: 'Receita no período', valor: money(r.receita), delta: r.delta.receita, ref: 'vs. anterior', ic: 'raio', serie: r.atual.map(d => d.receita) })}
        ${cartaoKPI({ rotulo: 'Receita acumulada', valor: money(receitaTotal), delta: 12.4, ref: 'histórico completo', ic: 'grafico', cor: 'var(--data-2)' })}
        ${cartaoKPI({ rotulo: 'Ticket médio', valor: money(r.ticket), delta: r.delta.ticket, ref: 'vs. anterior', ic: 'etiqueta', cor: 'var(--data-3)' })}
        ${cartaoKPI({ rotulo: 'Taxa de cancelamento', valor: pct(taxaCancelamento), delta: -2.1, ref: 'vs. anterior', ic: 'alerta', cor: 'var(--data-5)' })}
      </div>

      <div class="chart-grid">
        <section class="panel col-7">
          <header class="panel__head"><h2 class="panel__title">Evolução da receita</h2></header>
          <div class="panel__body" data-grafico-vendas></div>
        </section>

        <section class="panel col-5">
          <header class="panel__head"><h2 class="panel__title">Forma de pagamento</h2></header>
          <div class="panel__body">
            ${graficoRosca(pagamentos, {
              titulo: 'Receita por forma de pagamento',
              centroValor: compact(receitaTotal / 100),
              centroRotulo: 'em vendas',
            })}
            <div class="chart-legend" style="justify-content:center">
              ${pagamentos.map(p => `
                <span class="row" style="gap:6px">
                  <span class="legend-key" style="background:${p.cor}"></span>${escapeHtml(p.nome)}
                </span>`).join('')}
            </div>
          </div>
        </section>

        <section class="panel col-12">
          <header class="panel__head">
            <h2 class="panel__title">Produtos com melhor desempenho</h2>
          </header>
          <div class="panel__body panel__body--flush">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Produto</th><th>Categoria</th><th class="num">Unidades</th>
                    <th class="num">Receita estimada</th><th class="num">Estoque</th>
                  </tr>
                </thead>
                <tbody>
                  ${maisVendidos(10).map(p => {
                    const cat = state.categorias.find(c => c.id === p.cat);
                    return `
                    <tr>
                      <td>
                        <div class="prod-cel">
                          <span class="prod-cel__art">${arteProduto(p, { mini: true })}</span>
                          <span style="min-width:0">
                            <span class="prod-cel__n">${escapeHtml(p.nome)}</span>
                            <span class="prod-cel__sku">${escapeHtml(p.sku)}</span>
                          </span>
                        </div>
                      </td>
                      <td>${escapeHtml(cat?.nome || '')}</td>
                      <td class="num">${num(p.vendidos)}</td>
                      <td class="num cell-strong">${money(p.vendidos * p.preco)}</td>
                      <td class="num">
                        <span class="badge badge--${p.estoque === 0 ? 'danger' : p.estoque <= p.estoqueMin ? 'warning' : 'neutral'}">
                          ${num(p.estoque)}
                        </span>
                      </td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>`;

    const alvo = qs('[data-grafico-vendas]', corpo);
    const series = [{ nome: 'Receita', cor: 'var(--data-1)', dados: r.atual.map(d => ({ x: d.data, y: d.receita })) }];
    alvo.innerHTML = graficoLinha(series, { titulo: 'Receita', altura: 280 });
    ligarGraficoLinha(alvo, series);
  }

  ligarPeriodo(acoes, pintar);
  delegate(acoes, 'click', '[data-exportar]', () => exportarCSV());
  pintar();
  return () => {};
}

/* ---------- Utilitarios compartilhados ---------- */
function ligarPeriodo(acoes, pintar) {
  delegate(acoes, 'click', '[data-periodo]', (e, b) => {
    periodo = b.dataset.periodo;
    qsa('[data-periodo]', acoes).forEach(x =>
      x.setAttribute('aria-pressed', String(x.dataset.periodo === periodo)));
    pintar();
  });
}

async function exportarCSV() {
  const { toast } = await import('../../components/ui.js');
  const linhas = [['Data', 'Receita (R$)', 'Pedidos', 'Visitantes', 'Novos clientes']];
  serieDoPeriodo(periodo).forEach(d => {
    linhas.push([d.data, (d.receita / 100).toFixed(2), d.pedidos, d.visitantes, d.novosClientes]);
  });

  const csv = linhas.map(l => l.join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vanta-relatorio-${periodo}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  toast({ titulo: 'Relatório exportado', msg: `vanta-relatorio-${periodo}.csv`, tipo: 'success' });
}
