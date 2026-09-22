/* ============================================================
   VANTA — Roteador por hash
   Hash em vez de History API porque o projeto roda em hospedagem
   estatica: qualquer rota abre e pode ser compartilhada por link,
   sem precisar de regra de reescrita no servidor.
   ============================================================ */

const rotas = [];
let aoTrocar = null;
let atual = { path: '', params: {}, query: {} };

/** Registra: on('/produto/:id', handler) */
export function on(padrao, handler) {
  const partes = padrao.split('/').filter(Boolean);
  rotas.push({ padrao, partes, handler });
}

export function onChange(fn) { aoTrocar = fn; }

function parseHash() {
  const bruto = location.hash.slice(1) || '/';
  const [caminho, queryStr = ''] = bruto.split('?');
  const query = {};
  new URLSearchParams(queryStr).forEach((v, k) => { query[k] = v; });
  return { caminho: caminho || '/', query };
}

function casar(partesRota, partesUrl) {
  if (partesRota.length !== partesUrl.length) return null;
  const params = {};
  for (let i = 0; i < partesRota.length; i++) {
    const r = partesRota[i];
    if (r.startsWith(':')) params[r.slice(1)] = decodeURIComponent(partesUrl[i]);
    else if (r !== partesUrl[i]) return null;
  }
  return params;
}

export function resolver() {
  const { caminho, query } = parseHash();
  const partesUrl = caminho.split('/').filter(Boolean);

  for (const rota of rotas) {
    const params = casar(rota.partes, partesUrl);
    if (params) {
      atual = { path: caminho, params, query };
      if (aoTrocar) aoTrocar(atual);
      rota.handler({ params, query, path: caminho });
      return;
    }
  }

  // Sem correspondencia: rota 404 registrada por ultimo
  const naoEncontrada = rotas.find(r => r.padrao === '*');
  atual = { path: caminho, params: {}, query };
  if (aoTrocar) aoTrocar(atual);
  if (naoEncontrada) naoEncontrada.handler({ params: {}, query, path: caminho });
}

export const rotaAtual = () => atual;

/** Navega mantendo o historico (o botao voltar do navegador funciona) */
export function ir(caminho, query = null) {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const alvo = `#${caminho}${qs}`;
  if (location.hash === alvo) resolver();
  else location.hash = alvo;
}

/** Atualiza a query sem empilhar historico (filtros do catalogo) */
export function trocarQuery(query) {
  const { caminho } = parseHash();
  const limpo = Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== '' && v != null && v !== 'todos')
  );
  const qs = Object.keys(limpo).length ? '?' + new URLSearchParams(limpo).toString() : '';
  history.replaceState(null, '', `#${caminho}${qs}`);
  atual = { ...atual, query: limpo };
}

export function iniciar() {
  window.addEventListener('hashchange', resolver);
  resolver();
}
