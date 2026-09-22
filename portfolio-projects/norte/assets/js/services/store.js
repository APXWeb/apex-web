/* ============================================================
   NORTE — Estado da aplicacao
   Fonte unica de verdade. Persiste no localStorage e avisa os
   assinantes quando algo muda, para a interface se redesenhar.
   ============================================================ */

import { PROFISSOES, AREAS } from '../data/profissoes.js';
import { EMPRESAS } from '../data/empresas.js';
import { REGIOES, REMOTO } from '../data/regioes.js';
import { OPORTUNIDADES, AVALIACOES, SERIE, BUSCAS_POPULARES, REGIOES_POPULARES } from '../data/oportunidades.js';
import { USUARIOS } from '../data/usuarios.js';
import { CONTEUDOS } from '../data/conteudos.js';
import { hoje } from '../utils/format.js';

/* A versao entra na chave: dado antigo com formato diferente
   nao pode ressuscitar numa mesclagem. */
const CHAVE = 'norte_v2';

function estadoInicial() {
  return {
    // Catalogo editavel pelo admin
    profissoes: PROFISSOES.map(p => ({ ...p })),
    empresas: EMPRESAS.map(e => ({ ...e })),
    regioes: REGIOES.map(r => ({ ...r })),
    oportunidades: OPORTUNIDADES.map(o => ({ ...o })),
    avaliacoes: AVALIACOES.map(a => ({ ...a })),
    usuarios: USUARIOS.map(u => ({ ...u })),
    conteudos: CONTEUDOS.map(c => ({ ...c })),

    // Configuracao da plataforma, editavel pelo admin
    plataforma: {
      nome: 'NORTE',
      slogan: 'Encontre o seu norte profissional',
      contato: 'contato@norte.exemplo.com',
      vagasPorPagina: 12,
      exigirSalario: false,
      moderarVagas: true,
      permitirCadastro: true,
      diasExpiracao: 45,
    },

    // Sessao da pessoa
    perfil: {
      nome: 'Marina Duarte',
      email: 'marina.duarte@exemplo.com',
      cargo: 'Em transição de carreira',
      cidade: 'São Paulo, SP',
      regiaoPreferida: 'sp-sp',
      areasInteresse: ['tecnologia', 'dados'],
      nivel: 'junior',
      salarioDesejado: 6000,
      modelos: ['remoto', 'hibrido'],
    },
    salvos: { profissoes: [], vagas: [], empresas: [] },
    historico: [],
    comparacoes: [],
    alertas: [
      {
        id: 'al-1', profissaoId: 'analista-dados', regiaoId: 'sp-sp',
        salarioMin: 5000, modelo: 'qualquer', nivel: 'qualquer',
        frequencia: 'diaria', ativo: true, criadoEm: '2026-09-04', novas: 3, vistos: false,
      },
      {
        id: 'al-2', profissaoId: 'front-end', regiaoId: 'remoto',
        salarioMin: 7000, modelo: 'remoto', nivel: 'pleno',
        frequencia: 'semanal', ativo: true, criadoEm: '2026-08-21', novas: 0, vistos: true,
      },
    ],
    candidaturas: [],
    config: { emailAlertas: true, resumoSemanal: false, dicasCarreira: true },
  };
}

function carregar() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return estadoInicial();
    const salvo = JSON.parse(bruto);
    const base = estadoInicial();
    return {
      ...base,
      ...salvo,
      perfil: { ...base.perfil, ...(salvo.perfil || {}) },
      salvos: { ...base.salvos, ...(salvo.salvos || {}) },
      config: { ...base.config, ...(salvo.config || {}) },
      plataforma: { ...base.plataforma, ...(salvo.plataforma || {}) },
    };
  } catch {
    return estadoInicial();
  }
}

export const state = carregar();

export const AREAS_LISTA = AREAS;
export const SERIE_HISTORICA = SERIE;
export const POPULARES = BUSCAS_POPULARES;
export const REGIOES_TOP = REGIOES_POPULARES;
export const REGIAO_REMOTO = REMOTO;

const assinantes = new Set();

export function subscribe(fn) {
  assinantes.add(fn);
  return () => assinantes.delete(fn);
}

let agendado = false;

export function commit(evento = 'mudou') {
  if (!agendado) {
    agendado = true;
    setTimeout(() => {
      agendado = false;
      try {
        localStorage.setItem(CHAVE, JSON.stringify(state));
      } catch { /* cota cheia: segue sem persistir */ }
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
   LEITURA
   ============================================================ */
export const profissoesVisiveis = () => state.profissoes.filter(p => p.publicada);
export const acharProfissao = (id) => state.profissoes.find(p => p.id === id);
export const acharEmpresa = (id) => state.empresas.find(e => e.id === id);
export const acharRegiao = (id) => (id === 'remoto' ? REMOTO : state.regioes.find(r => r.id === id));
export const acharVaga = (id) => state.oportunidades.find(o => o.id === id);

export const todasRegioes = () => [...state.regioes, REMOTO];

export const vagasAtivas = () => state.oportunidades.filter(o => o.ativa);

export const vagasDaProfissao = (profissaoId) =>
  vagasAtivas().filter(o => o.profissaoId === profissaoId);

export const vagasDaEmpresa = (empresaId) =>
  vagasAtivas().filter(o => o.empresaId === empresaId);

export const avaliacoesDaEmpresa = (empresaId) =>
  state.avaliacoes.filter(a => a.empresaId === empresaId)
    .sort((a, b) => b.data.localeCompare(a.data));

/** Salario ajustado pelo indice da regiao */
export function salarioNaRegiao(profissao, regiaoId) {
  const r = acharRegiao(regiaoId);
  const i = r?.indice || 1;
  const s = profissao.salario;
  return {
    junior: Math.round(s.junior * i),
    pleno: Math.round(s.pleno * i),
    senior: Math.round(s.senior * i),
    media: Math.round(s.media * i),
    min: Math.round(s.min * i),
    max: Math.round(s.max * i),
  };
}

/* ============================================================
   SALVOS
   ============================================================ */
function alternar(lista, id) {
  const i = lista.indexOf(id);
  if (i >= 0) { lista.splice(i, 1); return false; }
  lista.push(id);
  return true;
}

export function alternarSalvo(tipo, id) {
  if (!state.salvos[tipo]) state.salvos[tipo] = [];
  const virouSalvo = alternar(state.salvos[tipo], id);
  commit('salvos');
  return virouSalvo;
}

export const estaSalvo = (tipo, id) => (state.salvos[tipo] || []).includes(id);

/* ============================================================
   HISTORICO DE BUSCA
   ============================================================ */
export function registrarBusca(profissaoId, regiaoId, total) {
  const prof = acharProfissao(profissaoId);
  const reg = acharRegiao(regiaoId);
  if (!prof || !reg) return;

  // Uma busca repetida sobe para o topo em vez de duplicar
  state.historico = state.historico.filter(
    h => !(h.profissaoId === profissaoId && h.regiaoId === regiaoId)
  );
  state.historico.unshift({
    id: `h-${Date.now().toString(36)}`,
    profissaoId, regiaoId,
    profissao: prof.nome, regiao: reg.nome,
    total, data: hoje(),
  });
  state.historico = state.historico.slice(0, 24);
  commit('historico');
}

export function limparHistorico() {
  state.historico = [];
  commit('historico');
}

export function removerDoHistorico(id) {
  state.historico = state.historico.filter(h => h.id !== id);
  commit('historico');
}

/* ============================================================
   COMPARACOES
   ============================================================ */
export function salvarComparacao(ids) {
  const nomes = ids.map(id => acharProfissao(id)?.nome).filter(Boolean);
  if (nomes.length < 2) return { ok: false, motivo: 'Escolha pelo menos duas profissões.' };

  const chave = [...ids].sort().join('|');
  if (state.comparacoes.some(c => [...c.ids].sort().join('|') === chave)) {
    return { ok: false, motivo: 'Essa comparação já está salva.' };
  }

  state.comparacoes.unshift({
    id: `cmp-${Date.now().toString(36)}`,
    ids: [...ids], nomes, data: hoje(),
  });
  commit('comparacoes');
  return { ok: true };
}

export function removerComparacao(id) {
  state.comparacoes = state.comparacoes.filter(c => c.id !== id);
  commit('comparacoes');
}

/* ============================================================
   ALERTAS
   ============================================================ */
export function criarAlerta(dados) {
  const alerta = {
    id: `al-${Date.now().toString(36)}`,
    profissaoId: dados.profissaoId,
    regiaoId: dados.regiaoId,
    salarioMin: Number(dados.salarioMin) || 0,
    modelo: dados.modelo || 'qualquer',
    nivel: dados.nivel || 'qualquer',
    frequencia: dados.frequencia || 'diaria',
    ativo: true,
    criadoEm: hoje(),
    novas: 0,
    vistos: true,
  };
  state.alertas.unshift(alerta);
  commit('alertas');
  return alerta;
}

export function atualizarAlerta(id, dados) {
  const a = state.alertas.find(x => x.id === id);
  if (!a) return { ok: false };
  Object.assign(a, dados);
  commit('alertas');
  return { ok: true, alerta: a };
}

export function removerAlerta(id) {
  const i = state.alertas.findIndex(a => a.id === id);
  if (i < 0) return { ok: false };
  const removido = state.alertas.splice(i, 1)[0];
  commit('alertas');
  return { ok: true, removido };
}

export function restaurarAlerta(alerta, pos = 0) {
  state.alertas.splice(pos, 0, alerta);
  commit('alertas');
}

/** Quantas vagas atendem cada alerta hoje */
export function vagasDoAlerta(alerta) {
  return vagasAtivas().filter(v =>
    v.profissaoId === alerta.profissaoId &&
    (alerta.regiaoId === 'qualquer' || v.regiaoId === alerta.regiaoId) &&
    (!alerta.salarioMin || v.salarioMax >= alerta.salarioMin) &&
    (alerta.modelo === 'qualquer' || v.modelo === alerta.modelo) &&
    (alerta.nivel === 'qualquer' || v.nivel === alerta.nivel)
  );
}

export const alertasNaoVistos = () =>
  state.alertas.filter(a => a.ativo && a.novas > 0 && !a.vistos).length;

export function marcarAlertasVistos() {
  let mudou = false;
  state.alertas.forEach(a => { if (!a.vistos) { a.vistos = true; mudou = true; } });
  if (mudou) commit('alertas');
}

/* ============================================================
   CANDIDATURA (simulada)
   ============================================================ */
export function candidatar(vagaId) {
  if (state.candidaturas.some(c => c.vagaId === vagaId)) {
    return { ok: false, motivo: 'Você já se candidatou a esta vaga.' };
  }
  const v = acharVaga(vagaId);
  if (!v) return { ok: false, motivo: 'Vaga não encontrada.' };

  state.candidaturas.unshift({
    id: `cand-${Date.now().toString(36)}`,
    vagaId, data: hoje(), status: 'enviada',
  });
  v.candidaturas += 1;
  commit('candidaturas');
  return { ok: true };
}

export const jaCandidatou = (vagaId) => state.candidaturas.some(c => c.vagaId === vagaId);

/* ============================================================
   PERFIL E CONFIGURACAO
   ============================================================ */
export function salvarPerfil(dados) {
  Object.assign(state.perfil, dados);
  commit('perfil');
  return { ok: true };
}

export function salvarConfig(dados) {
  Object.assign(state.config, dados);
  commit('config');
}


/* ============================================================
   ADMIN — escrita no catalogo
   ============================================================ */
export function salvarProfissao(dados) {
  if (dados.id && acharProfissao(dados.id)) {
    const p = acharProfissao(dados.id);
    Object.assign(p, dados);
    commit('profissoes');
    return { ok: true, profissao: p, criada: false };
  }
  // Os dados do formulario vem primeiro; o que falta e completado
  // depois, senao um id gerado agora seria apagado por um undefined.
  const nova = {
    ...dados,
    id: dados.id || `pr-${Date.now().toString(36)}`,
    area: dados.area || 'tecnologia',
    sinonimos: dados.sinonimos || [],
    responsabilidades: dados.responsabilidades || [],
    diaADia: dados.diaADia || [],
    ondeTrabalha: dados.ondeTrabalha || [],
    hardSkills: dados.hardSkills || [],
    softSkills: dados.softSkills || [],
    ferramentas: dados.ferramentas || [],
    cursos: dados.cursos || [],
    certificacoes: dados.certificacoes || [],
    beneficios: dados.beneficios || [],
    evolucao: dados.evolucao || [],
    roteiro: dados.roteiro || [],
    experiencia: dados.experiencia || { junior: '', pleno: '', senior: '' },
    modelos: dados.modelos || { remoto: 20, hibrido: 40, presencial: 40 },
    formacao: dados.formacao || { exigencia: 'opcional', rotulo: 'Graduação opcional', detalhe: '', tempoMeses: 12 },
    publicada: dados.publicada ?? true,
  };
  state.profissoes.unshift(nova);
  commit('profissoes');
  return { ok: true, profissao: nova, criada: true };
}

export function removerProfissao(id) {
  const i = state.profissoes.findIndex(p => p.id === id);
  if (i < 0) return { ok: false };
  const removida = state.profissoes.splice(i, 1)[0];
  commit('profissoes');
  return { ok: true, removida, pos: i };
}

export function restaurarProfissao(p, pos = 0) {
  state.profissoes.splice(pos, 0, p);
  commit('profissoes');
}

export function alternarPublicacao(id) {
  const p = acharProfissao(id);
  if (!p) return { ok: false };
  p.publicada = !p.publicada;
  commit('profissoes');
  return { ok: true, publicada: p.publicada };
}

export function salvarEmpresa(dados) {
  if (dados.id && acharEmpresa(dados.id)) {
    Object.assign(acharEmpresa(dados.id), dados);
    commit('empresas');
    return { ok: true, criada: false };
  }
  const nova = {
    ...dados,
    id: dados.id || `emp-${Date.now().toString(36)}`,
    sigla: dados.sigla || (dados.nome || 'NA').slice(0, 2).toUpperCase(),
    cor: dados.cor || '#067C8E',
    areas: dados.areas || [],
    regioes: dados.regioes || [],
    beneficios: dados.beneficios || [],
    cultura: dados.cultura || [],
    nota: dados.nota ?? 0,
    totalAvaliacoes: dados.totalAvaliacoes ?? 0,
    funcionarios: Number(dados.funcionarios) || 0,
  };
  state.empresas.unshift(nova);
  commit('empresas');
  return { ok: true, criada: true, empresa: nova };
}

export function removerEmpresa(id) {
  const i = state.empresas.findIndex(e => e.id === id);
  if (i < 0) return { ok: false };
  const removida = state.empresas.splice(i, 1)[0];
  commit('empresas');
  return { ok: true, removida, pos: i };
}

export function restaurarEmpresa(e, pos = 0) {
  state.empresas.splice(pos, 0, e);
  commit('empresas');
}

export function salvarVaga(dados) {
  if (dados.id && acharVaga(dados.id)) {
    Object.assign(acharVaga(dados.id), dados);
    commit('oportunidades');
    return { ok: true, criada: false };
  }
  const nova = {
    ...dados,
    id: dados.id || `op-${Date.now().toString(36)}`,
    pos: dados.pos || { x: 50, y: 50 },
    distancia: dados.distancia ?? 0,
    beneficios: dados.beneficios || [],
    requisitos: dados.requisitos || [],
    diferenciais: dados.diferenciais || [],
    publicadaEm: dados.publicadaEm || hoje(),
    diasPublicada: 0,
    candidaturas: dados.candidaturas ?? 0,
    salarioVisivel: dados.salarioVisivel ?? true,
    vagas: Number(dados.vagas) || 1,
    ativa: dados.ativa ?? true,
  };
  state.oportunidades.unshift(nova);
  commit('oportunidades');
  return { ok: true, criada: true, vaga: nova };
}

export function removerVaga(id) {
  const i = state.oportunidades.findIndex(o => o.id === id);
  if (i < 0) return { ok: false };
  const removida = state.oportunidades.splice(i, 1)[0];
  commit('oportunidades');
  return { ok: true, removida, pos: i };
}

export function restaurarVaga(v, pos = 0) {
  state.oportunidades.splice(pos, 0, v);
  commit('oportunidades');
}

export function alternarVaga(id) {
  const v = acharVaga(id);
  if (!v) return { ok: false };
  v.ativa = !v.ativa;
  commit('oportunidades');
  return { ok: true, ativa: v.ativa };
}

export function salvarRegiao(dados) {
  const existente = state.regioes.find(r => r.id === dados.id);
  if (existente) {
    Object.assign(existente, dados);
    commit('regioes');
    return { ok: true, criada: false };
  }
  const nova = {
    ...dados,
    id: dados.id || `reg-${Date.now().toString(36)}`,
    bairros: dados.bairros || [{ nome: 'Centro', x: 50, y: 50, peso: 10 }],
    indice: Number(dados.indice) || 1,
    vagasPeso: Number(dados.vagasPeso) || 5,
    nome: dados.nome || `${dados.cidade}, ${dados.uf}`,
  };
  state.regioes.push(nova);
  commit('regioes');
  return { ok: true, criada: true, regiao: nova };
}

export function removerRegiao(id) {
  const i = state.regioes.findIndex(r => r.id === id);
  if (i < 0) return { ok: false };
  const removida = state.regioes.splice(i, 1)[0];
  commit('regioes');
  return { ok: true, removida, pos: i };
}

export function restaurarRegiao(r, pos = 0) {
  state.regioes.splice(pos, 0, r);
  commit('regioes');
}

/* ============================================================
   ADMIN — usuarios, conteudo e configuracao da plataforma
   ============================================================ */
export const acharUsuario = (id) => state.usuarios.find(u => u.id === id);
export const acharConteudo = (id) => state.conteudos.find(c => c.id === id);

export function salvarUsuario(dados) {
  const existente = dados.id && acharUsuario(dados.id);
  if (existente) {
    Object.assign(existente, dados);
    commit('usuarios');
    return { ok: true, criado: false, usuario: existente };
  }
  const novo = {
    ...dados,
    id: dados.id || `us-${Date.now().toString(36)}`,
    candidaturas: Number(dados.candidaturas) || 0,
    alertas: Number(dados.alertas) || 0,
    cadastradoEm: dados.cadastradoEm || hoje(),
    ultimoAcesso: dados.ultimoAcesso || hoje(),
    ativo: dados.ativo ?? true,
  };
  state.usuarios.unshift(novo);
  commit('usuarios');
  return { ok: true, criado: true, usuario: novo };
}

export function removerUsuario(id) {
  const i = state.usuarios.findIndex(u => u.id === id);
  if (i < 0) return { ok: false };
  const removido = state.usuarios.splice(i, 1)[0];
  commit('usuarios');
  return { ok: true, removido, pos: i };
}

export function restaurarUsuario(u, pos = 0) {
  state.usuarios.splice(pos, 0, u);
  commit('usuarios');
}

export function alternarUsuario(id) {
  const u = acharUsuario(id);
  if (!u) return { ok: false };
  u.ativo = !u.ativo;
  commit('usuarios');
  return { ok: true, ativo: u.ativo };
}

export function salvarConteudo(dados) {
  const existente = dados.id && acharConteudo(dados.id);
  if (existente) {
    Object.assign(existente, dados, { atualizadoEm: hoje() });
    commit('conteudos');
    return { ok: true, criado: false, conteudo: existente };
  }
  const novo = {
    ...dados,
    id: dados.id || `ct-${Date.now().toString(36)}`,
    tipo: dados.tipo || 'guia',
    autor: dados.autor || 'Equipe NORTE',
    minutos: Number(dados.minutos) || 5,
    atualizadoEm: hoje(),
    publicado: dados.publicado ?? false,
    visualizacoes: Number(dados.visualizacoes) || 0,
  };
  state.conteudos.unshift(novo);
  commit('conteudos');
  return { ok: true, criado: true, conteudo: novo };
}

export function removerConteudo(id) {
  const i = state.conteudos.findIndex(c => c.id === id);
  if (i < 0) return { ok: false };
  const removido = state.conteudos.splice(i, 1)[0];
  commit('conteudos');
  return { ok: true, removido, pos: i };
}

export function restaurarConteudo(c, pos = 0) {
  state.conteudos.splice(pos, 0, c);
  commit('conteudos');
}

export function alternarConteudo(id) {
  const c = acharConteudo(id);
  if (!c) return { ok: false };
  c.publicado = !c.publicado;
  c.atualizadoEm = hoje();
  commit('conteudos');
  return { ok: true, publicado: c.publicado };
}

export function salvarPlataforma(dados) {
  Object.assign(state.plataforma, dados);
  commit('plataforma');
  return { ok: true };
}
