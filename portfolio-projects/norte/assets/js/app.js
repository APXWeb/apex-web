/* ============================================================
   NORTE — Ponto de entrada
   Registra as rotas, monta o cabecalho e liga o roteador.
   ============================================================ */

import { rota, iniciarRouter, ir, montarUrl } from './router.js';
import { montarHeader, montarBarraMobile } from './components/header.js';
import { montarRodape } from './components/rodape.js';
import { observarAnimacoes } from './utils/dom.js';

import { paginaHome } from './pages/home.js';
import { paginaResultados } from './pages/resultados.js';
import { paginaProfissao } from './pages/profissao.js';
import { paginaProfissoes } from './pages/profissoes.js';
import { paginaEmpresa } from './pages/empresa.js';
import { paginaEmpresas } from './pages/empresas.js';
import { paginaVaga } from './pages/vaga.js';
import { paginaComparar } from './pages/comparar.js';
import { paginaPerfil } from './pages/perfil/index.js';
import { paginaAdmin } from './pages/admin/index.js';
import { paginaNaoEncontrada } from './pages/naoEncontrada.js';

/* ---------- Rotas ---------- */
rota('/', paginaHome);
rota('/buscar', paginaResultados);
rota('/profissoes', paginaProfissoes);
rota('/profissao/:id', paginaProfissao);
rota('/empresas', paginaEmpresas);
rota('/empresa/:id', paginaEmpresa);
rota('/vaga/:id', paginaVaga);
rota('/comparar', paginaComparar);
rota('/perfil', (r, p, q) => paginaPerfil(r, { secao: 'painel' }, q));
rota('/perfil/:secao', paginaPerfil);
rota('/admin', (r, p, q) => paginaAdmin(r, { secao: 'overview' }, q));
rota('/admin/:secao', paginaAdmin);
rota('*', paginaNaoEncontrada);

/* ---------- Estrutura fixa ---------- */
montarHeader();
const conteudo = document.getElementById('conteudo');
montarRodape();
montarBarraMobile();

/* O admin ocupa a tela inteira: esconde cabecalho, rodape e barra */
function ajustarCromo(caminho) {
  const noAdmin = caminho.startsWith('/admin');
  document.body.classList.toggle('modo-admin', noAdmin);
}

iniciarRouter(conteudo, {
  aoTrocar: ({ caminho }) => {
    ajustarCromo(caminho);
    observarAnimacoes(conteudo);
    document.title = tituloDaRota(caminho);
  },
});

function tituloDaRota(caminho) {
  if (caminho === '/') return 'NORTE | Encontre o seu norte profissional';
  if (caminho.startsWith('/admin')) return 'Painel | NORTE';
  if (caminho.startsWith('/perfil')) return 'Meu perfil | NORTE';
  return document.title.includes('NORTE') ? document.title : 'NORTE';
}


export { ir, montarUrl };
