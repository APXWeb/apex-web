/* ============================================================
   NORTE — Rota inexistente
   ============================================================ */

import { icon } from '../components/icons.js';
import { qs } from '../utils/dom.js';
import { caixaBusca, ativarBusca } from '../components/caixaBusca.js';

export function paginaNaoEncontrada(raiz) {
  raiz.innerHTML = `
    <div class="shell">
      <div class="erro-pag">
        <span class="erro-pag__cod">404</span>
        <h1 style="font-size:var(--fs-2xl)">Esta página não existe</h1>
        <p class="lead centro" style="margin-inline:auto">
          O endereço pode ter mudado ou o link estar incompleto.
          Que tal começar por uma busca?
        </p>
        <div style="width:min(760px,100%);margin-top:var(--sp-5)" data-busca-404>
          ${caixaBusca({ tamanho: 'media' })}
        </div>
        <div class="linha" style="gap:var(--sp-3);margin-top:var(--sp-4);flex-wrap:wrap;justify-content:center">
          <a href="#/" class="btn btn--contorno">${icon.casa({ size: 16 })} Ir para o início</a>
          <a href="#/profissoes" class="btn btn--fantasma">Explorar profissões</a>
        </div>
      </div>
    </div>`;

  document.title = 'Página não encontrada | NORTE';
  const desligar = ativarBusca(qs('[data-busca-404]', raiz));
  return () => desligar();
}
