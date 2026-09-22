/* ============================================================
   VANTA — Painel administrativo: shell e navegacao
   ============================================================ */

import { qs, qsa, delegate, el, observarAnimacoes } from '../../utils/dom.js';
import { icon } from '../../components/icons.js';
import { num, iniciais } from '../../utils/format.js';
import { state, subscribe, estoqueBaixo } from '../../services/store.js';
import { ir } from '../../router.js';

const NAV = [
  ['Visão', [
    ['overview', 'Overview', 'painel'],
    ['analytics', 'Analytics', 'grafico'],
    ['vendas', 'Vendas', 'raio'],
  ]],
  ['Operação', [
    ['pedidos', 'Pedidos', 'caixa'],
    ['produtos', 'Produtos', 'sacola'],
    ['categorias', 'Categorias', 'etiqueta'],
    ['estoque', 'Estoque', 'estoque'],
    ['promocoes', 'Promoções', 'fogo'],
  ]],
  ['Pessoas', [
    ['clientes', 'Clientes', 'pessoas'],
    ['avaliacoes', 'Avaliações', 'comentario'],
  ]],
  ['Sistema', [
    ['config', 'Configurações', 'engrenagem'],
  ]],
];

const TITULOS = {
  overview: ['Overview', 'Resumo do desempenho da loja'],
  analytics: ['Analytics', 'Métricas detalhadas e comparação de períodos'],
  vendas: ['Vendas', 'Receita, ticket médio e desempenho por categoria'],
  pedidos: ['Pedidos', 'Acompanhe e atualize o status de cada pedido'],
  produtos: ['Produtos', 'Cadastro, preço, estoque e publicação'],
  categorias: ['Categorias', 'Organização do catálogo'],
  estoque: ['Estoque', 'Níveis, reposição e alertas'],
  promocoes: ['Promoções', 'Campanhas e cupons de desconto'],
  clientes: ['Clientes', 'Base de clientes e histórico de compras'],
  avaliacoes: ['Avaliações', 'Opiniões deixadas pelos clientes'],
  config: ['Configurações', 'Preferências da loja'],
};

export function paginaAdmin(root, secao = 'overview', query = {}) {
  if (!TITULOS[secao]) secao = 'overview';
  const [titulo, sub] = TITULOS[secao];
  document.title = `${titulo} | VANTA Admin`;

  const pendentes = state.pedidos.filter(p => p.status === 'pendente').length;
  const critico = estoqueBaixo().length;

  root.innerHTML = `
    <div class="admin">
      <div class="admin-side-backdrop" data-side-backdrop></div>

      <aside class="admin-side" data-side>
        <div class="admin-side__top">
          <a href="#/" class="brand" style="gap:10px">
            <span class="brand__mark" aria-hidden="true" style="width:28px;height:28px;font-size:16px">V</span>
            <span class="brand__word" style="font-size:1rem">VANTA</span>
          </a>
          <span class="admin-side__tag">Admin</span>
        </div>

        <nav class="admin-side__nav" aria-label="Navegação do painel">
          ${NAV.map(([grupo, itens]) => `
            <p class="admin-side__grupo">${grupo}</p>
            ${itens.map(([id, nome, ic]) => {
              const badge = id === 'pedidos' && pendentes
                ? `<span class="admin-link__badge">${pendentes}</span>`
                : id === 'estoque' && critico
                  ? `<span class="admin-link__badge admin-link__badge--alerta">${critico}</span>`
                  : '';
              return `
                <a href="#/admin/${id}" class="admin-link ${id === secao ? 'is-active' : ''}"
                   ${id === secao ? 'aria-current="page"' : ''}>
                  ${icon[ic]({ size: 18 })} <span>${nome}</span> ${badge}
                </a>`;
            }).join('')}`).join('')}
        </nav>

        <div class="admin-side__pe">
          <div class="row" style="gap:10px;padding:8px 4px">
            <span class="avatar" aria-hidden="true">AD</span>
            <div style="min-width:0;flex:1">
              <p style="font-size:var(--fs-sm);font-weight:600">Administração</p>
              <p class="dim" style="font-size:var(--fs-xs)">admin@vanta.com.br</p>
            </div>
          </div>
          <a href="#/" class="admin-link" style="margin-top:4px">
            ${icon.sair({ size: 18 })} <span>Voltar à loja</span>
          </a>
        </div>
      </aside>

      <div class="admin-main">
        <header class="admin-top">
          <button type="button" class="btn-icon admin-menu-btn" data-abrir-side aria-label="Abrir menu do painel">
            ${icon.menu()}
          </button>
          <div>
            <h1 class="admin-top__t">${titulo}</h1>
            <p class="admin-top__s">${sub}</p>
          </div>
          <div class="admin-top__acoes" data-acoes></div>
        </header>

        <div class="admin-body" data-admin-corpo></div>
      </div>
    </div>`;

  const corpo = qs('[data-admin-corpo]', root);
  const acoes = qs('[data-acoes]', root);
  const side = qs('[data-side]', root);
  const backdrop = qs('[data-side-backdrop]', root);

  /* Sidebar em gaveta no mobile */
  const fecharSide = () => {
    side.classList.remove('is-open');
    backdrop.classList.remove('is-open');
  };
  qs('[data-abrir-side]', root).addEventListener('click', () => {
    side.classList.add('is-open');
    backdrop.classList.add('is-open');
  });
  backdrop.addEventListener('click', fecharSide);
  delegate(side, 'click', '.admin-link', fecharSide);

  /* Carrega a secao sob demanda */
  let limparSecao = null;

  async function montarSecao() {
    const mod = await carregar(secao);
    if (limparSecao) { limparSecao(); limparSecao = null; }
    limparSecao = mod(corpo, acoes, query) || null;
    observarAnimacoes(corpo);
  }

  montarSecao();

  return () => { if (limparSecao) limparSecao(); };
}

/* Mapa de carregamento: cada secao vira um chunk separado */
async function carregar(secao) {
  switch (secao) {
    case 'overview':   return (await import('./dashboard.js')).secaoOverview;
    case 'analytics':  return (await import('./dashboard.js')).secaoAnalytics;
    case 'vendas':     return (await import('./dashboard.js')).secaoVendas;
    case 'produtos':   return (await import('./produtos.js')).secaoProdutos;
    case 'estoque':    return (await import('./produtos.js')).secaoEstoque;
    case 'categorias': return (await import('./produtos.js')).secaoCategorias;
    case 'pedidos':    return (await import('./pedidos.js')).secaoPedidos;
    case 'clientes':   return (await import('./clientes.js')).secaoClientes;
    case 'avaliacoes': return (await import('./clientes.js')).secaoAvaliacoes;
    case 'promocoes':  return (await import('./promocoes.js')).secaoPromocoes;
    case 'config':     return (await import('./config.js')).secaoConfig;
    default:           return (await import('./dashboard.js')).secaoOverview;
  }
}
