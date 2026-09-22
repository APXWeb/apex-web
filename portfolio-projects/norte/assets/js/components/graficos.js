/* ============================================================
   NORTE — Graficos
   SVG escrito na mao, sem biblioteca. Cada grafico devolve HTML;
   depois `ativarGraficos(raiz)` liga a dica flutuante e a
   navegacao por teclado em todos os graficos daquele container.

   Todo ponto interativo e um <g class="graf__alvo" tabindex="0">
   que carrega os dados da dica em data-*. Assim a interacao e uma
   so, independente do tipo de grafico.
   ============================================================ */

import { qs, qsa } from '../utils/dom.js';
import { escapeHtml, compacto, num } from '../utils/format.js';

let seq = 0;
const uid = (p = 'g') => `${p}-${(++seq).toString(36)}`;

const CORES = ['var(--dado-1)', 'var(--dado-2)', 'var(--dado-3)',
  'var(--dado-4)', 'var(--dado-5)', 'var(--dado-6)'];

export const corDado = (i) => CORES[i % CORES.length];

/* ------------------------------------------------------------
   Escala com marcas "redondas"
   ------------------------------------------------------------ */
function escala(valores, { zero = true, alvoLinhas = 4 } = {}) {
  const finitos = valores.filter(v => Number.isFinite(v));
  let min = finitos.length ? Math.min(...finitos) : 0;
  let max = finitos.length ? Math.max(...finitos) : 1;

  if (zero) min = Math.min(0, min);
  if (min === max) { max = max || 1; min = zero ? 0 : min - Math.abs(max) * 0.25; }

  const bruto = (max - min) / alvoLinhas;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto || 1)));
  const passo = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= bruto) || mag * 10;

  const lo = Math.floor(min / passo) * passo;
  const hi = Math.ceil(max / passo) * passo;

  const linhas = [];
  for (let v = lo; v <= hi + passo * 1e-6; v += passo) linhas.push(Number(v.toFixed(6)));
  return { min: lo, max: hi, passo, linhas };
}

/** Spline cardinal suave, presa dentro da area de plotagem */
function caminhoSuave(pts, limiteBaixo, tensao = 0.22) {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : '';
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  const preso = (y) => Math.max(0, Math.min(limiteBaixo, y));
  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const c1x = p1.x + (p2.x - p0.x) * tensao;
    const c1y = preso(p1.y + (p2.y - p0.y) * tensao);
    const c2x = p2.x - (p3.x - p1.x) * tensao;
    const c2y = preso(p2.y - (p3.y - p1.y) * tensao);

    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/** Conteudo da dica, guardado nos data-* do alvo */
function dadosDica({ titulo, valor, sub }) {
  return [
    `data-dt="${escapeHtml(titulo || '')}"`,
    `data-dv="${escapeHtml(valor || '')}"`,
    sub ? `data-ds="${escapeHtml(sub)}"` : '',
  ].join(' ');
}

function moldura({ titulo, sub, acao, corpo, legenda, tabela, classe = '' }) {
  const temCabeca = titulo || sub || acao;
  return `
  <figure class="graf ${classe}" data-graf>
    ${temCabeca ? `
      <div class="graf__cabeca">
        <figcaption>
          ${titulo ? `<p class="graf__titulo">${escapeHtml(titulo)}</p>` : ''}
          ${sub ? `<p class="graf__sub">${escapeHtml(sub)}</p>` : ''}
        </figcaption>
        ${acao || ''}
      </div>` : ''}
    <div class="graf__palco">
      ${corpo}
      <div class="graf__dica" data-dica hidden></div>
    </div>
    ${legenda || ''}
    ${tabela || ''}
  </figure>`;
}

/** Tabela so para leitor de tela: o grafico vira dado legivel */
function tabelaOculta(cabecalhos, linhas, resumo) {
  if (!linhas.length) return '';
  // A tabela vai dentro de um <div> escondido: elemento de tabela
  // nao respeita largura minima e escaparia do clip sozinho.
  return `
  <div class="so-leitor"><table>
    ${resumo ? `<caption>${escapeHtml(resumo)}</caption>` : ''}
    <thead><tr>${cabecalhos.map(c => `<th scope="col">${escapeHtml(c)}</th>`).join('')}</tr></thead>
    <tbody>
      ${linhas.map(l => `<tr>${l.map((c, i) =>
        i === 0 ? `<th scope="row">${escapeHtml(c)}</th>` : `<td>${escapeHtml(c)}</td>`
      ).join('')}</tr>`).join('')}
    </tbody>
  </table></div>`;
}

function htmlLegenda(itens) {
  if (!itens || itens.length < 2) return '';
  return `
  <ul class="graf__legenda">
    ${itens.map(i => `
      <li class="graf__legenda-i">
        <span class="graf__legenda-c" style="background:${i.cor}"></span>
        ${escapeHtml(i.nome)}
        ${i.valor ? `<span class="graf__legenda-n">${escapeHtml(i.valor)}</span>` : ''}
      </li>`).join('')}
  </ul>`;
}

/* ============================================================
   LINHA / AREA
   pontos: [{ rotulo, valor, sub }]
   ou series: [{ nome, cor, tracejada, pontos: [...] }]
   ============================================================ */
export function graficoLinha(entrada, o = {}) {
  const series = Array.isArray(entrada) && entrada[0]?.pontos
    ? entrada
    : [{ nome: o.nome || 'Valor', cor: o.cor || corDado(0), pontos: entrada }];

  const base = series[0].pontos || [];
  if (base.length < 2) return moldura({ titulo: o.titulo, sub: o.sub, corpo: vazioSvg() });

  const fmt = o.fmt || compacto;
  const W = 720, H = o.altura || 300;
  const m = { t: 18, r: 18, b: 34, l: o.margemEsq ?? 74 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;

  const todos = series.flatMap(s => s.pontos.map(p => p.valor));
  const esc = escala(todos, { zero: o.zero !== false });
  const yDe = (v) => m.t + ph - ((v - esc.min) / (esc.max - esc.min || 1)) * ph;
  const xDe = (i) => m.l + (base.length === 1 ? pw / 2 : (i / (base.length - 1)) * pw);

  // Com muitos pontos, so alguns rotulos cabem no eixo X
  const passoX = Math.max(1, Math.ceil(base.length / (o.maxRotulosX || 7)));

  const grade = esc.linhas.map(v => `
    <line class="graf__grade" x1="${m.l}" y1="${yDe(v).toFixed(1)}" x2="${W - m.r}" y2="${yDe(v).toFixed(1)}"/>
    <text class="graf__rot graf__rot--y graf__rot--num" x="${m.l - 10}" y="${(yDe(v) + 3.5).toFixed(1)}">${escapeHtml(fmt(v))}</text>
  `).join('');

  const rotulosX = base.map((p, i) =>
    (i % passoX === 0 || i === base.length - 1)
      ? `<text class="graf__rot graf__rot--x" x="${xDe(i).toFixed(1)}" y="${H - 12}">${escapeHtml(p.rotulo)}</text>`
      : ''
  ).join('');

  const desenho = series.map((s, si) => {
    const cor = s.cor || corDado(si);
    const pts = s.pontos.map((p, i) => ({ x: xDe(i), y: yDe(p.valor) }));
    const d = caminhoSuave(pts, m.t + ph);
    const idArea = uid('area');

    const area = (o.area !== false && series.length === 1)
      ? `<defs>
           <linearGradient id="${idArea}" x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stop-color="${cor}" stop-opacity="0.9"/>
             <stop offset="100%" stop-color="${cor}" stop-opacity="0"/>
           </linearGradient>
         </defs>
         <path class="graf__area graf__area--anim" fill="url(#${idArea})"
               d="${d} L ${pts[pts.length - 1].x.toFixed(2)} ${m.t + ph} L ${pts[0].x.toFixed(2)} ${m.t + ph} Z"/>`
      : '';

    // O comprimento alimenta a animacao de traco do CSS
    const comp = Math.round(pts.reduce((s2, p, i) =>
      i ? s2 + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0, 0) * 1.08);

    return `${area}
      <path class="graf__linha graf__linha--anim ${s.tracejada ? 'graf__linha--tracejada' : ''}"
            style="--comp:${comp}" stroke="${cor}" d="${d}"/>`;
  }).join('');

  // Alvos: uma faixa por indice, cobrindo todas as series daquele X
  const largura = pw / Math.max(1, base.length - 1);
  const alvos = base.map((p, i) => {
    const x = xDe(i);
    const principal = series[0].pontos[i];
    const sub = series.length > 1
      ? series.map((s, si) => `${s.nome}: ${fmt(s.pontos[i]?.valor ?? 0)}`).slice(1).join(' · ')
      : (p.sub || o.subPonto?.(p, i) || '');

    return `
    <g class="graf__alvo" tabindex="0" role="img" data-p
       aria-label="${escapeHtml(`${p.rotulo}: ${fmt(principal.valor)}${sub ? '. ' + sub : ''}`)}"
       data-tx="${((x / W) * 100).toFixed(2)}" data-ty="${((yDe(principal.valor) / H) * 100).toFixed(2)}"
       ${dadosDica({ titulo: p.rotulo, valor: fmt(principal.valor), sub })}>
      <rect class="graf__hit" x="${(x - largura / 2).toFixed(1)}" y="${m.t}"
            width="${largura.toFixed(1)}" height="${ph}"/>
      <line class="graf__guia" x1="${x.toFixed(1)}" y1="${m.t}" x2="${x.toFixed(1)}" y2="${m.t + ph}"/>
      ${series.map((s, si) => `
        <circle class="graf__ponto-b" style="--ordem:${i}" cx="${x.toFixed(1)}"
                cy="${yDe(s.pontos[i]?.valor ?? esc.min).toFixed(1)}" r="4.5"
                fill="${s.cor || corDado(si)}"/>`).join('')}
    </g>`;
  }).join('');

  const corpo = `
  <svg class="graf__svg" viewBox="0 0 ${W} ${H}" role="presentation">
    ${grade}
    ${desenho}
    <line class="graf__base" x1="${m.l}" y1="${m.t + ph}" x2="${W - m.r}" y2="${m.t + ph}"/>
    ${rotulosX}
    ${alvos}
  </svg>`;

  return moldura({
    titulo: o.titulo, sub: o.sub, acao: o.acao, corpo, classe: o.classe,
    legenda: series.length > 1
      ? htmlLegenda(series.map((s, i) => ({ nome: s.nome, cor: s.cor || corDado(i) })))
      : '',
    tabela: tabelaOculta(
      [o.rotuloX || 'Etapa', ...series.map(s => s.nome)],
      base.map((p, i) => [p.rotulo, ...series.map(s => fmt(s.pontos[i]?.valor ?? 0))]),
      o.titulo
    ),
  });
}

/* ============================================================
   BARRAS VERTICAIS
   itens: [{ rotulo, valor, cor, sub }]
   ============================================================ */
export function graficoBarras(itens, o = {}) {
  if (!itens?.length) return moldura({ titulo: o.titulo, sub: o.sub, corpo: vazioSvg() });

  const fmt = o.fmt || compacto;
  const W = 720, H = o.altura || 280;
  const m = { t: 24, r: 16, b: 40, l: o.margemEsq ?? 70 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;

  const esc = escala(itens.map(i => i.valor), { zero: true, alvoLinhas: 4 });
  const yDe = (v) => m.t + ph - ((v - esc.min) / (esc.max - esc.min || 1)) * ph;

  const vao = pw / itens.length;
  const larg = Math.min(o.larguraMax || 56, vao * 0.62);

  const grade = esc.linhas.map(v => `
    <line class="graf__grade" x1="${m.l}" y1="${yDe(v).toFixed(1)}" x2="${W - m.r}" y2="${yDe(v).toFixed(1)}"/>
    <text class="graf__rot graf__rot--y graf__rot--num" x="${m.l - 10}" y="${(yDe(v) + 3.5).toFixed(1)}">${escapeHtml(fmt(v))}</text>
  `).join('');

  const barras = itens.map((it, i) => {
    const cx = m.l + vao * i + vao / 2;
    const y = yDe(it.valor);
    const h = Math.max(1, m.t + ph - y);
    const cor = it.cor || o.cor || corDado(i);

    return `
    <g class="graf__alvo" tabindex="0" role="img" data-p
       aria-label="${escapeHtml(`${it.rotulo}: ${fmt(it.valor)}${it.sub ? '. ' + it.sub : ''}`)}"
       data-tx="${((cx / W) * 100).toFixed(2)}" data-ty="${((y / H) * 100).toFixed(2)}"
       ${dadosDica({ titulo: it.rotulo, valor: fmt(it.valor), sub: it.sub })}>
      <rect class="graf__hit" x="${(cx - vao / 2).toFixed(1)}" y="${m.t}" width="${vao.toFixed(1)}" height="${ph}"/>
      <rect class="graf__barra graf__barra--anim" style="--ordem:${i}"
            x="${(cx - larg / 2).toFixed(1)}" y="${y.toFixed(1)}"
            width="${larg.toFixed(1)}" height="${h.toFixed(1)}"
            rx="${Math.min(6, larg / 3).toFixed(1)}" fill="${cor}"/>
      ${o.semValores ? '' : `<text class="graf__valor-b" x="${cx.toFixed(1)}" y="${(y - 8).toFixed(1)}">${escapeHtml(fmt(it.valor))}</text>`}
      <text class="graf__rot graf__rot--x" x="${cx.toFixed(1)}" y="${H - 14}">${escapeHtml(it.rotulo)}</text>
    </g>`;
  }).join('');

  const corpo = `
  <svg class="graf__svg" viewBox="0 0 ${W} ${H}" role="presentation">
    ${grade}
    ${barras}
    <line class="graf__base" x1="${m.l}" y1="${m.t + ph}" x2="${W - m.r}" y2="${m.t + ph}"/>
  </svg>`;

  return moldura({
    titulo: o.titulo, sub: o.sub, acao: o.acao, corpo, classe: o.classe,
    tabela: tabelaOculta([o.rotuloX || 'Item', o.rotuloY || 'Valor'],
      itens.map(i => [i.rotulo, fmt(i.valor)]), o.titulo),
  });
}

/* ============================================================
   DONUT
   itens: [{ rotulo, valor, cor }]
   ============================================================ */
export function graficoDonut(itens, o = {}) {
  const uteis = (itens || []).filter(i => i.valor > 0);
  if (!uteis.length) return moldura({ titulo: o.titulo, sub: o.sub, corpo: vazioSvg() });

  const fmt = o.fmt || num;
  const total = uteis.reduce((s, i) => s + i.valor, 0);
  const V = 200;          // viewBox quadrado
  const c = V / 2;
  const r = 74;
  const esp = 20;
  const volta = 2 * Math.PI * r;

  let acumulado = 0;
  const fatias = uteis.map((it, i) => {
    const fracao = it.valor / total;
    const cor = it.cor || corDado(i);
    const comp = fracao * volta;
    // -90deg para comecar no topo; o offset anda no sentido horario
    const offset = -acumulado * volta;
    const anguloMeio = (acumulado + fracao / 2) * 2 * Math.PI - Math.PI / 2;
    acumulado += fracao;

    const tx = c + Math.cos(anguloMeio) * r;
    const ty = c + Math.sin(anguloMeio) * r;
    const pc = `${(fracao * 100).toFixed(fracao < 0.1 ? 1 : 0).replace('.', ',')}%`;

    return `
    <g class="graf__alvo" tabindex="0" role="img" data-p data-fatia="${i}"
       aria-label="${escapeHtml(`${it.rotulo}: ${fmt(it.valor)}, ${pc} do total`)}"
       data-tx="${((tx / V) * 100).toFixed(2)}" data-ty="${((ty / V) * 100).toFixed(2)}"
       ${dadosDica({ titulo: it.rotulo, valor: fmt(it.valor), sub: `${pc} do total` })}>
      <circle class="graf__donut-fatia graf__donut-fatia--anim" style="--ordem:${i}"
              cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${cor}" stroke-width="${esp}"
              stroke-dasharray="${comp.toFixed(2)} ${(volta - comp).toFixed(2)}"
              stroke-dashoffset="${offset.toFixed(2)}"
              transform="rotate(-90 ${c} ${c})"/>
    </g>`;
  }).join('');

  const corpo = `
  <svg class="graf__svg" viewBox="0 0 ${V} ${V}" role="presentation"
       style="max-width:${o.tamanho || 220}px;margin-inline:auto">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--grade-grafico)" stroke-width="${esp}"/>
    ${fatias}
    <text class="graf__donut-centro" x="${c}" y="${c + 2}">${escapeHtml(o.centro || fmt(total))}</text>
    ${o.centroSub ? `<text class="graf__donut-legenda-c" x="${c}" y="${c + 20}">${escapeHtml(o.centroSub)}</text>` : ''}
  </svg>`;

  return moldura({
    titulo: o.titulo, sub: o.sub, acao: o.acao, corpo, classe: o.classe,
    legenda: htmlLegenda(uteis.map((i, idx) => ({
      nome: i.rotulo, cor: i.cor || corDado(idx), valor: fmt(i.valor),
    }))),
    tabela: tabelaOculta(['Categoria', 'Valor', 'Participação'],
      uteis.map(i => [i.rotulo, fmt(i.valor), `${Math.round(i.valor / total * 100)}%`]), o.titulo),
  });
}

/* ============================================================
   RANKING EM BARRAS HORIZONTAIS (HTML puro)
   Melhor que SVG quando o rotulo e longo: empresa, bairro, area.
   itens: [{ rotulo, valor, href, cor, sufixo }]
   ============================================================ */
export function ranking(itens, o = {}) {
  if (!itens?.length) return '';
  const fmt = o.fmt || num;
  const max = o.max || Math.max(...itens.map(i => i.valor), 1);

  return `
  <div class="ranking">
    ${itens.map((it, i) => {
      const pc = Math.max(2, (it.valor / max) * 100);
      const conteudo = `
        <span class="ranking__r">${escapeHtml(it.rotulo)}</span>
        <span class="ranking__v">${escapeHtml(fmt(it.valor))}${it.sufixo ? escapeHtml(it.sufixo) : ''}</span>
        <span class="ranking__trilho">
          <span class="ranking__preenche" style="width:${pc.toFixed(1)}%;--ordem:${i};background:${it.cor || o.cor || corDado(0)}"></span>
        </span>`;
      return it.href
        ? `<a class="ranking__i" href="${it.href}">${conteudo}</a>`
        : `<div class="ranking__i">${conteudo}</div>`;
    }).join('')}
  </div>`;
}

/* ============================================================
   MEDIDOR (semicirculo)
   ============================================================ */
export function medidor(valor, o = {}) {
  const max = o.max || 100;
  const fracao = Math.max(0, Math.min(1, valor / max));
  const W = 200, H = 116;
  const c = 100, cy = 100, r = 80;
  const comp = Math.PI * r;
  const cor = o.cor || corDado(0);

  return `
  <div class="medidor">
    <svg class="medidor__svg" viewBox="0 0 ${W} ${H}" role="img"
         aria-label="${escapeHtml(o.rotuloA11y || `${o.centro || valor} de ${max}`)}">
      <path class="medidor__trilho" d="M ${c - r} ${cy} A ${r} ${r} 0 0 1 ${c + r} ${cy}"
            fill="none" stroke-width="14" stroke-linecap="round"/>
      <path class="medidor__arco medidor__arco--anim"
            style="--vazio:${comp}"
            d="M ${c - r} ${cy} A ${r} ${r} 0 0 1 ${c + r} ${cy}"
            fill="none" stroke="${cor}" stroke-width="14"
            stroke-dasharray="${comp.toFixed(1)}"
            stroke-dashoffset="${(comp * (1 - fracao)).toFixed(1)}"/>
      <text class="medidor__n" x="${c}" y="${cy - 8}">${escapeHtml(o.centro ?? String(valor))}</text>
    </svg>
    ${o.rotulo ? `<p class="medidor__l">${escapeHtml(o.rotulo)}</p>` : ''}
  </div>`;
}

/* ============================================================
   SPARKLINE
   ============================================================ */
export function sparkline(valores, o = {}) {
  const vals = (valores || []).filter(v => Number.isFinite(v));
  if (vals.length < 2) return '';

  const W = o.largura || 88, H = o.altura || 26, pad = 3;
  const min = Math.min(...vals), max = Math.max(...vals);
  const amp = (max - min) || 1;

  const pts = vals.map((v, i) => ({
    x: pad + (i / (vals.length - 1)) * (W - pad * 2),
    y: pad + (1 - (v - min) / amp) * (H - pad * 2),
  }));

  const d = caminhoSuave(pts, H);
  const cor = o.cor || (vals[vals.length - 1] >= vals[0] ? 'var(--ok)' : 'var(--erro)');
  const ultimo = pts[pts.length - 1];
  const idG = uid('spk');

  return `
  <span class="spark" role="img" aria-label="${escapeHtml(o.rotuloA11y || 'Tendência do período')}">
    <svg class="spark__svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      ${o.area === false ? '' : `
        <defs>
          <linearGradient id="${idG}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${cor}" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="${cor}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path class="spark__area" fill="url(#${idG})" d="${d} L ${ultimo.x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z"/>`}
      <path class="spark__linha" stroke="${cor}" d="${d}"/>
      <circle class="spark__fim" cx="${ultimo.x.toFixed(1)}" cy="${ultimo.y.toFixed(1)}" r="2.6" fill="${cor}"/>
    </svg>
  </span>`;
}

/* ============================================================
   RADAR — comparacao de profissoes em varios eixos
   eixos: ['Salário', 'Demanda', ...]
   series: [{ nome, cor, valores: [0-100, ...] }]
   ============================================================ */
export function graficoRadar(eixos, series, o = {}) {
  if (!eixos?.length || !series?.length) return '';

  const V = 300, c = V / 2, r = 98;
  const n = eixos.length;
  const ang = (i) => (i / n) * 2 * Math.PI - Math.PI / 2;
  const ponto = (i, f) => ({
    x: c + Math.cos(ang(i)) * r * f,
    y: c + Math.sin(ang(i)) * r * f,
  });

  const aneis = [0.25, 0.5, 0.75, 1].map(f => {
    const pts = eixos.map((_, i) => { const p = ponto(i, f); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; });
    return `<polygon class="radar__grade" points="${pts.join(' ')}"/>`;
  }).join('');

  const raios = eixos.map((_, i) => {
    const p = ponto(i, 1);
    return `<line class="radar__eixo" x1="${c}" y1="${c}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}"/>`;
  }).join('');

  const rotulos = eixos.map((e, i) => {
    const p = ponto(i, 1.17);
    const meio = Math.abs(p.x - c) < 12;
    const anchor = meio ? 'middle' : (p.x > c ? 'start' : 'end');
    return `<text class="radar__rot" x="${p.x.toFixed(1)}" y="${(p.y + 3.5).toFixed(1)}" text-anchor="${anchor}">${escapeHtml(e)}</text>`;
  }).join('');

  const formas = series.map((s, si) => {
    const cor = s.cor || corDado(si);
    const pts = s.valores.map((v, i) => {
      const p = ponto(i, Math.max(0.04, Math.min(1, v / 100)));
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    });
    return `<polygon class="radar__forma radar__forma--anim" style="--ordem:${si}"
             points="${pts.join(' ')}" fill="${cor}" stroke="${cor}"/>`;
  }).join('');

  const corpo = `
  <svg class="graf__svg" viewBox="0 0 ${V} ${V}" role="presentation"
       style="max-width:${o.tamanho || 340}px;margin-inline:auto">
    ${aneis}${raios}${formas}${rotulos}
  </svg>`;

  return moldura({
    titulo: o.titulo, sub: o.sub, corpo, classe: o.classe,
    legenda: htmlLegenda(series.map((s, i) => ({ nome: s.nome, cor: s.cor || corDado(i) }))),
    tabela: tabelaOculta(['Critério', ...series.map(s => s.nome)],
      eixos.map((e, i) => [e, ...series.map(s => `${Math.round(s.valores[i])} de 100`)]), o.titulo),
  });
}

/* ============================================================
   Estado vazio dentro da moldura
   ============================================================ */
function vazioSvg() {
  return `
  <div class="graf__svg" style="display:grid;place-items:center;min-height:140px">
    <p style="font-size:var(--fs-xs);color:var(--txt-fraco)">Sem dados suficientes para este gráfico.</p>
  </div>`;
}

/* ============================================================
   ATIVACAO — dica flutuante e teclado
   Uma so ligacao serve para todos os graficos do container.
   ============================================================ */
export function ativarGraficos(raiz) {
  if (!raiz) return () => {};

  function mostrar(alvo) {
    const fig = alvo.closest('[data-graf]');
    const dica = fig && qs('[data-dica]', fig);
    if (!dica) return;

    const tx = Number(alvo.dataset.tx);
    const ty = Number(alvo.dataset.ty);
    const sub = alvo.dataset.ds;

    dica.innerHTML = `
      <span class="graf__dica-t">${escapeHtml(alvo.dataset.dt || '')}</span><br>
      <span class="graf__dica-v">${escapeHtml(alvo.dataset.dv || '')}</span>
      ${sub ? `<br><span class="graf__dica-s">${escapeHtml(sub)}</span>` : ''}`;

    // Perto da borda a dica troca de ancoragem para nao vazar
    dica.classList.toggle('graf__dica--esq', tx < 14);
    dica.classList.toggle('graf__dica--dir', tx > 86);
    dica.style.left = `${tx}%`;
    dica.style.top = `${ty}%`;
    dica.hidden = false;
  }

  function esconder(fig) {
    const dica = fig && qs('[data-dica]', fig);
    if (dica) dica.hidden = true;
  }

  const onOver = (e) => {
    const alvo = e.target.closest?.('.graf__alvo');
    if (alvo && raiz.contains(alvo)) mostrar(alvo);
  };

  const onOut = (e) => {
    const alvo = e.target.closest?.('.graf__alvo');
    if (!alvo) return;
    const indo = e.relatedTarget;
    if (indo && alvo.contains(indo)) return;
    // Se o foco esta num alvo do mesmo grafico, a dica continua
    const fig = alvo.closest('[data-graf]');
    const focado = document.activeElement?.closest?.('.graf__alvo');
    if (focado && focado.closest('[data-graf]') === fig) { mostrar(focado); return; }
    esconder(fig);
  };

  const onFocus = (e) => {
    const alvo = e.target.closest?.('.graf__alvo');
    if (alvo) mostrar(alvo);
  };

  const onBlur = (e) => {
    const alvo = e.target.closest?.('.graf__alvo');
    if (alvo) esconder(alvo.closest('[data-graf]'));
  };

  // Setas andam entre os pontos do mesmo grafico
  const onKey = (e) => {
    const alvo = e.target.closest?.('.graf__alvo');
    if (!alvo) return;

    if (e.key === 'Escape') {
      esconder(alvo.closest('[data-graf]'));
      alvo.blur();
      return;
    }

    const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!passo && e.key !== 'Home' && e.key !== 'End') return;

    const irmaos = qsa('.graf__alvo', alvo.closest('[data-graf]'));
    const i = irmaos.indexOf(alvo);
    const destino = e.key === 'Home' ? irmaos[0]
      : e.key === 'End' ? irmaos[irmaos.length - 1]
        : irmaos[i + passo];

    if (destino) { e.preventDefault(); destino.focus(); }
  };

  raiz.addEventListener('pointerover', onOver);
  raiz.addEventListener('pointerout', onOut);
  raiz.addEventListener('focusin', onFocus);
  raiz.addEventListener('focusout', onBlur);
  raiz.addEventListener('keydown', onKey);

  return () => {
    raiz.removeEventListener('pointerover', onOver);
    raiz.removeEventListener('pointerout', onOut);
    raiz.removeEventListener('focusin', onFocus);
    raiz.removeEventListener('focusout', onBlur);
    raiz.removeEventListener('keydown', onKey);
  };
}
