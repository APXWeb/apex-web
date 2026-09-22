/* ============================================================
   NORTE — Rodape
   ============================================================ */

import { el } from '../utils/dom.js';
import { icon } from './icons.js';
import { AREAS } from '../data/profissoes.js';
import { REGIOES } from '../data/regioes.js';

export function montarRodape() {
  const ano = new Date('2026-09-22').getFullYear();

  const rodape = el(`
    <footer class="rodape">
      <div class="shell shell--larga">
        <div class="rodape__grade">
          <div class="rodape__marca">
            <a class="marca marca--rodape" href="#/" aria-label="NORTE, página inicial">
              <span class="marca__mark">${icon.norte({ size: 17 })}</span>
              <span class="marca__nome">NORTE</span>
            </a>
            <p class="rodape__texto">
              Descubra onde existem oportunidades para a sua profissão e entenda
              o caminho até elas: salário, demanda, formação e habilidades.
            </p>
            <p class="rodape__aviso">
              Projeto de demonstração criado pela APX Web.<br>
              Plataforma, empresas, vagas e dados são fictícios.
            </p>
          </div>

          <div class="rodape__col">
            <h4>Áreas</h4>
            ${AREAS.slice(0, 6).map(a => `
              <a href="#/profissoes?area=${a.id}">${a.nome}</a>`).join('')}
            <a href="#/profissoes">Ver todas</a>
          </div>

          <div class="rodape__col">
            <h4>Regiões</h4>
            ${REGIOES.slice(0, 6).map(r => `
              <a href="#/profissoes?regiao=${r.id}">${r.cidade}</a>`).join('')}
            <a href="#/profissoes?regiao=remoto">Remoto</a>
          </div>

          <div class="rodape__col">
            <h4>Plataforma</h4>
            <a href="#/profissoes">Explorar profissões</a>
            <a href="#/empresas">Empresas</a>
            <a href="#/comparar">Comparar carreiras</a>
            <a href="#/perfil/alertas">Alertas de vaga</a>
            <a href="#/admin">Painel administrativo</a>
          </div>

          <div class="rodape__col">
            <h4>Minha conta</h4>
            <a href="#/perfil">Meu painel</a>
            <a href="#/perfil/salvos">Itens salvos</a>
            <a href="#/perfil/historico">Histórico de buscas</a>
            <a href="#/perfil/comparacoes">Comparações</a>
            <a href="#/perfil/preferencias">Preferências</a>
          </div>
        </div>

        <div class="rodape__base">
          <p>&copy; ${ano} NORTE. Projeto fictício de demonstração.</p>
          <a href="../../index.html" target="_blank" rel="noopener" class="rodape__apx">
            Feito pela APX Web ${icon.externo({ size: 13 })}
          </a>
        </div>
      </div>
    </footer>`);

  document.getElementById('app').appendChild(rodape);
  return rodape;
}
