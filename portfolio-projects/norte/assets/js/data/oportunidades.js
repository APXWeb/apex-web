/* ============================================================
   NORTE — Oportunidades
   Geradas a partir de profissao x regiao x empresa com um
   gerador pseudoaleatorio semeado: o resultado e sempre o
   mesmo entre recarregamentos, o que mantem numero, mapa e
   grafico coerentes sem precisar de backend.
   ============================================================ */

import { PROFISSOES } from './profissoes.js';
import { EMPRESAS } from './empresas.js';
import { REGIOES, REGIAO_POR_ID, REMOTO } from './regioes.js';

/* Mulberry32: pequeno, rapido e determinístico */
function semente(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = semente(20260922);
const entre = (a, b) => a + rand() * (b - a);
const inteiro = (a, b) => Math.floor(entre(a, b + 1));
const escolher = (lista) => lista[Math.floor(rand() * lista.length)];

function escolherPeso(lista, chavePeso = 'peso') {
  const total = lista.reduce((s, i) => s + (i[chavePeso] || 1), 0);
  let n = rand() * total;
  for (const item of lista) {
    n -= item[chavePeso] || 1;
    if (n <= 0) return item;
  }
  return lista[lista.length - 1];
}

const NIVEIS = [
  { id: 'estagio', nome: 'Estágio', fator: 0.34, peso: 8 },
  { id: 'junior', nome: 'Júnior', fator: 1, peso: 26 },
  { id: 'pleno', nome: 'Pleno', fator: 1, peso: 38 },
  { id: 'senior', nome: 'Sênior', fator: 1, peso: 22 },
  { id: 'especialista', nome: 'Especialista', fator: 1.22, peso: 6 },
];

export const NIVEL_POR_ID = Object.fromEntries(NIVEIS.map(n => [n.id, n]));
export const NIVEIS_LISTA = NIVEIS;

export const MODELOS = [
  { id: 'presencial', nome: 'Presencial' },
  { id: 'hibrido', nome: 'Híbrido' },
  { id: 'remoto', nome: 'Remoto' },
];

export const CONTRATOS = [
  { id: 'clt', nome: 'CLT', peso: 62 },
  { id: 'pj', nome: 'PJ', peso: 22 },
  { id: 'estagio', nome: 'Estágio', peso: 9 },
  { id: 'temporario', nome: 'Temporário', peso: 7 },
];

export const HORARIOS = [
  { id: 'comercial', nome: 'Comercial (8h às 18h)', peso: 58 },
  { id: 'flexivel', nome: 'Flexível', peso: 22 },
  { id: 'escala', nome: 'Escala 12x36', peso: 11 },
  { id: 'turno', nome: 'Turno / plantão', peso: 6 },
  { id: 'parcial', nome: 'Meio período', peso: 3 },
];

/* Distancia aproximada em km a partir do centro da cidade,
   usando o plano 0-100 de cada regiao (1 unidade = 0,34 km). */
const UNIDADE_KM = 0.34;
export function distanciaEntre(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * UNIDADE_KM * 10) / 10;
}

const CENTRO = { x: 50, y: 50 };

function salarioDaVaga(prof, nivelId, indiceRegiao) {
  const s = prof.salario;
  let base;
  if (nivelId === 'estagio') base = Math.round(s.junior * 0.42);
  else if (nivelId === 'junior') base = s.junior;
  else if (nivelId === 'pleno') base = s.pleno;
  else if (nivelId === 'senior') base = s.senior;
  else base = Math.round(s.senior * 1.24);

  const ajustado = base * indiceRegiao * entre(0.92, 1.1);
  const min = Math.round(ajustado / 100) * 100;
  const max = Math.round((min * entre(1.16, 1.38)) / 100) * 100;
  return { min, max };
}

const EXTRAS_TITULO = ['', '', '', ' I', ' II', ' Sênior', ''];

function tituloVaga(prof, nivel) {
  if (nivel.id === 'estagio') return `Estágio em ${prof.nome}`;
  if (nivel.id === 'especialista') return `${prof.nome} Especialista`;
  if (nivel.id === 'pleno') return rand() > 0.55 ? `${prof.nome} Pleno` : prof.nome;
  return `${prof.nome} ${nivel.nome}`.replace(' Júnior Júnior', ' Júnior');
}

function requisitosDaVaga(prof, nivel) {
  const base = [...prof.hardSkills];
  const n = nivel.id === 'estagio' ? 3 : nivel.id === 'junior' ? 4 : 5;
  const lista = [];
  for (let i = 0; i < n && base.length; i++) {
    lista.push(base.splice(Math.floor(rand() * base.length), 1)[0]);
  }
  return lista;
}

function diferenciais(prof) {
  const pool = [...prof.ferramentas, ...prof.certificacoes];
  const lista = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    lista.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return lista;
}

const HOJE = new Date('2026-09-22T12:00:00');

function diasAtras(d) {
  const data = new Date(HOJE);
  data.setDate(data.getDate() - d);
  return data.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------
   Geracao
   ------------------------------------------------------------ */
const lista = [];
let seq = 0;

PROFISSOES.forEach(prof => {
  // Empresas que contratam essa area
  const candidatas = EMPRESAS.filter(e => e.areas.includes(prof.area));
  if (!candidatas.length) return;

  REGIOES.forEach(regiao => {
    // Quantidade proporcional a demanda da profissao e ao peso da regiao
    const base = (prof.demanda / 100) * (regiao.vagasPeso / 34) * 9;
    const qtd = Math.max(1, Math.round(base * entre(0.6, 1.5)));

    for (let i = 0; i < qtd; i++) {
      const empresasAqui = candidatas.filter(e => e.regioes.includes(regiao.id));
      const empresa = empresasAqui.length ? escolher(empresasAqui) : escolher(candidatas);
      const nivel = escolherPeso(NIVEIS);
      const bairro = escolherPeso(regiao.bairros);

      // O modelo respeita a vocacao da profissao e a politica da empresa
      let modelo;
      const r = rand() * 100;
      if (r < prof.modelos.remoto * 0.7) modelo = 'remoto';
      else if (r < prof.modelos.remoto * 0.7 + prof.modelos.hibrido) modelo = 'hibrido';
      else modelo = 'presencial';
      if (empresa.modelo === 'presencial' && modelo === 'remoto') modelo = 'hibrido';

      const contrato = nivel.id === 'estagio'
        ? CONTRATOS[2]
        : escolherPeso(CONTRATOS.filter(c => c.id !== 'estagio'));

      const horario = prof.area === 'saude' && rand() > 0.45
        ? escolher(HORARIOS.filter(h => h.id === 'escala' || h.id === 'turno'))
        : escolherPeso(HORARIOS.filter(h => h.id !== 'escala'));

      const sal = salarioDaVaga(prof, nivel.id, regiao.indice);
      const pos = { x: bairro.x + entre(-3, 3), y: bairro.y + entre(-3, 3) };
      const dias = Math.floor(Math.pow(rand(), 1.7) * 34);

      seq += 1;
      lista.push({
        id: `op-${String(seq).padStart(4, '0')}`,
        titulo: tituloVaga(prof, nivel),
        profissaoId: prof.id,
        area: prof.area,
        empresaId: empresa.id,
        regiaoId: regiao.id,
        bairro: bairro.nome,
        pos,
        distancia: distanciaEntre(pos, CENTRO),
        nivel: nivel.id,
        modelo,
        contrato: contrato.id,
        horario: horario.id,
        salarioMin: sal.min,
        salarioMax: sal.max,
        salarioVisivel: rand() > 0.12,
        vagas: rand() > 0.82 ? inteiro(2, 5) : 1,
        beneficios: empresa.beneficios.slice(0, inteiro(4, empresa.beneficios.length)),
        requisitos: requisitosDaVaga(prof, nivel),
        diferenciais: diferenciais(prof),
        publicadaEm: diasAtras(dias),
        diasPublicada: dias,
        candidaturas: Math.round(Math.pow(rand(), 1.5) * 180),
        urgente: rand() > 0.9,
        destaque: rand() > 0.87,
        ativa: true,
      });
    }
  });

  // Vagas 100% remotas, sem cidade definida
  const qtdRemoto = Math.max(0, Math.round((prof.remotoPct / 100) * 7 * entre(0.6, 1.4)));
  for (let i = 0; i < qtdRemoto; i++) {
    const empresa = escolher(candidatas);
    const nivel = escolherPeso(NIVEIS.filter(n => n.id !== 'estagio'));
    const sal = salarioDaVaga(prof, nivel.id, REMOTO.indice);
    const dias = Math.floor(Math.pow(rand(), 1.7) * 34);
    seq += 1;
    lista.push({
      id: `op-${String(seq).padStart(4, '0')}`,
      titulo: tituloVaga(prof, nivel),
      profissaoId: prof.id,
      area: prof.area,
      empresaId: empresa.id,
      regiaoId: 'remoto',
      bairro: 'Brasil',
      pos: { x: 50, y: 50 },
      distancia: 0,
      nivel: nivel.id,
      modelo: 'remoto',
      contrato: escolherPeso(CONTRATOS.filter(c => c.id !== 'estagio')).id,
      horario: 'flexivel',
      salarioMin: sal.min,
      salarioMax: sal.max,
      salarioVisivel: rand() > 0.1,
      vagas: 1,
      beneficios: empresa.beneficios.slice(0, inteiro(4, empresa.beneficios.length)),
      requisitos: requisitosDaVaga(prof, nivel),
      diferenciais: diferenciais(prof),
      publicadaEm: diasAtras(dias),
      diasPublicada: dias,
      candidaturas: Math.round(Math.pow(rand(), 1.5) * 260),
      urgente: rand() > 0.92,
      destaque: rand() > 0.88,
      ativa: true,
    });
  }
});

export const OPORTUNIDADES = lista;

/* ------------------------------------------------------------
   Avaliacoes ficticias de empresa
   ------------------------------------------------------------ */
const CARGOS_AVAL = ['Analista', 'Desenvolvedor', 'Coordenador', 'Especialista', 'Técnico', 'Consultor', 'Estagiário'];
const NOMES_AVAL = [
  'Ana P.', 'Bruno M.', 'Camila R.', 'Diego S.', 'Eduarda L.', 'Felipe A.', 'Gabriela T.',
  'Henrique C.', 'Isabela F.', 'João V.', 'Larissa N.', 'Marcelo D.', 'Natália B.',
  'Otávio G.', 'Patrícia H.', 'Rafael K.', 'Sofia M.', 'Thiago W.', 'Vanessa Q.', 'Yuri Z.',
];

const TITULOS_BONS = [
  'Ambiente que respeita o horário',
  'Bom lugar para crescer',
  'Time técnico forte',
  'Liderança acessível',
  'Aprendi muito em pouco tempo',
  'Processo bem organizado',
];
const TITULOS_MEDIOS = [
  'Tem pontos bons e pontos a melhorar',
  'Depende muito do time em que você cai',
  'Boa empresa, processos lentos',
  'Salário na média do mercado',
];
const TITULOS_RUINS = [
  'Cobrança alta e pouco retorno',
  'Rotatividade acima do saudável',
  'Falta clareza na promoção',
];

const TEXTOS_BONS = [
  'A liderança escuta de verdade e o plano de carreira é aplicado, não só um documento bonito. Consegui mudar de nível em pouco mais de um ano.',
  'O time é tecnicamente muito bom e existe espaço real para propor solução. Reunião só quando precisa.',
  'Benefício acima da média da região e horário respeitado. Nunca precisei virar noite.',
  'A empresa investe em formação de verdade: fiz duas certificações custeadas no primeiro ano.',
];
const TEXTOS_MEDIOS = [
  'Depende bastante da área. Algumas equipes são muito organizadas, outras nem tanto.',
  'Processo de decisão é lento por causa do tamanho, mas quando decide, executa bem.',
  'Salário na média. O diferencial acaba sendo o benefício e a estabilidade.',
  'Boa estrutura, mas a comunicação entre áreas ainda trava bastante coisa.',
];
const TEXTOS_RUINS = [
  'Meta agressiva demais para o tamanho do time, e a reposição demora.',
  'Promoção depende muito de quem é o gestor, falta critério transparente.',
  'Muita troca de prioridade no meio do caminho, o que gera retrabalho.',
];

const avals = [];
EMPRESAS.forEach(emp => {
  const n = inteiro(4, 7);
  for (let i = 0; i < n; i++) {
    // A nota puxa para a media da empresa, com variacao
    const alvo = emp.nota + entre(-1.1, 1.0);
    const nota = Math.max(1, Math.min(5, Math.round(alvo)));
    const conj = nota >= 4 ? [TITULOS_BONS, TEXTOS_BONS]
      : nota === 3 ? [TITULOS_MEDIOS, TEXTOS_MEDIOS]
        : [TITULOS_RUINS, TEXTOS_RUINS];
    avals.push({
      id: `av-${emp.id}-${i}`,
      empresaId: emp.id,
      autor: escolher(NOMES_AVAL),
      cargo: escolher(CARGOS_AVAL),
      nota,
      titulo: escolher(conj[0]),
      texto: escolher(conj[1]),
      recomenda: nota >= 4,
      tempoCasa: `${inteiro(1, 6)} anos`,
      data: diasAtras(inteiro(10, 400)),
    });
  }
});

export const AVALIACOES = avals;

/* Serie historica de buscas, usada no painel administrativo */
const serie = [];
for (let i = 179; i >= 0; i--) {
  const data = new Date(HOJE);
  data.setDate(data.getDate() - i);
  const dia = data.getDay();
  const fimDeSemana = dia === 0 || dia === 6;
  const tendencia = 1 + (179 - i) / 179 * 0.55;
  const base = 1400 * tendencia * (fimDeSemana ? 0.52 : 1);
  const buscas = Math.round(base * entre(0.86, 1.16));
  serie.push({
    data: data.toISOString().slice(0, 10),
    buscas,
    usuarios: Math.round(buscas * entre(0.52, 0.68)),
    visualizacoes: Math.round(buscas * entre(2.1, 3.2)),
    candidaturas: Math.round(buscas * entre(0.08, 0.16)),
  });
}

export const SERIE = serie;

/* Buscas mais frequentes, para sugestao e para o admin */
export const BUSCAS_POPULARES = (() => {
  const pares = [];
  PROFISSOES.forEach(p => {
    const peso = p.demanda * entre(0.7, 1.3);
    pares.push({ profissaoId: p.id, nome: p.nome, buscas: Math.round(peso * 42) });
  });
  return pares.sort((a, b) => b.buscas - a.buscas);
})();

export const REGIOES_POPULARES = REGIOES
  .map(r => ({ regiaoId: r.id, nome: r.nome, buscas: Math.round(r.vagasPeso * entre(120, 190)) }))
  .sort((a, b) => b.buscas - a.buscas);

export { REGIAO_POR_ID };
