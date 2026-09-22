/* ============================================================
   NORTE — Comparar profissões
   Duas ou três carreiras lado a lado. Sem ranking absoluto:
   cada linha marca quem tem o maior número, mas "maior" nem
   sempre é "melhor" — o texto de apoio deixa isso claro.
   ============================================================ */

import { qs, qsa, observarAnimacoes } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import {
  escapeHtml, dinheiro, dinheiroCompacto, num, pct, plural, norm, duracaoMeses,
} from '../utils/format.js';
import {
  profissoesVisiveis, acharProfissao, todasRegioes, salarioNaRegiao,
  vagasAtivas, state, salvarComparacao,
} from '../services/store.js';
import { AREA_POR_ID } from '../data/profissoes.js';
import { graficoLinha, graficoRadar, ativarGraficos, corDado } from '../components/graficos.js';
import { modal, toast } from '../components/ui.js';
import { montarUrl } from '../router.js';

const MAX = 3;

const EIXOS = [
  { nome: 'Salário', valor: (p) => Math.min(100, (p.salario.media / 22000) * 100) },
  { nome: 'Demanda', valor: (p) => p.demanda },
  { nome: 'Crescimento', valor: (p) => Math.min(100, (p.crescimento / 18) * 100) },
  { nome: 'Remoto', valor: (p) => p.remotoPct },
  { nome: 'Facilidade', valor: (p) => (6 - p.dificuldade) * 20 },
];

export function paginaComparar(raiz, params, query) {
  let ids = [query.a, query.b, query.c].filter(Boolean).filter(id => acharProfissao(id));
  let regiaoId = query.r || state.perfil.regiaoPreferida || 'qualquer';
  let desligarGraficos = null;

  const vagasDe = (profId) => vagasAtivas().filter(v =>
    v.profissaoId === profId &&
    (regiaoId === 'qualquer' || v.regiaoId === regiaoId || v.regiaoId === 'remoto')
  ).length;

  function sincronizarUrl() {
    history.replaceState(null, '', montarUrl('/comparar', {
      a: ids[0] || '', b: ids[1] || '', c: ids[2] || '',
      r: regiaoId !== 'qualquer' ? regiaoId : '',
    }));
  }

  function desenhar() {
    sincronizarUrl();
    const profs = ids.map(acharProfissao).filter(Boolean);

    raiz.innerHTML = `
      <div class="shell" style="padding-block:var(--sp-10) var(--sp-20)">
        <p class="sobrancelha">Comparação lado a lado</p>
        <h1 style="font-size:var(--fs-3xl);letter-spacing:-0.035em;max-width:20ch">
          Duas carreiras, os mesmos critérios
        </h1>
        <p class="lead" style="margin-top:var(--sp-4);max-width:62ch">
          Escolha até ${MAX} profissões e veja salário, demanda, formação e mercado
          na mesma régua. Não existe "melhor no geral": existe o que combina com você.
        </p>

        <div class="linha" style="gap:var(--sp-3);flex-wrap:wrap;margin-top:var(--sp-6)">
          <label class="linha" style="gap:var(--sp-2)">
            <span style="font-size:var(--fs-sm);color:var(--txt-suave)">Valores de</span>
            <select class="select" data-regiao style="min-width:190px">
              <option value="qualquer" ${regiaoId === 'qualquer' ? 'selected' : ''}>Todo o país</option>
              ${todasRegioes().map(r => `
                <option value="${r.id}" ${r.id === regiaoId ? 'selected' : ''}>${escapeHtml(r.nome)}</option>`).join('')}
            </select>
          </label>
          ${profs.length >= 2 ? `
            <button type="button" class="btn btn--contorno btn--sm" data-salvar-comp>
              ${icon.marcador({ size: 15 })} Salvar comparação
            </button>
            <button type="button" class="btn btn--fantasma btn--sm" data-limpar-comp>
              ${icon.atualizar({ size: 15 })} Recomeçar
            </button>` : ''}
        </div>

        <div class="comp-escolha" style="margin-top:var(--sp-7)">
          ${Array.from({ length: MAX }, (_, i) => htmlSlot(profs[i], i)).join('')}
        </div>

        ${profs.length >= 2 ? htmlComparacao(profs) : htmlAjuda()}
      </div>`;

    desligarGraficos?.();
    desligarGraficos = ativarGraficos(raiz);
    observarAnimacoes(raiz);
  }

  function htmlSlot(prof, i) {
    if (!prof) {
      return `
      <button type="button" class="comp-slot" data-escolher="${i}">
        <span class="vazio__icone" style="width:42px;height:42px">${icon.mais({ size: 20 })}</span>
        <span style="font-weight:600;color:var(--txt-forte)">
          ${i === 0 ? 'Escolher profissão' : i === 1 ? 'Comparar com...' : 'Adicionar uma terceira'}
        </span>
        <span style="font-size:var(--fs-xs);color:var(--txt-fraco)">
          ${i < 2 ? 'obrigatória' : 'opcional'}
        </span>
      </button>`;
    }

    const a = AREA_POR_ID[prof.area];
    return `
    <div class="comp-slot preenchido">
      <div class="linha" style="gap:var(--sp-3);align-items:flex-start">
        <span class="prof-capa__ic" style="color:${a?.cor || 'var(--acento)'};width:40px;height:40px;flex-shrink:0">
          ${icon[a?.icone || 'maleta']({ size: 19 })}
        </span>
        <div style="flex:1;min-width:0">
          <p style="font-family:var(--fonte-display);font-weight:600;color:var(--txt-forte)">
            ${escapeHtml(prof.nome)}
          </p>
          <p style="font-size:var(--fs-xs);color:var(--txt-fraco)">${escapeHtml(a?.nome || '')}</p>
        </div>
        <button type="button" class="btn-icone btn-icone--sm" data-remover="${i}"
                aria-label="Remover ${escapeHtml(prof.nome)} da comparação">
          ${icon.fechar({ size: 15 })}
        </button>
      </div>
      <div class="linha" style="gap:var(--sp-2);margin-top:var(--sp-3)">
        <span class="etiqueta etiqueta--estatica" style="background:${corDado(i)};color:#fff;border-color:transparent">
          Coluna ${String.fromCharCode(65 + i)}
        </span>
        <button type="button" class="btn btn--fantasma btn--sm" data-escolher="${i}">Trocar</button>
      </div>
    </div>`;
  }

  function htmlAjuda() {
    const sugestoes = profissoesVisiveis()
      .slice()
      .sort((a, b) => b.demanda - a.demanda)
      .slice(0, 6);

    return `
    <section style="margin-top:var(--sp-10)">
      <p class="filtro-bloco__t">Comparações que costumam ajudar</p>
      <div class="res-chips">
        ${[['front-end', 'back-end'], ['analista-dados', 'cientista-dados'], ['ux-designer', 'front-end']]
          .filter(([x, y]) => acharProfissao(x) && acharProfissao(y))
          .map(([x, y]) => `
            <a class="etiqueta" href="${montarUrl('/comparar', { a: x, b: y })}">
              ${escapeHtml(acharProfissao(x).nome)} ${icon.comparar({ size: 12 })} ${escapeHtml(acharProfissao(y).nome)}
            </a>`).join('')}
      </div>

      <p class="filtro-bloco__t" style="margin-top:var(--sp-8)">Ou comece por uma das mais procuradas</p>
      <div class="res-chips">
        ${sugestoes.map(p => `
          <button type="button" class="etiqueta" data-add="${p.id}">${escapeHtml(p.nome)}</button>`).join('')}
      </div>
    </section>`;
  }

  /* ---------------- Tabela ---------------- */
  function htmlComparacao(profs) {
    const sal = profs.map(p => salarioNaRegiao(p, regiaoId));

    // maior: true quando o maior numero e o resultado desejavel
    const linhas = [
      {
        rot: 'Salário ao começar', maior: true,
        v: profs.map((p, i) => sal[i].junior),
        fmt: dinheiro,
        nota: profs.map(() => 'até 2 anos de experiência'),
      },
      {
        rot: 'Salário sênior', maior: true,
        v: profs.map((p, i) => sal[i].senior),
        fmt: dinheiro,
        nota: profs.map(() => 'acima de 5 anos'),
      },
      {
        rot: 'Salto do júnior ao sênior', maior: true,
        v: profs.map((p, i) => Math.round((sal[i].senior / sal[i].junior) * 100 - 100)),
        fmt: (x) => `+${pct(x)}`,
        nota: profs.map((p, i) => `de ${dinheiroCompacto(sal[i].junior)} a ${dinheiroCompacto(sal[i].senior)}`),
      },
      {
        rot: 'Demanda do mercado', maior: true,
        v: profs.map(p => p.demanda),
        fmt: (x) => `${x}/100`,
        nota: profs.map(p => p.demanda >= 80 ? 'muito procurada' : p.demanda >= 60 ? 'procurada' : 'demanda moderada'),
      },
      {
        rot: 'Vagas abertas agora', maior: true,
        v: profs.map(p => vagasDe(p.id)),
        fmt: num,
        nota: profs.map(() => regiaoId === 'qualquer' ? 'em todo o país' : 'na região escolhida'),
      },
      {
        rot: 'Crescimento anual', maior: true,
        v: profs.map(p => p.crescimento),
        fmt: (x) => `${x > 0 ? '+' : ''}${pct(x)}`,
        nota: profs.map(() => 'projeção de novas vagas'),
      },
      {
        rot: 'Vagas remotas', maior: true,
        v: profs.map(p => p.remotoPct),
        fmt: (x) => pct(x),
        nota: profs.map(p => `${pct(p.modelos.hibrido)} híbrido, ${pct(p.modelos.presencial)} presencial`),
      },
      {
        rot: 'Tempo de preparo', maior: false,
        v: profs.map(p => p.formacao.tempoMeses),
        fmt: (x) => duracaoMeses(x) || '—',
        nota: profs.map(p => p.formacao.rotulo),
      },
      {
        rot: 'Dificuldade de entrada', maior: false,
        v: profs.map(p => p.dificuldade),
        fmt: (x) => `${x}/5`,
        nota: profs.map(p => ['muito acessível', 'acessível', 'exige preparo', 'exigente', 'muito exigente'][p.dificuldade - 1]),
      },
    ];

    const evolucao = profs.map((p, i) => ({
      nome: p.nome,
      cor: corDado(i),
      pontos: p.evolucao.map(e => ({
        rotulo: e.rotulo,
        valor: Math.round(e.valor * (todasRegioes().find(r => r.id === regiaoId)?.indice || 1)),
      })),
    }));

    return `
    <section style="margin-top:var(--sp-10)">
      <div class="comp-tabela-rol">
        <table class="comp-tabela">
          <caption class="so-leitor">Comparação entre ${profs.map(p => p.nome).join(', ')}</caption>
          <thead>
            <tr>
              <th scope="col"><span class="so-leitor">Critério</span></th>
              ${profs.map((p, i) => `
                <th scope="col">
                  <span class="linha" style="gap:var(--sp-2)">
                    <span style="width:10px;height:10px;border-radius:3px;background:${corDado(i)};flex-shrink:0"></span>
                    <a href="#/profissao/${p.id}" style="font-weight:600;color:var(--txt-forte)">
                      ${escapeHtml(p.nome)}
                    </a>
                  </span>
                </th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${linhas.map(l => {
              const melhor = l.maior ? Math.max(...l.v) : Math.min(...l.v);
              const unico = l.v.filter(x => x === melhor).length === 1;
              return `
              <tr>
                <th scope="row">${escapeHtml(l.rot)}</th>
                ${l.v.map((x, i) => `
                  <td>
                    <p class="comp-valor ${unico && x === melhor ? 'melhor' : ''}">
                      ${escapeHtml(l.fmt(x))}
                      ${unico && x === melhor ? `<span class="so-leitor">(maior valor)</span>` : ''}
                    </p>
                    <p class="comp-nota">${escapeHtml(l.nota[i])}</p>
                  </td>`).join('')}
              </tr>`;
            }).join('')}

            <tr>
              <th scope="row">Formação exigida</th>
              ${profs.map(p => `
                <td>
                  <p style="font-size:var(--fs-sm);color:var(--txt-base)">${escapeHtml(p.formacao.rotulo)}</p>
                  <p class="comp-nota">${escapeHtml(p.formacao.detalhe)}</p>
                </td>`).join('')}
            </tr>

            <tr>
              <th scope="row">Habilidades principais</th>
              ${profs.map(p => `
                <td>
                  <span class="skill-lista">
                    ${p.hardSkills.slice(0, 4).map(s => `<span class="skill">${escapeHtml(s)}</span>`).join('')}
                  </span>
                </td>`).join('')}
            </tr>

            <tr>
              <th scope="row">Onde se trabalha</th>
              ${profs.map(p => `
                <td><p style="font-size:var(--fs-sm);color:var(--txt-suave)">
                  ${escapeHtml(p.ondeTrabalha.slice(0, 3).join(' · '))}
                </p></td>`).join('')}
            </tr>

            <tr>
              <th scope="row"><span class="so-leitor">Ações</span></th>
              ${profs.map(p => `
                <td>
                  <span style="display:grid;gap:var(--sp-2)">
                    <a class="btn btn--primario btn--sm" href="${montarUrl('/buscar', { p: p.id, r: regiaoId })}">
                      Ver vagas
                    </a>
                    <a class="btn btn--contorno btn--sm" href="#/profissao/${p.id}">Guia completo</a>
                  </span>
                </td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>

      <p class="campo__dica" style="margin-top:var(--sp-4)">
        O valor destacado em verde é apenas o maior número da linha. Em tempo de preparo
        e dificuldade, menor é o destacado — e mesmo assim nada disso decide sozinho:
        quem gosta do que faz costuma ir mais longe.
      </p>

      <div class="skills-grade" style="margin-top:var(--sp-10);align-items:start">
        <div class="cartao cartao--pad">
          ${graficoLinha(evolucao, {
            titulo: 'Evolução salarial comparada',
            sub: regiaoId === 'qualquer' ? 'média nacional' : `valores de ${todasRegioes().find(r => r.id === regiaoId)?.cidade || ''}`,
            fmt: dinheiroCompacto,
            rotuloX: 'Tempo de carreira',
            area: false,
          })}
        </div>
        <div class="cartao cartao--pad">
          ${graficoRadar(
            EIXOS.map(e => e.nome),
            profs.map((p, i) => ({
              nome: p.nome,
              cor: corDado(i),
              valores: EIXOS.map(e => e.valor(p)),
            })),
            {
              titulo: 'Perfil de cada carreira',
              sub: 'cada eixo vai de 0 a 100, normalizado entre as profissões da plataforma',
            }
          )}
        </div>
      </div>
    </section>`;
  }

  /* ---------------- Seletor ---------------- */
  function abrirSeletor(slot) {
    const m = modal({
      titulo: 'Escolher profissão',
      sub: 'Digite para filtrar entre as profissões do catálogo',
      tamanho: 'lg',
      conteudo: `
        <label class="campo-icone" style="display:block;margin-bottom:var(--sp-4)">
          <span class="so-leitor">Buscar profissão</span>
          ${icon.lupa({ size: 17 })}
          <input type="search" class="input" data-filtro-prof placeholder="Ex.: enfermeiro, dados, design"
                 autocomplete="off" data-foco-inicial>
        </label>
        <div data-opcoes style="display:grid;gap:2px;max-height:52vh;overflow-y:auto"></div>`,
    });

    const caixa = qs('[data-opcoes]', m.node);
    const campo = qs('[data-filtro-prof]', m.node);

    const pintar = (termo = '') => {
      const t = norm(termo);
      const lista = profissoesVisiveis()
        .filter(p => !ids.includes(p.id) || ids[slot] === p.id)
        .filter(p => !t || norm(p.nome).includes(t) ||
          norm(AREA_POR_ID[p.area]?.nome || '').includes(t) ||
          p.hardSkills.some(s => norm(s).includes(t)))
        .sort((a, b) => b.demanda - a.demanda);

      if (!lista.length) {
        caixa.innerHTML = '<p class="campo__dica" style="padding:var(--sp-5);text-align:center">Nenhuma profissão encontrada.</p>';
        return;
      }

      caixa.innerHTML = lista.map(p => {
        const a = AREA_POR_ID[p.area];
        return `
        <button type="button" class="filtro-item" data-pick="${p.id}" style="min-height:52px;text-align:left">
          <span class="linha" style="gap:var(--sp-3);min-width:0">
            <span style="color:${a?.cor || 'var(--acento)'};flex-shrink:0">
              ${icon[a?.icone || 'maleta']({ size: 17 })}
            </span>
            <span style="min-width:0">
              <span style="display:block;font-weight:500;color:var(--txt-forte)">${escapeHtml(p.nome)}</span>
              <span style="display:block;font-size:var(--fs-xs);color:var(--txt-fraco)">
                ${escapeHtml(a?.nome || '')} · ${dinheiroCompacto(p.salario.media)}
              </span>
            </span>
          </span>
          <span class="filtro-item__n">${num(vagasDe(p.id))} vagas</span>
        </button>`;
      }).join('');
    };

    pintar();
    campo.addEventListener('input', () => pintar(campo.value));

    caixa.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pick]');
      if (!btn) return;
      ids[slot] = btn.dataset.pick;
      ids = ids.filter(Boolean);
      m.fechar();
      desenhar();
    });
  }

  /* ---------------- Eventos ---------------- */
  raiz.addEventListener('click', (e) => {
    const escolher = e.target.closest('[data-escolher]');
    if (escolher) { abrirSeletor(Number(escolher.dataset.escolher)); return; }

    const add = e.target.closest('[data-add]');
    if (add) {
      if (ids.length >= MAX) {
        toast(`Máximo de ${MAX} profissões`, { tipo: 'aviso', texto: 'Remova uma para adicionar outra.' });
        return;
      }
      ids.push(add.dataset.add);
      desenhar();
      return;
    }

    const remover = e.target.closest('[data-remover]');
    if (remover) {
      ids.splice(Number(remover.dataset.remover), 1);
      desenhar();
      return;
    }

    if (e.target.closest('[data-limpar-comp]')) {
      ids = [];
      desenhar();
      return;
    }

    if (e.target.closest('[data-salvar-comp]')) {
      const res = salvarComparacao(ids);
      toast(res.ok ? 'Comparação salva' : 'Não foi possível salvar', {
        tipo: res.ok ? 'ok' : 'aviso',
        texto: res.ok ? 'Você a encontra no seu perfil.' : res.motivo,
        acao: res.ok ? { rotulo: 'Ver', fn: () => { location.hash = '#/perfil/comparacoes'; } } : null,
      });
    }
  });

  raiz.addEventListener('change', (e) => {
    if (e.target.matches('[data-regiao]')) {
      regiaoId = e.target.value;
      desenhar();
    }
  });

  desenhar();
  document.title = 'Comparar profissões | NORTE';
  return () => desligarGraficos?.();
}
