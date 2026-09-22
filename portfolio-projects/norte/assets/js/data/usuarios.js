/* ============================================================
   NORTE — Usuários fictícios do painel
   Gerados com semente fixa: a lista é sempre a mesma entre
   recarregamentos, o que deixa o painel administrativo estável
   para demonstrar filtros, paginação e edição.
   ============================================================ */

import { REGIOES } from './regioes.js';
import { PROFISSOES } from './profissoes.js';

function semente(s) {
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = semente(19870413);
const inteiro = (a, b) => Math.floor(rand() * (b - a + 1)) + a;
const escolher = (lista) => lista[Math.floor(rand() * lista.length)];

const PRIMEIROS = [
  'Marina', 'Rafael', 'Camila', 'Bruno', 'Larissa', 'Diego', 'Juliana', 'Thiago',
  'Beatriz', 'Gustavo', 'Amanda', 'Felipe', 'Carolina', 'Leandro', 'Patrícia',
  'Rodrigo', 'Fernanda', 'Vinícius', 'Natália', 'André', 'Tatiane', 'Márcio',
  'Aline', 'Eduardo', 'Renata', 'Lucas', 'Priscila', 'Henrique', 'Vanessa', 'Caio',
  'Isabela', 'Murilo', 'Gabriela', 'Otávio', 'Letícia', 'Danilo', 'Mariana', 'Igor',
];

const SOBRENOMES = [
  'Duarte', 'Almeida', 'Nogueira', 'Barbosa', 'Rezende', 'Teixeira', 'Machado',
  'Vasconcelos', 'Fontes', 'Siqueira', 'Cardoso', 'Bittencourt', 'Rocha', 'Pires',
  'Amaral', 'Queiroz', 'Campos', 'Moraes', 'Tavares', 'Sampaio', 'Peixoto',
];

const PLANOS = [
  { id: 'gratuito', nome: 'Gratuito', peso: 68 },
  { id: 'plus', nome: 'Plus', peso: 24 },
  { id: 'pro', nome: 'Pro', peso: 8 },
];

const PAPEIS = [
  { id: 'candidato', nome: 'Candidato' },
  { id: 'recrutador', nome: 'Recrutador' },
  { id: 'admin', nome: 'Administrador' },
];

const HOJE = new Date('2026-09-22T12:00:00');

function diasAtras(d) {
  const x = new Date(HOJE);
  x.setDate(x.getDate() - d);
  return x.toISOString().slice(0, 10);
}

function planoSorteado() {
  const total = PLANOS.reduce((s, p) => s + p.peso, 0);
  let n = rand() * total;
  for (const p of PLANOS) {
    n -= p.peso;
    if (n <= 0) return p.id;
  }
  return 'gratuito';
}

function semAcento(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const usados = new Set();

export const USUARIOS = Array.from({ length: 64 }, (_, i) => {
  const nome = `${escolher(PRIMEIROS)} ${escolher(SOBRENOMES)}`;
  let base = semAcento(nome).replace(/\s+/g, '.');
  while (usados.has(base)) base += inteiro(2, 99);
  usados.add(base);

  const cadastro = inteiro(1, 500);
  const ultimoAcesso = Math.min(cadastro, inteiro(0, 70));
  const papel = i === 0 ? 'admin' : i < 3 ? 'admin' : rand() > 0.86 ? 'recrutador' : 'candidato';

  return {
    id: `us-${String(i + 1).padStart(3, '0')}`,
    nome,
    email: `${base}@exemplo.com`,
    papel,
    plano: papel === 'candidato' ? planoSorteado() : 'pro',
    regiaoId: escolher(REGIOES).id,
    profissaoId: escolher(PROFISSOES).id,
    candidaturas: Math.round(Math.pow(rand(), 1.6) * 22),
    alertas: Math.round(Math.pow(rand(), 1.4) * 5),
    cadastradoEm: diasAtras(cadastro),
    ultimoAcesso: diasAtras(ultimoAcesso),
    ativo: rand() > 0.08,
  };
});

export const PLANOS_LISTA = PLANOS;
export const PAPEIS_LISTA = PAPEIS;
export const PLANO_POR_ID = Object.fromEntries(PLANOS.map(p => [p.id, p]));
export const PAPEL_POR_ID = Object.fromEntries(PAPEIS.map(p => [p.id, p]));
