/* ============================================================
   VANTA — Ponto de entrada
   Monta o shell, registra as rotas e liga as acoes globais.
   ============================================================ */

import { qs, delegate, observarAnimacoes } from './utils/dom.js';
import { on, onChange, iniciar, rotaAtual } from './router.js';
import { montarHeader, marcarNavAtiva } from './components/header.js';
import { montarFooter } from './components/footer.js';
import { toast } from './components/ui.js';
import {
  adicionarAoCarrinho, alternarFavorito, acharProduto, subscribe,
} from './services/store.js';
import { icon } from './components/icons.js';

const app = qs('#app');
const main = qs('#conteudo');

/* ---------- Shell ---------- */
const header = montarHeader();
app.prepend(header);
app.append(montarFooter());

let limparPagina = null;

/** Troca o conteudo da pagina, com continuidade visual */
function render(html, { scroll = true } = {}) {
  if (limparPagina) { limparPagina(); limparPagina = null; }
  main.innerHTML = html;
  if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
  observarAnimacoes(main);
  marcarNavAtiva();
  // Foco no conteudo a cada troca de rota, para leitor de tela
  main.setAttribute('tabindex', '-1');
  main.focus({ preventScroll: true });
}

/* ---------- Rotas ---------- */
on('/', async () => {
  const { paginaHome, ligarContagem } = await import('./pages/home.js');
  render(paginaHome());
  limparPagina = ligarContagem(main);
  document.title = 'VANTA | Tecnologia, setup e design';
});

on('/catalogo', async ({ query }) => {
  const { paginaCatalogo } = await import('./pages/catalogo.js');
  limparPagina = paginaCatalogo(main, query);
  document.title = 'Catálogo | VANTA';
});

on('/produto/:id', async ({ params }) => {
  const { paginaProduto } = await import('./pages/produto.js');
  limparPagina = paginaProduto(main, params.id);
});

on('/carrinho', async () => {
  const { paginaCarrinho } = await import('./pages/carrinho.js');
  limparPagina = paginaCarrinho(main);
  document.title = 'Carrinho | VANTA';
});

on('/checkout', async () => {
  const { paginaCheckout } = await import('./pages/checkout.js');
  limparPagina = paginaCheckout(main);
  document.title = 'Checkout | VANTA';
});

on('/pedido/:id', async ({ params }) => {
  const { paginaConfirmacao } = await import('./pages/confirmacao.js');
  limparPagina = paginaConfirmacao(main, params.id);
  document.title = `Pedido ${params.id} | VANTA`;
});

on('/favoritos', async () => {
  const { paginaFavoritos } = await import('./pages/favoritos.js');
  limparPagina = paginaFavoritos(main);
  document.title = 'Favoritos | VANTA';
});

on('/conta', async () => {
  const { paginaConta } = await import('./pages/conta.js');
  limparPagina = paginaConta(main, 'visao');
});

on('/conta/:secao', async ({ params }) => {
  const { paginaConta } = await import('./pages/conta.js');
  limparPagina = paginaConta(main, params.secao);
});

on('/admin', async () => {
  const { paginaAdmin } = await import('./pages/admin/index.js');
  limparPagina = paginaAdmin(main, 'overview', {});
});

on('/admin/:secao', async ({ params, query }) => {
  const { paginaAdmin } = await import('./pages/admin/index.js');
  limparPagina = paginaAdmin(main, params.secao, query);
});

on('*', () => {
  render(`
    <section class="section">
      <div class="shell">
        <div class="empty">
          <span class="empty__icon">${icon.vazio({ size: 28 })}</span>
          <h1 class="empty__title">Página não encontrada</h1>
          <p class="empty__text">O endereço acessado não existe nesta loja.</p>
          <a href="#/" class="btn btn--primary">Voltar para a home</a>
        </div>
      </div>
    </section>`);
  document.title = 'Não encontrado | VANTA';
});

/* ---------- Admin esconde o header/footer da loja ---------- */
onChange(({ path }) => {
  const ehAdmin = path.startsWith('/admin');
  header.hidden = ehAdmin;
  qs('.site-footer', app).hidden = ehAdmin;
  document.body.classList.toggle('modo-admin', ehAdmin);
});

/* ============================================================
   Acoes globais (delegacao: funcionam em qualquer pagina)
   ============================================================ */

/* Adicionar ao carrinho */
delegate(app, 'click', '[data-add]', (e, botao) => {
  e.preventDefault();
  const id = botao.dataset.add;
  const p = acharProduto(id);
  if (!p) return;

  const qtd = Number(botao.dataset.qtd) || 1;
  const cor = botao.dataset.cor || null;
  const r = adicionarAoCarrinho(id, qtd, cor);

  if (!r.ok) {
    toast({ titulo: 'Não foi possível adicionar', msg: r.motivo, tipo: 'danger' });
    return;
  }

  // Confirmacao curta com atalho para o carrinho
  toast({
    titulo: 'Adicionado ao carrinho',
    msg: p.nome,
    tipo: 'accent',
    acao: { label: 'Ver carrinho', onClick: () => import('./components/cartDrawer.js').then(m => m.abrirCarrinho()) },
  });

  // Microinteracao no proprio botao
  botao.classList.add('is-done');
  const rotulo = botao.textContent;
  botao.textContent = 'Adicionado';
  setTimeout(() => {
    botao.classList.remove('is-done');
    botao.textContent = rotulo;
  }, 1300);
});

/* Favoritar */
delegate(app, 'click', '[data-fav]', (e, botao) => {
  e.preventDefault();
  const id = botao.dataset.fav;
  const p = acharProduto(id);
  const virouFavorito = alternarFavorito(id);

  botao.classList.toggle('is-on', virouFavorito);
  botao.setAttribute('aria-pressed', String(virouFavorito));
  botao.innerHTML = icon.coracao({ size: 17, fill: virouFavorito });

  if (p) {
    toast({
      titulo: virouFavorito ? 'Salvo nos favoritos' : 'Removido dos favoritos',
      msg: p.nome,
      tipo: virouFavorito ? 'success' : 'info',
      duracao: 2600,
    });
  }
});

/* Mantem todos os botoes de favorito da tela em sincronia */
subscribe((evento) => {
  if (evento !== 'favoritos') return;
  import('./services/store.js').then(({ ehFavorito }) => {
    document.querySelectorAll('[data-fav]').forEach(b => {
      const ativo = ehFavorito(b.dataset.fav);
      b.classList.toggle('is-on', ativo);
      b.setAttribute('aria-pressed', String(ativo));
      b.innerHTML = icon.coracao({ size: 17, fill: ativo });
    });
  });
});

/* ---------- Sobe ---------- */
document.documentElement.classList.remove('no-js');
iniciar();

// Exposto para os testes automatizados conseguirem inspecionar o estado
window.__VANTA__ = { rotaAtual };
