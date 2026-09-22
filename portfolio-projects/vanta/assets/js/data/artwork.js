/* ============================================================
   VANTA — Arte de produto gerada em SVG
   Nao temos fotografia de produto, entao cada item ganha uma
   ilustracao vetorial propria: nitida em qualquer tamanho,
   consistente entre si e leve (nenhum arquivo de imagem).
   ============================================================ */

// Paletas nomeadas, aplicadas por variante de cor do produto.
export const FINISHES = {
  graphite: { body: '#2a2f38', edge: '#161a21', hi: '#4a525f', trim: '#8b96a5' },
  midnight: { body: '#1e2a45', edge: '#121a2c', hi: '#35486f', trim: '#7d93c4' },
  silver:   { body: '#c3c9d2', edge: '#8e96a3', hi: '#e8ecf1', trim: '#5c6472' },
  sand:     { body: '#d6c5ab', edge: '#a8947a', hi: '#efe4d3', trim: '#6f6151' },
  volt:     { body: '#bef264', edge: '#86a832', hi: '#ddfd9c', trim: '#2f3d12' },
  iris:     { body: '#8b7cff', edge: '#5b4fc4', hi: '#b3a9ff', trim: '#2b2560' },
  cyan:     { body: '#4cd6e3', edge: '#2e9aa6', hi: '#93e9f1', trim: '#0f3d43' },
  rose:     { body: '#f4667d', edge: '#c1445a', hi: '#f9a1b0', trim: '#4d1520' },
  ivory:    { body: '#f0ece4', edge: '#c4bdb0', hi: '#ffffff', trim: '#6b655c' },
  forest:   { body: '#2f5d4e', edge: '#1c3a31', hi: '#4a8471', trim: '#9dc9b8' },
};

const uid = (() => { let n = 0; return () => `vg${++n}`; })();

// Fundo comum: leve halo radial que separa o produto do card sem "caixa".
function backdrop(p, id) {
  return `
    <defs>
      <radialGradient id="${id}-bg" cx="50%" cy="42%" r="62%">
        <stop offset="0%" stop-color="${p.hi}" stop-opacity="0.16"/>
        <stop offset="60%" stop-color="${p.body}" stop-opacity="0.05"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}-body" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stop-color="${p.hi}"/>
        <stop offset="45%" stop-color="${p.body}"/>
        <stop offset="100%" stop-color="${p.edge}"/>
      </linearGradient>
      <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
        <stop offset="55%" stop-color="#ffffff" stop-opacity="0.04"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.12"/>
      </linearGradient>
      <linearGradient id="${id}-screen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b1020"/>
        <stop offset="100%" stop-color="#1c2740"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#${id}-bg)"/>`;
}

// Sombra de contato no "chao" — ancora o objeto sem precisar de cena.
function shadow(cx = 200, cy = 330, rx = 92, ry = 13) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="0.38"/>`;
}

/* ---------------- Arquetipos ---------------- */

const ART = {
  headphones: (p, id) => `
    ${shadow(200, 342, 84, 11)}
    <path d="M104 214v-32a96 96 0 0 1 192 0v32" fill="none" stroke="url(#${id}-body)" stroke-width="20" stroke-linecap="round"/>
    <path d="M104 206v-24a96 96 0 0 1 192 0v24" fill="none" stroke="${p.hi}" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
    <rect x="72" y="196" width="66" height="112" rx="30" fill="url(#${id}-body)"/>
    <rect x="262" y="196" width="66" height="112" rx="30" fill="url(#${id}-body)"/>
    <rect x="84" y="210" width="42" height="84" rx="21" fill="${p.edge}" opacity="0.85"/>
    <rect x="274" y="210" width="42" height="84" rx="21" fill="${p.edge}" opacity="0.85"/>
    <ellipse cx="105" cy="252" rx="13" ry="30" fill="${p.trim}" opacity="0.4"/>
    <ellipse cx="295" cy="252" rx="13" ry="30" fill="${p.trim}" opacity="0.4"/>
    <rect x="72" y="196" width="66" height="112" rx="30" fill="url(#${id}-glass)"/>
    <rect x="262" y="196" width="66" height="112" rx="30" fill="url(#${id}-glass)"/>
    <circle cx="295" cy="288" r="4" fill="${p.trim}"/>`,

  earbuds: (p, id) => `
    ${shadow(200, 336, 76, 10)}
    <rect x="118" y="196" width="164" height="118" rx="34" fill="url(#${id}-body)"/>
    <rect x="118" y="196" width="164" height="118" rx="34" fill="url(#${id}-glass)"/>
    <path d="M118 236h164" stroke="${p.edge}" stroke-width="2.5" opacity="0.6"/>
    <circle cx="200" cy="292" r="5" fill="${p.trim}" opacity="0.7"/>
    <g>
      <path d="M156 92c19 0 33 15 33 34 0 16-7 26-7 40 0 15-11 26-26 26s-27-12-27-27c0-24 4-73 27-73z" fill="url(#${id}-body)"/>
      <circle cx="157" cy="126" r="15" fill="${p.edge}" opacity="0.8"/>
      <circle cx="152" cy="120" r="5" fill="${p.hi}" opacity="0.65"/>
    </g>
    <g>
      <path d="M244 92c-19 0-33 15-33 34 0 16 7 26 7 40 0 15 11 26 26 26s27-12 27-27c0-24-4-73-27-73z" fill="url(#${id}-body)"/>
      <circle cx="243" cy="126" r="15" fill="${p.edge}" opacity="0.8"/>
      <circle cx="248" cy="120" r="5" fill="${p.hi}" opacity="0.65"/>
    </g>`,

  keyboard: (p, id) => `
    ${shadow(200, 320, 116, 12)}
    <rect x="52" y="168" width="296" height="132" rx="18" fill="${p.edge}"/>
    <rect x="52" y="160" width="296" height="132" rx="18" fill="url(#${id}-body)"/>
    <g fill="${p.edge}" opacity="0.55">
      ${[0, 1, 2, 3].map(r =>
        Array.from({ length: 13 }, (_, c) =>
          `<rect x="${70 + c * 20.5}" y="${176 + r * 26}" width="17" height="21" rx="4"/>`).join('')
      ).join('')}
    </g>
    <g fill="${p.trim}" opacity="0.28">
      ${Array.from({ length: 13 }, (_, c) => `<rect x="${70 + c * 20.5}" y="176" width="17" height="21" rx="4"/>`).join('')}
    </g>
    <rect x="132" y="254" width="140" height="21" rx="5" fill="${p.edge}" opacity="0.55"/>
    <rect x="52" y="160" width="296" height="24" rx="18" fill="url(#${id}-glass)"/>
    <rect x="66" y="288" width="268" height="4" rx="2" fill="${p.hi}" opacity="0.25"/>`,

  mouse: (p, id) => `
    ${shadow(200, 330, 62, 10)}
    <path d="M200 96c46 0 74 42 74 106 0 62-30 110-74 110s-74-48-74-110c0-64 28-106 74-106z" fill="url(#${id}-body)"/>
    <path d="M200 96c46 0 74 42 74 106 0 62-30 110-74 110s-74-48-74-110c0-64 28-106 74-106z" fill="url(#${id}-glass)"/>
    <path d="M200 98v86" stroke="${p.edge}" stroke-width="3" opacity="0.65"/>
    <rect x="192" y="124" width="16" height="36" rx="8" fill="${p.trim}" opacity="0.85"/>
    <ellipse cx="200" cy="240" rx="40" ry="52" fill="${p.hi}" opacity="0.07"/>`,

  monitor: (p, id) => `
    ${shadow(200, 344, 92, 11)}
    <rect x="42" y="82" width="316" height="188" rx="14" fill="url(#${id}-body)"/>
    <rect x="54" y="94" width="292" height="164" rx="7" fill="url(#${id}-screen)"/>
    <g opacity="0.5">
      <rect x="74" y="116" width="110" height="9" rx="4" fill="${p.hi}" opacity="0.5"/>
      <rect x="74" y="136" width="188" height="6" rx="3" fill="${p.trim}" opacity="0.4"/>
      <rect x="74" y="152" width="150" height="6" rx="3" fill="${p.trim}" opacity="0.3"/>
      <rect x="74" y="182" width="74" height="54" rx="7" fill="${p.body}" opacity="0.35"/>
      <rect x="160" y="182" width="74" height="54" rx="7" fill="${p.body}" opacity="0.25"/>
      <rect x="246" y="182" width="74" height="54" rx="7" fill="${p.body}" opacity="0.18"/>
    </g>
    <rect x="54" y="94" width="292" height="164" rx="7" fill="url(#${id}-glass)" opacity="0.5"/>
    <rect x="176" y="270" width="48" height="44" fill="${p.edge}"/>
    <rect x="132" y="310" width="136" height="14" rx="7" fill="url(#${id}-body)"/>`,

  lamp: (p, id) => `
    ${shadow(200, 336, 66, 10)}
    <rect x="140" y="318" width="120" height="14" rx="7" fill="url(#${id}-body)"/>
    <rect x="193" y="150" width="14" height="172" rx="7" fill="url(#${id}-body)"/>
    <path d="M200 150 L296 150" stroke="url(#${id}-body)" stroke-width="14" stroke-linecap="round"/>
    <path d="M262 156h68l-16 46h-36z" fill="url(#${id}-body)"/>
    <ellipse cx="296" cy="202" rx="18" ry="5" fill="${p.hi}" opacity="0.9"/>
    <path d="M278 206 L314 206 L340 316 L252 316 Z" fill="${p.hi}" opacity="0.1"/>
    <circle cx="296" cy="200" r="30" fill="${p.hi}" opacity="0.12"/>`,

  speaker: (p, id) => `
    ${shadow(200, 340, 62, 10)}
    <rect x="132" y="96" width="136" height="232" rx="34" fill="url(#${id}-body)"/>
    <rect x="132" y="96" width="136" height="232" rx="34" fill="url(#${id}-glass)"/>
    <g opacity="0.5">
      ${Array.from({ length: 11 }, (_, r) =>
        Array.from({ length: 7 }, (_, c) =>
          `<circle cx="${152 + c * 16}" cy="${132 + r * 16}" r="2.6" fill="${p.edge}"/>`).join('')
      ).join('')}
    </g>
    <rect x="156" y="300" width="88" height="5" rx="2.5" fill="${p.trim}" opacity="0.5"/>
    <circle cx="200" cy="316" r="4" fill="${p.trim}" opacity="0.8"/>`,

  watch: (p, id) => `
    ${shadow(200, 344, 48, 8)}
    <path d="M170 74h60l-8 66h-44z" fill="${p.edge}" opacity="0.9"/>
    <path d="M162 262h76l-8 68h-60z" fill="${p.edge}" opacity="0.9"/>
    <rect x="128" y="122" width="144" height="160" rx="42" fill="url(#${id}-body)"/>
    <rect x="140" y="134" width="120" height="136" rx="34" fill="url(#${id}-screen)"/>
    <g opacity="0.85">
      <circle cx="200" cy="188" r="30" fill="none" stroke="${p.trim}" stroke-width="6" opacity="0.28"/>
      <path d="M200 158a30 30 0 0 1 24 48" fill="none" stroke="#bef264" stroke-width="6" stroke-linecap="round"/>
      <rect x="172" y="226" width="56" height="6" rx="3" fill="${p.trim}" opacity="0.4"/>
    </g>
    <rect x="128" y="122" width="144" height="160" rx="42" fill="url(#${id}-glass)" opacity="0.7"/>
    <rect x="272" y="176" width="9" height="30" rx="4.5" fill="${p.trim}"/>`,

  camera: (p, id) => `
    ${shadow(200, 334, 82, 11)}
    <rect x="72" y="146" width="256" height="166" rx="22" fill="url(#${id}-body)"/>
    <rect x="152" y="118" width="96" height="34" rx="10" fill="${p.edge}"/>
    <circle cx="200" cy="230" r="66" fill="${p.edge}"/>
    <circle cx="200" cy="230" r="54" fill="#0c1118"/>
    <circle cx="200" cy="230" r="38" fill="url(#${id}-screen)"/>
    <circle cx="200" cy="230" r="22" fill="#05080d"/>
    <circle cx="184" cy="214" r="10" fill="${p.hi}" opacity="0.35"/>
    <circle cx="200" cy="230" r="54" fill="none" stroke="${p.trim}" stroke-width="2" opacity="0.5"/>
    <rect x="72" y="146" width="256" height="40" rx="22" fill="url(#${id}-glass)"/>
    <circle cx="296" cy="176" r="7" fill="${p.trim}" opacity="0.7"/>
    <rect x="94" y="168" width="34" height="9" rx="4.5" fill="${p.trim}" opacity="0.45"/>`,

  stand: (p, id) => `
    ${shadow(200, 340, 92, 11)}
    <rect x="92" y="316" width="216" height="16" rx="8" fill="url(#${id}-body)"/>
    <path d="M118 316 L180 178 L214 178 L152 316 Z" fill="url(#${id}-body)"/>
    <path d="M282 316 L220 178 L186 178 L248 316 Z" fill="${p.edge}"/>
    <rect x="150" y="164" width="100" height="16" rx="8" fill="url(#${id}-body)"/>
    <g transform="rotate(-12 200 120)">
      <rect x="112" y="76" width="176" height="106" rx="9" fill="${p.edge}"/>
      <rect x="120" y="84" width="160" height="90" rx="5" fill="url(#${id}-screen)"/>
      <rect x="134" y="100" width="72" height="7" rx="3.5" fill="${p.hi}" opacity="0.45"/>
      <rect x="134" y="116" width="118" height="5" rx="2.5" fill="${p.trim}" opacity="0.3"/>
      <rect x="134" y="130" width="96" height="5" rx="2.5" fill="${p.trim}" opacity="0.22"/>
      <rect x="112" y="76" width="176" height="106" rx="9" fill="url(#${id}-glass)" opacity="0.6"/>
    </g>
    <ellipse cx="200" cy="322" rx="46" ry="5" fill="${p.hi}" opacity="0.14"/>`,

  backpack: (p, id) => `
    ${shadow(200, 342, 72, 10)}
    <path d="M170 104a30 30 0 0 1 60 0v26" fill="none" stroke="${p.trim}" stroke-width="11" stroke-linecap="round" opacity="0.85"/>
    <path d="M110 176c-16 34-18 84-8 126" fill="none" stroke="${p.edge}" stroke-width="20" stroke-linecap="round"/>
    <path d="M290 176c16 34 18 84 8 126" fill="none" stroke="${p.edge}" stroke-width="20" stroke-linecap="round"/>
    <path d="M132 126h136a42 42 0 0 1 42 42v128a34 34 0 0 1-34 34H124a34 34 0 0 1-34-34V168a42 42 0 0 1 42-42z" fill="url(#${id}-body)"/>
    <path d="M132 126h136a42 42 0 0 1 42 42v40H90v-40a42 42 0 0 1 42-42z" fill="${p.hi}" opacity="0.12"/>
    <path d="M90 206h220" stroke="${p.edge}" stroke-width="3" opacity="0.8"/>
    <rect x="128" y="230" width="144" height="74" rx="16" fill="${p.edge}" opacity="0.75"/>
    <path d="M128 262h144" stroke="${p.trim}" stroke-width="2.5" opacity="0.5"/>
    <rect x="186" y="252" width="28" height="9" rx="4.5" fill="${p.trim}" opacity="0.9"/>
    <circle cx="200" cy="176" r="13" fill="${p.edge}" opacity="0.7"/>
    <path d="M132 126h136a42 42 0 0 1 42 42v128a34 34 0 0 1-34 34H124a34 34 0 0 1-34-34V168a42 42 0 0 1 42-42z" fill="url(#${id}-glass)"/>`,

  bottle: (p, id) => `
    ${shadow(200, 342, 42, 8)}
    <rect x="178" y="62" width="44" height="34" rx="10" fill="${p.edge}"/>
    <rect x="170" y="90" width="60" height="18" rx="7" fill="${p.trim}" opacity="0.8"/>
    <path d="M158 108h84a22 22 0 0 1 22 22v178a22 22 0 0 1-22 22h-84a22 22 0 0 1-22-22V130a22 22 0 0 1 22-22z" fill="url(#${id}-body)"/>
    <path d="M158 108h84a22 22 0 0 1 22 22v178a22 22 0 0 1-22 22h-84a22 22 0 0 1-22-22V130a22 22 0 0 1 22-22z" fill="url(#${id}-glass)"/>
    <rect x="150" y="176" width="14" height="96" rx="7" fill="${p.hi}" opacity="0.22"/>
    <circle cx="200" cy="216" r="26" fill="${p.trim}" opacity="0.18"/>`,

  notebook: (p, id) => `
    ${shadow(200, 330, 86, 11)}
    <rect x="86" y="92" width="216" height="220" rx="12" fill="${p.edge}"/>
    <rect x="94" y="86" width="216" height="220" rx="12" fill="url(#${id}-body)"/>
    <rect x="94" y="86" width="216" height="220" rx="12" fill="url(#${id}-glass)"/>
    <rect x="94" y="86" width="22" height="220" fill="${p.edge}" opacity="0.4"/>
    <g fill="${p.trim}" opacity="0.4">
      <rect x="146" y="150" width="120" height="7" rx="3.5"/>
      <rect x="146" y="172" width="96" height="7" rx="3.5"/>
      <rect x="146" y="194" width="110" height="7" rx="3.5"/>
    </g>
    <rect x="146" y="236" width="52" height="5" rx="2.5" fill="${p.hi}" opacity="0.5"/>
    <circle cx="105" cy="120" r="4" fill="${p.hi}" opacity="0.5"/>
    <circle cx="105" cy="160" r="4" fill="${p.hi}" opacity="0.5"/>
    <circle cx="105" cy="200" r="4" fill="${p.hi}" opacity="0.5"/>`,

  charger: (p, id) => `
    ${shadow(200, 330, 66, 10)}
    <rect x="122" y="128" width="156" height="184" rx="26" fill="url(#${id}-body)"/>
    <rect x="122" y="128" width="156" height="184" rx="26" fill="url(#${id}-glass)"/>
    <rect x="144" y="156" width="112" height="54" rx="10" fill="${p.edge}" opacity="0.75"/>
    <g fill="${p.hi}" opacity="0.7">
      <rect x="160" y="176" width="20" height="8" rx="4"/>
      <rect x="190" y="176" width="20" height="8" rx="4"/>
      <rect x="220" y="176" width="20" height="8" rx="4"/>
    </g>
    <g>
      ${[0, 1, 2, 3].map(i => `<rect x="${152 + i * 24}" y="240" width="14" height="34" rx="7" fill="${i < 3 ? '#bef264' : p.edge}" opacity="${i < 3 ? 0.9 : 0.5}"/>`).join('')}
    </g>
    <rect x="152" y="290" width="96" height="5" rx="2.5" fill="${p.trim}" opacity="0.4"/>`,

  dock: (p, id) => `
    ${shadow(200, 324, 92, 11)}
    <rect x="78" y="228" width="244" height="82" rx="20" fill="url(#${id}-body)"/>
    <rect x="78" y="228" width="244" height="82" rx="20" fill="url(#${id}-glass)"/>
    <g fill="${p.edge}" opacity="0.8">
      <rect x="106" y="256" width="40" height="14" rx="4"/>
      <rect x="158" y="256" width="40" height="14" rx="4"/>
      <rect x="210" y="258" width="26" height="10" rx="3"/>
      <rect x="248" y="258" width="26" height="10" rx="3"/>
    </g>
    <circle cx="296" cy="264" r="6" fill="#bef264" opacity="0.9"/>
    <path d="M132 228v-62a34 34 0 0 1 34-34h68a34 34 0 0 1 34 34v62" fill="none" stroke="${p.edge}" stroke-width="10" opacity="0.5"/>
    <rect x="166" y="106" width="68" height="46" rx="8" fill="${p.edge}" opacity="0.6"/>`,

  chair: (p, id) => `
    ${shadow(200, 344, 78, 10)}
    <path d="M136 92h128a26 26 0 0 1 26 26v92a26 26 0 0 1-26 26H136a26 26 0 0 1-26-26v-92a26 26 0 0 1 26-26z" fill="url(#${id}-body)"/>
    <path d="M136 92h128a26 26 0 0 1 26 26v92a26 26 0 0 1-26 26H136a26 26 0 0 1-26-26v-92a26 26 0 0 1 26-26z" fill="url(#${id}-glass)"/>
    <g stroke="${p.edge}" stroke-width="3" opacity="0.4">
      <path d="M144 118v92M172 112v104M200 110v108M228 112v104M256 118v92"/>
    </g>
    <rect x="122" y="246" width="156" height="30" rx="14" fill="url(#${id}-body)"/>
    <rect x="193" y="276" width="14" height="42" rx="7" fill="${p.edge}"/>
    <path d="M200 318 L140 340 M200 318 L260 340 M200 318 L200 344" stroke="${p.edge}" stroke-width="10" stroke-linecap="round"/>`,

  turntable: (p, id) => `
    ${shadow(200, 330, 100, 12)}
    <rect x="62" y="170" width="276" height="146" rx="16" fill="url(#${id}-body)"/>
    <rect x="62" y="170" width="276" height="30" rx="16" fill="url(#${id}-glass)"/>
    <circle cx="176" cy="248" r="66" fill="#0b0e13"/>
    <circle cx="176" cy="248" r="66" fill="none" stroke="${p.trim}" stroke-width="1" opacity="0.28"/>
    <circle cx="176" cy="248" r="50" fill="none" stroke="${p.trim}" stroke-width="1" opacity="0.2"/>
    <circle cx="176" cy="248" r="34" fill="none" stroke="${p.trim}" stroke-width="1" opacity="0.14"/>
    <circle cx="176" cy="248" r="22" fill="#bef264" opacity="0.85"/>
    <circle cx="176" cy="248" r="4" fill="${p.edge}"/>
    <path d="M300 196 L276 262" stroke="${p.trim}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="302" cy="194" r="11" fill="${p.trim}"/>
    <rect x="266" y="256" width="18" height="12" rx="4" fill="${p.edge}"/>`,

  drone: (p, id) => `
    ${shadow(200, 334, 86, 10)}
    <g stroke="${p.edge}" stroke-width="13" stroke-linecap="round">
      <path d="M152 202 L96 146M248 202 L304 146M152 258 L96 314M248 258 L304 314"/>
    </g>
    <g fill="${p.trim}" opacity="0.32">
      <ellipse cx="96" cy="146" rx="46" ry="7"/>
      <ellipse cx="304" cy="146" rx="46" ry="7"/>
      <ellipse cx="96" cy="314" rx="46" ry="7"/>
      <ellipse cx="304" cy="314" rx="46" ry="7"/>
    </g>
    <g fill="${p.edge}">
      <circle cx="96" cy="146" r="10"/><circle cx="304" cy="146" r="10"/>
      <circle cx="96" cy="314" r="10"/><circle cx="304" cy="314" r="10"/>
    </g>
    <rect x="146" y="192" width="108" height="78" rx="26" fill="url(#${id}-body)"/>
    <rect x="146" y="192" width="108" height="78" rx="26" fill="url(#${id}-glass)"/>
    <circle cx="200" cy="266" r="20" fill="${p.edge}"/>
    <circle cx="200" cy="266" r="12" fill="#0a0e15"/>
    <circle cx="195" cy="261" r="4" fill="${p.hi}" opacity="0.5"/>
    <circle cx="170" cy="212" r="5" fill="#bef264"/>`,

  sunglasses: (p, id) => `
    ${shadow(200, 300, 76, 9)}
    <path d="M60 172 L110 164" stroke="${p.edge}" stroke-width="10" stroke-linecap="round"/>
    <path d="M340 172 L290 164" stroke="${p.edge}" stroke-width="10" stroke-linecap="round"/>
    <path d="M110 158h74a14 14 0 0 1 14 14v22a44 44 0 0 1-44 44h-14a44 44 0 0 1-44-44v-22a14 14 0 0 1 14-14z" fill="url(#${id}-screen)" stroke="${p.edge}" stroke-width="7"/>
    <path d="M216 158h74a14 14 0 0 1 14 14v22a44 44 0 0 1-44 44h-14a44 44 0 0 1-44-44v-22a14 14 0 0 1 14-14z" fill="url(#${id}-screen)" stroke="${p.edge}" stroke-width="7"/>
    <path d="M198 176h18" stroke="${p.edge}" stroke-width="8" stroke-linecap="round"/>
    <path d="M122 172 L148 172 L128 208 Z" fill="${p.hi}" opacity="0.22"/>
    <path d="M228 172 L254 172 L234 208 Z" fill="${p.hi}" opacity="0.22"/>`,

  pen: (p, id) => `
    ${shadow(200, 338, 40, 8)}
    <path d="M186 62h28a8 8 0 0 1 8 8v196l-22 44-22-44V70a8 8 0 0 1 8-8z" fill="url(#${id}-body)"/>
    <path d="M186 62h28a8 8 0 0 1 8 8v196l-22 44-22-44V70a8 8 0 0 1 8-8z" fill="url(#${id}-glass)"/>
    <rect x="178" y="130" width="44" height="30" rx="5" fill="${p.trim}" opacity="0.5"/>
    <path d="M192 266h16l-8 30z" fill="${p.trim}"/>
    <rect x="224" y="86" width="9" height="86" rx="4.5" fill="${p.trim}" opacity="0.8"/>`,
};

export const ARCHETYPES = Object.keys(ART);

/**
 * Gera o SVG de um produto.
 * @param {string} archetype - chave em ART
 * @param {string} finish - chave em FINISHES
 */
export function productArt(archetype, finish = 'graphite') {
  const draw = ART[archetype] || ART.headphones;
  const p = FINISHES[finish] || FINISHES.graphite;
  const id = uid();
  return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="presentation" focusable="false">
    ${backdrop(p, id)}
    ${draw(p, id)}
  </svg>`;
}

/** Versao data-URI, para usar em background-image ou <img src>. */
export function productArtURI(archetype, finish) {
  return `data:image/svg+xml,${encodeURIComponent(productArt(archetype, finish))}`;
}
