/* ============================================================
   NORTE — Conteúdo editorial
   Textos de apoio que o painel administrativo edita e que
   aparecem para quem usa a plataforma.
   ============================================================ */

export const CONTEUDOS = [
  {
    id: 'ct-001',
    tipo: 'guia',
    titulo: 'Como montar um currículo que passa da triagem',
    resumo: 'O que recrutador procura nos primeiros quinze segundos e o que só ocupa espaço.',
    autor: 'Equipe NORTE',
    minutos: 6,
    atualizadoEm: '2026-09-12',
    publicado: true,
    visualizacoes: 4820,
  },
  {
    id: 'ct-002',
    tipo: 'guia',
    titulo: 'Primeira vaga sem experiência: por onde começar',
    resumo: 'Projetos, voluntariado e estágio contam como experiência. Veja como apresentar isso.',
    autor: 'Equipe NORTE',
    minutos: 8,
    atualizadoEm: '2026-09-05',
    publicado: true,
    visualizacoes: 7140,
  },
  {
    id: 'ct-003',
    tipo: 'guia',
    titulo: 'Como negociar salário sem perder a vaga',
    resumo: 'Quando falar de dinheiro, que número dizer e como responder à pergunta da pretensão.',
    autor: 'Equipe NORTE',
    minutos: 7,
    atualizadoEm: '2026-08-28',
    publicado: true,
    visualizacoes: 9320,
  },
  {
    id: 'ct-004',
    tipo: 'dica',
    titulo: 'Entrevista técnica: o que estudar na véspera',
    resumo: 'Revisar o básico rende mais que decorar caso complexo.',
    autor: 'Equipe NORTE',
    minutos: 4,
    atualizadoEm: '2026-09-18',
    publicado: true,
    visualizacoes: 2610,
  },
  {
    id: 'ct-005',
    tipo: 'dica',
    titulo: 'Transição de carreira depois dos 35',
    resumo: 'Experiência anterior é ativo, não passivo. Como traduzir isso no currículo.',
    autor: 'Equipe NORTE',
    minutos: 5,
    atualizadoEm: '2026-09-01',
    publicado: false,
    visualizacoes: 0,
  },
  {
    id: 'ct-006',
    tipo: 'relatorio',
    titulo: 'Panorama do mercado: terceiro trimestre de 2026',
    resumo: 'Onde abriram mais vagas, que áreas esfriaram e o que esperar do próximo trimestre.',
    autor: 'Pesquisa NORTE',
    minutos: 12,
    atualizadoEm: '2026-09-20',
    publicado: true,
    visualizacoes: 1890,
  },
  {
    id: 'ct-007',
    tipo: 'relatorio',
    titulo: 'Trabalho remoto dois anos depois',
    resumo: 'Quantas vagas continuam remotas por área e o que mudou na exigência das empresas.',
    autor: 'Pesquisa NORTE',
    minutos: 10,
    atualizadoEm: '2026-07-14',
    publicado: true,
    visualizacoes: 5430,
  },
  {
    id: 'ct-008',
    tipo: 'dica',
    titulo: 'O que responder em "fale sobre você"',
    resumo: 'Uma estrutura de três partes que cabe em noventa segundos.',
    autor: 'Equipe NORTE',
    minutos: 3,
    atualizadoEm: '2026-06-30',
    publicado: false,
    visualizacoes: 0,
  },
];

export const TIPOS_CONTEUDO = [
  { id: 'guia', nome: 'Guia', cor: 'var(--dado-1)' },
  { id: 'dica', nome: 'Dica rápida', cor: 'var(--dado-2)' },
  { id: 'relatorio', nome: 'Relatório', cor: 'var(--dado-4)' },
];

export const TIPO_POR_ID = Object.fromEntries(TIPOS_CONTEUDO.map(t => [t.id, t]));
