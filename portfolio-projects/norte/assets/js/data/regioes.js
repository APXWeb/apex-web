/* ============================================================
   NORTE — Regioes
   Cada regiao traz bairros com coordenada normalizada (0-100)
   usada pelo mapa estilizado. Nao e geografia real: e um plano
   cartesiano proprio, coerente dentro de cada cidade.
   `indice` calibra o salario local (1.00 = media nacional).
   ============================================================ */

export const REGIOES = [
  {
    id: 'sp-sp', cidade: 'São Paulo', uf: 'SP', nome: 'São Paulo, SP',
    indice: 1.18, populacao: 11451245, vagasPeso: 34,
    resumo: 'Maior mercado de trabalho do país, com forte concentração em tecnologia, finanças e serviços.',
    bairros: [
      { nome: 'Itaim Bibi', x: 46, y: 58, peso: 16 },
      { nome: 'Vila Olímpia', x: 44, y: 64, peso: 14 },
      { nome: 'Faria Lima', x: 41, y: 55, peso: 15 },
      { nome: 'Pinheiros', x: 36, y: 50, peso: 11 },
      { nome: 'Paulista', x: 50, y: 44, peso: 13 },
      { nome: 'Centro', x: 57, y: 35, peso: 8 },
      { nome: 'Berrini', x: 42, y: 71, peso: 9 },
      { nome: 'Barra Funda', x: 44, y: 28, peso: 5 },
      { nome: 'Santana', x: 58, y: 18, peso: 4 },
      { nome: 'Tatuapé', x: 72, y: 34, peso: 5 },
    ],
  },
  {
    id: 'sp-camp', cidade: 'Campinas', uf: 'SP', nome: 'Campinas, SP',
    indice: 1.02, populacao: 1223237, vagasPeso: 9,
    resumo: 'Polo de tecnologia e pesquisa, com forte presença de indústria e universidades.',
    bairros: [
      { nome: 'Cambuí', x: 48, y: 46, peso: 15 },
      { nome: 'Centro', x: 53, y: 38, peso: 12 },
      { nome: 'Barão Geraldo', x: 33, y: 22, peso: 16 },
      { nome: 'Taquaral', x: 45, y: 31, peso: 9 },
      { nome: 'Swift', x: 58, y: 52, peso: 7 },
      { nome: 'Nova Campinas', x: 41, y: 58, peso: 8 },
      { nome: 'Guanabara', x: 62, y: 44, peso: 6 },
      { nome: 'Vila Industrial', x: 66, y: 60, peso: 6 },
    ],
  },
  {
    id: 'rj-rj', cidade: 'Rio de Janeiro', uf: 'RJ', nome: 'Rio de Janeiro, RJ',
    indice: 1.06, populacao: 6211423, vagasPeso: 17,
    resumo: 'Segundo maior mercado nacional, com destaque em energia, mídia, turismo e serviços.',
    bairros: [
      { nome: 'Centro', x: 62, y: 40, peso: 16 },
      { nome: 'Botafogo', x: 55, y: 52, peso: 13 },
      { nome: 'Barra da Tijuca', x: 22, y: 70, peso: 14 },
      { nome: 'Copacabana', x: 58, y: 62, peso: 9 },
      { nome: 'Ipanema', x: 50, y: 66, peso: 8 },
      { nome: 'Tijuca', x: 48, y: 34, peso: 8 },
      { nome: 'Flamengo', x: 59, y: 48, peso: 7 },
      { nome: 'Cidade Nova', x: 66, y: 33, peso: 6 },
      { nome: 'Recreio', x: 12, y: 76, peso: 5 },
    ],
  },
  {
    id: 'mg-bh', cidade: 'Belo Horizonte', uf: 'MG', nome: 'Belo Horizonte, MG',
    indice: 0.94, populacao: 2315560, vagasPeso: 10,
    resumo: 'Centro econômico de Minas, com mineração, saúde, tecnologia e serviços.',
    bairros: [
      { nome: 'Savassi', x: 50, y: 52, peso: 16 },
      { nome: 'Funcionários', x: 54, y: 47, peso: 12 },
      { nome: 'Centro', x: 48, y: 40, peso: 13 },
      { nome: 'Lourdes', x: 43, y: 48, peso: 11 },
      { nome: 'Belvedere', x: 56, y: 70, peso: 9 },
      { nome: 'Buritis', x: 33, y: 63, peso: 7 },
      { nome: 'Santo Agostinho', x: 44, y: 44, peso: 7 },
      { nome: 'Pampulha', x: 40, y: 18, peso: 6 },
    ],
  },
  {
    id: 'pr-ctb', cidade: 'Curitiba', uf: 'PR', nome: 'Curitiba, PR',
    indice: 0.96, populacao: 1773718, vagasPeso: 8,
    resumo: 'Polo industrial e de tecnologia do Sul, com boa qualidade de vida e custo moderado.',
    bairros: [
      { nome: 'Centro', x: 50, y: 42, peso: 14 },
      { nome: 'Batel', x: 42, y: 52, peso: 16 },
      { nome: 'Água Verde', x: 45, y: 60, peso: 10 },
      { nome: 'Rebouças', x: 55, y: 50, peso: 9 },
      { nome: 'Mercês', x: 40, y: 36, peso: 8 },
      { nome: 'Cabral', x: 56, y: 28, peso: 7 },
      { nome: 'Portão', x: 38, y: 66, peso: 6 },
      { nome: 'CIC', x: 24, y: 72, peso: 6 },
    ],
  },
  {
    id: 'rs-poa', cidade: 'Porto Alegre', uf: 'RS', nome: 'Porto Alegre, RS',
    indice: 0.95, populacao: 1332570, vagasPeso: 7,
    resumo: 'Principal mercado do Rio Grande do Sul, forte em saúde, agro e tecnologia.',
    bairros: [
      { nome: 'Centro Histórico', x: 44, y: 40, peso: 13 },
      { nome: 'Moinhos de Vento', x: 48, y: 33, peso: 15 },
      { nome: 'Bela Vista', x: 52, y: 38, peso: 10 },
      { nome: 'Menino Deus', x: 50, y: 52, peso: 9 },
      { nome: 'Petrópolis', x: 58, y: 40, peso: 8 },
      { nome: 'Praia de Belas', x: 46, y: 48, peso: 8 },
      { nome: 'Zona Norte', x: 56, y: 20, peso: 6 },
    ],
  },
  {
    id: 'sc-fln', cidade: 'Florianópolis', uf: 'SC', nome: 'Florianópolis, SC',
    indice: 1.00, populacao: 537211, vagasPeso: 6,
    resumo: 'Um dos maiores polos de tecnologia por habitante do país, com muitas vagas remotas.',
    bairros: [
      { nome: 'Centro', x: 52, y: 46, peso: 14 },
      { nome: 'Trindade', x: 45, y: 38, peso: 13 },
      { nome: 'Itacorubi', x: 52, y: 32, peso: 15 },
      { nome: 'Córrego Grande', x: 47, y: 28, peso: 10 },
      { nome: 'Estreito', x: 32, y: 50, peso: 8 },
      { nome: 'Campeche', x: 58, y: 78, peso: 7 },
      { nome: 'Santo Antônio', x: 40, y: 14, peso: 5 },
    ],
  },
  {
    id: 'df-bsb', cidade: 'Brasília', uf: 'DF', nome: 'Brasília, DF',
    indice: 1.08, populacao: 2817381, vagasPeso: 9,
    resumo: 'Mercado com peso de setor público, consultoria, direito e tecnologia para governo.',
    bairros: [
      { nome: 'Asa Sul', x: 46, y: 56, peso: 15 },
      { nome: 'Asa Norte', x: 46, y: 34, peso: 13 },
      { nome: 'Setor Bancário', x: 50, y: 46, peso: 14 },
      { nome: 'Lago Sul', x: 64, y: 64, peso: 8 },
      { nome: 'Águas Claras', x: 24, y: 58, peso: 10 },
      { nome: 'Taguatinga', x: 16, y: 48, peso: 8 },
      { nome: 'Sudoeste', x: 38, y: 48, peso: 7 },
    ],
  },
  {
    id: 'pe-rec', cidade: 'Recife', uf: 'PE', nome: 'Recife, PE',
    indice: 0.88, populacao: 1488920, vagasPeso: 6,
    resumo: 'Maior polo de tecnologia do Nordeste, com o Porto Digital e forte setor de saúde.',
    bairros: [
      { nome: 'Recife Antigo', x: 66, y: 38, peso: 16 },
      { nome: 'Boa Viagem', x: 58, y: 72, peso: 13 },
      { nome: 'Ilha do Leite', x: 54, y: 46, peso: 11 },
      { nome: 'Santo Amaro', x: 58, y: 34, peso: 9 },
      { nome: 'Derby', x: 50, y: 48, peso: 8 },
      { nome: 'Casa Forte', x: 42, y: 34, peso: 7 },
      { nome: 'Imbiribeira', x: 52, y: 64, peso: 6 },
    ],
  },
  {
    id: 'ba-ssa', cidade: 'Salvador', uf: 'BA', nome: 'Salvador, BA',
    indice: 0.86, populacao: 2417678, vagasPeso: 6,
    resumo: 'Grande mercado do Nordeste, com serviços, turismo, saúde e indústria.',
    bairros: [
      { nome: 'Comércio', x: 34, y: 40, peso: 12 },
      { nome: 'Caminho das Árvores', x: 56, y: 52, peso: 15 },
      { nome: 'Pituba', x: 58, y: 60, peso: 12 },
      { nome: 'Itaigara', x: 52, y: 54, peso: 10 },
      { nome: 'Ondina', x: 40, y: 62, peso: 7 },
      { nome: 'Paralela', x: 66, y: 40, peso: 9 },
      { nome: 'Barra', x: 36, y: 70, peso: 6 },
    ],
  },
  {
    id: 'ce-for', cidade: 'Fortaleza', uf: 'CE', nome: 'Fortaleza, CE',
    indice: 0.84, populacao: 2428708, vagasPeso: 5,
    resumo: 'Mercado em crescimento, com indústria, comércio, saúde e polo emergente de tecnologia.',
    bairros: [
      { nome: 'Aldeota', x: 52, y: 54, peso: 15 },
      { nome: 'Meireles', x: 56, y: 44, peso: 13 },
      { nome: 'Centro', x: 44, y: 40, peso: 11 },
      { nome: 'Cocó', x: 62, y: 62, peso: 10 },
      { nome: 'Papicu', x: 66, y: 52, peso: 8 },
      { nome: 'Benfica', x: 40, y: 48, peso: 7 },
    ],
  },
  {
    id: 'go-goi', cidade: 'Goiânia', uf: 'GO', nome: 'Goiânia, GO',
    indice: 0.90, populacao: 1437366, vagasPeso: 5,
    resumo: 'Centro do agronegócio e da saúde no Centro-Oeste, com custo de vida acessível.',
    bairros: [
      { nome: 'Setor Bueno', x: 44, y: 56, peso: 15 },
      { nome: 'Setor Oeste', x: 46, y: 44, peso: 12 },
      { nome: 'Setor Marista', x: 50, y: 52, peso: 11 },
      { nome: 'Centro', x: 54, y: 40, peso: 9 },
      { nome: 'Jardim Goiás', x: 60, y: 58, peso: 10 },
      { nome: 'Campinas', x: 38, y: 42, peso: 6 },
    ],
  },
];

export const REGIAO_POR_ID = Object.fromEntries(REGIOES.map(r => [r.id, r]));

/* Trabalho remoto nao tem bairro: vira uma opcao propria de busca. */
export const REMOTO = {
  id: 'remoto', cidade: 'Remoto', uf: 'BR', nome: 'Qualquer lugar (remoto)',
  indice: 1.04, vagasPeso: 12,
  resumo: 'Vagas abertas para qualquer cidade do país, com trabalho totalmente a distância.',
  bairros: [],
};
