/* ============================================================
   NORTE — Servico de busca
   Concentra sugestao, filtro, ordenacao e as estatisticas que
   a pagina de resultados mostra no topo.
   ============================================================ */

import {
  state, profissoesVisiveis, todasRegioes, vagasAtivas,
  acharProfissao, acharRegiao, acharEmpresa, salarioNaRegiao,
} from './store.js';
import { norm } from '../utils/format.js';
import { AREA_POR_ID } from '../data/profissoes.js';

/* ------------------------------------------------------------
   Sugestao (autocomplete)
   ------------------------------------------------------------ */
export function sugerirProfissoes(termo, limite = 7) {
  const t = norm(termo);
  const lista = profissoesVisiveis();

  if (!t) {
    return [...lista].sort((a, b) => b.demanda - a.demanda).slice(0, limite);
  }

  const pontuada = lista.map(p => {
    const nome = norm(p.nome);
    let pontos = 0;
    if (nome === t) pontos = 100;
    else if (nome.startsWith(t)) pontos = 80;
    else if (nome.includes(t)) pontos = 60;
    else if ((p.sinonimos || []).some(s => norm(s).startsWith(t))) pontos = 50;
    else if ((p.sinonimos || []).some(s => norm(s).includes(t))) pontos = 38;
    else if (norm(AREA_POR_ID[p.area]?.nome || '').includes(t)) pontos = 22;
    else if ((p.hardSkills || []).some(s => norm(s).includes(t))) pontos = 16;
    return { p, pontos: pontos ? pontos + p.demanda / 20 : 0 };
  }).filter(x => x.pontos > 0);

  return pontuada.sort((a, b) => b.pontos - a.pontos).slice(0, limite).map(x => x.p);
}

export function sugerirRegioes(termo, limite = 7) {
  const t = norm(termo);
  const lista = todasRegioes();

  if (!t) {
    return [...lista].sort((a, b) => (b.vagasPeso || 0) - (a.vagasPeso || 0)).slice(0, limite);
  }

  const pontuada = lista.map(r => {
    const cidade = norm(r.cidade);
    const nome = norm(r.nome);
    let pontos = 0;
    if (cidade === t) pontos = 100;
    else if (cidade.startsWith(t)) pontos = 80;
    else if (nome.includes(t)) pontos = 60;
    else if (norm(r.uf) === t) pontos = 55;
    else if ((r.bairros || []).some(b => norm(b.nome).startsWith(t))) pontos = 40;
    return { r, pontos: pontos ? pontos + (r.vagasPeso || 0) / 10 : 0 };
  }).filter(x => x.pontos > 0);

  return pontuada.sort((a, b) => b.pontos - a.pontos).slice(0, limite).map(x => x.r);
}

/* ------------------------------------------------------------
   Filtros
   ------------------------------------------------------------ */
export const FILTROS_PADRAO = {
  distancia: 0,        // 0 = sem limite
  salarioMin: 0,
  niveis: [],
  modelos: [],
  contratos: [],
  horarios: [],
  beneficios: [],
  empresas: [],
  soComSalario: false,
  publicadaAte: 0,     // dias; 0 = sem limite
  ordem: 'relevancia',
};

export function filtrosVazios(f) {
  return (
    !f.distancia && !f.salarioMin && !f.niveis.length && !f.modelos.length &&
    !f.contratos.length && !f.horarios.length && !f.beneficios.length &&
    !f.empresas.length && !f.soComSalario && !f.publicadaAte
  );
}

export function contarFiltros(f) {
  return (
    (f.distancia ? 1 : 0) + (f.salarioMin ? 1 : 0) + f.niveis.length + f.modelos.length +
    f.contratos.length + f.horarios.length + f.beneficios.length + f.empresas.length +
    (f.soComSalario ? 1 : 0) + (f.publicadaAte ? 1 : 0)
  );
}

/** Base da busca: vagas da profissao na regiao (remoto entra sempre) */
export function baseDaBusca(profissaoId, regiaoId) {
  const todas = vagasAtivas().filter(v => v.profissaoId === profissaoId);
  if (!regiaoId || regiaoId === 'qualquer') return todas;
  if (regiaoId === 'remoto') return todas.filter(v => v.modelo === 'remoto');
  // Numa cidade, vaga remota tambem serve para quem mora la
  return todas.filter(v => v.regiaoId === regiaoId || v.regiaoId === 'remoto');
}

export function aplicarFiltros(lista, f) {
  return lista.filter(v => {
    if (f.distancia && v.modelo !== 'remoto' && v.distancia > f.distancia) return false;
    if (f.salarioMin && (!v.salarioVisivel || v.salarioMax < f.salarioMin)) return false;
    if (f.soComSalario && !v.salarioVisivel) return false;
    if (f.niveis.length && !f.niveis.includes(v.nivel)) return false;
    if (f.modelos.length && !f.modelos.includes(v.modelo)) return false;
    if (f.contratos.length && !f.contratos.includes(v.contrato)) return false;
    if (f.horarios.length && !f.horarios.includes(v.horario)) return false;
    if (f.empresas.length && !f.empresas.includes(v.empresaId)) return false;
    if (f.publicadaAte && v.diasPublicada > f.publicadaAte) return false;
    if (f.beneficios.length) {
      const temTodos = f.beneficios.every(b =>
        v.beneficios.some(x => norm(x).includes(norm(b)))
      );
      if (!temTodos) return false;
    }
    return true;
  });
}

export const ORDENS = [
  { id: 'relevancia', nome: 'Mais relevantes' },
  { id: 'recentes', nome: 'Mais recentes' },
  { id: 'salario', nome: 'Maior salário' },
  { id: 'perto', nome: 'Mais perto' },
  { id: 'concorrencia', nome: 'Menos concorrência' },
];

export function ordenar(lista, ordem) {
  const copia = [...lista];
  switch (ordem) {
    case 'recentes':
      return copia.sort((a, b) => a.diasPublicada - b.diasPublicada);
    case 'salario':
      return copia.sort((a, b) => (b.salarioVisivel ? b.salarioMax : 0) - (a.salarioVisivel ? a.salarioMax : 0));
    case 'perto':
      return copia.sort((a, b) => a.distancia - b.distancia);
    case 'concorrencia':
      return copia.sort((a, b) => a.candidaturas - b.candidaturas);
    default:
      // Relevancia: destaque e urgencia pesam, vaga velha perde ponto
      return copia.sort((a, b) => pontuar(b) - pontuar(a));
  }
}

function pontuar(v) {
  let p = 0;
  if (v.destaque) p += 30;
  if (v.urgente) p += 12;
  if (v.salarioVisivel) p += 10;
  p += Math.max(0, 22 - v.diasPublicada);
  p += Math.min(14, v.salarioMax / 2000);
  return p;
}

/* ------------------------------------------------------------
   Estatisticas do resultado
   ------------------------------------------------------------ */
export function estatisticas(lista, profissaoId, regiaoId) {
  const prof = acharProfissao(profissaoId);
  const reg = acharRegiao(regiaoId);
  const comSalario = lista.filter(v => v.salarioVisivel);

  const medias = comSalario.map(v => (v.salarioMin + v.salarioMax) / 2);
  const media = medias.length ? medias.reduce((s, n) => s + n, 0) / medias.length : 0;
  const min = comSalario.length ? Math.min(...comSalario.map(v => v.salarioMin)) : 0;
  const max = comSalario.length ? Math.max(...comSalario.map(v => v.salarioMax)) : 0;

  const contar = (campo) => {
    const mapa = {};
    lista.forEach(v => { mapa[v[campo]] = (mapa[v[campo]] || 0) + 1; });
    return mapa;
  };

  const porModelo = contar('modelo');
  const porNivel = contar('nivel');
  const porHorario = contar('horario');
  const porContrato = contar('contrato');

  const maisComum = (mapa) =>
    Object.entries(mapa).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const empresas = {};
  lista.forEach(v => { empresas[v.empresaId] = (empresas[v.empresaId] || 0) + 1; });
  const topEmpresas = Object.entries(empresas)
    .map(([id, n]) => ({ empresa: acharEmpresa(id), vagas: n }))
    .filter(x => x.empresa)
    .sort((a, b) => b.vagas - a.vagas);

  const bairros = {};
  lista.filter(v => v.regiaoId !== 'remoto').forEach(v => {
    bairros[v.bairro] = (bairros[v.bairro] || 0) + 1;
  });
  const topBairros = Object.entries(bairros)
    .map(([nome, n]) => ({ nome, vagas: n }))
    .sort((a, b) => b.vagas - a.vagas);

  // Demanda relativa: compara com a media de vagas por profissao na regiao
  const universo = vagasAtivas().filter(v =>
    regiaoId === 'qualquer' || v.regiaoId === regiaoId || v.regiaoId === 'remoto'
  );
  const profissoesComVaga = new Set(universo.map(v => v.profissaoId)).size || 1;
  const mediaPorProfissao = universo.length / profissoesComVaga;
  const indiceDemanda = mediaPorProfissao ? lista.length / mediaPorProfissao : 1;

  return {
    total: lista.length,
    profissao: prof,
    regiao: reg,
    salario: {
      media: Math.round(media),
      min, max,
      referencia: prof ? salarioNaRegiao(prof, regiaoId) : null,
      semInformacao: lista.length - comSalario.length,
    },
    porModelo, porNivel, porHorario, porContrato,
    modeloMaisComum: maisComum(porModelo),
    horarioMaisComum: maisComum(porHorario),
    contratoMaisComum: maisComum(porContrato),
    topEmpresas,
    topBairros,
    novasNaSemana: lista.filter(v => v.diasPublicada <= 7).length,
    demanda: {
      indice: indiceDemanda,
      rotulo: indiceDemanda >= 1.6 ? 'Muito alta'
        : indiceDemanda >= 1.05 ? 'Alta'
          : indiceDemanda >= 0.6 ? 'Moderada' : 'Baixa',
      nivel: indiceDemanda >= 1.6 ? 4 : indiceDemanda >= 1.05 ? 3 : indiceDemanda >= 0.6 ? 2 : 1,
    },
  };
}

/** Beneficios que aparecem nas vagas do resultado, para montar o filtro */
export function beneficiosDisponiveis(lista) {
  const mapa = {};
  lista.forEach(v => v.beneficios.forEach(b => {
    const chave = b.split(' de R$')[0].split(' sem ')[0].trim();
    mapa[chave] = (mapa[chave] || 0) + 1;
  }));
  return Object.entries(mapa)
    .map(([nome, n]) => ({ nome, vagas: n }))
    .sort((a, b) => b.vagas - a.vagas)
    .slice(0, 8);
}

/** Empresas presentes no resultado, para o filtro */
export function empresasDisponiveis(lista) {
  const mapa = {};
  lista.forEach(v => { mapa[v.empresaId] = (mapa[v.empresaId] || 0) + 1; });
  return Object.entries(mapa)
    .map(([id, n]) => ({ empresa: acharEmpresa(id), vagas: n }))
    .filter(x => x.empresa)
    .sort((a, b) => b.vagas - a.vagas);
}

/* ------------------------------------------------------------
   Recomendacao para a pessoa
   ------------------------------------------------------------ */
export function recomendadasParaMim(limite = 6) {
  const p = state.perfil;
  const pontuadas = vagasAtivas().map(v => {
    let pontos = 0;
    const prof = acharProfissao(v.profissaoId);
    if (!prof) return null;

    if (p.areasInteresse?.includes(prof.area)) pontos += 34;
    if (v.regiaoId === p.regiaoPreferida) pontos += 22;
    if (v.regiaoId === 'remoto' && p.modelos?.includes('remoto')) pontos += 18;
    if (p.modelos?.includes(v.modelo)) pontos += 14;
    if (v.nivel === p.nivel) pontos += 16;
    if (v.salarioVisivel && v.salarioMax >= (p.salarioDesejado || 0)) pontos += 12;
    if (state.salvos.profissoes.includes(v.profissaoId)) pontos += 26;
    if (state.salvos.empresas.includes(v.empresaId)) pontos += 14;
    pontos += Math.max(0, 10 - v.diasPublicada / 3);

    return pontos > 30 ? { v, pontos } : null;
  }).filter(Boolean);

  return pontuadas.sort((a, b) => b.pontos - a.pontos).slice(0, limite).map(x => x.v);
}

/** Profissoes parecidas, para o rodape da pagina de profissao */
export function profissoesParecidas(profissao, limite = 4) {
  return profissoesVisiveis()
    .filter(p => p.id !== profissao.id)
    .map(p => {
      let pontos = 0;
      if (p.area === profissao.area) pontos += 40;
      const skills = new Set(profissao.hardSkills.map(norm));
      pontos += p.hardSkills.filter(s => skills.has(norm(s))).length * 12;
      const difSalario = Math.abs(p.salario.media - profissao.salario.media) / profissao.salario.media;
      pontos += Math.max(0, 18 - difSalario * 30);
      return { p, pontos };
    })
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, limite)
    .map(x => x.p);
}
