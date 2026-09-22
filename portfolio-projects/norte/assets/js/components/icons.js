/* ============================================================
   NORTE — Icones SVG
   Tracado unico de 1.7, cantos arredondados, herdando a cor do
   texto. Nenhum emoji e nenhum arquivo externo.
   ============================================================ */

const svg = (corpo, { size = 18, fill = 'none', strokeWidth = 1.7, cls = '' } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"
        fill="${fill}" stroke="currentColor" stroke-width="${strokeWidth}"
        stroke-linecap="round" stroke-linejoin="round" class="${cls}"
        aria-hidden="true" focusable="false">${corpo}</svg>`;

export const icon = {
  // Marca
  bussola: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="m15.4 8.6-2.1 5-5 2.1 2.1-5z"/>', o),
  norte: (o) => svg('<path d="m12 2 3.1 7.4 7.4 3.1-7.4 3.1L12 23l-3.1-7.4L1.5 12.5l7.4-3.1z"/>', o),

  // Navegacao
  lupa: (o) => svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', o),
  local: (o) => svg('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>', o),
  mapa: (o) => svg('<path d="m9 4-6 2.5v13L9 17l6 2.5 6-2.5v-13L15 6.5z"/><path d="M9 4v13M15 6.5v13"/>', o),
  lista: (o) => svg('<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>', o),
  grade: (o) => svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>', o),
  casa: (o) => svg('<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-7h6v7"/>', o),
  menu: (o) => svg('<path d="M3 6h18M3 12h18M3 18h18"/>', o),
  fechar: (o) => svg('<path d="M18 6 6 18M6 6l12 12"/>', o),
  seta: (o) => svg('<path d="M5 12h14M13 6l6 6-6 6"/>', o),
  setaEsq: (o) => svg('<path d="M19 12H5M11 18l-6-6 6-6"/>', o),
  chevronD: (o) => svg('<path d="m6 9 6 6 6-6"/>', o),
  chevronR: (o) => svg('<path d="m9 6 6 6-6 6"/>', o),
  chevronE: (o) => svg('<path d="m15 6-6 6 6 6"/>', o),
  chevronC: (o) => svg('<path d="m6 15 6-6 6 6"/>', o),
  externo: (o) => svg('<path d="M15 3h6v6M10 14 21 3M18 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h7"/>', o),

  // Trabalho
  maleta: (o) => svg('<rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="M8.5 7V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M2.5 12.5h19"/>', o),
  predio: (o) => svg('<path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M15 21V11h3a2 2 0 0 1 2 2v8M2 21h20"/><path d="M8 7h3M8 11h3M8 15h3"/>', o),
  relogio: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 1.9"/>', o),
  moeda: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="M15 9.5a2.6 2.6 0 0 0-2.5-1.5h-1a2.25 2.25 0 0 0 0 4.5h1a2.25 2.25 0 0 1 0 4.5h-1A2.6 2.6 0 0 1 9 15.5M12 6v2M12 16v2"/>', o),
  escada: (o) => svg('<path d="M3 20h4v-5H3zM10 20h4V10h-4zM17 20h4V4h-4z"/>', o),
  alvo: (o) => svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>', o),
  foguete: (o) => svg('<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2 2 0 0 0-2.9-.1z"/><path d="M12 15 9 12a13 13 0 0 1 3-8c1.5-1.6 3.6-2.6 5.8-2.8.5 2.2-.2 4.5-1.8 6.1A13 13 0 0 1 12 15z"/><path d="M9 12H5.5a1 1 0 0 1-.7-1.7l2-2a2 2 0 0 1 1.4-.6h2.4M12 15v3.5a1 1 0 0 0 1.7.7l2-2a2 2 0 0 0 .6-1.4v-2.4"/>', o),

  // Dado
  grafico: (o) => svg('<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m7 15 3.5-4 3 2.5L20 7"/>', o),
  barras: (o) => svg('<path d="M3 3v16a2 2 0 0 0 2 2h16"/><rect x="7" y="12" width="3" height="5" rx="1"/><rect x="12.5" y="8" width="3" height="9" rx="1"/><rect x="18" y="5" width="3" height="12" rx="1"/>', o),
  pizza: (o) => svg('<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15.5 2.5A8 8 0 0 1 21.5 8.5L15.5 10z"/>', o),
  tendencia: (o) => svg('<path d="m3 17 6-6 4 4 8-8"/><path d="M17 7h4v4"/>', o),
  pulso: (o) => svg('<path d="M3 12h4l2.5-7 5 14L17 12h4"/>', o),

  // Pessoa
  usuario: (o) => svg('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>', o),
  usuarios: (o) => svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 21v-1a5.5 5.5 0 0 1 5.5-5.5h2A5.5 5.5 0 0 1 15.5 20v1"/><path d="M16.5 4.5a3.5 3.5 0 0 1 0 7M18 14.5a5.5 5.5 0 0 1 3.5 5.1V21"/>', o),
  coracao: (o) => svg('<path d="M12 20.5S3.5 15 3.5 9.3A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 8.5 2.9c0 5.7-8.5 11.2-8.5 11.2z"/>', o),
  estrela: (o) => svg('<path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 16.8 6.6 19.6l1.2-6-4.5-4.2 6.1-.8z"/>', o),
  sino: (o) => svg('<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>', o),
  marcador: (o) => svg('<path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.2L5 21V4.5a1 1 0 0 1 1-1z"/>', o),

  // Formacao
  livro: (o) => svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z"/>', o),
  chapeu: (o) => svg('<path d="m2.5 8.5 9.5-4.5 9.5 4.5-9.5 4.5z"/><path d="M6.5 10.5v5c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-5M21 9v5"/>', o),
  selo: (o) => svg('<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1 7 4.5-2.5 4.5 2.5-1-7"/>', o),
  medalha: (o) => svg('<circle cx="12" cy="15" r="6"/><path d="m8 3 2.5 6M16 3l-2.5 6M12 12.5v5M9.8 15h4.4"/>', o),

  // Estado
  ok: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="m8.5 12.3 2.4 2.4 4.6-4.9"/>', o),
  alerta: (o) => svg('<path d="M10.3 4.3 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>', o),
  erro: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>', o),
  info: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', o),
  ajuda: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.1-2.5 3.6M12 17.5h.01"/>', o),

  // Acao
  filtro: (o) => svg('<path d="M3.5 5.5h17l-6.5 7.5v6l-4 2v-8z"/>', o),
  ordenar: (o) => svg('<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>', o),
  editar: (o) => svg('<path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5z"/><path d="M14.5 6.5 17.5 9.5"/>', o),
  lixo: (o) => svg('<path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6 7v12.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V7M10 11v6M14 11v6"/>', o),
  mais: (o) => svg('<path d="M12 5v14M5 12h14"/>', o),
  menos: (o) => svg('<path d="M5 12h14"/>', o),
  olho: (o) => svg('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>', o),
  olhoFechado: (o) => svg('<path d="M3 3l18 18M10.6 10.7a2.8 2.8 0 0 0 3.8 3.8M7 6.6C4.2 8.3 2 12 2 12s3.6 6.5 10 6.5c1.7 0 3.2-.4 4.5-1M20.6 15.4C21.6 13.8 22 12 22 12s-3.6-6.5-10-6.5c-.8 0-1.5.1-2.2.3"/>', o),
  atualizar: (o) => svg('<path d="M20 11a8 8 0 1 0-1.3 5.5"/><path d="M20 20v-5h-5"/>', o),
  baixar: (o) => svg('<path d="M12 3v12M8 11l4 4 4-4M4 20h16"/>', o),
  copiar: (o) => svg('<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M4.5 15.5h-.5a1.5 1.5 0 0 1-1.5-1.5V4a1.5 1.5 0 0 1 1.5-1.5h10A1.5 1.5 0 0 1 15.5 4v.5"/>', o),
  compartilhar: (o) => svg('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>', o),
  comparar: (o) => svg('<path d="M12 3v18M6 8 2.5 13h7zM18 8l-3.5 5h7z"/><path d="M6 17H2.5M21.5 17H18"/>', o),
  ajustes: (o) => svg('<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>', o),
  engrenagem: (o) => svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>', o),
  sair: (o) => svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', o),

  // Tema
  sol: (o) => svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', o),
  lua: (o) => svg('<path d="M21 13.5A9 9 0 1 1 10.5 3a7 7 0 0 0 10.5 10.5z"/>', o),

  // Areas
  codigo: (o) => svg('<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>', o),
  pincel: (o) => svg('<path d="M9.5 14.5 3 21s3.5.5 5-1a2.1 2.1 0 0 0-1.5-3.5"/><path d="m13 12 8.5-8.5a2 2 0 0 0-3-3L10 9"/><path d="m9 11 4 4"/>', o),
  regua: (o) => svg('<path d="m14.5 2.5 7 7L9.5 21.5l-7-7z"/><path d="m7 12 2 2M10 9l2 2M13 6l2 2"/>', o),
  balanca: (o) => svg('<path d="M12 3v18M7 21h10M12 6l7 2M12 6 5 8"/><path d="M5 8 2.5 14h5zM19 8l-2.5 6h5z"/>', o),
  megafone: (o) => svg('<path d="M3 11v2a2 2 0 0 0 2 2h2l6 4V5L7 9H5a2 2 0 0 0-2 2z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>', o),
  chave: (o) => svg('<path d="M14.5 6.5a4 4 0 1 1-5.4 5.4L3 18v3h3l.5-2h2l.5-2h2l1.6-1.6a4 4 0 0 1 1.9-8.9z"/><circle cx="16.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/>', o),
  caminhao: (o) => svg('<path d="M2.5 7h10v9h-10z"/><path d="M12.5 10h4l3 3v3h-7z"/><circle cx="6.5" cy="18.5" r="1.8"/><circle cx="16.5" cy="18.5" r="1.8"/>', o),
  raio: (o) => svg('<path d="M13 2 4 13.5h6L11 22l9-11.5h-6z"/>', o),
  calendario: (o) => svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', o),
  arquivo: (o) => svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>', o),
  pasta: (o) => svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', o),
  vazio: (o) => svg('<path d="M3 8.5 12 3l9 5.5v7L12 21l-9-5.5z"/><path d="M3 8.5 12 14l9-5.5M12 14v7"/>', o),
};

/** Sequencia de estrelas preenchidas conforme a nota */
export function estrelas(nota, size = 14) {
  const cheias = Math.round(nota);
  return `<span class="estrelas" role="img" aria-label="Nota ${String(nota).replace('.', ',')} de 5">${
    Array.from({ length: 5 }, (_, i) =>
      `<span class="estrelas__i ${i < cheias ? 'on' : ''}">${icon.estrela({ size, fill: i < cheias ? 'currentColor' : 'none' })}</span>`
    ).join('')
  }</span>`;
}
