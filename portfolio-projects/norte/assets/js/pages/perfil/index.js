/* ============================================================
   NORTE — Área da pessoa
   Painel, salvos, histórico, comparações, alertas e preferências.
   Tudo mora no localStorage: é uma demonstração, mas o estado é
   real e sobrevive ao recarregamento.
   ============================================================ */

import { qs, qsa, observarAnimacoes } from '../../utils/dom.js';
import { icon } from '../../components/icons.js';
import {
  escapeHtml, dinheiro, dinheiroCompacto, num, pct, plural,
  haQuantoTempo, dataMedia, iniciais,
} from '../../utils/format.js';
import {
  state, acharProfissao, acharRegiao, acharEmpresa, acharVaga,
  todasRegioes, alternarSalvo, limparHistorico, removerDoHistorico,
  removerComparacao, criarAlerta, atualizarAlerta, removerAlerta,
  restaurarAlerta, vagasDoAlerta, marcarAlertasVistos, salvarPerfil,
  salvarConfig, resetarTudo, profissoesVisiveis,
  salarioNaRegiao, vagasDaProfissao,
} from '../../services/store.js';
import { recomendadasParaMim } from '../../services/busca.js';
import { AREAS, AREA_POR_ID } from '../../data/profissoes.js';
import { NIVEIS_LISTA, MODELOS } from '../../data/oportunidades.js';
import { vagaCard, vagaLinha, ligarSalvarVaga, nomeNivel, nomeModelo } from '../../components/vagaCard.js';
import { ranking, sparkline, ativarGraficos, corDado } from '../../components/graficos.js';
import { toast, vazio, modal, confirmar } from '../../components/ui.js';
import { montarUrl, ir } from '../../router.js';

const SECOES = [
  { id: 'painel', nome: 'Painel', icone: 'grade' },
  { id: 'salvos', nome: 'Salvos', icone: 'marcador' },
  { id: 'historico', nome: 'Histórico', icone: 'relogio' },
  { id: 'comparacoes', nome: 'Comparações', icone: 'comparar' },
  { id: 'alertas', nome: 'Alertas', icone: 'sino' },
  { id: 'preferencias', nome: 'Preferências', icone: 'ajustes' },
];

const FREQUENCIAS = [
  { id: 'diaria', nome: 'Todo dia' },
  { id: 'semanal', nome: 'Uma vez por semana' },
  { id: 'imediata', nome: 'Assim que aparecer' },
];

export function paginaPerfil(raiz, params) {
  let secao = SECOES.some(s => s.id === params.secao) ? params.secao : 'painel';
  let desligarGraficos = null;
  let desligarFav = null;

  raiz.innerHTML = `
    <div class="shell">
      <div class="perfil-layout">
        <aside>
          <nav class="perfil-nav" aria-label="Seções do perfil">
            <div class="perfil-nav__cartao">
              <span class="avatar" aria-hidden="true">${escapeHtml(iniciais(state.perfil.nome))}</span>
              <div>
                <p class="perfil-nav__n" data-nome-nav>${escapeHtml(state.perfil.nome)}</p>
                <p class="perfil-nav__e" data-email-nav>${escapeHtml(state.perfil.email)}</p>
              </div>
            </div>
            ${SECOES.map(s => `
              <a class="perfil-nav__link ${s.id === secao ? 'ativo' : ''}"
                 href="#/perfil/${s.id}" data-nav="${s.id}">
                ${icon[s.icone]({ size: 16 })} ${s.nome}
                ${s.id === 'alertas' ? '<span class="selo selo--marca" data-selo-alertas hidden></span>' : ''}
              </a>`).join('')}
            <button type="button" class="perfil-nav__link" data-sair style="margin-top:var(--sp-4);color:var(--erro)">
              ${icon.atualizar({ size: 16 })} Reiniciar demonstração
            </button>
          </nav>
        </aside>

        <div data-conteudo style="min-width:0"></div>
      </div>
    </div>`;

  /* ============================================================
     PAINEL
     ============================================================ */
  function htmlPainel() {
    const salvasVagas = (state.salvos.vagas || []).map(acharVaga).filter(Boolean);
    const salvasProf = (state.salvos.profissoes || []).map(acharProfissao).filter(Boolean);
    const recomendadas = recomendadasParaMim(4);
    const alertasAtivos = state.alertas.filter(a => a.ativo);
    const novasDosAlertas = alertasAtivos.reduce((s, a) => s + vagasDoAlerta(a).filter(v => v.diasPublicada <= 7).length, 0);

    return `
    <div class="perfil-topo">
      <h1>Olá, ${escapeHtml(state.perfil.nome.split(' ')[0])}</h1>
      <p>${escapeHtml(state.perfil.cargo)} · ${escapeHtml(state.perfil.cidade)}</p>
    </div>

    <div class="kpi-grade">
      <div class="kpi">
        <p class="kpi__l">${icon.marcador({ size: 13 })} Vagas salvas</p>
        <p class="kpi__n">${num(salvasVagas.length)}</p>
      </div>
      <div class="kpi">
        <p class="kpi__l">${icon.foguete({ size: 13 })} Candidaturas</p>
        <p class="kpi__n">${num(state.candidaturas.length)}</p>
      </div>
      <div class="kpi">
        <p class="kpi__l">${icon.sino({ size: 13 })} Alertas ativos</p>
        <p class="kpi__n">${num(alertasAtivos.length)}</p>
      </div>
      <div class="kpi">
        <p class="kpi__l">${icon.pulso({ size: 13 })} Novidades da semana</p>
        <p class="kpi__n">${num(novasDosAlertas)}</p>
      </div>
    </div>

    ${state.candidaturas.length ? `
      <section style="margin-top:var(--sp-10)">
        <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-5)">Suas candidaturas</h2>
        <div class="pilha">
          ${state.candidaturas.map(c => {
            const v = acharVaga(c.vagaId);
            if (!v) return '';
            const e = acharEmpresa(v.empresaId);
            return `
            <a class="vaga-linha" href="#/vaga/${v.id}">
              <span class="logo-emp logo-emp--sm" style="background:${e?.cor || 'var(--acento)'}" aria-hidden="true">
                ${escapeHtml(e?.sigla || '??')}
              </span>
              <span class="vaga-linha__meio">
                <span class="vaga-linha__t cortar">${escapeHtml(v.titulo)}</span>
                <span class="vaga-linha__s cortar">${escapeHtml(e?.nome || '')}</span>
              </span>
              <span class="vaga-linha__dir">
                <span class="selo selo--ok">${icon.ok({ size: 11 })} Enviada</span>
                <span class="vaga-linha__s">${haQuantoTempo(c.data)}</span>
              </span>
            </a>`;
          }).join('')}
        </div>
      </section>` : ''}

    ${salvasProf.length ? `
      <section style="margin-top:var(--sp-10)">
        <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-5)">Carreiras que você está acompanhando</h2>
        <div class="res-grade res-grade--2">
          ${salvasProf.slice(0, 4).map(p => {
            const a = AREA_POR_ID[p.area];
            const nVagas = vagasDaProfissao(p.id).length;
            const sal = salarioNaRegiao(p, state.perfil.regiaoPreferida);
            return `
            <a class="cartao cartao--pad" href="#/profissao/${p.id}" style="display:grid;gap:var(--sp-3)">
              <span class="linha" style="gap:var(--sp-3)">
                <span class="prof-capa__ic" style="color:${a?.cor || 'var(--acento)'};width:38px;height:38px">
                  ${icon[a?.icone || 'maleta']({ size: 18 })}
                </span>
                <span style="min-width:0">
                  <span style="display:block;font-weight:600;color:var(--txt-forte)">${escapeHtml(p.nome)}</span>
                  <span style="display:block;font-size:var(--fs-xs);color:var(--txt-fraco)">
                    ${dinheiroCompacto(sal.media)} · ${plural(nVagas, 'vaga')}
                  </span>
                </span>
                ${sparkline(p.evolucao.map(e => e.valor), { largura: 64, altura: 22 })}
              </span>
            </a>`;
          }).join('')}
        </div>
      </section>` : ''}

    <section style="margin-top:var(--sp-10)">
      <div class="res-barra">
        <h2 style="font-size:var(--fs-xl)">Recomendadas para você</h2>
        <a class="btn btn--fantasma btn--sm" href="#/perfil/preferencias">
          ${icon.ajustes({ size: 15 })} Ajustar preferências
        </a>
      </div>
      ${recomendadas.length ? `
        <div class="res-grade res-grade--2">
          ${recomendadas.map(v => vagaCard(v)).join('')}
        </div>`
        : vazio({
          icone: 'alvo',
          titulo: 'Ainda não temos o suficiente para recomendar',
          texto: 'Salve algumas profissões ou ajuste suas preferências para as recomendações ficarem certeiras.',
          acao: '<a class="btn btn--primario" href="#/profissoes" style="margin-top:var(--sp-5)">Explorar profissões</a>',
        })}
    </section>`;
  }

  /* ============================================================
     SALVOS
     ============================================================ */
  function htmlSalvos() {
    const vagas = (state.salvos.vagas || []).map(acharVaga).filter(Boolean);
    const profs = (state.salvos.profissoes || []).map(acharProfissao).filter(Boolean);
    const emps = (state.salvos.empresas || []).map(acharEmpresa).filter(Boolean);
    const total = vagas.length + profs.length + emps.length;

    return `
    <div class="perfil-topo">
      <h1>Salvos</h1>
      <p>${total ? `${plural(total, 'item guardado', 'itens guardados')} para voltar depois` : 'Nada guardado ainda'}</p>
    </div>

    ${!total ? vazio({
      icone: 'marcador',
      titulo: 'Sua lista está vazia',
      texto: 'Use o marcador nos cartões de vaga, nas profissões e nas empresas para guardar o que interessa.',
      acao: '<a class="btn btn--primario" href="#/profissoes" style="margin-top:var(--sp-5)">Começar a explorar</a>',
    }) : `
      <div class="abas" role="tablist" style="margin-bottom:var(--sp-6)">
        <button type="button" class="aba" role="tab" data-tab-salvos="vagas" aria-selected="true">
          Vagas <span style="color:var(--txt-fraco)">${vagas.length}</span>
        </button>
        <button type="button" class="aba" role="tab" data-tab-salvos="profissoes" aria-selected="false">
          Profissões <span style="color:var(--txt-fraco)">${profs.length}</span>
        </button>
        <button type="button" class="aba" role="tab" data-tab-salvos="empresas" aria-selected="false">
          Empresas <span style="color:var(--txt-fraco)">${emps.length}</span>
        </button>
      </div>

      <div data-painel-salvos="vagas">
        ${vagas.length
          ? `<div class="res-grade res-grade--2">${vagas.map(v => vagaCard(v)).join('')}</div>`
          : '<p class="campo__dica">Nenhuma vaga salva.</p>'}
      </div>

      <div data-painel-salvos="profissoes" hidden>
        ${profs.length ? `
          <div class="res-grade res-grade--2">
            ${profs.map(p => {
              const a = AREA_POR_ID[p.area];
              return `
              <div class="cartao cartao--pad" style="display:grid;gap:var(--sp-3)">
                <div class="linha" style="gap:var(--sp-3);align-items:flex-start">
                  <span class="prof-capa__ic" style="color:${a?.cor || 'var(--acento)'};width:40px;height:40px;flex-shrink:0">
                    ${icon[a?.icone || 'maleta']({ size: 19 })}
                  </span>
                  <div style="flex:1;min-width:0">
                    <a href="#/profissao/${p.id}" style="display:block;font-weight:600;color:var(--txt-forte)">
                      ${escapeHtml(p.nome)}
                    </a>
                    <p style="font-size:var(--fs-xs);color:var(--txt-fraco)">${escapeHtml(a?.nome || '')}</p>
                  </div>
                  <button type="button" class="btn-icone btn-icone--sm" data-tirar="profissoes|${p.id}"
                          aria-label="Remover ${escapeHtml(p.nome)} dos salvos">
                    ${icon.lixo({ size: 15 })}
                  </button>
                </div>
                <div class="linha" style="gap:var(--sp-3)">
                  <a class="btn btn--contorno btn--sm" href="${montarUrl('/buscar', { p: p.id, r: state.perfil.regiaoPreferida })}">
                    Ver vagas
                  </a>
                  <a class="btn btn--fantasma btn--sm" href="${montarUrl('/comparar', { a: p.id })}">Comparar</a>
                </div>
              </div>`;
            }).join('')}
          </div>`
          : '<p class="campo__dica">Nenhuma profissão salva.</p>'}
      </div>

      <div data-painel-salvos="empresas" hidden>
        ${emps.length ? `
          <div class="res-grade res-grade--2">
            ${emps.map(e => `
              <div class="cartao cartao--pad linha" style="gap:var(--sp-3);align-items:flex-start">
                <span class="logo-emp" style="background:${e.cor}" aria-hidden="true">${escapeHtml(e.sigla)}</span>
                <div style="flex:1;min-width:0">
                  <a href="#/empresa/${e.id}" style="display:block;font-weight:600;color:var(--txt-forte)">
                    ${escapeHtml(e.nome)}
                  </a>
                  <p style="font-size:var(--fs-xs);color:var(--txt-fraco)">
                    ${escapeHtml(e.setor)} · ${plural(vagasDaEmpresaLocal(e.id), 'vaga aberta', 'vagas abertas')}
                  </p>
                </div>
                <button type="button" class="btn-icone btn-icone--sm" data-tirar="empresas|${e.id}"
                        aria-label="Deixar de seguir ${escapeHtml(e.nome)}">
                  ${icon.lixo({ size: 15 })}
                </button>
              </div>`).join('')}
          </div>`
          : '<p class="campo__dica">Nenhuma empresa seguida.</p>'}
      </div>`}`;
  }

  const vagasDaEmpresaLocal = (id) =>
    state.oportunidades.filter(o => o.ativa && o.empresaId === id).length;

  /* ============================================================
     HISTÓRICO
     ============================================================ */
  function htmlHistorico() {
    const h = state.historico;

    return `
    <div class="perfil-topo">
      <div class="res-barra" style="margin:0">
        <div>
          <h1>Histórico de buscas</h1>
          <p>${h.length ? plural(h.length, 'busca registrada', 'buscas registradas') : 'Nenhuma busca ainda'}</p>
        </div>
        ${h.length ? '<button type="button" class="btn btn--fantasma btn--sm" data-limpar-hist>Limpar tudo</button>' : ''}
      </div>
    </div>

    ${!h.length ? vazio({
      icone: 'relogio',
      titulo: 'Você ainda não buscou nada',
      texto: 'Suas buscas ficam aqui para você retomar de onde parou.',
      acao: '<a class="btn btn--primario" href="#/" style="margin-top:var(--sp-5)">Fazer uma busca</a>',
    }) : `
      <div class="pilha">
        ${h.map(b => `
          <div class="cartao cartao--pad linha" style="gap:var(--sp-4);align-items:center">
            <span class="prof-capa__ic" style="width:38px;height:38px;flex-shrink:0">
              ${icon.lupa({ size: 17 })}
            </span>
            <a href="${montarUrl('/buscar', { p: b.profissaoId, r: b.regiaoId })}" style="flex:1;min-width:0">
              <span style="display:block;font-weight:600;color:var(--txt-forte)">${escapeHtml(b.profissao)}</span>
              <span style="display:block;font-size:var(--fs-xs);color:var(--txt-fraco)">
                ${escapeHtml(b.regiao)} · ${plural(b.total, 'resultado')} · ${dataMedia(b.data)}
              </span>
            </a>
            <button type="button" class="btn-icone btn-icone--sm" data-tirar-hist="${b.id}"
                    aria-label="Remover esta busca do histórico">
              ${icon.fechar({ size: 15 })}
            </button>
          </div>`).join('')}
      </div>`}`;
  }

  /* ============================================================
     COMPARAÇÕES
     ============================================================ */
  function htmlComparacoes() {
    const c = state.comparacoes;

    return `
    <div class="perfil-topo">
      <h1>Comparações salvas</h1>
      <p>${c.length ? plural(c.length, 'comparação guardada', 'comparações guardadas') : 'Nenhuma comparação salva'}</p>
    </div>

    ${!c.length ? vazio({
      icone: 'comparar',
      titulo: 'Nenhuma comparação salva',
      texto: 'Coloque duas ou três carreiras lado a lado e salve para consultar depois.',
      acao: '<a class="btn btn--primario" href="#/comparar" style="margin-top:var(--sp-5)">Comparar profissões</a>',
    }) : `
      <div class="pilha">
        ${c.map(cmp => `
          <div class="cartao cartao--pad" style="display:grid;gap:var(--sp-4)">
            <div class="linha" style="justify-content:space-between;gap:var(--sp-3);align-items:flex-start">
              <div style="min-width:0">
                <p style="font-weight:600;color:var(--txt-forte)">${escapeHtml(cmp.nomes.join(' · '))}</p>
                <p style="font-size:var(--fs-xs);color:var(--txt-fraco);margin-top:2px">
                  Salva em ${dataMedia(cmp.data)}
                </p>
              </div>
              <button type="button" class="btn-icone btn-icone--sm" data-tirar-comp="${cmp.id}"
                      aria-label="Excluir comparação">${icon.lixo({ size: 15 })}</button>
            </div>
            <div class="linha" style="gap:var(--sp-2);flex-wrap:wrap">
              ${cmp.ids.map((id, i) => `
                <span class="etiqueta etiqueta--estatica">
                  <span style="width:8px;height:8px;border-radius:2px;background:${corDado(i)}"></span>
                  ${escapeHtml(acharProfissao(id)?.nome || id)}
                </span>`).join('')}
            </div>
            <a class="btn btn--contorno btn--sm" style="justify-self:start"
               href="${montarUrl('/comparar', { a: cmp.ids[0], b: cmp.ids[1], c: cmp.ids[2] || '' })}">
              Abrir comparação ${icon.chevronR({ size: 14 })}
            </a>
          </div>`).join('')}
      </div>`}`;
  }

  /* ============================================================
     ALERTAS
     ============================================================ */
  function htmlAlertas() {
    const a = state.alertas;

    return `
    <div class="perfil-topo">
      <div class="res-barra" style="margin:0">
        <div>
          <h1>Alertas de vaga</h1>
          <p>Avisamos quando aparecer algo com a sua cara</p>
        </div>
        <button type="button" class="btn btn--primario btn--sm" data-novo-alerta>
          ${icon.mais({ size: 15 })} Novo alerta
        </button>
      </div>
    </div>

    ${!a.length ? vazio({
      icone: 'sino',
      titulo: 'Nenhum alerta criado',
      texto: 'Diga que profissão e onde, e nós avisamos quando surgir uma vaga nova.',
      acao: '<button type="button" class="btn btn--primario" data-novo-alerta style="margin-top:var(--sp-5)">Criar meu primeiro alerta</button>',
    }) : `
      <div class="pilha">
        ${a.map(al => {
          const prof = acharProfissao(al.profissaoId);
          const reg = acharRegiao(al.regiaoId);
          const correspondentes = vagasDoAlerta(al);
          const novas = correspondentes.filter(v => v.diasPublicada <= 7).length;

          return `
          <div class="alerta-card ${novas && al.ativo ? 'com-novas' : ''}">
            <div class="alerta-card__topo">
              <div style="min-width:0">
                <p class="alerta-card__t">
                  ${escapeHtml(prof?.nome || 'Profissão removida')}
                  ${novas && al.ativo ? `<span class="selo selo--marca">${novas} ${novas === 1 ? 'nova' : 'novas'}</span>` : ''}
                </p>
                <p class="alerta-card__s">
                  ${escapeHtml(al.regiaoId === 'qualquer' ? 'Todo o país' : reg?.nome || '')}
                  · ${plural(correspondentes.length, 'vaga corresponde', 'vagas correspondem')}
                </p>
              </div>
              <label class="switch">
                <span class="so-leitor">Alerta ativo</span>
                <input type="checkbox" data-alerta-ativo="${al.id}" ${al.ativo ? 'checked' : ''}>
              </label>
            </div>

            <div class="alerta-card__cond">
              ${al.salarioMin ? `<span class="selo selo--neutro">${icon.moeda({ size: 11 })} A partir de ${dinheiro(al.salarioMin)}</span>` : ''}
              ${al.modelo !== 'qualquer' ? `<span class="selo selo--neutro">${icon.raio({ size: 11 })} ${nomeModelo(al.modelo)}</span>` : ''}
              ${al.nivel !== 'qualquer' ? `<span class="selo selo--neutro">${icon.escada({ size: 11 })} ${nomeNivel(al.nivel)}</span>` : ''}
              <span class="selo selo--neutro">
                ${icon.sino({ size: 11 })} ${FREQUENCIAS.find(f => f.id === al.frequencia)?.nome || al.frequencia}
              </span>
              <span class="selo selo--contorno">${icon.calendario({ size: 11 })} desde ${dataMedia(al.criadoEm)}</span>
            </div>

            ${correspondentes.length ? `
              <details>
                <summary style="cursor:pointer;font-size:var(--fs-sm);color:var(--txt-marca);font-weight:600">
                  Ver as vagas deste alerta
                </summary>
                <div class="pilha" style="margin-top:var(--sp-4)">
                  ${correspondentes.slice(0, 5).map(v => vagaLinha(v)).join('')}
                </div>
              </details>` : ''}

            <div class="alerta-card__acoes">
              <a class="btn btn--contorno btn--sm"
                 href="${montarUrl('/buscar', { p: al.profissaoId, r: al.regiaoId, sal: al.salarioMin || '' })}">
                Ver resultados
              </a>
              <button type="button" class="btn btn--fantasma btn--sm" data-editar-alerta="${al.id}">
                ${icon.editar({ size: 14 })} Editar
              </button>
              <button type="button" class="btn btn--fantasma btn--sm" data-excluir-alerta="${al.id}"
                      style="color:var(--erro)">
                ${icon.lixo({ size: 14 })} Excluir
              </button>
            </div>
          </div>`;
        }).join('')}
      </div>`}`;
  }

  /* ============================================================
     PREFERÊNCIAS
     ============================================================ */
  function htmlPreferencias() {
    const p = state.perfil;
    const c = state.config;

    return `
    <div class="perfil-topo">
      <h1>Preferências</h1>
      <p>Quanto mais preciso aqui, melhores as recomendações</p>
    </div>

    <form data-form-perfil style="display:grid;gap:var(--sp-8)">
      <section class="painel">
        <div class="painel__topo">
          <div>
            <p class="painel__titulo">Seus dados</p>
            <p class="painel__sub">Usados só neste navegador</p>
          </div>
        </div>
        <div class="painel__corpo" style="display:grid;gap:var(--sp-5)">
          <div class="skills-grade">
            <label class="campo">
              <span class="campo__rotulo">Nome</span>
              <input class="input" name="nome" value="${escapeHtml(p.nome)}" required>
            </label>
            <label class="campo">
              <span class="campo__rotulo">E-mail</span>
              <input class="input" type="email" name="email" value="${escapeHtml(p.email)}" required>
            </label>
          </div>
          <div class="skills-grade">
            <label class="campo">
              <span class="campo__rotulo">Momento de carreira</span>
              <input class="input" name="cargo" value="${escapeHtml(p.cargo)}"
                     placeholder="Ex.: estudante, em transição, buscando recolocação">
            </label>
            <label class="campo">
              <span class="campo__rotulo">Cidade onde mora</span>
              <input class="input" name="cidade" value="${escapeHtml(p.cidade)}">
            </label>
          </div>
        </div>
      </section>

      <section class="painel">
        <div class="painel__topo">
          <div>
            <p class="painel__titulo">O que você procura</p>
            <p class="painel__sub">Alimenta as recomendações do painel</p>
          </div>
        </div>
        <div class="painel__corpo" style="display:grid;gap:var(--sp-6)">
          <div class="skills-grade">
            <label class="campo">
              <span class="campo__rotulo">Região preferida</span>
              <select class="select" name="regiaoPreferida">
                <option value="qualquer" ${p.regiaoPreferida === 'qualquer' ? 'selected' : ''}>Tanto faz</option>
                ${todasRegioes().map(r => `
                  <option value="${r.id}" ${r.id === p.regiaoPreferida ? 'selected' : ''}>${escapeHtml(r.nome)}</option>`).join('')}
              </select>
            </label>
            <label class="campo">
              <span class="campo__rotulo">Seu nível hoje</span>
              <select class="select" name="nivel">
                ${NIVEIS_LISTA.map(n => `
                  <option value="${n.id}" ${n.id === p.nivel ? 'selected' : ''}>${n.nome}</option>`).join('')}
              </select>
            </label>
          </div>

          <div class="campo">
            <span class="campo__rotulo">Salário desejado (mínimo)</span>
            <div class="filtro-faixa">
              <div class="filtro-faixa__v">
                <span data-rot-desejado>${p.salarioDesejado ? dinheiro(p.salarioDesejado) : 'Indiferente'}</span>
                <span style="color:var(--txt-fraco);font-weight:400">R$ 25.000</span>
              </div>
              <input type="range" name="salarioDesejado" min="0" max="25000" step="500"
                     value="${p.salarioDesejado}" data-slider-desejado>
            </div>
          </div>

          <fieldset style="border:none;padding:0">
            <legend class="campo__rotulo" style="margin-bottom:var(--sp-3)">Modelos que aceita</legend>
            <div class="linha" style="gap:var(--sp-4);flex-wrap:wrap">
              ${MODELOS.map(m => `
                <label class="check">
                  <input type="checkbox" name="modelos" value="${m.id}"
                         ${(p.modelos || []).includes(m.id) ? 'checked' : ''}>
                  <span>${m.nome}</span>
                </label>`).join('')}
            </div>
          </fieldset>

          <fieldset style="border:none;padding:0">
            <legend class="campo__rotulo" style="margin-bottom:var(--sp-3)">Áreas de interesse</legend>
            <div class="res-chips" style="margin:0">
              ${AREAS.map(a => `
                <label class="etiqueta ${(p.areasInteresse || []).includes(a.id) ? 'is-on' : ''}" data-chip-area>
                  <input type="checkbox" name="areasInteresse" value="${a.id}" class="so-leitor"
                         ${(p.areasInteresse || []).includes(a.id) ? 'checked' : ''}>
                  <span style="color:${a.cor}">${icon[a.icone]({ size: 13 })}</span>
                  ${escapeHtml(a.nome)}
                </label>`).join('')}
            </div>
          </fieldset>
        </div>
      </section>

      <section class="painel">
        <div class="painel__topo">
          <div>
            <p class="painel__titulo">Avisos</p>
          </div>
        </div>
        <div class="painel__corpo" style="display:grid;gap:var(--sp-5)">
          <label class="switch">
            <input type="checkbox" name="emailAlertas" ${c.emailAlertas ? 'checked' : ''}>
            <span>Receber alertas de vaga por e-mail</span>
          </label>
          <label class="switch">
            <input type="checkbox" name="resumoSemanal" ${c.resumoSemanal ? 'checked' : ''}>
            <span>Resumo semanal do mercado da minha área</span>
          </label>
          <label class="switch">
            <input type="checkbox" name="dicasCarreira" ${c.dicasCarreira ? 'checked' : ''}>
            <span>Dicas de carreira e preparação para entrevista</span>
          </label>

          <p class="campo__dica">
            Nada é enviado de verdade: esta é uma demonstração e os dados
            ficam apenas no seu navegador.
          </p>
        </div>
      </section>

      <div class="linha" style="gap:var(--sp-3);flex-wrap:wrap">
        <button type="submit" class="btn btn--primario">${icon.ok({ size: 16 })} Salvar preferências</button>
        <button type="button" class="btn btn--fantasma" data-sair style="color:var(--erro)">
          Apagar meus dados e recomeçar
        </button>
      </div>
    </form>`;
  }

  /* ============================================================
     RENDERIZAÇÃO
     ============================================================ */
  const RENDER = {
    painel: htmlPainel,
    salvos: htmlSalvos,
    historico: htmlHistorico,
    comparacoes: htmlComparacoes,
    alertas: htmlAlertas,
    preferencias: htmlPreferencias,
  };

  function desenhar() {
    desligarGraficos?.();
    desligarFav?.();

    const alvo = qs('[data-conteudo]', raiz);
    alvo.innerHTML = (RENDER[secao] || htmlPainel)();

    qsa('[data-nav]', raiz).forEach(a => {
      a.classList.toggle('ativo', a.dataset.nav === secao);
    });

    const naoVistos = state.alertas.filter(a => a.ativo && a.novas > 0 && !a.vistos).length;
    const selo = qs('[data-selo-alertas]', raiz);
    if (selo) {
      selo.textContent = naoVistos || '';
      selo.hidden = !naoVistos;
    }

    desligarGraficos = ativarGraficos(alvo);
    desligarFav = ligarSalvarVaga(alvo, (id, btn) => {
      alternarSalvo('vagas', id);
      // Na aba de salvos, tirar da lista significa sumir dali
      if (secao === 'salvos') desenhar();
      else {
        const virou = (state.salvos.vagas || []).includes(id);
        btn.classList.toggle('is-on', virou);
        btn.setAttribute('aria-pressed', String(virou));
        btn.innerHTML = icon.marcador({ size: 16, fill: virou ? 'currentColor' : 'none' });
      }
      toast((state.salvos.vagas || []).includes(id) ? 'Vaga salva' : 'Vaga removida', { tipo: 'info' });
    });

    observarAnimacoes(alvo);
    document.title = `${SECOES.find(s => s.id === secao)?.nome || 'Perfil'} | NORTE`;

    if (secao === 'alertas') marcarAlertasVistos();
  }

  /* ============================================================
     FORMULÁRIO DE ALERTA
     ============================================================ */
  function formAlerta(alerta = null) {
    const m = modal({
      titulo: alerta ? 'Editar alerta' : 'Novo alerta de vaga',
      sub: 'Avisamos quando surgir uma vaga que bate com estas condições',
      tamanho: 'lg',
      conteudo: `
        <form data-form-alerta style="display:grid;gap:var(--sp-5)">
          <label class="campo">
            <span class="campo__rotulo">Profissão</span>
            <select class="select" name="profissaoId" required>
              ${profissoesVisiveis()
                .slice()
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                .map(p => `
                  <option value="${p.id}" ${alerta?.profissaoId === p.id ? 'selected' : ''}>${escapeHtml(p.nome)}</option>`).join('')}
            </select>
          </label>

          <label class="campo">
            <span class="campo__rotulo">Onde</span>
            <select class="select" name="regiaoId">
              <option value="qualquer" ${alerta?.regiaoId === 'qualquer' ? 'selected' : ''}>Todo o país</option>
              ${todasRegioes().map(r => `
                <option value="${r.id}" ${alerta?.regiaoId === r.id ? 'selected' : ''}>${escapeHtml(r.nome)}</option>`).join('')}
            </select>
          </label>

          <div class="skills-grade">
            <label class="campo">
              <span class="campo__rotulo">Nível</span>
              <select class="select" name="nivel">
                <option value="qualquer">Qualquer nível</option>
                ${NIVEIS_LISTA.map(n => `
                  <option value="${n.id}" ${alerta?.nivel === n.id ? 'selected' : ''}>${n.nome}</option>`).join('')}
              </select>
            </label>
            <label class="campo">
              <span class="campo__rotulo">Modelo</span>
              <select class="select" name="modelo">
                <option value="qualquer">Qualquer modelo</option>
                ${MODELOS.map(mo => `
                  <option value="${mo.id}" ${alerta?.modelo === mo.id ? 'selected' : ''}>${mo.nome}</option>`).join('')}
              </select>
            </label>
          </div>

          <div class="campo">
            <span class="campo__rotulo">Salário mínimo</span>
            <div class="filtro-faixa">
              <div class="filtro-faixa__v">
                <span data-rot-alerta>${alerta?.salarioMin ? dinheiro(alerta.salarioMin) : 'Qualquer valor'}</span>
                <span style="color:var(--txt-fraco);font-weight:400">R$ 25.000</span>
              </div>
              <input type="range" name="salarioMin" min="0" max="25000" step="500"
                     value="${alerta?.salarioMin || 0}" data-slider-alerta>
            </div>
          </div>

          <label class="campo">
            <span class="campo__rotulo">Com que frequência avisar</span>
            <select class="select" name="frequencia">
              ${FREQUENCIAS.map(f => `
                <option value="${f.id}" ${alerta?.frequencia === f.id ? 'selected' : ''}>${f.nome}</option>`).join('')}
            </select>
          </label>

          <p class="campo__dica" data-previa-alerta></p>
        </form>`,
      rodape: `
        <button type="button" class="btn btn--contorno" data-fechar>Cancelar</button>
        <button type="button" class="btn btn--primario" data-salvar-alerta>
          ${alerta ? 'Salvar alterações' : 'Criar alerta'}
        </button>`,
    });

    const form = qs('[data-form-alerta]', m.node);
    const slider = qs('[data-slider-alerta]', m.node);
    const rot = qs('[data-rot-alerta]', m.node);
    const previa = qs('[data-previa-alerta]', m.node);

    const atualizarPrevia = () => {
      const d = Object.fromEntries(new FormData(form));
      const quantas = vagasDoAlerta({
        profissaoId: d.profissaoId,
        regiaoId: d.regiaoId,
        salarioMin: Number(d.salarioMin) || 0,
        modelo: d.modelo,
        nivel: d.nivel,
      }).length;
      previa.innerHTML = quantas
        ? `Hoje <b style="color:var(--txt-marca)">${plural(quantas, 'vaga atende', 'vagas atendem')}</b> a estas condições.`
        : 'Nenhuma vaga atende a isso agora — avisaremos assim que a primeira aparecer.';
    };

    slider.addEventListener('input', () => {
      rot.textContent = Number(slider.value) ? dinheiro(Number(slider.value)) : 'Qualquer valor';
      atualizarPrevia();
    });
    form.addEventListener('change', atualizarPrevia);
    atualizarPrevia();

    qs('[data-salvar-alerta]', m.node).addEventListener('click', () => {
      const d = Object.fromEntries(new FormData(form));
      const dados = {
        profissaoId: d.profissaoId,
        regiaoId: d.regiaoId,
        salarioMin: Number(d.salarioMin) || 0,
        modelo: d.modelo,
        nivel: d.nivel,
        frequencia: d.frequencia,
      };

      if (alerta) atualizarAlerta(alerta.id, dados);
      else criarAlerta(dados);

      m.fechar();
      desenhar();
      toast(alerta ? 'Alerta atualizado' : 'Alerta criado', { tipo: 'ok' });
    });
  }

  /* ============================================================
     EVENTOS
     ============================================================ */
  raiz.addEventListener('click', async (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      secao = nav.dataset.nav;
      // Deixa o hash mudar sozinho; so evitamos o redesenho duplo
      setTimeout(desenhar, 0);
      return;
    }

    const tab = e.target.closest('[data-tab-salvos]');
    if (tab) {
      const alvo = tab.dataset.tabSalvos;
      qsa('[data-tab-salvos]', raiz).forEach(t =>
        t.setAttribute('aria-selected', String(t.dataset.tabSalvos === alvo)));
      qsa('[data-painel-salvos]', raiz).forEach(p => {
        p.hidden = p.dataset.painelSalvos !== alvo;
      });
      return;
    }

    const tirar = e.target.closest('[data-tirar]');
    if (tirar) {
      const [tipo, id] = tirar.dataset.tirar.split('|');
      alternarSalvo(tipo, id);
      desenhar();
      toast('Removido dos salvos', { tipo: 'info' });
      return;
    }

    if (e.target.closest('[data-limpar-hist]')) {
      if (await confirmar({
        titulo: 'Limpar o histórico?',
        texto: 'Todas as buscas registradas serão apagadas. Isso não afeta suas vagas salvas.',
        confirmar: 'Limpar histórico',
        perigo: true,
      })) {
        limparHistorico();
        desenhar();
        toast('Histórico limpo', { tipo: 'ok' });
      }
      return;
    }

    const tirarHist = e.target.closest('[data-tirar-hist]');
    if (tirarHist) {
      removerDoHistorico(tirarHist.dataset.tirarHist);
      desenhar();
      return;
    }

    const tirarComp = e.target.closest('[data-tirar-comp]');
    if (tirarComp) {
      removerComparacao(tirarComp.dataset.tirarComp);
      desenhar();
      toast('Comparação excluída', { tipo: 'info' });
      return;
    }

    if (e.target.closest('[data-novo-alerta]')) { formAlerta(); return; }

    const editar = e.target.closest('[data-editar-alerta]');
    if (editar) {
      formAlerta(state.alertas.find(a => a.id === editar.dataset.editarAlerta));
      return;
    }

    const excluir = e.target.closest('[data-excluir-alerta]');
    if (excluir) {
      const id = excluir.dataset.excluirAlerta;
      const res = removerAlerta(id);
      if (!res.ok) return;
      desenhar();
      // Desfazer e mais honesto que perguntar antes numa acao pequena
      toast('Alerta excluído', {
        tipo: 'info',
        duracao: 6000,
        acao: {
          rotulo: 'Desfazer',
          fn: () => { restaurarAlerta(res.removido); desenhar(); },
        },
      });
      return;
    }

    const chip = e.target.closest('[data-chip-area]');
    if (chip && !e.target.matches('input')) {
      const input = qs('input', chip);
      input.checked = !input.checked;
      chip.classList.toggle('is-on', input.checked);
      return;
    }

    if (e.target.closest('[data-sair]')) {
      if (await confirmar({
        titulo: 'Reiniciar a demonstração?',
        texto: 'Suas vagas salvas, buscas, alertas, candidaturas e qualquer alteração feita no painel administrativo voltam ao estado original.',
        confirmar: 'Reiniciar tudo',
        perigo: true,
      })) {
        resetarTudo();
        toast('Demonstração reiniciada', { tipo: 'ok' });
        ir('/');
      }
    }
  });

  raiz.addEventListener('input', (e) => {
    if (e.target.matches('[data-slider-desejado]')) {
      const v = Number(e.target.value);
      qs('[data-rot-desejado]', raiz).textContent = v ? dinheiro(v) : 'Indiferente';
    }
  });

  raiz.addEventListener('change', (e) => {
    const sw = e.target.closest('[data-alerta-ativo]');
    if (sw) {
      atualizarAlerta(sw.dataset.alertaAtivo, { ativo: sw.checked });
      const cartao = sw.closest('.alerta-card');
      cartao?.classList.toggle('com-novas', sw.checked && cartao.querySelector('.selo--marca'));
      toast(sw.checked ? 'Alerta reativado' : 'Alerta pausado', { tipo: 'info', duracao: 2400 });
    }
  });

  raiz.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-form-perfil]')) return;
    e.preventDefault();

    const form = e.target;
    const d = new FormData(form);

    salvarPerfil({
      nome: d.get('nome').trim() || state.perfil.nome,
      email: d.get('email').trim(),
      cargo: d.get('cargo').trim(),
      cidade: d.get('cidade').trim(),
      regiaoPreferida: d.get('regiaoPreferida'),
      nivel: d.get('nivel'),
      salarioDesejado: Number(d.get('salarioDesejado')) || 0,
      modelos: d.getAll('modelos'),
      areasInteresse: d.getAll('areasInteresse'),
    });

    salvarConfig({
      emailAlertas: qs('[name="emailAlertas"]', form).checked,
      resumoSemanal: qs('[name="resumoSemanal"]', form).checked,
      dicasCarreira: qs('[name="dicasCarreira"]', form).checked,
    });

    qs('[data-nome-nav]', raiz).textContent = state.perfil.nome;
    qs('[data-email-nav]', raiz).textContent = state.perfil.email;
    qs('.avatar', raiz).textContent = iniciais(state.perfil.nome);

    toast('Preferências salvas', {
      tipo: 'ok',
      texto: 'As recomendações do painel já usam estes dados.',
      acao: { rotulo: 'Ver painel', fn: () => ir('/perfil/painel') },
    });
  });

  desenhar();

  return () => {
    desligarGraficos?.();
    desligarFav?.();
  };
}
