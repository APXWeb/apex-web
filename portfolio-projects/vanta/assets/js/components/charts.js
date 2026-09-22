/* ============================================================
   VANTA — Graficos em SVG puro
   Sem biblioteca externa: controle total do visual, zero peso
   de download e acessibilidade feita do jeito certo (cada
   grafico tem resumo em texto e tabela alternativa).
   ============================================================ */

import { money, compact, num, dataMedia, escapeHtml, pct } from '../utils/format.js';

let seq = 0;
const uid = () => `ch${++seq}`;

/* Curva suave (Catmull-Rom convertida em Bezier) — linha organica
   sem os "bicos" de um polyline reto. */
function caminhoSuave(pontos) {
  if (pontos.length < 2) return '';
  let d = `M ${pontos[0][0]} ${pontos[0][1]}`;
  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[i - 1] || pontos[i];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[i + 2] || p2;
    const t = 0.18;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * Grafico de linha com area, eixos e interacao por hover/teclado.
 * @param {Array} series [{ nome, cor, dados:[{x,y}] }]
 */
export function graficoLinha(series, {
  altura = 260, formato = money, rotuloX = (d) => dataMedia(d), titulo = '',
} = {}) {
  const id = uid();
  const W = 800;
  const H = altura;
  const m = { t: 16, r: 16, b: 30, l: 74 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;

  const todos = series.flatMap(s => s.dados.map(d => d.y));
  const maxY = Math.max(...todos) * 1.12 || 1;
  const n = series[0]?.dados.length || 0;

  const px = (i) => m.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const py = (v) => m.t + ih - (v / maxY) * ih;

  // Linhas de grade horizontais com rotulo
  const ticks = 4;
  const grade = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = (maxY / ticks) * i;
    const y = py(v);
    return `
      <line x1="${m.l}" y1="${y.toFixed(1)}" x2="${W - m.r}" y2="${y.toFixed(1)}"
            stroke="var(--border-subtle)" stroke-width="1"/>
      <text x="${m.l - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end"
            fill="var(--ink-400)" font-size="11" font-family="var(--font-mono)">${compact(v / 100)}</text>`;
  }).join('');

  // Rotulos do eixo X, esparsos o suficiente para nao amontoar
  const passo = Math.max(1, Math.ceil(n / 7));
  const eixoX = series[0]?.dados.map((d, i) =>
    i % passo === 0 || i === n - 1
      ? `<text x="${px(i).toFixed(1)}" y="${H - 8}" text-anchor="middle"
              fill="var(--ink-400)" font-size="11">${escapeHtml(rotuloX(d.x))}</text>`
      : '').join('') || '';

  const camadas = series.map((s, si) => {
    const pontos = s.dados.map((d, i) => [px(i), py(d.y)]);
    const linha = caminhoSuave(pontos);
    const area = `${linha} L ${px(n - 1)} ${m.t + ih} L ${px(0)} ${m.t + ih} Z`;
    return `
      <g data-serie="${si}">
        <defs>
          <linearGradient id="${id}-g${si}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${s.cor}" stop-opacity="0.28"/>
            <stop offset="100%" stop-color="${s.cor}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${area}" fill="url(#${id}-g${si})"/>
        <path d="${linha}" fill="none" stroke="${s.cor}" stroke-width="2.4"
              stroke-linecap="round" stroke-linejoin="round"
              stroke-dasharray="${si === 1 ? '6 5' : 'none'}"/>
      </g>`;
  }).join('');

  // Alvos invisiveis para hover: uma faixa por ponto
  const alvos = Array.from({ length: n }, (_, i) => `
    <rect class="ch-hit" x="${(px(i) - iw / n / 2).toFixed(1)}" y="${m.t}"
          width="${(iw / n).toFixed(1)}" height="${ih}" fill="transparent" data-i="${i}"/>`).join('');

  const resumo = series.map(s => {
    const vals = s.dados.map(d => d.y);
    const ini = vals[0], fim = vals.at(-1);
    const dir = fim >= ini ? 'alta' : 'queda';
    return `${s.nome}: de ${formato(ini)} a ${formato(fim)}, tendência de ${dir}`;
  }).join('. ');

  return `
    <div class="chart-wrap" data-grafico="${id}">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(titulo || 'Gráfico de linha')}. ${escapeHtml(resumo)}">
        ${grade}
        ${camadas}
        ${eixoX}
        <g class="ch-cursor" style="opacity:0">
          <line y1="${m.t}" y2="${m.t + ih}" stroke="var(--border-strong)" stroke-width="1" stroke-dasharray="3 3"/>
          ${series.map(s => `<circle r="4.5" fill="${s.cor}" stroke="var(--surface-base)" stroke-width="2"/>`).join('')}
        </g>
        ${alvos}
      </svg>
      <div class="chart-tip" role="status"></div>
    </div>`;
}

/** Liga o hover/foco do grafico de linha depois de inserido no DOM */
export function ligarGraficoLinha(container, series, { formato = money, rotuloX = (d) => dataMedia(d) } = {}) {
  const wrap = container.querySelector('.chart-wrap');
  if (!wrap) return;

  const svg = wrap.querySelector('svg');
  const cursor = wrap.querySelector('.ch-cursor');
  const tip = wrap.querySelector('.chart-tip');
  const pontos = Array.from(cursor.querySelectorAll('circle'));
  const hits = Array.from(wrap.querySelectorAll('.ch-hit'));
  const linhaV = cursor.querySelector('line');

  function mostrar(i) {
    const hit = hits[i];
    if (!hit) return;
    const x = Number(hit.getAttribute('x')) + Number(hit.getAttribute('width')) / 2;

    linhaV.setAttribute('x1', x);
    linhaV.setAttribute('x2', x);

    const vb = svg.viewBox.baseVal;
    const maxY = Math.max(...series.flatMap(s => s.dados.map(d => d.y))) * 1.12 || 1;
    const m = { t: 16, b: 30 };
    const ih = vb.height - m.t - m.b;

    series.forEach((s, si) => {
      const d = s.dados[i];
      if (!d || !pontos[si]) return;
      pontos[si].setAttribute('cx', x);
      pontos[si].setAttribute('cy', m.t + ih - (d.y / maxY) * ih);
    });

    cursor.style.opacity = '1';

    const r = svg.getBoundingClientRect();
    const rw = wrap.getBoundingClientRect();
    tip.style.left = `${(x / vb.width) * r.width + (r.left - rw.left)}px`;
    tip.style.top = `${(m.t + ih * 0.35 / 1) / vb.height * r.height}px`;
    tip.innerHTML = `
      <p class="chart-tip__d">${escapeHtml(rotuloX(series[0].dados[i].x))}</p>
      ${series.map(s => `
        <p class="chart-tip__v" style="color:${s.cor}">
          ${escapeHtml(s.nome)}: ${formato(s.dados[i].y)}
        </p>`).join('')}`;
    tip.classList.add('is-on');
  }

  function esconder() {
    cursor.style.opacity = '0';
    tip.classList.remove('is-on');
  }

  hits.forEach((h, i) => {
    h.addEventListener('pointerenter', () => mostrar(i));
    h.style.cursor = 'crosshair';
  });
  wrap.addEventListener('pointerleave', esconder);

  // Teclado: setas percorrem os pontos
  svg.setAttribute('tabindex', '0');
  let atual = 0;
  svg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { atual = Math.min(hits.length - 1, atual + 1); mostrar(atual); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { atual = Math.max(0, atual - 1); mostrar(atual); e.preventDefault(); }
    if (e.key === 'Escape') esconder();
  });
  svg.addEventListener('blur', esconder);
}

/** Barras verticais (comparacao entre periodos) */
export function graficoBarras(dados, { altura = 240, cor = 'var(--data-1)', formato = num, titulo = '' } = {}) {
  const id = uid();
  const W = 800;
  const H = altura;
  const m = { t: 16, r: 10, b: 32, l: 62 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const max = Math.max(...dados.map(d => d.valor)) * 1.15 || 1;
  const larg = Math.min(46, (iw / dados.length) * 0.62);

  const barras = dados.map((d, i) => {
    const x = m.l + (i + 0.5) * (iw / dados.length) - larg / 2;
    const h = (d.valor / max) * ih;
    const y = m.t + ih - h;
    return `
      <g>
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${larg.toFixed(1)}" height="${Math.max(2, h).toFixed(1)}"
              rx="5" fill="${d.cor || cor}" opacity="${d.destaque === false ? 0.42 : 1}">
          <title>${escapeHtml(d.rotulo)}: ${escapeHtml(String(formato(d.valor)))}</title>
        </rect>
        <text x="${(x + larg / 2).toFixed(1)}" y="${H - 10}" text-anchor="middle"
              fill="var(--ink-400)" font-size="11">${escapeHtml(d.rotulo)}</text>
      </g>`;
  }).join('');

  const grade = Array.from({ length: 4 }, (_, i) => {
    const v = (max / 3) * i;
    const y = m.t + ih - (v / max) * ih;
    return `<line x1="${m.l}" y1="${y.toFixed(1)}" x2="${W - m.r}" y2="${y.toFixed(1)}"
                  stroke="var(--border-subtle)" stroke-width="1"/>
            <text x="${m.l - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end"
                  fill="var(--ink-400)" font-size="11" font-family="var(--font-mono)">${compact(v)}</text>`;
  }).join('');

  return `
    <div class="chart-box">
      <svg viewBox="0 0 ${W} ${H}" role="img"
           aria-label="${escapeHtml(titulo)}. ${dados.map(d => `${d.rotulo}: ${formato(d.valor)}`).join(', ')}">
        ${grade}${barras}
      </svg>
    </div>`;
}

/** Rosca (participacao por categoria) */
export function graficoRosca(fatias, { titulo = '', centroRotulo = '', centroValor = '' } = {}) {
  const id = uid();
  const total = fatias.reduce((s, f) => s + f.valor, 0) || 1;
  const R = 76;
  const r = 50;
  const C = 100;
  let angulo = -Math.PI / 2;

  const setores = fatias.map((f, i) => {
    const frac = f.valor / total;
    const a0 = angulo;
    const a1 = angulo + frac * Math.PI * 2;
    angulo = a1;
    const grande = frac > 0.5 ? 1 : 0;
    const x0 = C + R * Math.cos(a0), y0 = C + R * Math.sin(a0);
    const x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1);
    const xi1 = C + r * Math.cos(a1), yi1 = C + r * Math.sin(a1);
    const xi0 = C + r * Math.cos(a0), yi0 = C + r * Math.sin(a0);
    return `
      <path d="M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${grande} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}
               L ${xi1.toFixed(2)} ${yi1.toFixed(2)} A ${r} ${r} 0 ${grande} 0 ${xi0.toFixed(2)} ${yi0.toFixed(2)} Z"
            fill="${f.cor}" stroke="var(--surface-raised)" stroke-width="1.5">
        <title>${escapeHtml(f.nome)}: ${pct(frac * 100)}</title>
      </path>`;
  }).join('');

  return `
    <div class="chart-box">
      <svg viewBox="0 0 200 200" role="img"
           aria-label="${escapeHtml(titulo)}. ${fatias.map(f => `${f.nome}: ${pct(f.valor / total * 100)}`).join(', ')}"
           style="max-width:220px;margin-inline:auto">
        ${setores}
        ${centroValor ? `
          <text x="100" y="96" text-anchor="middle" fill="var(--text-primary)"
                font-size="21" font-weight="600" font-family="var(--font-display)">${escapeHtml(centroValor)}</text>
          <text x="100" y="114" text-anchor="middle" fill="var(--ink-400)" font-size="10">${escapeHtml(centroRotulo)}</text>` : ''}
      </svg>
    </div>`;
}

/** Mini linha para dentro dos cartoes de KPI */
export function sparkline(valores, cor = 'var(--data-1)') {
  if (!valores.length) return '';
  const W = 120, H = 34;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const amp = max - min || 1;
  const pontos = valores.map((v, i) => [
    (i / (valores.length - 1)) * W,
    H - 3 - ((v - min) / amp) * (H - 8),
  ]);
  const d = caminhoSuave(pontos);
  const area = `${d} L ${W} ${H} L 0 ${H} Z`;
  const gid = uid();

  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${cor}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${cor}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#${gid})"/>
      <path d="${d}" fill="none" stroke="${cor}" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
}

/** Barras horizontais — ranking legivel com valor ao lado */
export function barrasHorizontais(itens, { formato = money, cores = null } = {}) {
  const max = Math.max(...itens.map(i => i.valor)) || 1;
  const paleta = cores || ['var(--data-1)', 'var(--data-2)', 'var(--data-3)', 'var(--data-4)', 'var(--data-5)', 'var(--data-6)'];

  return `
    <div class="hbar">
      ${itens.map((it, i) => `
        <div class="hbar__item">
          <div class="hbar__top">
            <span class="hbar__n">${escapeHtml(it.nome)}</span>
            <span class="hbar__v">${escapeHtml(String(formato(it.valor)))}</span>
          </div>
          <div class="hbar__trilho">
            <div class="hbar__fill" style="width:${((it.valor / max) * 100).toFixed(1)}%;background:${paleta[i % paleta.length]}"></div>
          </div>
        </div>`).join('')}
    </div>`;
}

/** Medidor contra meta (o "bullet chart" recomendado para KPI) */
export function medidor({ valor, meta, formato = money, rotulo = '' }) {
  const p = Math.min(100, (valor / meta) * 100);
  const bateu = valor >= meta;
  return `
    <div class="stack stack--sm">
      <div class="row row--between">
        <span class="dim" style="font-size:var(--fs-sm)">${escapeHtml(rotulo)}</span>
        <span style="font-size:var(--fs-sm);font-weight:600;color:${bateu ? 'var(--success)' : 'var(--text-primary)'}">
          ${pct(p, 0)} da meta
        </span>
      </div>
      <div class="hbar__trilho" style="height:10px">
        <div class="hbar__fill" style="width:${p}%;background:${bateu ? 'var(--success)' : 'var(--accent)'}"></div>
      </div>
      <div class="row row--between" style="font-size:var(--fs-xs);color:var(--text-tertiary)">
        <span>${formato(valor)}</span>
        <span>meta ${formato(meta)}</span>
      </div>
    </div>`;
}
