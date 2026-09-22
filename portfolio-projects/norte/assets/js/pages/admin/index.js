/* ============================================================
   NORTE — Painel administrativo
   Nove seções sobre o MESMO estado que a plataforma usa. Editar
   uma vaga aqui muda o que a pessoa vê na busca; despublicar uma
   profissão a tira do catálogo na hora.

   Cada seção declara uma configuração (colunas, filtros, campos
   do formulário) e a tabela genérica cuida do resto: busca,
   ordenação, paginação, criar, editar, publicar e excluir.
   ============================================================ */

import { qs, qsa, debounce, observarAnimacoes } from '../../utils/dom.js';
import { icon } from '../../components/icons.js';
import {
  escapeHtml, dinheiro, dinheiroCompacto, num, pct, compacto,
  plural, norm, dataCurta, dataMedia, haQuantoTempo, iniciais,
} from '../../utils/format.js';
import {
  state, SERIE_HISTORICA, acharProfissao, acharEmpresa, acharRegiao, acharVaga,
  acharUsuario, acharConteudo, todasRegioes, vagasAtivas,
  salvarProfissao, removerProfissao, restaurarProfissao, alternarPublicacao,
  salvarEmpresa, removerEmpresa, restaurarEmpresa,
  salvarVaga, removerVaga, restaurarVaga, alternarVaga,
  salvarRegiao, removerRegiao, restaurarRegiao,
  salvarUsuario, removerUsuario, restaurarUsuario, alternarUsuario,
  salvarConteudo, removerConteudo, restaurarConteudo, alternarConteudo,
  salvarPlataforma, resetarTudo,
} from '../../services/store.js';
import { AREAS, AREA_POR_ID } from '../../data/profissoes.js';
import { PORTES } from '../../data/empresas.js';
import { NIVEIS_LISTA, MODELOS, CONTRATOS, HORARIOS } from '../../data/oportunidades.js';
import { PLANOS_LISTA, PAPEIS_LISTA, PLANO_POR_ID, PAPEL_POR_ID } from '../../data/usuarios.js';
import { TIPOS_CONTEUDO, TIPO_POR_ID } from '../../data/conteudos.js';
import {
  graficoLinha, graficoBarras, graficoDonut, ranking, sparkline,
  ativarGraficos, corDado,
} from '../../components/graficos.js';
import { toast, modal, confirmar, vazio } from '../../components/ui.js';
import { ir, montarUrl } from '../../router.js';

const POR_PAGINA = 10;

const MENU = [
  { grupo: 'Visão' },
  { id: 'overview', nome: 'Overview', icone: 'grade' },
  { id: 'analytics', nome: 'Analytics', icone: 'grafico' },
  { grupo: 'Catálogo' },
  { id: 'oportunidades', nome: 'Oportunidades', icone: 'maleta' },
  { id: 'profissoes', nome: 'Profissões', icone: 'chapeu' },
  { id: 'empresas', nome: 'Empresas', icone: 'predio' },
  { id: 'regioes', nome: 'Regiões', icone: 'local' },
  { grupo: 'Plataforma' },
  { id: 'usuarios', nome: 'Usuários', icone: 'usuarios' },
  { id: 'conteudo', nome: 'Conteúdo', icone: 'livro' },
  { id: 'configuracoes', nome: 'Configurações', icone: 'engrenagem' },
];

const TITULOS = {
  overview: ['Overview', 'O estado da plataforma agora'],
  analytics: ['Analytics', 'Busca, conversão e comportamento'],
  oportunidades: ['Oportunidades', 'Todas as vagas publicadas na plataforma'],
  profissoes: ['Profissões', 'O catálogo de carreiras que alimenta a busca'],
  empresas: ['Empresas', 'Quem publica vaga aqui'],
  regioes: ['Regiões', 'Cidades atendidas e o índice de custo de cada uma'],
  usuarios: ['Usuários', 'Quem usa a plataforma'],
  conteudo: ['Conteúdo', 'Guias, dicas e relatórios publicados'],
  configuracoes: ['Configurações', 'Regras gerais de funcionamento'],
};

export function paginaAdmin(raiz, params) {
  let secao = TITULOS[params.secao] ? params.secao : 'overview';
  let desligarGraficos = null;
  let ladoAberto = false;

  // Estado de cada tabela, preservado ao trocar de seção e voltar
  const tabelas = {};
  const tabelaDe = (id) => {
    if (!tabelas[id]) tabelas[id] = { termo: '', pagina: 1, ordem: null, asc: false, filtro: '' };
    return tabelas[id];
  };

  raiz.innerHTML = `
    <div class="adm">
      <div class="adm__fundo" data-fundo-lado></div>

      <aside class="adm__lado" data-lado>
        <div class="adm__marca">
          <span class="adm__marca-ic">${icon.norte({ size: 19 })}</span>
          <span>
            NORTE
            <span class="adm__marca-sub">Painel</span>
          </span>
        </div>

        <nav data-menu style="display:grid;gap:2px">${htmlMenu()}</nav>

        <div class="adm__rodape">
          <a class="adm__link" href="#/">
            ${icon.externo({ size: 16 })} Ver a plataforma
          </a>
          <button type="button" class="adm__link" data-reset style="color:#FF8A8A">
            ${icon.atualizar({ size: 16 })} Restaurar dados
          </button>
        </div>
      </aside>

      <div class="adm__main">
        <header class="adm__topo">
          <div style="min-width:0">
            <button type="button" class="btn-icone adm__menu-btn" data-abrir-lado aria-label="Abrir menu">
              ${icon.menu({ size: 19 })}
            </button>
            <h1 class="adm__titulo" data-titulo></h1>
            <p class="adm__sub" data-subtitulo></p>
          </div>
          <div class="linha" style="gap:var(--sp-3)" data-acoes-topo></div>
        </header>

        <div class="adm__corpo" data-corpo></div>
      </div>
    </div>`;

  function htmlMenu() {
    return MENU.map(m => {
      if (m.grupo) return `<p class="adm__sec">${escapeHtml(m.grupo)}</p>`;
      return `
      <a class="adm__link ${m.id === secao ? 'ativo' : ''}" href="#/admin/${m.id}" data-nav="${m.id}">
        ${icon[m.icone]({ size: 16 })} ${m.nome}
        ${contagemMenu(m.id) !== null ? `<span class="adm__link-n">${num(contagemMenu(m.id))}</span>` : ''}
      </a>`;
    }).join('');
  }

  function contagemMenu(id) {
    switch (id) {
      case 'oportunidades': return state.oportunidades.length;
      case 'profissoes': return state.profissoes.length;
      case 'empresas': return state.empresas.length;
      case 'regioes': return state.regioes.length;
      case 'usuarios': return state.usuarios.length;
      case 'conteudo': return state.conteudos.length;
      default: return null;
    }
  }

  /* ============================================================
     TABELA GENÉRICA
     ============================================================ */
  function tabela(cfg) {
    const t = tabelaDe(cfg.id);
    const termo = norm(t.termo);

    let linhas = cfg.dados();
    if (termo) linhas = linhas.filter(x => norm(cfg.busca(x)).includes(termo));
    if (t.filtro && cfg.filtrar) linhas = linhas.filter(x => cfg.filtrar(x, t.filtro));

    if (t.ordem) {
      const col = cfg.colunas.find(c => c.id === t.ordem);
      if (col?.valor) {
        linhas = [...linhas].sort((a, b) => {
          const va = col.valor(a);
          const vb = col.valor(b);
          const r = typeof va === 'string'
            ? va.localeCompare(vb, 'pt-BR')
            : (va || 0) - (vb || 0);
          return t.asc ? r : -r;
        });
      }
    }

    const total = linhas.length;
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    if (t.pagina > paginas) t.pagina = paginas;
    const visiveis = linhas.slice((t.pagina - 1) * POR_PAGINA, t.pagina * POR_PAGINA);

    return `
    <section data-tabela="${cfg.id}">
      <div class="adm__barra">
        <div class="adm__filtros">
          <label class="campo-icone">
            <span class="so-leitor">Buscar</span>
            ${icon.lupa({ size: 16 })}
            <input type="search" class="input" data-busca-tabela placeholder="${escapeHtml(cfg.placeholder || 'Buscar')}"
                   value="${escapeHtml(t.termo)}" style="min-width:min(300px,60vw);height:40px">
          </label>
          ${cfg.filtros ? `
            <select class="select" data-filtro-tabela style="height:40px;min-width:170px">
              ${cfg.filtros.map(f => `
                <option value="${escapeHtml(f.id)}" ${t.filtro === f.id ? 'selected' : ''}>${escapeHtml(f.nome)}</option>`).join('')}
            </select>` : ''}
        </div>
        <p class="res-contagem"><b>${num(total)}</b> ${escapeHtml(total === 1 ? cfg.unidade : cfg.unidades)}</p>
      </div>

      ${!total ? vazio({
        icone: 'lupa',
        titulo: 'Nada encontrado',
        texto: 'Ajuste a busca ou o filtro para ver os registros.',
      }) : `
        <div class="adm-tabela-rol">
          <table class="adm-tabela">
            <thead>
              <tr>
                ${cfg.colunas.map(c => `
                  <th scope="col" ${c.largura ? `style="width:${c.largura}"` : ''}>
                    ${c.valor
                      ? `<button type="button" data-ordenar="${c.id}">
                           ${escapeHtml(c.nome)}
                           ${t.ordem === c.id ? icon[t.asc ? 'chevronD' : 'chevronD']({ size: 12 }) : ''}
                         </button>`
                      : escapeHtml(c.nome)}
                  </th>`).join('')}
                <th scope="col" style="text-align:right;width:120px">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${visiveis.map(x => `
                <tr data-id="${escapeHtml(cfg.chave(x))}">
                  ${cfg.colunas.map(c => `<td>${c.celula(x)}</td>`).join('')}
                  <td>
                    <div class="adm-tabela__acoes">
                      ${cfg.alternar ? `
                        <button type="button" class="btn-icone btn-icone--sm" data-alternar
                                aria-label="${cfg.alternarRotulo ? escapeHtml(cfg.alternarRotulo(x)) : 'Alternar publicação'}"
                                title="${cfg.alternarRotulo ? escapeHtml(cfg.alternarRotulo(x)) : ''}">
                          ${cfg.ligado(x) ? icon.olho({ size: 15 }) : icon.olhoFechado({ size: 15 })}
                        </button>` : ''}
                      <button type="button" class="btn-icone btn-icone--sm" data-editar aria-label="Editar">
                        ${icon.editar({ size: 15 })}
                      </button>
                      <button type="button" class="btn-icone btn-icone--sm" data-excluir aria-label="Excluir"
                              style="color:var(--erro)">
                        ${icon.lixo({ size: 15 })}
                      </button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>

        ${paginas > 1 ? `
          <nav class="paginador" style="margin-top:var(--sp-5)" aria-label="Paginação">
            <button type="button" class="paginador__btn" data-pag="${t.pagina - 1}"
                    ${t.pagina === 1 ? 'disabled' : ''} aria-label="Anterior">
              ${icon.chevronE({ size: 15 })}
            </button>
            <span class="paginador__btn" aria-current="page">${t.pagina} de ${paginas}</span>
            <button type="button" class="paginador__btn" data-pag="${t.pagina + 1}"
                    ${t.pagina === paginas ? 'disabled' : ''} aria-label="Próxima">
              ${icon.chevronR({ size: 15 })}
            </button>
          </nav>` : ''}`}
    </section>`;
  }

  /* ============================================================
     CONFIGURAÇÃO DAS SEÇÕES DE CATÁLOGO
     ============================================================ */
  const selo = (on, simNao = ['Publicada', 'Oculta']) =>
    `<span class="adm-ponto adm-ponto--${on ? 'on' : 'off'}">${on ? simNao[0] : simNao[1]}</span>`;

  const CFG = {
    oportunidades: () => ({
      id: 'oportunidades',
      unidade: 'vaga', unidades: 'vagas',
      placeholder: 'Título, empresa ou bairro',
      dados: () => state.oportunidades,
      chave: (v) => v.id,
      busca: (v) => `${v.titulo} ${acharEmpresa(v.empresaId)?.nome || ''} ${v.bairro}`,
      filtros: [
        { id: '', nome: 'Todas as vagas' },
        { id: 'ativa', nome: 'Somente ativas' },
        { id: 'inativa', nome: 'Somente inativas' },
        { id: 'destaque', nome: 'Em destaque' },
        { id: 'semsalario', nome: 'Sem salário divulgado' },
      ],
      filtrar: (v, f) => f === 'ativa' ? v.ativa
        : f === 'inativa' ? !v.ativa
          : f === 'destaque' ? v.destaque
            : f === 'semsalario' ? !v.salarioVisivel : true,
      alternar: (v) => alternarVaga(v.id),
      ligado: (v) => v.ativa,
      alternarRotulo: (v) => v.ativa ? 'Desativar vaga' : 'Ativar vaga',
      colunas: [
        {
          id: 'titulo', nome: 'Vaga', valor: (v) => v.titulo,
          celula: (v) => {
            const e = acharEmpresa(v.empresaId);
            return `
            <div class="adm-linha-emp">
              <span class="logo-emp logo-emp--sm" style="background:${e?.cor || 'var(--acento)'}" aria-hidden="true">
                ${escapeHtml(e?.sigla || '??')}
              </span>
              <div style="min-width:0">
                <p class="adm-celula-forte cortar">${escapeHtml(v.titulo)}</p>
                <p class="adm-celula-sub cortar">${escapeHtml(e?.nome || '')}</p>
              </div>
            </div>`;
          },
        },
        {
          id: 'local', nome: 'Local', valor: (v) => v.bairro,
          celula: (v) => v.modelo === 'remoto'
            ? '<span class="selo selo--info">Remoto</span>'
            : `<p>${escapeHtml(v.bairro)}</p><p class="adm-celula-sub">${escapeHtml(acharRegiao(v.regiaoId)?.cidade || '')}</p>`,
        },
        {
          id: 'salario', nome: 'Salário', valor: (v) => (v.salarioVisivel ? v.salarioMax : 0),
          celula: (v) => v.salarioVisivel
            ? `<span class="adm-tabela__num">${dinheiroCompacto(v.salarioMin)} – ${dinheiroCompacto(v.salarioMax)}</span>`
            : '<span style="color:var(--txt-fraco)">a combinar</span>',
        },
        {
          id: 'candidaturas', nome: 'Candidaturas', valor: (v) => v.candidaturas,
          celula: (v) => `<span class="adm-tabela__num">${num(v.candidaturas)}</span>`,
        },
        {
          id: 'dias', nome: 'Publicada', valor: (v) => -v.diasPublicada,
          celula: (v) => `<span style="font-size:var(--fs-xs);color:var(--txt-suave)">${haQuantoTempo(v.publicadaEm)}</span>`,
        },
        {
          id: 'estado', nome: 'Estado', valor: (v) => (v.ativa ? 1 : 0),
          celula: (v) => selo(v.ativa, ['Ativa', 'Inativa']),
        },
      ],
      campos: (v) => [
        { nome: 'titulo', rotulo: 'Título da vaga', valor: v?.titulo || '', obrigatorio: true },
        {
          nome: 'profissaoId', rotulo: 'Profissão', tipo: 'select', valor: v?.profissaoId,
          opcoes: state.profissoes.map(p => ({ v: p.id, n: p.nome })),
        },
        {
          nome: 'empresaId', rotulo: 'Empresa', tipo: 'select', valor: v?.empresaId,
          opcoes: state.empresas.map(e => ({ v: e.id, n: e.nome })),
        },
        {
          nome: 'regiaoId', rotulo: 'Região', tipo: 'select', valor: v?.regiaoId,
          opcoes: todasRegioes().map(r => ({ v: r.id, n: r.nome })),
        },
        { nome: 'bairro', rotulo: 'Bairro', valor: v?.bairro || '' },
        {
          nome: 'nivel', rotulo: 'Nível', tipo: 'select', valor: v?.nivel,
          opcoes: NIVEIS_LISTA.map(n => ({ v: n.id, n: n.nome })),
        },
        {
          nome: 'modelo', rotulo: 'Modelo', tipo: 'select', valor: v?.modelo,
          opcoes: MODELOS.map(m => ({ v: m.id, n: m.nome })),
        },
        {
          nome: 'contrato', rotulo: 'Contrato', tipo: 'select', valor: v?.contrato,
          opcoes: CONTRATOS.map(c => ({ v: c.id, n: c.nome })),
        },
        {
          nome: 'horario', rotulo: 'Jornada', tipo: 'select', valor: v?.horario,
          opcoes: HORARIOS.map(h => ({ v: h.id, n: h.nome })),
        },
        { nome: 'salarioMin', rotulo: 'Salário mínimo', tipo: 'number', valor: v?.salarioMin ?? 3000 },
        { nome: 'salarioMax', rotulo: 'Salário máximo', tipo: 'number', valor: v?.salarioMax ?? 6000 },
        { nome: 'vagas', rotulo: 'Posições', tipo: 'number', valor: v?.vagas ?? 1 },
        { nome: 'salarioVisivel', rotulo: 'Divulgar o salário', tipo: 'switch', valor: v?.salarioVisivel ?? true },
        { nome: 'destaque', rotulo: 'Destacar na busca', tipo: 'switch', valor: v?.destaque ?? false },
        { nome: 'urgente', rotulo: 'Contratação urgente', tipo: 'switch', valor: v?.urgente ?? false },
        { nome: 'ativa', rotulo: 'Vaga ativa', tipo: 'switch', valor: v?.ativa ?? true },
      ],
      ler: (id) => acharVaga(id),
      gravar: (dados, id) => {
        const base = id ? acharVaga(id) : null;
        return salvarVaga({
          ...(base || {}),
          ...dados,
          id,
          salarioMin: Number(dados.salarioMin) || 0,
          salarioMax: Number(dados.salarioMax) || 0,
          vagas: Number(dados.vagas) || 1,
          area: acharProfissao(dados.profissaoId)?.area || 'tecnologia',
        });
      },
      apagar: removerVaga,
      repor: restaurarVaga,
      nomeDe: (v) => v.titulo,
    }),

    profissoes: () => ({
      id: 'profissoes',
      unidade: 'profissão', unidades: 'profissões',
      placeholder: 'Nome ou área',
      dados: () => state.profissoes,
      chave: (p) => p.id,
      busca: (p) => `${p.nome} ${AREA_POR_ID[p.area]?.nome || ''}`,
      filtros: [
        { id: '', nome: 'Todas as áreas' },
        ...AREAS.map(a => ({ id: a.id, nome: a.nome })),
      ],
      filtrar: (p, f) => p.area === f,
      alternar: (p) => alternarPublicacao(p.id),
      ligado: (p) => p.publicada,
      alternarRotulo: (p) => p.publicada ? 'Despublicar' : 'Publicar',
      colunas: [
        {
          id: 'nome', nome: 'Profissão', valor: (p) => p.nome,
          celula: (p) => {
            const a = AREA_POR_ID[p.area];
            return `
            <div class="adm-linha-emp">
              <span style="color:${a?.cor || 'var(--acento)'};flex-shrink:0">
                ${icon[a?.icone || 'maleta']({ size: 17 })}
              </span>
              <div style="min-width:0">
                <p class="adm-celula-forte cortar">${escapeHtml(p.nome)}</p>
                <p class="adm-celula-sub">${escapeHtml(a?.nome || '')}</p>
              </div>
            </div>`;
          },
        },
        {
          id: 'salario', nome: 'Salário médio', valor: (p) => p.salario.media,
          celula: (p) => `<span class="adm-tabela__num">${dinheiro(p.salario.media)}</span>`,
        },
        {
          id: 'demanda', nome: 'Demanda', valor: (p) => p.demanda,
          celula: (p) => `
            <div class="linha" style="gap:var(--sp-2)">
              <span class="barra barra--fina" style="width:56px">
                <span style="width:${p.demanda}%"></span>
              </span>
              <span class="adm-tabela__num" style="font-size:var(--fs-xs)">${p.demanda}</span>
            </div>`,
        },
        {
          id: 'vagas', nome: 'Vagas', valor: (p) => vagasAtivas().filter(v => v.profissaoId === p.id).length,
          celula: (p) => `<span class="adm-tabela__num">${num(vagasAtivas().filter(v => v.profissaoId === p.id).length)}</span>`,
        },
        {
          id: 'estado', nome: 'Estado', valor: (p) => (p.publicada ? 1 : 0),
          celula: (p) => selo(p.publicada),
        },
      ],
      campos: (p) => [
        { nome: 'nome', rotulo: 'Nome da profissão', valor: p?.nome || '', obrigatorio: true },
        {
          nome: 'area', rotulo: 'Área', tipo: 'select', valor: p?.area,
          opcoes: AREAS.map(a => ({ v: a.id, n: a.nome })),
        },
        { nome: 'resumo', rotulo: 'Resumo (uma frase)', tipo: 'textarea', valor: p?.resumo || '', obrigatorio: true },
        { nome: 'descricao', rotulo: 'Descrição completa', tipo: 'textarea', valor: p?.descricao || '' },
        { nome: 'demanda', rotulo: 'Demanda (0 a 100)', tipo: 'number', valor: p?.demanda ?? 60, min: 0, max: 100 },
        { nome: 'crescimento', rotulo: 'Crescimento anual (%)', tipo: 'number', valor: p?.crescimento ?? 5 },
        { nome: 'remotoPct', rotulo: 'Vagas remotas (%)', tipo: 'number', valor: p?.remotoPct ?? 20, min: 0, max: 100 },
        { nome: 'dificuldade', rotulo: 'Dificuldade (1 a 5)', tipo: 'number', valor: p?.dificuldade ?? 3, min: 1, max: 5 },
        { nome: 'salarioJunior', rotulo: 'Salário júnior', tipo: 'number', valor: p?.salario?.junior ?? 2500 },
        { nome: 'salarioPleno', rotulo: 'Salário pleno', tipo: 'number', valor: p?.salario?.pleno ?? 5000 },
        { nome: 'salarioSenior', rotulo: 'Salário sênior', tipo: 'number', valor: p?.salario?.senior ?? 9000 },
        { nome: 'publicada', rotulo: 'Visível no catálogo', tipo: 'switch', valor: p?.publicada ?? true },
      ],
      ler: (id) => acharProfissao(id),
      gravar: (dados, id) => {
        const base = id ? acharProfissao(id) : null;
        const jr = Number(dados.salarioJunior) || 0;
        const pl = Number(dados.salarioPleno) || 0;
        const sr = Number(dados.salarioSenior) || 0;

        const salario = {
          junior: jr, pleno: pl, senior: sr,
          media: Math.round((jr + pl * 1.6 + sr * 0.8) / 3.4),
          min: Math.round(jr * 0.78),
          max: Math.round(sr * 1.35),
        };

        const remoto = Math.max(0, Math.min(100, Number(dados.remotoPct) || 0));
        const hibrido = Math.round((100 - remoto) * 0.55);

        const limpo = { ...dados };
        delete limpo.salarioJunior; delete limpo.salarioPleno; delete limpo.salarioSenior;

        return salvarProfissao({
          ...(base || {}),
          ...limpo,
          id,
          demanda: Number(dados.demanda) || 0,
          crescimento: Number(dados.crescimento) || 0,
          remotoPct: remoto,
          dificuldade: Number(dados.dificuldade) || 3,
          salario,
          modelos: { remoto, hibrido, presencial: 100 - remoto - hibrido },
          evolucao: [
            { rotulo: 'Início', anos: 0, valor: Math.round(jr * 0.82) },
            { rotulo: '1 ano', anos: 1, valor: jr },
            { rotulo: '3 anos', anos: 3, valor: Math.round(jr + (pl - jr) * 0.6) },
            { rotulo: '5 anos', anos: 5, valor: pl },
            { rotulo: '8 anos', anos: 8, valor: Math.round(pl + (sr - pl) * 0.62) },
            { rotulo: '10+ anos', anos: 10, valor: sr },
          ],
        });
      },
      apagar: removerProfissao,
      repor: restaurarProfissao,
      nomeDe: (p) => p.nome,
    }),

    empresas: () => ({
      id: 'empresas',
      unidade: 'empresa', unidades: 'empresas',
      placeholder: 'Nome ou setor',
      dados: () => state.empresas,
      chave: (e) => e.id,
      busca: (e) => `${e.nome} ${e.setor}`,
      filtros: [
        { id: '', nome: 'Todos os portes' },
        ...Object.entries(PORTES).map(([id, p]) => ({ id, nome: p.rotulo })),
      ],
      filtrar: (e, f) => e.porte === f,
      colunas: [
        {
          id: 'nome', nome: 'Empresa', valor: (e) => e.nome,
          celula: (e) => `
            <div class="adm-linha-emp">
              <span class="logo-emp logo-emp--sm" style="background:${e.cor}" aria-hidden="true">
                ${escapeHtml(e.sigla)}
              </span>
              <div style="min-width:0">
                <p class="adm-celula-forte cortar">${escapeHtml(e.nome)}</p>
                <p class="adm-celula-sub">${escapeHtml(e.setor)}</p>
              </div>
            </div>`,
        },
        {
          id: 'porte', nome: 'Porte', valor: (e) => e.funcionarios,
          celula: (e) => `<p>${escapeHtml(PORTES[e.porte]?.rotulo || '')}</p><p class="adm-celula-sub">${num(e.funcionarios)} pessoas</p>`,
        },
        {
          id: 'sede', nome: 'Sede', valor: (e) => acharRegiao(e.sede)?.cidade || '',
          celula: (e) => escapeHtml(acharRegiao(e.sede)?.cidade || '—'),
        },
        {
          id: 'nota', nome: 'Nota', valor: (e) => e.nota,
          celula: (e) => `
            <span class="linha" style="gap:5px">
              <span style="color:var(--ambar-500)">${icon.estrela({ size: 13, fill: 'currentColor' })}</span>
              <span class="adm-tabela__num">${String(e.nota).replace('.', ',')}</span>
              <span class="adm-celula-sub">(${num(e.totalAvaliacoes)})</span>
            </span>`,
        },
        {
          id: 'vagas', nome: 'Vagas', valor: (e) => vagasAtivas().filter(v => v.empresaId === e.id).length,
          celula: (e) => `<span class="adm-tabela__num">${num(vagasAtivas().filter(v => v.empresaId === e.id).length)}</span>`,
        },
      ],
      campos: (e) => [
        { nome: 'nome', rotulo: 'Nome', valor: e?.nome || '', obrigatorio: true },
        { nome: 'sigla', rotulo: 'Sigla do logo (2 letras)', valor: e?.sigla || '', maxlength: 2 },
        { nome: 'cor', rotulo: 'Cor do logo', tipo: 'color', valor: e?.cor || '#4F3DF5' },
        { nome: 'setor', rotulo: 'Setor', valor: e?.setor || '' },
        {
          nome: 'porte', rotulo: 'Porte', tipo: 'select', valor: e?.porte,
          opcoes: Object.entries(PORTES).map(([id, p]) => ({ v: id, n: `${p.rotulo} — ${p.faixa}` })),
        },
        { nome: 'funcionarios', rotulo: 'Nº de funcionários', tipo: 'number', valor: e?.funcionarios ?? 100 },
        { nome: 'fundacao', rotulo: 'Ano de fundação', tipo: 'number', valor: e?.fundacao ?? 2015 },
        {
          nome: 'sede', rotulo: 'Sede', tipo: 'select', valor: e?.sede,
          opcoes: state.regioes.map(r => ({ v: r.id, n: r.nome })),
        },
        {
          nome: 'modelo', rotulo: 'Modelo predominante', tipo: 'select', valor: e?.modelo,
          opcoes: MODELOS.map(m => ({ v: m.id, n: m.nome })),
        },
        { nome: 'site', rotulo: 'Site', valor: e?.site || '' },
        { nome: 'nota', rotulo: 'Nota (0 a 5)', tipo: 'number', valor: e?.nota ?? 4, step: '0.1', min: 0, max: 5 },
        { nome: 'descricao', rotulo: 'Descrição', tipo: 'textarea', valor: e?.descricao || '' },
      ],
      ler: (id) => acharEmpresa(id),
      gravar: (dados, id) => {
        const base = id ? acharEmpresa(id) : null;
        return salvarEmpresa({
          ...(base || {}),
          ...dados,
          id,
          funcionarios: Number(dados.funcionarios) || 0,
          fundacao: Number(dados.fundacao) || 2020,
          nota: Number(dados.nota) || 0,
          sigla: (dados.sigla || dados.nome.slice(0, 2)).toUpperCase(),
        });
      },
      apagar: removerEmpresa,
      repor: restaurarEmpresa,
      nomeDe: (e) => e.nome,
    }),

    regioes: () => ({
      id: 'regioes',
      unidade: 'região', unidades: 'regiões',
      placeholder: 'Cidade ou estado',
      dados: () => state.regioes,
      chave: (r) => r.id,
      busca: (r) => `${r.cidade} ${r.uf} ${r.nome}`,
      colunas: [
        {
          id: 'cidade', nome: 'Região', valor: (r) => r.cidade,
          celula: (r) => `
            <div style="min-width:0">
              <p class="adm-celula-forte">${escapeHtml(r.cidade)}, ${escapeHtml(r.uf)}</p>
              <p class="adm-celula-sub">${plural((r.bairros || []).length, 'bairro')} mapeados</p>
            </div>`,
        },
        {
          id: 'indice', nome: 'Índice salarial', valor: (r) => r.indice,
          celula: (r) => `
            <span class="adm-tabela__num">${r.indice.toFixed(2).replace('.', ',')}×</span>
            <p class="adm-celula-sub">${r.indice >= 1 ? 'acima' : 'abaixo'} da média nacional</p>`,
        },
        {
          id: 'peso', nome: 'Peso de vagas', valor: (r) => r.vagasPeso,
          celula: (r) => `<span class="adm-tabela__num">${r.vagasPeso}</span>`,
        },
        {
          id: 'vagas', nome: 'Vagas ativas', valor: (r) => vagasAtivas().filter(v => v.regiaoId === r.id).length,
          celula: (r) => `<span class="adm-tabela__num">${num(vagasAtivas().filter(v => v.regiaoId === r.id).length)}</span>`,
        },
        {
          id: 'empresas', nome: 'Empresas', valor: (r) => state.empresas.filter(e => e.regioes.includes(r.id)).length,
          celula: (r) => `<span class="adm-tabela__num">${num(state.empresas.filter(e => e.regioes.includes(r.id)).length)}</span>`,
        },
      ],
      campos: (r) => [
        { nome: 'cidade', rotulo: 'Cidade', valor: r?.cidade || '', obrigatorio: true },
        { nome: 'uf', rotulo: 'UF', valor: r?.uf || '', maxlength: 2, obrigatorio: true },
        { nome: 'indice', rotulo: 'Índice salarial (1 = média nacional)', tipo: 'number', valor: r?.indice ?? 1, step: '0.01' },
        { nome: 'vagasPeso', rotulo: 'Peso na geração de vagas', tipo: 'number', valor: r?.vagasPeso ?? 5 },
        { nome: 'resumo', rotulo: 'Resumo da região', tipo: 'textarea', valor: r?.resumo || '' },
      ],
      ler: (id) => acharRegiao(id),
      gravar: (dados, id) => {
        const base = id ? acharRegiao(id) : null;
        return salvarRegiao({
          ...(base || {}),
          ...dados,
          id,
          uf: (dados.uf || '').toUpperCase(),
          indice: Number(dados.indice) || 1,
          vagasPeso: Number(dados.vagasPeso) || 1,
          nome: `${dados.cidade}, ${(dados.uf || '').toUpperCase()}`,
        });
      },
      apagar: removerRegiao,
      repor: restaurarRegiao,
      nomeDe: (r) => r.nome,
    }),

    usuarios: () => ({
      id: 'usuarios',
      unidade: 'usuário', unidades: 'usuários',
      placeholder: 'Nome ou e-mail',
      dados: () => state.usuarios,
      chave: (u) => u.id,
      busca: (u) => `${u.nome} ${u.email}`,
      filtros: [
        { id: '', nome: 'Todos os usuários' },
        ...PAPEIS_LISTA.map(p => ({ id: `papel:${p.id}`, nome: p.nome })),
        ...PLANOS_LISTA.map(p => ({ id: `plano:${p.id}`, nome: `Plano ${p.nome}` })),
        { id: 'inativo', nome: 'Desativados' },
      ],
      filtrar: (u, f) => {
        if (f === 'inativo') return !u.ativo;
        const [tipo, valor] = f.split(':');
        return tipo === 'papel' ? u.papel === valor : u.plano === valor;
      },
      alternar: (u) => alternarUsuario(u.id),
      ligado: (u) => u.ativo,
      alternarRotulo: (u) => u.ativo ? 'Desativar conta' : 'Reativar conta',
      colunas: [
        {
          id: 'nome', nome: 'Usuário', valor: (u) => u.nome,
          celula: (u) => `
            <div class="adm-linha-emp">
              <span class="avatar" style="width:32px;height:32px;font-size:var(--fs-2xs)" aria-hidden="true">
                ${escapeHtml(iniciais(u.nome))}
              </span>
              <div style="min-width:0">
                <p class="adm-celula-forte cortar">${escapeHtml(u.nome)}</p>
                <p class="adm-celula-sub cortar">${escapeHtml(u.email)}</p>
              </div>
            </div>`,
        },
        {
          id: 'papel', nome: 'Papel', valor: (u) => u.papel,
          celula: (u) => `<span class="selo ${u.papel === 'admin' ? 'selo--marca' : u.papel === 'recrutador' ? 'selo--info' : 'selo--neutro'}">
            ${escapeHtml(PAPEL_POR_ID[u.papel]?.nome || u.papel)}
          </span>`,
        },
        {
          id: 'plano', nome: 'Plano', valor: (u) => u.plano,
          celula: (u) => escapeHtml(PLANO_POR_ID[u.plano]?.nome || u.plano),
        },
        {
          id: 'candidaturas', nome: 'Candidaturas', valor: (u) => u.candidaturas,
          celula: (u) => `<span class="adm-tabela__num">${num(u.candidaturas)}</span>`,
        },
        {
          id: 'acesso', nome: 'Último acesso', valor: (u) => u.ultimoAcesso,
          celula: (u) => `<span style="font-size:var(--fs-xs);color:var(--txt-suave)">${haQuantoTempo(u.ultimoAcesso)}</span>`,
        },
        {
          id: 'estado', nome: 'Estado', valor: (u) => (u.ativo ? 1 : 0),
          celula: (u) => selo(u.ativo, ['Ativo', 'Desativado']),
        },
      ],
      campos: (u) => [
        { nome: 'nome', rotulo: 'Nome', valor: u?.nome || '', obrigatorio: true },
        { nome: 'email', rotulo: 'E-mail', tipo: 'email', valor: u?.email || '', obrigatorio: true },
        {
          nome: 'papel', rotulo: 'Papel', tipo: 'select', valor: u?.papel,
          opcoes: PAPEIS_LISTA.map(p => ({ v: p.id, n: p.nome })),
        },
        {
          nome: 'plano', rotulo: 'Plano', tipo: 'select', valor: u?.plano,
          opcoes: PLANOS_LISTA.map(p => ({ v: p.id, n: p.nome })),
        },
        {
          nome: 'regiaoId', rotulo: 'Região', tipo: 'select', valor: u?.regiaoId,
          opcoes: state.regioes.map(r => ({ v: r.id, n: r.nome })),
        },
        {
          nome: 'profissaoId', rotulo: 'Profissão de interesse', tipo: 'select', valor: u?.profissaoId,
          opcoes: state.profissoes.map(p => ({ v: p.id, n: p.nome })),
        },
        { nome: 'ativo', rotulo: 'Conta ativa', tipo: 'switch', valor: u?.ativo ?? true },
      ],
      ler: (id) => acharUsuario(id),
      gravar: (dados, id) => {
        const base = id ? acharUsuario(id) : null;
        return salvarUsuario({ ...(base || {}), ...dados, id });
      },
      apagar: removerUsuario,
      repor: restaurarUsuario,
      nomeDe: (u) => u.nome,
    }),

    conteudo: () => ({
      id: 'conteudo',
      unidade: 'publicação', unidades: 'publicações',
      placeholder: 'Título ou autor',
      dados: () => state.conteudos,
      chave: (c) => c.id,
      busca: (c) => `${c.titulo} ${c.autor} ${c.resumo}`,
      filtros: [
        { id: '', nome: 'Todos os tipos' },
        ...TIPOS_CONTEUDO.map(t => ({ id: t.id, nome: t.nome })),
        { id: 'rascunho', nome: 'Rascunhos' },
      ],
      filtrar: (c, f) => f === 'rascunho' ? !c.publicado : c.tipo === f,
      alternar: (c) => alternarConteudo(c.id),
      ligado: (c) => c.publicado,
      alternarRotulo: (c) => c.publicado ? 'Despublicar' : 'Publicar',
      colunas: [
        {
          id: 'titulo', nome: 'Publicação', valor: (c) => c.titulo,
          celula: (c) => `
            <div style="min-width:0">
              <p class="adm-celula-forte cortar">${escapeHtml(c.titulo)}</p>
              <p class="adm-celula-sub cortar">${escapeHtml(c.resumo)}</p>
            </div>`,
        },
        {
          id: 'tipo', nome: 'Tipo', valor: (c) => c.tipo,
          celula: (c) => `<span class="selo selo--neutro" style="color:${TIPO_POR_ID[c.tipo]?.cor || 'var(--txt-suave)'}">
            ${escapeHtml(TIPO_POR_ID[c.tipo]?.nome || c.tipo)}
          </span>`,
        },
        { id: 'autor', nome: 'Autor', valor: (c) => c.autor, celula: (c) => escapeHtml(c.autor) },
        {
          id: 'leitura', nome: 'Leitura', valor: (c) => c.minutos,
          celula: (c) => `<span class="adm-tabela__num">${c.minutos} min</span>`,
        },
        {
          id: 'views', nome: 'Visualizações', valor: (c) => c.visualizacoes,
          celula: (c) => `<span class="adm-tabela__num">${compacto(c.visualizacoes)}</span>`,
        },
        {
          id: 'estado', nome: 'Estado', valor: (c) => (c.publicado ? 1 : 0),
          celula: (c) => selo(c.publicado, ['Publicado', 'Rascunho']),
        },
      ],
      campos: (c) => [
        { nome: 'titulo', rotulo: 'Título', valor: c?.titulo || '', obrigatorio: true },
        {
          nome: 'tipo', rotulo: 'Tipo', tipo: 'select', valor: c?.tipo,
          opcoes: TIPOS_CONTEUDO.map(t => ({ v: t.id, n: t.nome })),
        },
        { nome: 'resumo', rotulo: 'Resumo', tipo: 'textarea', valor: c?.resumo || '', obrigatorio: true },
        { nome: 'autor', rotulo: 'Autor', valor: c?.autor || 'Equipe NORTE' },
        { nome: 'minutos', rotulo: 'Tempo de leitura (min)', tipo: 'number', valor: c?.minutos ?? 5, min: 1 },
        { nome: 'publicado', rotulo: 'Publicado', tipo: 'switch', valor: c?.publicado ?? false },
      ],
      ler: (id) => acharConteudo(id),
      gravar: (dados, id) => {
        const base = id ? acharConteudo(id) : null;
        return salvarConteudo({ ...(base || {}), ...dados, id, minutos: Number(dados.minutos) || 5 });
      },
      apagar: removerConteudo,
      repor: restaurarConteudo,
      nomeDe: (c) => c.titulo,
    }),
  };

  /* ============================================================
     FORMULÁRIO GENÉRICO
     ============================================================ */
  function abrirForm(cfg, id = null) {
    const registro = id ? cfg.ler(id) : null;
    const campos = cfg.campos(registro);

    const m = modal({
      titulo: registro ? `Editar ${cfg.unidade}` : `Nova ${cfg.unidade}`,
      sub: registro ? cfg.nomeDe(registro) : 'Preencha os campos e salve',
      tamanho: 'lg',
      conteudo: `
        <form class="adm-form" data-form-adm>
          <div class="adm-form__linha">
            ${campos.filter(c => c.tipo !== 'textarea' && c.tipo !== 'switch').map(campoHtml).join('')}
          </div>
          ${campos.filter(c => c.tipo === 'textarea').map(campoHtml).join('')}
          ${campos.some(c => c.tipo === 'switch') ? `
            <div style="display:grid;gap:var(--sp-3);padding-top:var(--sp-4);border-top:1px solid var(--bd-sutil)">
              ${campos.filter(c => c.tipo === 'switch').map(campoHtml).join('')}
            </div>` : ''}
        </form>`,
      rodape: `
        <button type="button" class="btn btn--contorno" data-fechar>Cancelar</button>
        <button type="button" class="btn btn--primario" data-gravar>
          ${registro ? 'Salvar alterações' : `Criar ${cfg.unidade}`}
        </button>`,
    });

    qs('[data-gravar]', m.node).addEventListener('click', () => {
      const form = qs('[data-form-adm]', m.node);
      if (!form.reportValidity()) return;

      const dados = {};
      campos.forEach(c => {
        const el = qs(`[name="${c.nome}"]`, form);
        if (!el) return;
        dados[c.nome] = c.tipo === 'switch' ? el.checked : el.value;
      });

      const res = cfg.gravar(dados, id);
      m.fechar();
      desenhar();
      toast(res.criada || res.criado ? `${cfg.unidade} criada` : 'Alterações salvas', {
        tipo: 'ok',
        texto: 'A plataforma já reflete a mudança.',
      });
    });
  }

  function campoHtml(c) {
    const comum = `name="${c.nome}" ${c.obrigatorio ? 'required' : ''}`;

    if (c.tipo === 'switch') {
      return `
      <label class="switch">
        <input type="checkbox" ${comum} ${c.valor ? 'checked' : ''}>
        <span>${escapeHtml(c.rotulo)}</span>
      </label>`;
    }

    if (c.tipo === 'select') {
      return `
      <label class="campo">
        <span class="campo__rotulo">${escapeHtml(c.rotulo)}</span>
        <select class="select" ${comum}>
          ${(c.opcoes || []).map(o => `
            <option value="${escapeHtml(String(o.v))}" ${String(o.v) === String(c.valor) ? 'selected' : ''}>
              ${escapeHtml(o.n)}
            </option>`).join('')}
        </select>
      </label>`;
    }

    if (c.tipo === 'textarea') {
      return `
      <label class="campo">
        <span class="campo__rotulo">${escapeHtml(c.rotulo)}</span>
        <textarea class="textarea" rows="3" ${comum}>${escapeHtml(c.valor)}</textarea>
      </label>`;
    }

    return `
    <label class="campo">
      <span class="campo__rotulo">${escapeHtml(c.rotulo)}</span>
      <input class="input" type="${c.tipo || 'text'}" ${comum}
             value="${escapeHtml(String(c.valor ?? ''))}"
             ${c.min !== undefined ? `min="${c.min}"` : ''}
             ${c.max !== undefined ? `max="${c.max}"` : ''}
             ${c.step ? `step="${c.step}"` : ''}
             ${c.maxlength ? `maxlength="${c.maxlength}"` : ''}>
    </label>`;
  }

  /* ============================================================
     OVERVIEW
     ============================================================ */
  function htmlOverview() {
    const ativas = vagasAtivas();
    const publicadas = state.profissoes.filter(p => p.publicada).length;
    const usuariosAtivos = state.usuarios.filter(u => u.ativo).length;
    const novasSemana = ativas.filter(v => v.diasPublicada <= 7).length;
    const candidaturasTotais = ativas.reduce((s, v) => s + v.candidaturas, 0);
    const serie = SERIE_HISTORICA.slice(-60);

    const porArea = AREAS.map((a, i) => ({
      rotulo: a.nome,
      valor: ativas.filter(v => v.area === a.id).length,
      cor: a.cor,
    })).filter(x => x.valor > 0).sort((a, b) => b.valor - a.valor);

    const topRegioes = state.regioes.map(r => ({
      rotulo: r.cidade,
      valor: ativas.filter(v => v.regiaoId === r.id).length,
    })).filter(x => x.valor > 0).sort((a, b) => b.valor - a.valor).slice(0, 7);

    return `
    <div class="adm__aviso">
      ${icon.info({ size: 17 })}
      <span>
        Tudo aqui é editável e reflete na plataforma na mesma hora.
        Para voltar ao estado original, use <b>Restaurar dados</b> no rodapé do menu.
      </span>
    </div>

    <div class="adm__kpis">
      ${kpi('Vagas ativas', num(ativas.length), 'maleta',
        `${num(novasSemana)} publicadas esta semana`,
        sparkline(serie.map(d => d.candidaturas), { largura: 76, altura: 24 }))}
      ${kpi('Profissões publicadas', num(publicadas), 'chapeu',
        `${num(state.profissoes.length - publicadas)} ocultas do catálogo`)}
      ${kpi('Empresas', num(state.empresas.length), 'predio',
        `${num(state.empresas.filter(e => ativas.some(v => v.empresaId === e.id)).length)} com vaga aberta`)}
      ${kpi('Usuários', num(usuariosAtivos), 'usuarios',
        `${num(state.usuarios.length - usuariosAtivos)} desativados`,
        sparkline(serie.map(d => d.usuarios), { largura: 76, altura: 24 }))}
    </div>

    <div class="adm__grade adm__grade--2-1">
      <div class="cartao cartao--pad">
        ${graficoLinha(
          serie.map(d => ({ rotulo: dataCurta(d.data), valor: d.buscas })),
          {
            titulo: 'Buscas por dia nos últimos 60 dias',
            sub: 'quanto a plataforma foi usada, dia a dia',
            fmt: num,
            maxRotulosX: 6,
            zero: false,
          }
        )}
      </div>

      <div class="cartao cartao--pad">
        ${graficoDonut(porArea.slice(0, 6), {
          titulo: 'Vagas por área',
          tamanho: 180,
          centro: num(ativas.length),
          centroSub: 'vagas',
          fmt: num,
        })}
      </div>
    </div>

    <div class="adm__grade">
      <div class="cartao cartao--pad">
        <p class="graf__titulo" style="margin-bottom:var(--sp-4)">Regiões com mais vagas</p>
        ${ranking(topRegioes, { fmt: num })}
      </div>

      <div class="cartao cartao--pad">
        <p class="graf__titulo" style="margin-bottom:var(--sp-4)">Últimas vagas publicadas</p>
        <div class="pilha">
          ${[...ativas].sort((a, b) => a.diasPublicada - b.diasPublicada).slice(0, 5).map(v => {
            const e = acharEmpresa(v.empresaId);
            return `
            <div class="linha" style="gap:var(--sp-3)">
              <span class="logo-emp logo-emp--sm" style="background:${e?.cor || 'var(--acento)'}" aria-hidden="true">
                ${escapeHtml(e?.sigla || '??')}
              </span>
              <span style="flex:1;min-width:0">
                <span style="display:block;font-size:var(--fs-sm);font-weight:600;color:var(--txt-forte)" class="cortar">
                  ${escapeHtml(v.titulo)}
                </span>
                <span style="display:block;font-size:var(--fs-xs);color:var(--txt-fraco)" class="cortar">
                  ${escapeHtml(e?.nome || '')} · ${haQuantoTempo(v.publicadaEm)}
                </span>
              </span>
              <a class="btn-icone btn-icone--sm" href="#/vaga/${v.id}" aria-label="Ver vaga">
                ${icon.externo({ size: 14 })}
              </a>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="cartao cartao--pad">
        <p class="graf__titulo" style="margin-bottom:var(--sp-4)">Saúde do catálogo</p>
        <div style="display:grid;gap:var(--sp-4)">
          ${saude('Vagas com salário divulgado',
            ativas.filter(v => v.salarioVisivel).length, ativas.length)}
          ${saude('Vagas com menos de 30 dias',
            ativas.filter(v => v.diasPublicada < 30).length, ativas.length)}
          ${saude('Profissões com vaga aberta',
            state.profissoes.filter(p => ativas.some(v => v.profissaoId === p.id)).length,
            state.profissoes.length)}
          ${saude('Empresas com vaga aberta',
            state.empresas.filter(e => ativas.some(v => v.empresaId === e.id)).length,
            state.empresas.length)}
        </div>
        <p class="campo__dica" style="margin-top:var(--sp-5)">
          ${num(candidaturasTotais)} candidaturas registradas no total.
        </p>
      </div>
    </div>`;
  }

  function kpi(rotulo, valor, icone, pe, grafico = '') {
    return `
    <div class="adm-kpi">
      <div class="adm-kpi__topo">
        <p class="adm-kpi__l">${icon[icone]({ size: 13 })} ${escapeHtml(rotulo)}</p>
        ${grafico}
      </div>
      <p class="adm-kpi__n">${valor}</p>
      <p style="font-size:var(--fs-xs);color:var(--txt-fraco)">${pe}</p>
    </div>`;
  }

  function saude(rotulo, parte, total) {
    const p = total ? (parte / total) * 100 : 0;
    const cor = p >= 75 ? 'var(--ok)' : p >= 45 ? 'var(--aviso)' : 'var(--erro)';
    return `
    <div>
      <div class="linha" style="justify-content:space-between;margin-bottom:6px">
        <span style="font-size:var(--fs-sm);color:var(--txt-base)">${escapeHtml(rotulo)}</span>
        <span class="adm-tabela__num" style="font-size:var(--fs-xs);color:var(--txt-suave)">
          ${num(parte)}/${num(total)}
        </span>
      </div>
      <div class="barra barra--fina"><span style="width:${p}%;background:${cor}"></span></div>
    </div>`;
  }

  /* ============================================================
     ANALYTICS
     ============================================================ */
  function htmlAnalytics() {
    const serie = SERIE_HISTORICA.slice(-90);
    const ativas = vagasAtivas();

    const buscasPorProfissao = state.historico.reduce((m, h) => {
      m[h.profissaoId] = (m[h.profissaoId] || 0) + 1;
      return m;
    }, {});

    const maisBuscadas = state.profissoes
      .map(p => ({
        rotulo: p.nome,
        valor: (buscasPorProfissao[p.id] || 0) * 40 + p.demanda,
        href: montarUrl('/buscar', { p: p.id, r: 'qualquer' }),
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);

    const porNivel = NIVEIS_LISTA.map((n, i) => ({
      rotulo: n.nome,
      valor: ativas.filter(v => v.nivel === n.id).length,
      cor: corDado(i),
    })).filter(x => x.valor > 0);

    const porContrato = CONTRATOS.map((c, i) => ({
      rotulo: c.nome,
      valor: ativas.filter(v => v.contrato === c.id).length,
      cor: corDado(i),
    })).filter(x => x.valor > 0);

    const totalVisitas = serie.reduce((s, d) => s + d.visualizacoes, 0);
    const totalBuscas = serie.reduce((s, d) => s + d.buscas, 0);
    const conversao = totalVisitas ? (totalBuscas / totalVisitas) * 100 : 0;
    const candidaturas = ativas.reduce((s, v) => s + v.candidaturas, 0);

    return `
    <div class="adm__kpis">
      ${kpi('Visualizações (90 dias)', compacto(totalVisitas), 'olho', 'páginas vistas no período',
        sparkline(serie.map(d => d.visualizacoes), { largura: 76, altura: 24 }))}
      ${kpi('Buscas realizadas', compacto(totalBuscas), 'lupa', `${pct(conversao)} das visualizações viram busca`,
        sparkline(serie.map(d => d.buscas), { largura: 76, altura: 24 }))}
      ${kpi('Candidaturas', compacto(candidaturas), 'foguete',
        `${(candidaturas / Math.max(1, ativas.length)).toFixed(1).replace('.', ',')} por vaga em média`)}
      ${kpi('Salário médio anunciado', dinheiroCompacto(
        ativas.filter(v => v.salarioVisivel).reduce((s, v) => s + (v.salarioMin + v.salarioMax) / 2, 0) /
        Math.max(1, ativas.filter(v => v.salarioVisivel).length)
      ), 'moeda', 'entre as vagas que divulgam valor')}
    </div>

    <div class="cartao cartao--pad">
      ${graficoLinha(
        [
          { nome: 'Visualizações', cor: corDado(0), pontos: serie.map(d => ({ rotulo: dataCurta(d.data), valor: d.visualizacoes })) },
          { nome: 'Buscas', cor: corDado(1), pontos: serie.map(d => ({ rotulo: dataCurta(d.data), valor: d.buscas })) },
        ],
        {
          titulo: 'Visualizações e buscas nos últimos 90 dias',
          sub: 'a distância entre as linhas é quem chega e não busca',
          fmt: compacto,
          maxRotulosX: 7,
        }
      )}
    </div>

    <div class="adm__grade">
      <div class="cartao cartao--pad">
        <p class="graf__titulo" style="margin-bottom:var(--sp-4)">Profissões mais procuradas</p>
        ${ranking(maisBuscadas, { fmt: (v) => `${Math.round(v)} pts` })}
        <p class="campo__dica" style="margin-top:var(--sp-4)">
          Índice combinado de demanda de mercado e buscas feitas nesta sessão.
        </p>
      </div>

      <div class="cartao cartao--pad">
        ${graficoBarras(porNivel, {
          titulo: 'Vagas por nível de experiência',
          fmt: num,
          altura: 260,
        })}
      </div>

      <div class="cartao cartao--pad">
        ${graficoDonut(porContrato, {
          titulo: 'Tipo de contrato',
          tamanho: 180,
          centro: num(ativas.length),
          centroSub: 'vagas',
          fmt: num,
        })}
      </div>
    </div>`;
  }

  /* ============================================================
     CONFIGURAÇÕES
     ============================================================ */
  function htmlConfiguracoes() {
    const p = state.plataforma;
    return `
    <form data-form-plataforma style="display:grid;gap:var(--sp-6);max-width:760px">
      <section class="painel">
        <div class="painel__topo">
          <div>
            <p class="painel__titulo">Identidade</p>
            <p class="painel__sub">Aparece no rodapé e nos e-mails</p>
          </div>
        </div>
        <div class="painel__corpo" style="display:grid;gap:var(--sp-4)">
          <div class="adm-form__linha">
            <label class="campo">
              <span class="campo__rotulo">Nome da plataforma</span>
              <input class="input" name="nome" value="${escapeHtml(p.nome)}" required>
            </label>
            <label class="campo">
              <span class="campo__rotulo">E-mail de contato</span>
              <input class="input" type="email" name="contato" value="${escapeHtml(p.contato)}">
            </label>
          </div>
          <label class="campo">
            <span class="campo__rotulo">Slogan</span>
            <input class="input" name="slogan" value="${escapeHtml(p.slogan)}">
          </label>
        </div>
      </section>

      <section class="painel">
        <div class="painel__topo">
          <div>
            <p class="painel__titulo">Regras de publicação</p>
            <p class="painel__sub">Valem para toda vaga nova</p>
          </div>
        </div>
        <div class="painel__corpo" style="display:grid;gap:var(--sp-5)">
          <div class="adm-form__linha">
            <label class="campo">
              <span class="campo__rotulo">Vagas por página na busca</span>
              <input class="input" type="number" name="vagasPorPagina" min="6" max="48"
                     value="${p.vagasPorPagina}">
              <span class="campo__dica">Entre 6 e 48</span>
            </label>
            <label class="campo">
              <span class="campo__rotulo">Dias até a vaga expirar</span>
              <input class="input" type="number" name="diasExpiracao" min="7" max="180"
                     value="${p.diasExpiracao}">
            </label>
          </div>

          <label class="switch">
            <input type="checkbox" name="exigirSalario" ${p.exigirSalario ? 'checked' : ''}>
            <span>Exigir salário divulgado em toda vaga nova</span>
          </label>
          <label class="switch">
            <input type="checkbox" name="moderarVagas" ${p.moderarVagas ? 'checked' : ''}>
            <span>Revisar vagas antes de publicar</span>
          </label>
          <label class="switch">
            <input type="checkbox" name="permitirCadastro" ${p.permitirCadastro ? 'checked' : ''}>
            <span>Permitir novos cadastros de usuário</span>
          </label>
        </div>
      </section>

      <section class="painel">
        <div class="painel__topo">
          <div>
            <p class="painel__titulo">Zona de risco</p>
            <p class="painel__sub">Ações que não dá para desfazer</p>
          </div>
        </div>
        <div class="painel__corpo" style="display:grid;gap:var(--sp-4)">
          <p style="font-size:var(--fs-sm);color:var(--txt-suave);line-height:var(--lh-solto)">
            Restaurar devolve profissões, empresas, vagas, regiões, usuários e conteúdo
            ao conjunto original da demonstração, e apaga o que foi salvo neste navegador.
          </p>
          <button type="button" class="btn btn--perigo" data-reset style="justify-self:start">
            ${icon.atualizar({ size: 16 })} Restaurar todos os dados
          </button>
        </div>
      </section>

      <div>
        <button type="submit" class="btn btn--primario">
          ${icon.ok({ size: 16 })} Salvar configurações
        </button>
      </div>
    </form>`;
  }

  /* ============================================================
     RENDERIZAÇÃO
     ============================================================ */
  function acoesTopo() {
    if (CFG[secao]) {
      const cfg = CFG[secao]();
      return `
        <button type="button" class="btn btn--primario btn--sm" data-novo>
          ${icon.mais({ size: 15 })} Nova ${escapeHtml(cfg.unidade)}
        </button>`;
    }
    if (secao === 'overview' || secao === 'analytics') {
      return `<a class="btn btn--contorno btn--sm" href="#/">${icon.externo({ size: 15 })} Ver a plataforma</a>`;
    }
    return '';
  }

  function desenhar() {
    desligarGraficos?.();

    const [titulo, sub] = TITULOS[secao] || TITULOS.overview;
    qs('[data-titulo]', raiz).textContent = titulo;
    qs('[data-subtitulo]', raiz).textContent = sub;
    qs('[data-acoes-topo]', raiz).innerHTML = acoesTopo();
    qs('[data-menu]', raiz).innerHTML = htmlMenu();

    const corpo = qs('[data-corpo]', raiz);
    if (secao === 'overview') corpo.innerHTML = htmlOverview();
    else if (secao === 'analytics') corpo.innerHTML = htmlAnalytics();
    else if (secao === 'configuracoes') corpo.innerHTML = htmlConfiguracoes();
    else corpo.innerHTML = tabela(CFG[secao]());

    desligarGraficos = ativarGraficos(corpo);
    observarAnimacoes(corpo);
    document.title = `${titulo} | Painel NORTE`;
  }

  function fecharLado() {
    ladoAberto = false;
    qs('[data-lado]', raiz).classList.remove('aberto');
    qs('[data-fundo-lado]', raiz).classList.remove('aberto');
  }

  /* ============================================================
     EVENTOS
     ============================================================ */
  const buscarComAtraso = debounce((id, valor) => {
    const t = tabelaDe(id);
    t.termo = valor;
    t.pagina = 1;
    desenhar();
    // Devolve o cursor ao campo: quem digita não quer perder o foco
    const campo = qs('[data-busca-tabela]', raiz);
    if (campo) {
      campo.focus();
      campo.setSelectionRange(campo.value.length, campo.value.length);
    }
  }, 260);

  raiz.addEventListener('input', (e) => {
    if (e.target.matches('[data-busca-tabela]')) {
      const id = e.target.closest('[data-tabela]').dataset.tabela;
      buscarComAtraso(id, e.target.value);
    }
  });

  raiz.addEventListener('change', (e) => {
    if (e.target.matches('[data-filtro-tabela]')) {
      const id = e.target.closest('[data-tabela]').dataset.tabela;
      const t = tabelaDe(id);
      t.filtro = e.target.value;
      t.pagina = 1;
      desenhar();
    }
  });

  raiz.addEventListener('click', async (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      secao = nav.dataset.nav;
      fecharLado();
      setTimeout(desenhar, 0);
      return;
    }

    if (e.target.closest('[data-abrir-lado]')) {
      ladoAberto = true;
      qs('[data-lado]', raiz).classList.add('aberto');
      qs('[data-fundo-lado]', raiz).classList.add('aberto');
      return;
    }

    if (e.target.closest('[data-fundo-lado]')) { fecharLado(); return; }

    if (e.target.closest('[data-novo]')) {
      abrirForm(CFG[secao]());
      return;
    }

    const ordenar = e.target.closest('[data-ordenar]');
    if (ordenar) {
      const id = ordenar.closest('[data-tabela]').dataset.tabela;
      const t = tabelaDe(id);
      const col = ordenar.dataset.ordenar;
      if (t.ordem === col) t.asc = !t.asc;
      else { t.ordem = col; t.asc = false; }
      desenhar();
      return;
    }

    const pag = e.target.closest('[data-pag]');
    if (pag && !pag.disabled) {
      const id = pag.closest('[data-tabela]').dataset.tabela;
      tabelaDe(id).pagina = Number(pag.dataset.pag);
      desenhar();
      return;
    }

    const linha = e.target.closest('tr[data-id]');
    if (linha && CFG[secao]) {
      const cfg = CFG[secao]();
      const id = linha.dataset.id;

      if (e.target.closest('[data-editar]')) { abrirForm(cfg, id); return; }

      if (e.target.closest('[data-alternar]') && cfg.alternar) {
        const registro = cfg.ler(id);
        cfg.alternar(registro);
        desenhar();
        toast(cfg.ligado(cfg.ler(id)) ? 'Publicado' : 'Ocultado', {
          tipo: 'info',
          texto: `${cfg.nomeDe(registro)} — a mudança já vale na plataforma.`,
          duracao: 3000,
        });
        return;
      }

      if (e.target.closest('[data-excluir]')) {
        const registro = cfg.ler(id);
        const ok = await confirmar({
          titulo: `Excluir ${cfg.unidade}?`,
          sub: cfg.nomeDe(registro),
          texto: 'O registro sai da plataforma imediatamente. Você pode desfazer logo em seguida.',
          confirmar: 'Excluir',
          perigo: true,
        });
        if (!ok) return;

        const res = cfg.apagar(id);
        if (!res.ok) return;
        desenhar();

        toast(`${cfg.unidade[0].toUpperCase()}${cfg.unidade.slice(1)} excluída`, {
          tipo: 'info',
          duracao: 7000,
          acao: {
            rotulo: 'Desfazer',
            fn: () => {
              cfg.repor(res.removida || res.removido, res.pos);
              desenhar();
              toast('Restaurado', { tipo: 'ok', duracao: 2200 });
            },
          },
        });
        return;
      }
    }

    if (e.target.closest('[data-reset]')) {
      const ok = await confirmar({
        titulo: 'Restaurar todos os dados?',
        texto: 'Profissões, empresas, vagas, regiões, usuários, conteúdo e o que você salvou como visitante voltam ao estado original.',
        confirmar: 'Restaurar tudo',
        perigo: true,
      });
      if (!ok) return;
      resetarTudo();
      Object.keys(tabelas).forEach(k => delete tabelas[k]);
      desenhar();
      toast('Dados restaurados', { tipo: 'ok', texto: 'A demonstração voltou ao estado inicial.' });
    }
  });

  raiz.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-form-plataforma]')) return;
    e.preventDefault();

    const form = e.target;
    const d = new FormData(form);

    salvarPlataforma({
      nome: d.get('nome').trim() || 'NORTE',
      slogan: d.get('slogan').trim(),
      contato: d.get('contato').trim(),
      vagasPorPagina: Math.max(6, Math.min(48, Number(d.get('vagasPorPagina')) || 12)),
      diasExpiracao: Math.max(7, Math.min(180, Number(d.get('diasExpiracao')) || 45)),
      exigirSalario: qs('[name="exigirSalario"]', form).checked,
      moderarVagas: qs('[name="moderarVagas"]', form).checked,
      permitirCadastro: qs('[name="permitirCadastro"]', form).checked,
    });

    toast('Configurações salvas', { tipo: 'ok' });
  });

  const onKey = (e) => { if (e.key === 'Escape' && ladoAberto) fecharLado(); };
  document.addEventListener('keydown', onKey);

  desenhar();

  return () => {
    desligarGraficos?.();
    document.removeEventListener('keydown', onKey);
  };
}
