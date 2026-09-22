/* ============================================================
   NORTE — Cartao de oportunidade
   ============================================================ */

import { icon } from './icons.js';
import { escapeHtml, dinheiro, km, haQuantoTempo, plural } from '../utils/format.js';
import { acharEmpresa, acharRegiao, estaSalvo, jaCandidatou } from '../services/store.js';
import { NIVEL_POR_ID, MODELOS, CONTRATOS, HORARIOS } from '../data/oportunidades.js';

const nomeDe = (lista, id) => lista.find(x => x.id === id)?.nome || id;

export const nomeModelo = (id) => nomeDe(MODELOS, id);
export const nomeContrato = (id) => nomeDe(CONTRATOS, id);
export const nomeHorario = (id) => nomeDe(HORARIOS, id);
export const nomeNivel = (id) => NIVEL_POR_ID[id]?.nome || id;

const ICONE_MODELO = { remoto: 'raio', hibrido: 'atualizar', presencial: 'predio' };

export function salarioTexto(v) {
  if (!v.salarioVisivel) return null;
  return v.salarioMin === v.salarioMax
    ? dinheiro(v.salarioMin)
    : `${dinheiro(v.salarioMin)} – ${dinheiro(v.salarioMax)}`;
}

/** Cartao completo, usado na lista de resultados e nos trilhos */
export function vagaCard(v, opts = {}) {
  const emp = acharEmpresa(v.empresaId);
  const reg = acharRegiao(v.regiaoId);
  const salvo = estaSalvo('vagas', v.id);
  const aplicado = jaCandidatou(v.id);
  const salario = salarioTexto(v);
  const remoto = v.modelo === 'remoto';

  return `
  <article class="vaga-card ${v.destaque ? 'destacada' : ''}" data-vaga="${v.id}">
    ${(v.destaque || v.urgente || aplicado) ? `
      <div class="vaga-card__flags">
        ${aplicado ? `<span class="selo selo--ok">${icon.ok({ size: 11 })} Candidatura enviada</span>` : ''}
        ${v.destaque && !aplicado ? '<span class="selo selo--marca">Destaque</span>' : ''}
        ${v.urgente ? '<span class="selo selo--aviso">Contratação urgente</span>' : ''}
      </div>` : ''}

    <div class="vaga-card__topo">
      <span class="logo-emp" style="background:${emp?.cor || 'var(--acento)'}" aria-hidden="true">
        ${escapeHtml(emp?.sigla || '??')}
      </span>

      <div class="vaga-card__id">
        <h3 class="vaga-card__titulo">
          <a href="#/vaga/${v.id}">${escapeHtml(v.titulo)}</a>
        </h3>
        <p class="vaga-card__emp">
          <a href="#/empresa/${v.empresaId}">${escapeHtml(emp?.nome || 'Empresa')}</a>
          <span aria-hidden="true">·</span>
          <span>${icon.local({ size: 13 })} ${escapeHtml(remoto ? 'Remoto' : `${v.bairro}, ${reg?.cidade || ''}`)}</span>
          ${!remoto && v.distancia ? `<span aria-hidden="true">·</span><span>${km(v.distancia)} do centro</span>` : ''}
        </p>
      </div>

      <button type="button"
              class="btn-icone btn-icone--sm vaga-card__fav ${salvo ? 'is-on' : ''}"
              data-salvar-vaga="${v.id}" aria-pressed="${salvo}"
              aria-label="${salvo ? 'Remover' : 'Salvar'} ${escapeHtml(v.titulo)}">
        ${icon.marcador({ size: 16, fill: salvo ? 'currentColor' : 'none' })}
      </button>
    </div>

    <div class="vaga-card__salario">
      ${salario
        ? `<span class="vaga-card__valor">${salario}</span><span class="vaga-card__mes">/mês</span>`
        : '<span class="vaga-card__valor vaga-card__valor--oculto">Salário a combinar</span>'}
    </div>

    <div class="vaga-card__tags">
      <span class="selo selo--neutro">${icon[ICONE_MODELO[v.modelo]]({ size: 11 })} ${nomeModelo(v.modelo)}</span>
      <span class="selo selo--neutro">${nomeNivel(v.nivel)}</span>
      <span class="selo selo--neutro">${nomeContrato(v.contrato)}</span>
      <span class="selo selo--neutro">${icon.relogio({ size: 11 })} ${nomeHorario(v.horario)}</span>
      ${v.vagas > 1 ? `<span class="selo selo--info">${v.vagas} vagas</span>` : ''}
    </div>

    ${opts.semRodape ? '' : `
      <div class="vaga-card__rodape">
        <div class="vaga-card__meta">
          <span>${icon.calendario({ size: 12 })} ${haQuantoTempo(v.publicadaEm)}</span>
          <span>${icon.usuarios({ size: 12 })} ${plural(v.candidaturas, 'candidato')}</span>
        </div>
        <span class="linha" style="gap:4px;color:var(--txt-marca);font-weight:600">
          Ver vaga ${icon.chevronR({ size: 13 })}
        </span>
      </div>`}
  </article>`;
}

/** Linha compacta, para trilhos e listas densas do perfil */
export function vagaLinha(v) {
  const emp = acharEmpresa(v.empresaId);
  const reg = acharRegiao(v.regiaoId);
  const salario = salarioTexto(v);

  return `
  <a class="vaga-linha" href="#/vaga/${v.id}">
    <span class="logo-emp logo-emp--sm" style="background:${emp?.cor || 'var(--acento)'}" aria-hidden="true">
      ${escapeHtml(emp?.sigla || '??')}
    </span>
    <span class="vaga-linha__meio">
      <span class="vaga-linha__t cortar">${escapeHtml(v.titulo)}</span>
      <span class="vaga-linha__s cortar">
        ${escapeHtml(emp?.nome || '')} · ${escapeHtml(v.modelo === 'remoto' ? 'Remoto' : reg?.cidade || '')}
      </span>
    </span>
    <span class="vaga-linha__dir">
      <span class="vaga-linha__v">${salario || 'A combinar'}</span>
      <span class="vaga-linha__s">${haQuantoTempo(v.publicadaEm)}</span>
    </span>
  </a>`;
}

/** Liga o botao de salvar em qualquer container que use vagaCard */
export function ligarSalvarVaga(raiz, aoAlternar) {
  raiz.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-salvar-vaga]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    aoAlternar(btn.dataset.salvarVaga, btn);
  });
}
