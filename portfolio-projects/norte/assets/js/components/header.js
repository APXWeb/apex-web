/* ============================================================
   NORTE — Cabecalho e barra inferior do celular
   ============================================================ */

import { el, qs, qsa, delegate, travarScroll } from '../utils/dom.js';
import { icon } from './icons.js';
import { state, subscribe, alertasNaoVistos } from '../services/store.js';
import { rotaAtual, ir, montarUrl } from '../router.js';
import { escapeHtml, iniciais } from '../utils/format.js';
import { abrirBuscaRapida } from './caixaBusca.js';

const LINKS = [
  ['/', 'Início', 'casa'],
  ['/profissoes', 'Profissões', 'chapeu'],
  ['/empresas', 'Empresas', 'predio'],
  ['/comparar', 'Comparar', 'comparar'],
];

const LINKS_MOBILE = [
  ['/', 'Início', 'casa'],
  ['/profissoes', 'Explorar', 'lupa'],
  ['/perfil/salvos', 'Salvos', 'marcador'],
  ['/perfil/alertas', 'Alertas', 'sino'],
  ['/perfil', 'Perfil', 'usuario'],
];

export function montarHeader() {
  const header = el(`
    <header class="topo" data-topo>
      <div class="shell shell--larga topo__linha">
        <a class="marca" href="#/" aria-label="NORTE, página inicial">
          <span class="marca__mark">${icon.norte({ size: 17 })}</span>
          <span class="marca__nome">NORTE</span>
        </a>

        <nav class="topo__nav" aria-label="Navegação principal">
          ${LINKS.map(([href, rotulo]) => `
            <a href="#${href}" class="topo__link" data-link="${href}">${rotulo}</a>
          `).join('')}
        </nav>

        <div class="topo__acoes">
          <button type="button" class="topo__busca" data-busca-rapida
                  aria-label="Buscar profissão e região">
            ${icon.lupa({ size: 16 })}
            <span>Buscar profissão</span>
            <kbd class="topo__kbd">/</kbd>
          </button>

          <a href="#/perfil/alertas" class="btn-icone topo__sino" aria-label="Meus alertas">
            ${icon.sino({ size: 19 })}
            <span class="topo__contador" data-alertas hidden></span>
          </a>

          <a href="#/perfil" class="topo__perfil" data-link="/perfil">
            <span class="avatar" data-avatar>MD</span>
            <span class="topo__perfil-nome" data-perfil-nome>Marina</span>
          </a>

          <button type="button" class="btn-icone topo__menu-btn" data-menu
                  aria-label="Abrir menu" aria-expanded="false">
            ${icon.menu({ size: 20 })}
          </button>
        </div>
      </div>

      <div class="topo__mobile" data-menu-mobile hidden>
        <nav class="shell" aria-label="Navegação">
          ${LINKS.map(([href, rotulo, ic]) => `
            <a href="#${href}" class="topo__mlink" data-link="${href}">
              ${icon[ic]({ size: 18 })} ${rotulo}
            </a>`).join('')}
          <hr class="divisor" style="margin-block:8px">
          <a href="#/perfil" class="topo__mlink">${icon.usuario({ size: 18 })} Meu perfil</a>
          <a href="#/perfil/alertas" class="topo__mlink">${icon.sino({ size: 18 })} Alertas</a>
          <a href="#/admin" class="topo__mlink">${icon.ajustes({ size: 18 })} Painel administrativo</a>
        </nav>
      </div>
    </header>`);

  document.body.prepend(header);

  /* ---- Busca rapida ---- */
  qs('[data-busca-rapida]', header).addEventListener('click', () => abrirBuscaRapida());

  document.addEventListener('keydown', (e) => {
    const digitando = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (e.key === '/' && !digitando && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      abrirBuscaRapida();
    }
  });

  /* ---- Menu do celular ---- */
  const btnMenu = qs('[data-menu]', header);
  const menu = qs('[data-menu-mobile]', header);

  const fecharMenu = () => {
    menu.hidden = true;
    btnMenu.setAttribute('aria-expanded', 'false');
    btnMenu.innerHTML = icon.menu({ size: 20 });
    travarScroll(false);
  };

  btnMenu.addEventListener('click', () => {
    const abrindo = menu.hidden;
    menu.hidden = !abrindo;
    btnMenu.setAttribute('aria-expanded', String(abrindo));
    btnMenu.innerHTML = abrindo ? icon.fechar({ size: 20 }) : icon.menu({ size: 20 });
    travarScroll(abrindo);
  });

  delegate(menu, 'click', 'a', fecharMenu);
  window.addEventListener('hashchange', fecharMenu);

  /* ---- Sombra ao rolar ---- */
  const aoRolar = () => header.classList.toggle('rolado', window.scrollY > 8);
  window.addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();

  /* ---- Estado dinamico ---- */
  function pintar() {
    const { caminho } = rotaAtual();
    qsa('[data-link]', header).forEach(a => {
      const alvo = a.dataset.link;
      const ativo = alvo === '/' ? caminho === '/' : caminho.startsWith(alvo);
      a.classList.toggle('ativo', ativo);
      if (ativo) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    const n = alertasNaoVistos();
    const contador = qs('[data-alertas]', header);
    contador.textContent = n;
    contador.hidden = n === 0;
    qs('[data-avatar]', header).textContent = iniciais(state.perfil.nome);
    qs('[data-perfil-nome]', header).textContent = state.perfil.nome.split(' ')[0];
  }

  pintar();
  subscribe(pintar);
  window.addEventListener('hashchange', pintar);

  return header;
}

/* ------------------------------------------------------------
   Barra inferior do celular (maximo de 5 destinos)
   ------------------------------------------------------------ */
export function montarBarraMobile() {
  const barra = el(`
    <nav class="barra-mob" aria-label="Navegação principal do celular">
      ${LINKS_MOBILE.map(([href, rotulo, ic]) => `
        <a href="#${href}" class="barra-mob__item" data-link="${href}">
          <span class="barra-mob__ic">${icon[ic]({ size: 21 })}</span>
          <span class="barra-mob__t">${rotulo}</span>
          ${href === '/perfil/alertas' ? '<span class="barra-mob__ponto" data-alertas-mob hidden></span>' : ''}
        </a>`).join('')}
    </nav>`);

  document.body.appendChild(barra);

  function pintar() {
    const { caminho } = rotaAtual();
    qsa('[data-link]', barra).forEach(a => {
      const alvo = a.dataset.link;
      const ativo = alvo === '/'
        ? caminho === '/'
        : (alvo === '/profissoes' ? (caminho.startsWith('/profissoes') || caminho.startsWith('/buscar')) : caminho === alvo);
      a.classList.toggle('ativo', ativo);
      if (ativo) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const p = qs('[data-alertas-mob]', barra);
    if (p) p.hidden = alertasNaoVistos() === 0;
  }

  pintar();
  subscribe(pintar);
  window.addEventListener('hashchange', pintar);
  return barra;
}

export { montarUrl, ir };
