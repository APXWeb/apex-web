/* ============================================================
   NORTE — Formatacao
   ============================================================ */

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0,
});

const BRL_C = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
});

const NUM = new Intl.NumberFormat('pt-BR');

/** Salario mensal, sem centavos (R$ 7.500) */
export const dinheiro = (v) => BRL.format(Math.round(v || 0));

/** Valor com centavos, para o que precisa de precisao */
export const dinheiroExato = (v) => BRL_C.format(v || 0);

export const num = (v) => NUM.format(Math.round(v || 0));

/** 1.240 -> 1,2 mil | 1.240.000 -> 1,2 mi */
export function compacto(v) {
  const n = Math.round(v || 0);
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1).replace('.', ',') + ' mi';
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + ' mil';
  return NUM.format(n);
}

export const pct = (v, casas = 0) =>
  `${Number(v || 0).toFixed(casas).replace('.', ',')}%`;

/** Faixa salarial em uma linha */
export function faixa(min, max) {
  if (!min && !max) return 'A combinar';
  if (!max || min === max) return dinheiro(min);
  return `${dinheiro(min)} a ${dinheiro(max)}`;
}

export const km = (v) => {
  if (v === 0) return 'Remoto';
  if (v < 1) return `${Math.round(v * 1000)} m`;
  return `${String(v.toFixed(1)).replace('.', ',')} km`;
};

/* ---------- Datas ---------- */
const HOJE = new Date('2026-09-22T12:00:00');

export function hoje() {
  return HOJE.toISOString().slice(0, 10);
}

export function somaDias(iso, dias) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function dataCurta(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a.slice(2)}`;
}

export function dataMedia(iso) {
  if (!iso) return '';
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const [, m, d] = iso.split('-');
  return `${Number(d)} de ${meses[Number(m) - 1]}`;
}

export function dataLonga(iso) {
  if (!iso) return '';
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const [a, m, d] = iso.split('-');
  return `${Number(d)} de ${meses[Number(m) - 1]} de ${a}`;
}

/** "há 3 dias" a partir de uma data ISO */
export function haQuantoTempo(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  const dias = Math.round((HOJE - d) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  if (dias < 14) return 'há 1 semana';
  if (dias < 31) return `há ${Math.floor(dias / 7)} semanas`;
  if (dias < 60) return 'há 1 mês';
  if (dias < 365) return `há ${Math.floor(dias / 30)} meses`;
  return `há ${Math.floor(dias / 365)} ano${dias >= 730 ? 's' : ''}`;
}

/** Meses -> "2 anos e 6 meses" */
export function duracaoMeses(m) {
  if (!m) return '';
  const anos = Math.floor(m / 12);
  const meses = m % 12;
  const partes = [];
  if (anos) partes.push(`${anos} ano${anos > 1 ? 's' : ''}`);
  if (meses) partes.push(`${meses} mes${meses > 1 ? 'es' : ''}`);
  return partes.join(' e ');
}

/* ---------- Texto ---------- */
export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Normaliza para busca: sem acento, minusculo */
export function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function iniciais(nome) {
  return String(nome || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0] || '')
    .join('')
    .toUpperCase();
}

export function plural(n, singular, pluralForma) {
  return `${num(n)} ${n === 1 ? singular : (pluralForma || singular + 's')}`;
}

/** Destaca o trecho buscado dentro de um texto ja escapado */
export function realcar(texto, termo) {
  const t = escapeHtml(texto);
  if (!termo || termo.length < 2) return t;
  const alvo = norm(termo);
  const base = norm(texto);
  const i = base.indexOf(alvo);
  if (i < 0) return t;
  // Trabalha sobre o texto original para preservar acento
  const antes = escapeHtml(texto.slice(0, i));
  const meio = escapeHtml(texto.slice(i, i + termo.length));
  const depois = escapeHtml(texto.slice(i + termo.length));
  return `${antes}<mark>${meio}</mark>${depois}`;
}

export const capitalizar = (s) =>
  String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

/** Dinheiro curto para rotulo de grafico e estatistica: R$ 7,5 mil */
export function dinheiroCompacto(v) {
  const n = Math.round(v || 0);
  if (Math.abs(n) >= 1000000) return `R$ ${(n / 1000000).toFixed(1).replace('.', ',')} mi`;
  if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toFixed(1).replace('.', ',')} mil`;
  return dinheiro(n);
}
