/* VANTA — Formatacao (moeda, numero, data, texto) */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUM = new Intl.NumberFormat('pt-BR');
const COMPACTO = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

/** Centavos -> "R$ 1.234,56" */
export const money = (centavos) => BRL.format((centavos || 0) / 100);

/** Centavos -> "1.234,56" (sem simbolo, para tabela) */
export const moneyPlain = (centavos) =>
  ((centavos || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const num = (n) => NUM.format(n || 0);
export const compact = (n) => COMPACTO.format(n || 0);
export const pct = (n, casas = 1) => `${(n || 0).toFixed(casas).replace('.', ',')}%`;

/** Parcelamento sem juros: maior numero de parcelas com valor >= R$ 50 */
export function parcelas(centavos, max = 12, minParcela = 5000) {
  let n = Math.min(max, Math.max(1, Math.floor(centavos / minParcela)));
  if (n < 1) n = 1;
  return { n, valor: Math.round(centavos / n) };
}

export function desconto(preco, precoAnterior) {
  if (!precoAnterior || precoAnterior <= preco) return 0;
  return Math.round((1 - preco / precoAnterior) * 100);
}

/* ---------- Datas ---------- */
export function dataCurta(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a.slice(2)}`;
}

export function dataLonga(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function dataMedia(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

const HOJE = new Date('2026-09-21T12:00:00');

export function haQuantoTempo(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  const dias = Math.round((HOJE - d) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  if (dias < 60) return 'há 1 mês';
  if (dias < 365) return `há ${Math.floor(dias / 30)} meses`;
  const anos = Math.floor(dias / 365);
  return anos === 1 ? 'há 1 ano' : `há ${anos} anos`;
}

export const hoje = () => HOJE.toISOString().slice(0, 10);

export function somaDias(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/* ---------- Texto ---------- */
export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const slug = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const iniciais = (nome) =>
  String(nome).trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

/** Normaliza para busca: sem acento, minusculo */
export const norm = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
