/* ============================================================
   NORTE — Mapa estilizado de oportunidades
   Nao usa API externa: desenha um plano proprio em SVG a partir
   das coordenadas 0-100 dos bairros e posiciona um marcador por
   vaga. Funciona offline e nao depende de chave de servico.
   ============================================================ */

import { qs, qsa, el } from '../utils/dom.js';
import { icon } from './icons.js';
import { escapeHtml, dinheiro, km, plural } from '../utils/format.js';
import { acharEmpresa, acharRegiao } from '../services/store.js';
import { salarioTexto, nomeModelo, nomeNivel } from './vagaCard.js';

/** Fundo: malha viaria estilizada, gerada a partir dos bairros */
function fundoMapa(bairros) {
  if (!bairros.length) return '';

  const eixos = [];
  // Vias horizontais e verticais passando pelos bairros mais densos
  const densos = [...bairros].sort((a, b) => b.peso - a.peso).slice(0, 5);
  densos.forEach((b, i) => {
    eixos.push(`<line x1="0" y1="${b.y}" x2="100" y2="${b.y}"
      stroke="var(--mapa-via)" stroke-width="${i < 2 ? 0.9 : 0.5}" />`);
    eixos.push(`<line x1="${b.x}" y1="0" x2="${b.x}" y2="100"
      stroke="var(--mapa-via)" stroke-width="${i < 2 ? 0.9 : 0.5}" />`);
  });

  // Duas diagonais para quebrar a grade e lembrar traçado real
  eixos.push('<line x1="4" y1="96" x2="92" y2="12" stroke="var(--mapa-via)" stroke-width="0.7"/>');
  eixos.push('<line x1="10" y1="6" x2="88" y2="90" stroke="var(--mapa-via)" stroke-width="0.6"/>');

  // Manchas de "area verde" e "agua" para dar leitura de cidade
  const manchas = `
    <circle cx="18" cy="76" r="13" fill="var(--mapa-verde)"/>
    <circle cx="82" cy="24" r="10" fill="var(--mapa-verde)"/>
    <path d="M -5 34 Q 20 28 42 40 T 105 36 L 105 22 Q 60 18 -5 24 Z" fill="var(--mapa-agua)"/>`;

  return `${manchas}<g opacity="0.9">${eixos.join('')}</g>`;
}

/**
 * @param {Array} vagas
 * @param {object} o { regiaoId, aoSelecionar(id), alturaClasse }
 */
export function mapaOportunidades(vagas, o = {}) {
  const reg = acharRegiao(o.regiaoId);
  const comLocal = vagas.filter(v => v.regiaoId !== 'remoto');
  const remotas = vagas.length - comLocal.length;

  if (!comLocal.length) {
    return `
      <div class="mapa mapa--vazio">
        <div class="mapa__aviso">
          <span class="vazio__icone">${icon.raio({ size: 24 })}</span>
          <h3 class="vazio__titulo" style="font-size:var(--fs-md)">Tudo remoto por aqui</h3>
          <p class="vazio__texto" style="font-size:var(--fs-sm)">
            ${remotas ? `${plural(remotas, 'oportunidade')} sem endereço fixo: dá para trabalhar de qualquer cidade.`
              : 'Nenhuma oportunidade com endereço nesta busca.'}
          </p>
        </div>
      </div>`;
  }

  // Agrupa por bairro para nao empilhar marcador no mesmo ponto
  const grupos = {};
  comLocal.forEach(v => {
    const chave = v.bairro;
    if (!grupos[chave]) grupos[chave] = { bairro: chave, x: 0, y: 0, vagas: [] };
    grupos[chave].vagas.push(v);
  });

  Object.values(grupos).forEach(g => {
    g.x = g.vagas.reduce((s, v) => s + v.pos.x, 0) / g.vagas.length;
    g.y = g.vagas.reduce((s, v) => s + v.pos.y, 0) / g.vagas.length;
  });

  const lista = Object.values(grupos).sort((a, b) => b.vagas.length - a.vagas.length);
  const maior = Math.max(...lista.map(g => g.vagas.length));

  return `
  <div class="mapa ${o.alturaClasse || ''}" data-mapa>
    <svg class="mapa__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"
         role="img" aria-label="Mapa com a distribuição das oportunidades por bairro">
      ${fundoMapa(reg?.bairros || [])}
    </svg>

    <div class="mapa__pinos">
      ${lista.map((g, i) => {
        const tamanho = 0.62 + (g.vagas.length / maior) * 0.38;
        return `
        <button type="button" class="mapa__pino" data-pino="${escapeHtml(g.bairro)}"
                style="left:${g.x}%;top:${g.y}%;--escala:${tamanho.toFixed(2)};--ordem:${i}"
                aria-label="${escapeHtml(g.bairro)}: ${plural(g.vagas.length, 'oportunidade')}">
          <span class="mapa__pino-n">${g.vagas.length}</span>
        </button>`;
      }).join('')}
    </div>

    <div class="mapa__topo">
      <span class="mapa__etiqueta">
        ${icon.local({ size: 13 })}
        ${escapeHtml(reg?.cidade || 'Região')} · ${plural(comLocal.length, 'oportunidade')}
      </span>
      ${remotas ? `<span class="mapa__etiqueta mapa__etiqueta--fraca">
        ${icon.raio({ size: 13 })} + ${plural(remotas, 'remota')}
      </span>` : ''}
    </div>

    <div class="mapa__legenda">
      <span class="mapa__legenda-i"><i class="mapa__bola mapa__bola--p"></i> poucas</span>
      <span class="mapa__legenda-i"><i class="mapa__bola mapa__bola--g"></i> muitas</span>
    </div>

    <div class="mapa__cartao" data-cartao hidden></div>
  </div>`;
}

/** Liga clique e teclado nos marcadores */
export function ativarMapa(raiz, vagas, o = {}) {
  const mapa = qs('[data-mapa]', raiz);
  if (!mapa) return () => {};

  const cartao = qs('[data-cartao]', mapa);
  let aberto = null;

  function fechar() {
    cartao.hidden = true;
    cartao.innerHTML = '';
    qsa('.mapa__pino', mapa).forEach(p => p.classList.remove('ativo'));
    aberto = null;
  }

  function abrir(bairro, pino) {
    const doBairro = vagas.filter(v => v.bairro === bairro && v.regiaoId !== 'remoto');
    if (!doBairro.length) return;

    aberto = bairro;
    qsa('.mapa__pino', mapa).forEach(p => p.classList.toggle('ativo', p === pino));

    const topo = doBairro.slice(0, 3);
    cartao.innerHTML = `
      <div class="mapa__cartao-topo">
        <div>
          <p class="mapa__cartao-b">${icon.local({ size: 13 })} ${escapeHtml(bairro)}</p>
          <p class="mapa__cartao-c">${plural(doBairro.length, 'oportunidade')} nesta região</p>
        </div>
        <button type="button" class="btn-icone btn-icone--sm" data-fechar-cartao aria-label="Fechar">
          ${icon.fechar({ size: 15 })}
        </button>
      </div>
      <div class="mapa__cartao-lista">
        ${topo.map(v => {
          const emp = acharEmpresa(v.empresaId);
          const sal = salarioTexto(v);
          return `
          <a class="mapa__vaga" href="#/vaga/${v.id}">
            <span class="logo-emp logo-emp--sm" style="background:${emp?.cor || 'var(--acento)'}">
              ${escapeHtml(emp?.sigla || '??')}
            </span>
            <span class="mapa__vaga-txt">
              <span class="mapa__vaga-t cortar">${escapeHtml(v.titulo)}</span>
              <span class="mapa__vaga-s cortar">
                ${escapeHtml(emp?.nome || '')} · ${nomeNivel(v.nivel)} · ${nomeModelo(v.modelo)}
              </span>
              <span class="mapa__vaga-m">
                ${sal ? dinheiro(v.salarioMin) : 'A combinar'} · ${km(v.distancia)} do centro
              </span>
            </span>
            <span class="mapa__vaga-seta">${icon.chevronR({ size: 15 })}</span>
          </a>`;
        }).join('')}
      </div>
      ${doBairro.length > 3 ? `
        <button type="button" class="btn btn--suave btn--sm btn--bloco" data-filtrar-bairro="${escapeHtml(bairro)}">
          Ver as ${doBairro.length} oportunidades em ${escapeHtml(bairro)}
        </button>` : ''}`;
    cartao.hidden = false;
  }

  const onClick = (e) => {
    const pino = e.target.closest('.mapa__pino');
    if (pino) {
      const bairro = pino.dataset.pino;
      if (aberto === bairro) fechar();
      else abrir(bairro, pino);
      return;
    }
    if (e.target.closest('[data-fechar-cartao]')) { fechar(); return; }
    const filtrar = e.target.closest('[data-filtrar-bairro]');
    if (filtrar) {
      o.aoFiltrarBairro?.(filtrar.dataset.filtrarBairro);
      fechar();
      return;
    }
    if (!e.target.closest('[data-cartao]')) fechar();
  };

  mapa.addEventListener('click', onClick);

  const onKey = (e) => { if (e.key === 'Escape' && aberto) fechar(); };
  document.addEventListener('keydown', onKey);

  return () => {
    mapa.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
  };
}
