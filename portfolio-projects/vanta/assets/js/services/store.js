/* ============================================================
   VANTA — Estado da aplicacao
   Fonte unica de verdade. Persiste no localStorage e avisa os
   assinantes quando algo muda, para a UI se redesenhar sozinha.
   ============================================================ */

import { PRODUCTS, CATEGORIES, PRODUCT_BY_ID } from '../data/catalog.js';
import { CUSTOMERS, ORDERS, REVIEWS, PROMOTIONS, COUPONS, SERIE, ORDER_STATUS } from '../data/seed.js';
import { hoje, somaDias } from '../utils/format.js';

/* A versao entra na chave: o catalogo mudou de ponta a ponta quando as
   fotos reais entraram, e um estado antigo salvo no navegador
   ressuscitaria os produtos velhos na mesclagem. */
const CHAVE = 'vanta_store_v2';

/* ---------- Estado inicial ---------- */
function estadoInicial() {
  return {
    // Catalogo: copia editavel (o admin altera isso de verdade)
    produtos: PRODUCTS.map(p => ({ ...p, ativo: true, publicado: true })),
    categorias: CATEGORIES.map(c => ({ ...c })),
    clientes: CUSTOMERS.map(c => ({ ...c })),
    pedidos: ORDERS.map(o => ({ ...o })),
    avaliacoes: REVIEWS.map(r => ({ ...r })),
    promocoes: PROMOTIONS.map(p => ({ ...p })),
    cupons: COUPONS.map(c => ({ ...c })),

    // Sessao do visitante
    carrinho: [],          // [{ produtoId, qtd, cor }]
    favoritos: [],         // [produtoId]
    cupomAplicado: null,
    enderecoEntrega: null,
    meusPedidos: [],       // pedidos criados nesta sessao

    // Perfil do cliente demonstrativo
    perfil: {
      nome: 'Helena Barbosa',
      email: 'helena.barbosa@exemplo.com',
      telefone: '(11) 98472-3310',
      cpf: '000.000.000-00',
      nascimento: '1994-03-17',
    },
    enderecos: [
      { id: 'end-1', rotulo: 'Casa', destinatario: 'Helena Barbosa', cep: '01415-002',
        rua: 'Rua Haddock Lobo, 1626', complemento: 'Apto 91', bairro: 'Cerqueira César',
        cidade: 'São Paulo', uf: 'SP', padrao: true },
      { id: 'end-2', rotulo: 'Escritório', destinatario: 'Helena Barbosa', cep: '04538-133',
        rua: 'Av. Brigadeiro Faria Lima, 3477', complemento: '14º andar', bairro: 'Itaim Bibi',
        cidade: 'São Paulo', uf: 'SP', padrao: false },
    ],
    config: {
      notificacoesEmail: true,
      notificacoesPromo: true,
      resumoSemanal: false,
      newsletter: true,
    },
  };
}

/* ---------- Carga / persistencia ---------- */
function carregar() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return estadoInicial();
    const salvo = JSON.parse(bruto);
    const base = estadoInicial();
    // Mescla raso: campos novos do codigo continuam existindo em sessoes antigas
    return { ...base, ...salvo, config: { ...base.config, ...(salvo.config || {}) } };
  } catch {
    return estadoInicial();
  }
}

export const state = carregar();

const assinantes = new Set();

export function subscribe(fn) {
  assinantes.add(fn);
  return () => assinantes.delete(fn);
}

let salvarAgendado = false;

export function commit(evento = 'change') {
  if (!salvarAgendado) {
    salvarAgendado = true;
    // Agrupa gravacoes seguidas num unico write
    setTimeout(() => {
      salvarAgendado = false;
      try { localStorage.setItem(CHAVE, JSON.stringify(state)); } catch { /* cota cheia: segue sem persistir */ }
    }, 0);
  }
  assinantes.forEach(fn => fn(evento));
}

export function resetarTudo() {
  localStorage.removeItem(CHAVE);
  Object.assign(state, estadoInicial());
  commit('reset');
}

/* ============================================================
   CATALOGO (leitura)
   ============================================================ */
export const produtosVisiveis = () =>
  state.produtos.filter(p => p.ativo && p.publicado);

export const acharProduto = (id) => state.produtos.find(p => p.id === id);

export function precoVigente(produto) {
  // Promocao de categoria ativa sobrepoe o preco anterior do produto
  const promo = promocaoDe(produto);
  if (!promo) return { preco: produto.preco, de: produto.precoAnterior, promo: null };
  if (promo.tipo === 'percentual') {
    return {
      preco: Math.round(produto.preco * (1 - promo.valor / 100)),
      de: produto.preco,
      promo,
    };
  }
  if (promo.tipo === 'fixo') {
    return { preco: Math.max(0, produto.preco - promo.valor), de: produto.preco, promo };
  }
  return { preco: produto.preco, de: produto.precoAnterior, promo: null };
}

export function promocaoDe(produto) {
  const d = hoje();
  return state.promocoes.find(pr =>
    pr.status === 'ativa' &&
    pr.tipo !== 'frete' &&
    (pr.categoria === 'todas' || pr.categoria === produto.cat) &&
    pr.inicio <= d && pr.fim >= d
  ) || null;
}

export const avaliacoesDe = (produtoId) =>
  state.avaliacoes.filter(r => r.produtoId === produtoId)
    .sort((a, b) => b.data.localeCompare(a.data));

export function relacionados(produto, n = 4) {
  return semFotoRepetida(
    produtosVisiveis()
      .filter(p => p.id !== produto.id && p.cat === produto.cat)
      .sort((a, b) => b.vendidos - a.vendidos)
  ).slice(0, n);
}

/* Variacoes de um mesmo item dividem a foto. Numa vitrine lado a lado
   isso parece defeito, entao os trilhos mostram so o primeiro de cada
   imagem. */
export function semFotoRepetida(lista) {
  const vistas = new Set();
  return lista.filter(p => {
    const capa = p.fotos?.[0];
    if (!capa) return true;
    if (vistas.has(capa)) return false;
    vistas.add(capa);
    return true;
  });
}

/* ============================================================
   CARRINHO
   ============================================================ */
export const itensCarrinho = () =>
  state.carrinho.map(i => {
    const p = acharProduto(i.produtoId);
    if (!p) return null;
    const { preco, de } = precoVigente(p);
    return { ...i, produto: p, preco, precoDe: de, subtotal: preco * i.qtd };
  }).filter(Boolean);

export const qtdCarrinho = () => state.carrinho.reduce((s, i) => s + i.qtd, 0);

export function adicionarAoCarrinho(produtoId, qtd = 1, cor = null) {
  const p = acharProduto(produtoId);
  if (!p) return { ok: false, motivo: 'Produto não encontrado.' };
  if (p.estoque <= 0) return { ok: false, motivo: 'Produto sem estoque.' };

  const existente = state.carrinho.find(i => i.produtoId === produtoId && i.cor === cor);
  const jaNoCarrinho = existente ? existente.qtd : 0;

  if (jaNoCarrinho + qtd > p.estoque) {
    return { ok: false, motivo: `Só temos ${p.estoque} em estoque.` };
  }

  if (existente) existente.qtd += qtd;
  else state.carrinho.push({ produtoId, qtd, cor: cor || p.finish });

  commit('carrinho');
  return { ok: true };
}

export function alterarQtd(produtoId, cor, qtd) {
  const item = state.carrinho.find(i => i.produtoId === produtoId && i.cor === cor);
  if (!item) return { ok: false };
  const p = acharProduto(produtoId);
  if (qtd > p.estoque) return { ok: false, motivo: `Máximo de ${p.estoque} unidades.` };
  if (qtd <= 0) return removerDoCarrinho(produtoId, cor);
  item.qtd = qtd;
  commit('carrinho');
  return { ok: true };
}

export function removerDoCarrinho(produtoId, cor) {
  const i = state.carrinho.findIndex(it => it.produtoId === produtoId && it.cor === cor);
  if (i < 0) return { ok: false };
  const removido = state.carrinho.splice(i, 1)[0];
  commit('carrinho');
  return { ok: true, removido };
}

export function restaurarNoCarrinho(item) {
  state.carrinho.push(item);
  commit('carrinho');
}

export function limparCarrinho() {
  state.carrinho = [];
  state.cupomAplicado = null;
  commit('carrinho');
}

/* ---------- Cupom e totais ---------- */
export function aplicarCupom(codigo) {
  const c = state.cupons.find(c => c.codigo === String(codigo).trim().toUpperCase());
  if (!c) return { ok: false, motivo: 'Cupom não encontrado.' };
  if (!c.ativo) return { ok: false, motivo: 'Este cupom não está mais válido.' };
  const sub = itensCarrinho().reduce((s, i) => s + i.subtotal, 0);
  if (sub < c.minimo) {
    return { ok: false, motivo: `Válido em compras acima de ${(c.minimo / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.` };
  }
  state.cupomAplicado = c.codigo;
  commit('carrinho');
  return { ok: true, cupom: c };
}

export function removerCupom() {
  state.cupomAplicado = null;
  commit('carrinho');
}

export const FRETE_PADRAO = 2490;
export const FRETE_GRATIS_ACIMA = 25000;

export function totais() {
  const itens = itensCarrinho();
  const subtotal = itens.reduce((s, i) => s + i.subtotal, 0);
  const economiaPromo = itens.reduce((s, i) => s + (i.precoDe ? (i.precoDe - i.preco) * i.qtd : 0), 0);

  const cupom = state.cupons.find(c => c.codigo === state.cupomAplicado) || null;
  let descontoCupom = 0;
  let freteGratisPorCupom = false;

  if (cupom && subtotal >= cupom.minimo) {
    if (cupom.tipo === 'percentual') descontoCupom = Math.round(subtotal * cupom.valor / 100);
    else if (cupom.tipo === 'fixo') descontoCupom = Math.min(cupom.valor, subtotal);
    else if (cupom.tipo === 'frete') freteGratisPorCupom = true;
  }

  const promoFrete = state.promocoes.some(p =>
    p.status === 'ativa' && p.tipo === 'frete' && p.inicio <= hoje() && p.fim >= hoje());

  const freteGratis = freteGratisPorCupom || (promoFrete && subtotal >= FRETE_GRATIS_ACIMA) || subtotal >= FRETE_GRATIS_ACIMA;
  const frete = itens.length === 0 ? 0 : (freteGratis ? 0 : FRETE_PADRAO);

  return {
    itens,
    qtd: itens.reduce((s, i) => s + i.qtd, 0),
    subtotal,
    economiaPromo,
    cupom,
    descontoCupom,
    frete,
    freteGratis,
    faltaParaFreteGratis: Math.max(0, FRETE_GRATIS_ACIMA - subtotal),
    total: Math.max(0, subtotal - descontoCupom + frete),
  };
}

/* ============================================================
   FAVORITOS
   ============================================================ */
export const ehFavorito = (id) => state.favoritos.includes(id);

export function alternarFavorito(id) {
  const i = state.favoritos.indexOf(id);
  if (i >= 0) state.favoritos.splice(i, 1);
  else state.favoritos.push(id);
  commit('favoritos');
  return i < 0; // true = virou favorito
}

export const produtosFavoritos = () =>
  state.favoritos.map(acharProduto).filter(Boolean);

/* ============================================================
   PEDIDOS (cliente)
   ============================================================ */
export function finalizarPedido(dados) {
  const t = totais();
  if (!t.itens.length) return { ok: false, motivo: 'Carrinho vazio.' };

  const numero = `VNT-${26200 + state.meusPedidos.length + 1}`;
  const pedido = {
    id: numero,
    clienteId: 'cli-000',
    cliente: dados.nome,
    email: dados.email,
    data: hoje(),
    itens: t.itens.map(i => ({
      produtoId: i.produto.id, nome: i.produto.nome, art: i.produto.art,
      cor: i.cor || null, finish: i.cor || i.produto.finish, preco: i.preco, qtd: i.qtd,
    })),
    subtotal: t.subtotal,
    frete: t.frete,
    desconto: t.descontoCupom,
    total: t.total,
    status: 'confirmado',
    pagamento: dados.pagamento,
    entregaPrevista: somaDias(hoje(), dados.prazoDias || 5),
    endereco: dados.endereco,
    meu: true,
  };

  // Baixa de estoque e contagem de vendas
  t.itens.forEach(i => {
    const p = acharProduto(i.produto.id);
    if (p) { p.estoque = Math.max(0, p.estoque - i.qtd); p.vendidos += i.qtd; }
  });

  state.pedidos.unshift(pedido);
  state.meusPedidos.unshift(numero);
  limparCarrinho();
  commit('pedido');
  return { ok: true, pedido };
}

export const meusPedidos = () =>
  state.meusPedidos.map(id => state.pedidos.find(p => p.id === id)).filter(Boolean);

export const acharPedido = (id) => state.pedidos.find(p => p.id === id);

/* ============================================================
   ADMIN — mutacoes
   ============================================================ */
export function salvarProduto(dados) {
  if (dados.id) {
    const p = acharProduto(dados.id);
    if (!p) return { ok: false, motivo: 'Produto não encontrado.' };
    Object.assign(p, dados);
    commit('produtos');
    return { ok: true, produto: p, criado: false };
  }
  // Os dados do formulario vem primeiro; os campos gerados so preenchem
  // o que faltou. (Espalhar `dados` por ultimo apagava o id recem-criado,
  // porque para um produto novo `dados.id` chega como undefined.)
  const novo = {
    ...dados,
    id: dados.id || `vn-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
    sku: dados.sku || `VNT-NEW-${Math.floor(Math.random() * 9000 + 1000)}`,
    art: dados.art || 'notebook',
    finish: dados.finish || 'graphite',
    cores: dados.cores || [dados.finish || 'graphite'],
    criadoEm: dados.criadoEm || hoje(),
    vendidos: dados.vendidos ?? 0,
    nota: dados.nota ?? 0,
    avaliacoes: dados.avaliacoes ?? 0,
    destaque: dados.destaque ?? false,
    novo: dados.novo ?? true,
    ativo: true,
    publicado: dados.publicado ?? true,
    specs: dados.specs || [],
    resumo: dados.resumo || '',
    desc: dados.desc || '',
    precoAnterior: dados.precoAnterior ?? null,
    estoqueMin: dados.estoqueMin ?? 5,
  };
  state.produtos.unshift(novo);
  commit('produtos');
  return { ok: true, produto: novo, criado: true };
}

export function excluirProduto(id) {
  const i = state.produtos.findIndex(p => p.id === id);
  if (i < 0) return { ok: false };
  const removido = state.produtos.splice(i, 1)[0];
  commit('produtos');
  return { ok: true, removido };
}

export function restaurarProduto(produto, posicao = 0) {
  state.produtos.splice(posicao, 0, produto);
  commit('produtos');
}

export function alternarPublicado(id) {
  const p = acharProduto(id);
  if (!p) return { ok: false };
  p.publicado = !p.publicado;
  commit('produtos');
  return { ok: true, publicado: p.publicado };
}

export function ajustarEstoque(id, valor) {
  const p = acharProduto(id);
  if (!p) return { ok: false };
  p.estoque = Math.max(0, Number(valor) || 0);
  commit('produtos');
  return { ok: true, estoque: p.estoque };
}

export function mudarStatusPedido(pedidoId, status) {
  const p = acharPedido(pedidoId);
  if (!p || !ORDER_STATUS[status]) return { ok: false };
  const anterior = p.status;
  p.status = status;
  commit('pedidos');
  return { ok: true, anterior };
}

export function salvarPromocao(dados) {
  if (dados.id) {
    const pr = state.promocoes.find(p => p.id === dados.id);
    if (!pr) return { ok: false };
    Object.assign(pr, dados);
    commit('promocoes');
    return { ok: true, promocao: pr, criado: false };
  }
  const nova = { id: `promo-${Date.now().toString().slice(-6)}`, usos: 0, ...dados };
  state.promocoes.unshift(nova);
  commit('promocoes');
  return { ok: true, promocao: nova, criado: true };
}

export function excluirPromocao(id) {
  const i = state.promocoes.findIndex(p => p.id === id);
  if (i < 0) return { ok: false };
  const removida = state.promocoes.splice(i, 1)[0];
  commit('promocoes');
  return { ok: true, removida };
}

export function alternarPromocao(id) {
  const pr = state.promocoes.find(p => p.id === id);
  if (!pr) return { ok: false };
  pr.status = pr.status === 'ativa' ? 'encerrada' : 'ativa';
  commit('promocoes');
  return { ok: true, status: pr.status };
}

export function salvarCupom(dados) {
  const existente = state.cupons.find(c => c.codigo === dados.codigo);
  if (existente) { Object.assign(existente, dados); commit('cupons'); return { ok: true, criado: false }; }
  state.cupons.unshift({ ativo: true, ...dados });
  commit('cupons');
  return { ok: true, criado: true };
}

/* ---------- Enderecos e perfil ---------- */
export function salvarEndereco(dados) {
  if (dados.id) {
    const e = state.enderecos.find(e => e.id === dados.id);
    if (e) Object.assign(e, dados);
  } else {
    state.enderecos.push({ id: `end-${Date.now().toString().slice(-6)}`, ...dados });
  }
  if (dados.padrao) {
    state.enderecos.forEach(e => { e.padrao = e.id === (dados.id || state.enderecos.at(-1).id); });
  }
  commit('enderecos');
  return { ok: true };
}

export function excluirEndereco(id) {
  const i = state.enderecos.findIndex(e => e.id === id);
  if (i < 0) return { ok: false };
  state.enderecos.splice(i, 1);
  commit('enderecos');
  return { ok: true };
}

export function salvarPerfil(dados) {
  Object.assign(state.perfil, dados);
  commit('perfil');
  return { ok: true };
}

export function salvarConfig(chave, valor) {
  state.config[chave] = valor;
  commit('config');
}

/* ============================================================
   ANALYTICS
   ============================================================ */
export const PERIODOS = {
  '1d':  { label: 'Hoje',     dias: 1 },
  '7d':  { label: '7 dias',   dias: 7 },
  '30d': { label: '30 dias',  dias: 30 },
  '90d': { label: '90 dias',  dias: 90 },
  '1a':  { label: '1 ano',    dias: 365 },
};

export function serieDoPeriodo(periodo = '30d') {
  const dias = PERIODOS[periodo]?.dias || 30;
  return SERIE.slice(-dias);
}

export function serieAnterior(periodo = '30d') {
  const dias = PERIODOS[periodo]?.dias || 30;
  return SERIE.slice(-dias * 2, -dias);
}

export function resumoPeriodo(periodo = '30d') {
  const atual = serieDoPeriodo(periodo);
  const ant = serieAnterior(periodo);

  const soma = (arr, campo) => arr.reduce((s, d) => s + d[campo], 0);
  const variacao = (a, b) => (b === 0 ? 0 : ((a - b) / b) * 100);

  const receita = soma(atual, 'receita');
  const pedidos = soma(atual, 'pedidos');
  const visitantes = soma(atual, 'visitantes');
  const novos = soma(atual, 'novosClientes');

  const receitaAnt = soma(ant, 'receita') || receita * 0.85;
  const pedidosAnt = soma(ant, 'pedidos') || pedidos * 0.88;
  const visitantesAnt = soma(ant, 'visitantes') || visitantes * 0.9;
  const novosAnt = soma(ant, 'novosClientes') || novos * 0.8;

  const ticket = pedidos ? Math.round(receita / pedidos) : 0;
  const ticketAnt = pedidosAnt ? Math.round(receitaAnt / pedidosAnt) : 0;
  const conv = visitantes ? (pedidos / visitantes) * 100 : 0;
  const convAnt = visitantesAnt ? (pedidosAnt / visitantesAnt) * 100 : 0;

  return {
    atual, anterior: ant,
    receita, pedidos, visitantes, novos, ticket, conv,
    unidades: Math.round(pedidos * 1.42),
    delta: {
      receita: variacao(receita, receitaAnt),
      pedidos: variacao(pedidos, pedidosAnt),
      visitantes: variacao(visitantes, visitantesAnt),
      novos: variacao(novos, novosAnt),
      ticket: variacao(ticket, ticketAnt),
      conv: variacao(conv, convAnt),
    },
  };
}

export function vendasPorCategoria() {
  const mapa = {};
  state.categorias.forEach(c => { mapa[c.id] = { nome: c.nome, valor: 0, unidades: 0 }; });
  state.pedidos.forEach(o => {
    if (o.status === 'cancelado') return;
    o.itens.forEach(it => {
      const p = PRODUCT_BY_ID[it.produtoId] || acharProduto(it.produtoId);
      if (!p || !mapa[p.cat]) return;
      mapa[p.cat].valor += it.preco * it.qtd;
      mapa[p.cat].unidades += it.qtd;
    });
  });
  return Object.entries(mapa)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.valor - a.valor);
}

export function maisVendidos(n = 6) {
  return semFotoRepetida(
    [...state.produtos].sort((a, b) => b.vendidos - a.vendidos)
  ).slice(0, n);
}

export function estoqueBaixo() {
  return state.produtos
    .filter(p => p.estoque <= p.estoqueMin)
    .sort((a, b) => a.estoque - b.estoque);
}

export { ORDER_STATUS };
