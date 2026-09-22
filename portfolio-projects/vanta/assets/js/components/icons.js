/* VANTA — Conjunto de icones (traco 1.7, familia unica)
   SVG inline: escalam, herdam a cor e nao dependem de fonte. */

const svg = (corpo, { size = 20, fill = false } = {}) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill ? 'currentColor' : 'none'}" ` +
  `stroke="${fill ? 'none' : 'currentColor'}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ` +
  `aria-hidden="true" focusable="false">${corpo}</svg>`;

export const icon = {
  busca: (o) => svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', o),
  carrinho: (o) => svg('<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h2.2l2.3 12.3a2 2 0 0 0 2 1.7h8.4a2 2 0 0 0 2-1.6L21 8H5.3"/>', o),
  usuario: (o) => svg('<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>', o),
  coracao: (o) => svg('<path d="M12 20.5 4.7 13.4a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8a4.6 4.6 0 0 1 6.5 6.5Z"/>', o),
  menu: (o) => svg('<path d="M3 6h18M3 12h18M3 18h18"/>', o),
  fechar: (o) => svg('<path d="M18 6 6 18M6 6l12 12"/>', o),
  chevronD: (o) => svg('<path d="m6 9 6 6 6-6"/>', o),
  chevronR: (o) => svg('<path d="m9 6 6 6-6 6"/>', o),
  chevronL: (o) => svg('<path d="m15 6-6 6 6 6"/>', o),
  chevronU: (o) => svg('<path d="m6 15 6-6 6 6"/>', o),
  seta: (o) => svg('<path d="M5 12h14M13 6l6 6-6 6"/>', o),
  mais: (o) => svg('<path d="M12 5v14M5 12h14"/>', o),
  menos: (o) => svg('<path d="M5 12h14"/>', o),
  check: (o) => svg('<path d="m4 12.5 5 5L20 6.5"/>', o),
  checkCirculo: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/>', o),
  alerta: (o) => svg('<path d="M12 3.5 22 20H2Z"/><path d="M12 10v4M12 17.2v.1"/>', o),
  info: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.1"/>', o),
  lixeira: (o) => svg('<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>', o),
  editar: (o) => svg('<path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5Z"/>', o),
  filtro: (o) => svg('<path d="M3 5h18M6 12h12M10 19h4"/>', o),
  ordenar: (o) => svg('<path d="M7 4v16M7 20l-3-3M17 20V4M17 4l3 3"/>', o),
  grade: (o) => svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>', o),
  lista: (o) => svg('<path d="M4 6h16M4 12h16M4 18h16"/>', o),
  estrela: (o) => svg('<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 9.7l5.8-.8Z"/>', o),
  caminhao: (o) => svg('<path d="M2 6.5h11v9H2zM13 9.5h4l3 3.2v2.8h-7z"/><circle cx="6" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/>', o),
  escudo: (o) => svg('<path d="M12 3 20 6.2v5.2c0 4.6-3.4 8.3-8 9.4-4.6-1.1-8-4.8-8-9.4V6.2Z"/><path d="m9 12 2 2 4-4.2"/>', o),
  retorno: (o) => svg('<path d="M3 11a9 9 0 1 1 2.6 6.4"/><path d="M3 5v6h6"/>', o),
  cartao: (o) => svg('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>', o),
  pix: (o) => svg('<path d="m12 3 4.2 4.2a2 2 0 0 0 1.4.6H19l-7 7-7-7h1.4a2 2 0 0 0 1.4-.6Z"/><path d="m5 12 7 7 7-7"/>', o),
  caixa: (o) => svg('<path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9Z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>', o),
  grafico: (o) => svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', o),
  pizza: (o) => svg('<path d="M12 3a9 9 0 1 0 9 9h-9Z"/><path d="M14.5 3.6A9 9 0 0 1 20.4 9.5h-5.9Z"/>', o),
  pessoas: (o) => svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 19a6 6 0 0 1 12 0"/><path d="M16.5 5.2a3.2 3.2 0 0 1 0 5.6M18 19a6 6 0 0 0-2-4.5"/>', o),
  etiqueta: (o) => svg('<path d="M3 11.5V4h7.5L21 14.5 14.5 21Z"/><circle cx="7.5" cy="7.5" r="1.3"/>', o),
  engrenagem: (o) => svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3"/>', o),
  painel: (o) => svg('<rect x="3" y="3" width="8" height="10" rx="1.6"/><rect x="13" y="3" width="8" height="6" rx="1.6"/><rect x="13" y="11" width="8" height="10" rx="1.6"/><rect x="3" y="15" width="8" height="6" rx="1.6"/>', o),
  sacola: (o) => svg('<path d="M4.5 7.5h15L18.5 21h-13Z"/><path d="M8.5 7.5V6a3.5 3.5 0 0 1 7 0v1.5"/>', o),
  local: (o) => svg('<path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>', o),
  relogio: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.2 1.9"/>', o),
  raio: (o) => svg('<path d="M13 2 4 13.5h6L11 22l9-11.5h-6Z"/>', o),
  sair: (o) => svg('<path d="M14 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8"/><path d="M17 15.5 20.5 12 17 8.5M20.5 12H10"/>', o),
  olho: (o) => svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>', o),
  olhoOff: (o) => svg('<path d="M4 4l16 16"/><path d="M9.5 9.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2"/><path d="M6.6 6.8A11.7 11.7 0 0 0 2.5 12S6 18.5 12 18.5a10 10 0 0 0 4.2-.9M17.8 15.2A11.5 11.5 0 0 0 21.5 12S18 5.5 12 5.5a9.9 9.9 0 0 0-2 .2"/>', o),
  copiar: (o) => svg('<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M5.5 15.5H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h9A1.5 1.5 0 0 1 15.5 5v.5"/>', o),
  exportar: (o) => svg('<path d="M12 15V3M8.5 6.5 12 3l3.5 3.5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>', o),
  vazio: (o) => svg('<path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5Z"/><path d="M4 8.5 12 13l8-4.5M12 13v7"/><path d="M2 2l20 20" stroke-dasharray="2 2"/>', o),
  estoque: (o) => svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18M8 7V4h8v3"/>', o),
  comentario: (o) => svg('<path d="M21 11.5a8 8 0 0 1-8 8H8l-5 2.5 1.3-4.4A8 8 0 1 1 21 11.5Z"/>', o),
  pergunta: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.4 2.4 0 1 1 3.3 2.2c-.6.3-.9.8-.9 1.4v.4M12 16.6v.1"/>', o),
  medalha: (o) => svg('<circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.5-1.5 7 5-2.6 5 2.6-1.5-7"/>', o),
  fogo: (o) => svg('<path d="M12 22c4 0 6.5-2.7 6.5-6.2 0-4.6-4.3-6.3-3.6-11.3-2.6.9-4.6 3.4-4.6 6 0 1.4-1 1.8-1.6 1-.5-.7-.6-1.7-.6-1.7C6 11.3 5.5 13.3 5.5 15.8 5.5 19.3 8 22 12 22Z"/>', o),
};

export const iconNames = Object.keys(icon);
