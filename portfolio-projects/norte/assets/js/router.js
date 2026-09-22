/* ============================================================
   NORTE — Roteador por hash
   Hash mantem o projeto funcionando como arquivo estatico, sem
   servidor reescrevendo rota. Cada pagina devolve uma funcao de
   limpeza, chamada antes de trocar de tela.
   ============================================================ */

const rotas = [];
let limparAtual = null;
let raiz = null;
let aoTrocar = null;

/**
 * @param {string} padrao ex.: '/profissao/:id'
 * @param {Function} render (raiz, params, query) => funcaoDeLimpeza
 */
export function rota(padrao, render) {
  const partes = padrao.split('/').filter(Boolean);
  rotas.push({ padrao, partes, render });
}

export function iniciarRouter(elRaiz, opcoes = {}) {
  raiz = elRaiz;
  aoTrocar = opcoes.aoTrocar;
  window.addEventListener('hashchange', resolver);
  resolver();
}

export function rotaAtual() {
  const bruto = location.hash.slice(1) || '/';
  const [caminho, busca] = bruto.split('?');
  return { caminho: caminho || '/', busca: busca || '' };
}

export function parametros() {
  return Object.fromEntries(new URLSearchParams(rotaAtual().busca));
}

/** Navega. `trocar` substitui a entrada atual no historico. */
export function ir(destino, trocar = false) {
  const alvo = destino.startsWith('#') ? destino : `#${destino}`;
  if (location.hash === alvo) { resolver(); return; }
  if (trocar) location.replace(alvo);
  else location.hash = alvo;
}

export function montarUrl(caminho, query = {}) {
  const q = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return `#${caminho}${q ? `?${q}` : ''}`;
}

function casar(partesRota, partesUrl) {
  if (partesRota.length !== partesUrl.length) return null;
  const params = {};
  for (let i = 0; i < partesRota.length; i++) {
    const r = partesRota[i];
    const u = partesUrl[i];
    if (r.startsWith(':')) params[r.slice(1)] = decodeURIComponent(u);
    else if (r !== u) return null;
  }
  return params;
}

function resolver() {
  const { caminho, busca } = rotaAtual();
  const partesUrl = caminho.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(busca));

  let escolhida = null;
  let params = null;

  for (const r of rotas) {
    const p = casar(r.partes, partesUrl);
    if (p) { escolhida = r; params = p; break; }
  }

  if (typeof limparAtual === 'function') {
    try { limparAtual(); } catch { /* limpeza nao pode derrubar a navegacao */ }
  }
  limparAtual = null;

  raiz.innerHTML = '';

  if (!escolhida) {
    const naoEncontrada = rotas.find(r => r.padrao === '*');
    limparAtual = naoEncontrada ? naoEncontrada.render(raiz, {}, query) : null;
  } else {
    limparAtual = escolhida.render(raiz, params, query);
  }

  aoTrocar?.({ caminho, params, query });

  // Rolagem ao topo, exceto quando a propria pagina ancora em uma secao
  if (!location.hash.includes('#secao=')) {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  // Leitor de tela precisa saber que a pagina mudou
  const principal = document.getElementById('conteudo');
  if (principal) {
    principal.setAttribute('tabindex', '-1');
    principal.focus({ preventScroll: true });
  }
}
