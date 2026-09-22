/* ============================================================
   VANTA — Geracao dos dados ficticios derivados
   Usa um PRNG com semente fixa: os numeros parecem aleatorios
   mas sao sempre os mesmos, entao o dashboard nao "muda de
   historia" a cada recarga.
   ============================================================ */

import { PRODUCTS } from './catalog.js';

/* PRNG deterministico (mulberry32) */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(20260921);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

const HOJE = new Date('2026-09-21T12:00:00');

function diasAtras(n) {
  const d = new Date(HOJE);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/* ---------------- Clientes ---------------- */
const NOMES = [
  'HelenaВаrbosa', 'Rafael Nogueira', 'Camila Ferraz', 'Thiago Amaral', 'Beatriz Lemos',
  'Gustavo Pires', 'Larissa Tavares', 'Otávio Rangel', 'Mariana Duarte', 'Felipe Andrade',
  'Juliana Peixoto', 'Bruno Vasconcelos', 'Renata Siqueira', 'Eduardo Bastos', 'Carolina Muniz',
  'Vinícius Rocha', 'Patrícia Goulart', 'Leonardo Vieira', 'Isabela Nunes', 'André Cavalcanti',
  'Fernanda Quintela', 'Marcelo Britto', 'Tatiana Rezende', 'Rodrigo Sampaio', 'Luciana Prado',
  'Henrique Moraes', 'Simone Aguiar', 'Daniel Fontes', 'Priscila Barros', 'Caio Monteiro',
].map(n => n.replace('В', 'B'));

const CIDADES = [
  ['São Paulo', 'SP'], ['Rio de Janeiro', 'RJ'], ['Belo Horizonte', 'MG'], ['Curitiba', 'PR'],
  ['Porto Alegre', 'RS'], ['Florianópolis', 'SC'], ['Recife', 'PE'], ['Salvador', 'BA'],
  ['Brasília', 'DF'], ['Campinas', 'SP'], ['Fortaleza', 'CE'], ['Goiânia', 'GO'],
];

const RUAS = ['Rua das Palmeiras', 'Av. Brigadeiro Faria Lima', 'Rua Haddock Lobo', 'Av. Paulista',
  'Rua Augusta', 'Alameda Santos', 'Rua Oscar Freire', 'Av. Rebouças', 'Rua Bela Cintra'];

function slugEmail(nome) {
  return nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '.') + '@exemplo.com';
}

export const CUSTOMERS = NOMES.map((nome, i) => {
  const [cidade, uf] = pick(CIDADES);
  const desde = diasAtras(int(20, 700));
  return {
    id: `cli-${String(i + 1).padStart(3, '0')}`,
    nome,
    email: slugEmail(nome),
    telefone: `(${pick(['11', '21', '31', '41', '51'])}) 9${int(1000, 9999)}-${int(1000, 9999)}`,
    cidade, uf,
    endereco: `${pick(RUAS)}, ${int(50, 1980)}`,
    cep: `${int(10, 99)}${int(100, 999)}-${int(100, 999)}`,
    desde,
    status: rand() > 0.12 ? 'ativo' : 'inativo',
    // preenchidos depois, a partir dos pedidos
    pedidos: 0, gasto: 0, ultimaCompra: null,
  };
});

/* ---------------- Pedidos ---------------- */
export const ORDER_STATUS = {
  pendente:   { label: 'Pendente',   tone: 'warning', passo: 0 },
  confirmado: { label: 'Confirmado', tone: 'info',    passo: 1 },
  preparando: { label: 'Preparando', tone: 'info',    passo: 2 },
  enviado:    { label: 'Enviado',    tone: 'accent',  passo: 3 },
  entregue:   { label: 'Entregue',   tone: 'success', passo: 4 },
  cancelado:  { label: 'Cancelado',  tone: 'danger',  passo: -1 },
};

const PAGAMENTOS = ['Pix', 'Cartão de crédito', 'Cartão de crédito', 'Cartão de crédito', 'Boleto'];

function statusPorIdade(dias) {
  if (dias > 22) return rand() > 0.07 ? 'entregue' : 'cancelado';
  if (dias > 12) return pick(['entregue', 'entregue', 'enviado', 'cancelado']);
  if (dias > 6) return pick(['enviado', 'enviado', 'preparando', 'entregue']);
  if (dias > 2) return pick(['preparando', 'confirmado', 'enviado']);
  return pick(['pendente', 'confirmado', 'confirmado', 'preparando']);
}

export const ORDERS = [];

for (let i = 0; i < 168; i++) {
  const dias = Math.floor(Math.pow(rand(), 1.5) * 300);
  const cliente = pick(CUSTOMERS);
  const nItens = rand() > 0.62 ? int(2, 4) : 1;
  const itens = [];
  const usados = new Set();

  for (let k = 0; k < nItens; k++) {
    let p = pick(PRODUCTS);
    let guard = 0;
    while (usados.has(p.id) && guard++ < 8) p = pick(PRODUCTS);
    usados.add(p.id);
    itens.push({ produtoId: p.id, nome: p.nome, art: p.art, finish: p.finish, preco: p.preco, qtd: rand() > 0.82 ? 2 : 1 });
  }

  const subtotal = itens.reduce((s, it) => s + it.preco * it.qtd, 0);
  const frete = subtotal > 30000000 ? 0 : (subtotal > 25000 ? 0 : 2490);
  const desconto = rand() > 0.78 ? Math.round(subtotal * pick([0.05, 0.08, 0.1, 0.12])) : 0;
  const status = statusPorIdade(dias);

  ORDERS.push({
    id: `VNT-${26000 + i}`,
    clienteId: cliente.id,
    cliente: cliente.nome,
    email: cliente.email,
    data: diasAtras(dias),
    itens,
    subtotal,
    frete,
    desconto,
    total: subtotal + frete - desconto,
    status,
    pagamento: pick(PAGAMENTOS),
    entregaPrevista: diasAtras(dias - int(4, 9)),
    endereco: `${cliente.endereco}, ${cliente.cidade}/${cliente.uf}`,
  });
}

ORDERS.sort((a, b) => b.data.localeCompare(a.data));

// Consolida os totais por cliente
ORDERS.forEach(o => {
  if (o.status === 'cancelado') return;
  const c = CUSTOMERS.find(c => c.id === o.clienteId);
  if (!c) return;
  c.pedidos += 1;
  c.gasto += o.total;
  if (!c.ultimaCompra || o.data > c.ultimaCompra) c.ultimaCompra = o.data;
});

/* ---------------- Avaliacoes ---------------- */
const COMENTARIOS = [
  ['Superou o que eu esperava', 'Comprei meio na dúvida pelo preço e me surpreendi. Acabamento muito acima do que a foto mostra.'],
  ['Vale cada centavo', 'Uso todo dia há dois meses. Nenhum arrependimento, faria de novo.'],
  ['Muito bom, com uma ressalva', 'O produto é excelente, só achei o manual bem fraco. Tive que procurar no site como configurar.'],
  ['Exatamente como descrito', 'Chegou antes do prazo e é idêntico ao anúncio. Recomendo.'],
  ['Qualidade de construção impressiona', 'Dá pra sentir que não economizaram em material. Pesado na medida certa.'],
  ['Bom, mas esperava mais', 'Funciona bem, mas pelo valor achei que viria com mais acessórios na caixa.'],
  ['Melhor compra do ano', 'Mudou minha rotina de trabalho completamente. Devia ter comprado antes.'],
  ['Atendeu bem', 'Cumpre o que promete, sem sustos. Entrega foi rápida.'],
  ['Design impecável', 'Além de funcionar bem, é bonito de deixar à mostra na mesa.'],
  ['Recomendo com ressalva', 'Ótimo produto, mas o aplicativo companheiro ainda precisa melhorar.'],
  ['Simplesmente funciona', 'Tirei da caixa, liguei e funcionou. Sem configuração complicada.'],
  ['Robusto e bem pensado', 'Detalhes que só aparecem no uso mostram que foi projetado por quem usa.'],
];

export const REVIEWS = [];

PRODUCTS.forEach(p => {
  const n = int(3, 11);
  for (let i = 0; i < n; i++) {
    const nota = rand() > 0.16 ? int(4, 5) : int(2, 3);
    const [titulo, texto] = pick(COMENTARIOS);
    const cliente = pick(CUSTOMERS);
    REVIEWS.push({
      id: `rev-${REVIEWS.length + 1}`,
      produtoId: p.id,
      cliente: cliente.nome,
      clienteId: cliente.id,
      nota,
      titulo,
      texto,
      data: diasAtras(int(2, 240)),
      verificada: rand() > 0.22,
      util: int(0, 34),
    });
  }
});

// Nota media e contagem entram no produto
PRODUCTS.forEach(p => {
  const rs = REVIEWS.filter(r => r.produtoId === p.id);
  p.avaliacoes = rs.length;
  p.nota = rs.length ? Math.round((rs.reduce((s, r) => s + r.nota, 0) / rs.length) * 10) / 10 : 0;
});

/* ---------------- Promocoes ---------------- */
export const PROMOTIONS = [
  { id: 'promo-1', nome: 'Semana da Informática', tipo: 'percentual', valor: 15, categoria: 'info',
    inicio: diasAtras(4), fim: diasAtras(-6), status: 'ativa', usos: 214,
    desc: 'Desconto em monitores, notebooks e acessórios de carga.' },
  { id: 'promo-2', nome: 'Áudio em Destaque', tipo: 'percentual', valor: 12, categoria: 'audio',
    inicio: diasAtras(1), fim: diasAtras(-13), status: 'ativa', usos: 96,
    desc: 'Fones, headsets e caixas de som selecionados.' },
  { id: 'promo-3', nome: 'Frete Grátis Nacional', tipo: 'frete', valor: 0, categoria: 'todas',
    inicio: diasAtras(9), fim: diasAtras(-2), status: 'ativa', usos: 638,
    desc: 'Frete grátis para todo o Brasil em compras acima de R$ 250.' },
  { id: 'promo-4', nome: 'Lançamento Primavera', tipo: 'percentual', valor: 10, categoria: 'casa',
    inicio: diasAtras(-8), fim: diasAtras(-28), status: 'programada', usos: 0,
    desc: 'Campanha programada para a coleção de estação.' },
  { id: 'promo-5', nome: 'Liquidação de Inverno', tipo: 'percentual', valor: 25, categoria: 'todas',
    inicio: diasAtras(88), fim: diasAtras(61), status: 'encerrada', usos: 1247,
    desc: 'Campanha sazonal encerrada.' },
  { id: 'promo-6', nome: 'Combo Cozinha Completa', tipo: 'fixo', valor: 15000, categoria: 'cozinha',
    inicio: diasAtras(30), fim: diasAtras(12), status: 'encerrada', usos: 183,
    desc: 'R$ 150 de desconto na compra de air fryer + cafeteira.' },
];

export const COUPONS = [
  { codigo: 'VANTA10',   tipo: 'percentual', valor: 10, minimo: 0,      ativo: true,  desc: '10% de desconto' },
  { codigo: 'CASA20',    tipo: 'percentual', valor: 20, minimo: 50000,  ativo: true,  desc: '20% acima de R$ 500' },
  { codigo: 'FRETEZERO', tipo: 'frete',      valor: 0,  minimo: 15000,  ativo: true,  desc: 'Frete grátis acima de R$ 150' },
  { codigo: 'PRIMEIRA',  tipo: 'fixo',       valor: 5000, minimo: 20000, ativo: true, desc: 'R$ 50 na primeira compra' },
  { codigo: 'INVERNO25', tipo: 'percentual', valor: 25, minimo: 0,      ativo: false, desc: 'Campanha encerrada' },
];

/* ---------------- Series para analytics ----------------
   Receita diaria dos ultimos 365 dias, com tendencia de alta,
   sazonalidade semanal (fim de semana mais fraco) e ruido. */
function serieDiaria(dias) {
  const out = [];
  const r = rng(77321);
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(HOJE);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const tendencia = 1 + (dias - i) / dias * 0.55;            // cresce ao longo do periodo
    const semana = dow === 0 || dow === 6 ? 0.68 : 1;          // fim de semana cai
    const pico = (dow === 3 || dow === 4) ? 1.12 : 1;          // meio de semana sobe
    const ruido = 0.78 + r() * 0.44;
    const base = 1850000;
    out.push({
      data: d.toISOString().slice(0, 10),
      receita: Math.round(base * tendencia * semana * pico * ruido),
      pedidos: Math.round(14 * tendencia * semana * pico * (0.8 + r() * 0.4)),
      visitantes: Math.round(980 * tendencia * semana * (0.82 + r() * 0.36)),
      novosClientes: Math.round(6 * tendencia * semana * (0.7 + r() * 0.6)),
    });
  }
  return out;
}

export const SERIE = serieDiaria(365);
