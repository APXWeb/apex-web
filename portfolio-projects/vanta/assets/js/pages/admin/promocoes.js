/* ============================================================
   VANTA Admin — Promoções e cupons
   ============================================================ */

import { qs, qsa, delegate } from '../../utils/dom.js';
import { icon } from '../../components/icons.js';
import { money, num, escapeHtml, dataCurta, dataLonga, hoje, somaDias, pct } from '../../utils/format.js';
import {
  state, salvarPromocao, excluirPromocao, alternarPromocao, salvarCupom, subscribe,
} from '../../services/store.js';
import { toast, modal, confirmar, vazio } from '../../components/ui.js';

const TOM_STATUS = { ativa: 'success', programada: 'info', encerrada: 'neutral' };

export function secaoPromocoes(corpo, acoes) {
  acoes.innerHTML = `
    <button type="button" class="btn btn--secondary btn--sm" data-novo-cupom>
      ${icon.etiqueta({ size: 15 })} Novo cupom
    </button>
    <button type="button" class="btn btn--primary btn--sm" data-nova-promo>
      ${icon.mais({ size: 16 })} Nova promoção
    </button>`;

  function pintar() {
    const ativas = state.promocoes.filter(p => p.status === 'ativa');
    const programadas = state.promocoes.filter(p => p.status === 'programada');
    const encerradas = state.promocoes.filter(p => p.status === 'encerrada');
    const usosTotal = state.promocoes.reduce((s, p) => s + p.usos, 0);

    corpo.innerHTML = `
      <div class="stat-grid">
        <article class="stat">
          <div class="stat__head"><span class="stat__l">Campanhas ativas</span>
            <span class="stat__ico">${icon.fogo({ size: 16 })}</span></div>
          <p class="stat__v" style="color:var(--accent)">${num(ativas.length)}</p>
        </article>
        <article class="stat">
          <div class="stat__head"><span class="stat__l">Programadas</span>
            <span class="stat__ico">${icon.relogio({ size: 16 })}</span></div>
          <p class="stat__v">${num(programadas.length)}</p>
        </article>
        <article class="stat">
          <div class="stat__head"><span class="stat__l">Usos acumulados</span>
            <span class="stat__ico">${icon.etiqueta({ size: 16 })}</span></div>
          <p class="stat__v">${num(usosTotal)}</p>
        </article>
        <article class="stat">
          <div class="stat__head"><span class="stat__l">Cupons cadastrados</span>
            <span class="stat__ico">${icon.medalha({ size: 16 })}</span></div>
          <p class="stat__v">${num(state.cupons.length)}</p>
        </article>
      </div>

      ${bloco('Ativas agora', ativas, 'Campanhas valendo neste momento na loja.')}
      ${bloco('Programadas', programadas, 'Vão começar automaticamente na data de início.')}
      ${bloco('Encerradas', encerradas, 'Histórico de campanhas já finalizadas.')}

      <section class="panel">
        <header class="panel__head">
          <div>
            <h2 class="panel__title">Cupons de desconto</h2>
            <p class="dim" style="font-size:var(--fs-xs)">Códigos que o cliente digita no carrinho</p>
          </div>
          <button type="button" class="btn btn--secondary btn--sm" data-novo-cupom>
            ${icon.mais({ size: 15 })} Novo cupom
          </button>
        </header>
        <div class="panel__body panel__body--flush tabela-cards">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Código</th><th>Benefício</th><th class="num">Compra mínima</th>
                  <th>Status</th><th style="text-align:right">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${state.cupons.map(c => `
                  <tr>
                    <td class="cel-destaque" data-rotulo="Código">
                      <span class="tabular cell-strong" style="font-family:var(--font-mono);letter-spacing:.04em">
                        ${escapeHtml(c.codigo)}
                      </span>
                    </td>
                    <td data-rotulo="Benefício">${escapeHtml(c.desc)}</td>
                    <td class="num" data-rotulo="Compra mínima">${c.minimo ? money(c.minimo) : '—'}</td>
                    <td data-rotulo="Status">
                      <span class="badge badge--${c.ativo ? 'success' : 'neutral'}">
                        <span class="badge__dot"></span> ${c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td data-rotulo="Ações">
                      <div class="acoes-cel">
                        <button type="button" class="btn-icon btn-icon--sm" data-toggle-cupom="${escapeHtml(c.codigo)}"
                                aria-label="${c.ativo ? 'Desativar' : 'Ativar'} cupom ${escapeHtml(c.codigo)}">
                          ${c.ativo ? icon.olhoOff({ size: 16 }) : icon.olho({ size: 16 })}
                        </button>
                      </div>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>`;
  }

  function bloco(titulo, lista, sub) {
    return `
      <section class="panel">
        <header class="panel__head">
          <div>
            <h2 class="panel__title">${titulo}</h2>
            <p class="dim" style="font-size:var(--fs-xs)">${sub}</p>
          </div>
          <span class="badge badge--neutral">${num(lista.length)}</span>
        </header>
        <div class="panel__body">
          ${lista.length ? `
            <div class="grid-auto" style="grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))">
              ${lista.map(cartaoPromo).join('')}
            </div>` : `
            <p class="muted" style="padding:20px;text-align:center;font-size:var(--fs-base)">
              Nenhuma campanha nesta situação.
            </p>`}
        </div>
      </section>`;
  }

  function cartaoPromo(p) {
    const cat = p.categoria === 'todas'
      ? 'Todo o catálogo'
      : state.categorias.find(c => c.id === p.categoria)?.nome || p.categoria;
    const beneficio = p.tipo === 'percentual' ? `${p.valor}% de desconto`
      : p.tipo === 'fixo' ? `${money(p.valor)} de desconto`
      : 'Frete grátis';
    const vigente = p.inicio <= hoje() && p.fim >= hoje();

    return `
      <article class="card card--pad" data-anim>
        <div class="row row--between" style="margin-bottom:12px">
          <span class="badge badge--${TOM_STATUS[p.status]}">
            <span class="badge__dot"></span> ${p.status.charAt(0).toUpperCase() + p.status.slice(1)}
          </span>
          <div class="acoes-cel">
            <button type="button" class="btn-icon btn-icon--sm" data-editar-promo="${p.id}" aria-label="Editar ${escapeHtml(p.nome)}">
              ${icon.editar({ size: 15 })}
            </button>
            <button type="button" class="btn-icon btn-icon--sm" data-toggle-promo="${p.id}"
                    aria-label="${p.status === 'ativa' ? 'Encerrar' : 'Ativar'} ${escapeHtml(p.nome)}">
              ${p.status === 'ativa' ? icon.olhoOff({ size: 15 }) : icon.olho({ size: 15 })}
            </button>
            <button type="button" class="btn-icon btn-icon--sm" data-excluir-promo="${p.id}"
                    aria-label="Excluir ${escapeHtml(p.nome)}" style="color:var(--danger)">
              ${icon.lixeira({ size: 15 })}
            </button>
          </div>
        </div>

        <h3 style="font-size:var(--fs-lg);font-family:var(--font-display)">${escapeHtml(p.nome)}</h3>
        <p class="dim" style="font-size:var(--fs-sm);margin-top:6px">${escapeHtml(p.desc)}</p>

        <dl class="det-lista" style="margin-top:16px">
          <div class="det-linha"><dt>Benefício</dt><dd style="color:var(--accent);font-weight:600">${beneficio}</dd></div>
          <div class="det-linha"><dt>Alcance</dt><dd>${escapeHtml(cat)}</dd></div>
          <div class="det-linha"><dt>Período</dt><dd>${dataCurta(p.inicio)} a ${dataCurta(p.fim)}</dd></div>
          <div class="det-linha"><dt>Usos</dt><dd class="tabular">${num(p.usos)}</dd></div>
        </dl>

        ${p.status === 'ativa' && vigente ? `
          <p class="pcard__ship" style="margin-top:14px">
            ${icon.checkCirculo({ size: 13 })} Aplicando desconto na loja agora
          </p>` : ''}
      </article>`;
  }

  /* ---------- Eventos ---------- */
  delegate(acoes, 'click', '[data-nova-promo]', () => abrirPromo(null));
  delegate(corpo, 'click', '[data-editar-promo]', (e, b) => abrirPromo(b.dataset.editarPromo));

  delegate(corpo, 'click', '[data-toggle-promo]', (e, b) => {
    const r = alternarPromocao(b.dataset.togglePromo);
    if (r.ok) {
      toast({
        titulo: r.status === 'ativa' ? 'Promoção ativada' : 'Promoção encerrada',
        msg: r.status === 'ativa' ? 'Os descontos já valem na loja.' : 'Os preços voltaram ao normal.',
        tipo: r.status === 'ativa' ? 'success' : 'info',
      });
    }
  });

  delegate(corpo, 'click', '[data-excluir-promo]', async (e, b) => {
    const p = state.promocoes.find(x => x.id === b.dataset.excluirPromo);
    if (!p) return;
    const ok = await confirmar({
      titulo: 'Excluir promoção',
      msg: `A campanha "${p.nome}" será removida permanentemente.`,
      confirmarLabel: 'Excluir',
    });
    if (!ok) return;
    excluirPromocao(p.id);
    toast({ titulo: 'Promoção excluída', msg: p.nome, tipo: 'info' });
  });

  delegate(acoes, 'click', '[data-novo-cupom]', () => abrirCupom());
  delegate(corpo, 'click', '[data-novo-cupom]', () => abrirCupom());

  delegate(corpo, 'click', '[data-toggle-cupom]', (e, b) => {
    const c = state.cupons.find(x => x.codigo === b.dataset.toggleCupom);
    if (!c) return;
    salvarCupom({ ...c, ativo: !c.ativo });
    toast({
      titulo: !c.ativo ? 'Cupom ativado' : 'Cupom desativado',
      msg: c.codigo,
      tipo: !c.ativo ? 'success' : 'info',
      duracao: 2600,
    });
  });

  const desassinar = subscribe((ev) => {
    if (['promocoes', 'cupons', 'reset'].includes(ev)) pintar();
  });

  pintar();
  return () => desassinar();
}

/* ---------- Formulário de promoção ---------- */
function abrirPromo(id) {
  const p = id ? state.promocoes.find(x => x.id === id) : null;
  const v = (c, d = '') => escapeHtml(String(p?.[c] ?? d));

  const m = modal({
    titulo: p ? 'Editar promoção' : 'Nova promoção',
    tamanho: 'lg',
    id: 'promo',
    conteudo: `
      <form class="form-grid" data-form-promo novalidate>
        <div class="field span-2">
          <label class="field__label" for="pm-nome">Nome da campanha <span class="req">*</span></label>
          <input type="text" id="pm-nome" class="input" name="nome" value="${v('nome')}" placeholder="Semana da Cozinha">
          <p class="field__error" data-erro="nome" hidden></p>
        </div>

        <div class="field span-2">
          <label class="field__label" for="pm-desc">Descrição</label>
          <input type="text" id="pm-desc" class="input" name="desc" value="${v('desc')}"
                 placeholder="O que entra nesta campanha">
        </div>

        <div class="field">
          <label class="field__label" for="pm-tipo">Tipo de benefício</label>
          <select id="pm-tipo" class="select" name="tipo" data-tipo>
            <option value="percentual" ${p?.tipo === 'percentual' ? 'selected' : ''}>Desconto percentual</option>
            <option value="fixo" ${p?.tipo === 'fixo' ? 'selected' : ''}>Desconto fixo em reais</option>
            <option value="frete" ${p?.tipo === 'frete' ? 'selected' : ''}>Frete grátis</option>
          </select>
        </div>

        <div class="field" data-campo-valor ${p?.tipo === 'frete' ? 'hidden' : ''}>
          <label class="field__label" for="pm-valor">
            Valor <span class="req">*</span>
            <span class="dim" data-unidade>${p?.tipo === 'fixo' ? '(R$)' : '(%)'}</span>
          </label>
          <input type="number" id="pm-valor" class="input" name="valor" min="0" step="0.01"
                 value="${p ? (p.tipo === 'fixo' ? (p.valor / 100).toFixed(2) : p.valor) : ''}">
          <p class="field__error" data-erro="valor" hidden></p>
        </div>

        <div class="field span-2">
          <label class="field__label" for="pm-cat">Aplicar em</label>
          <select id="pm-cat" class="select" name="categoria">
            <option value="todas" ${p?.categoria === 'todas' ? 'selected' : ''}>Todo o catálogo</option>
            ${state.categorias.map(c =>
              `<option value="${c.id}" ${p?.categoria === c.id ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label class="field__label" for="pm-ini">Início <span class="req">*</span></label>
          <input type="date" id="pm-ini" class="input" name="inicio" value="${v('inicio', hoje())}">
          <p class="field__error" data-erro="inicio" hidden></p>
        </div>

        <div class="field">
          <label class="field__label" for="pm-fim">Término <span class="req">*</span></label>
          <input type="date" id="pm-fim" class="input" name="fim" value="${v('fim', somaDias(hoje(), 14))}">
          <p class="field__error" data-erro="fim" hidden></p>
        </div>

        <div class="field span-2">
          <label class="field__label" for="pm-status">Situação</label>
          <select id="pm-status" class="select" name="status">
            <option value="ativa" ${p?.status === 'ativa' ? 'selected' : ''}>Ativa</option>
            <option value="programada" ${p?.status === 'programada' ? 'selected' : ''}>Programada</option>
            <option value="encerrada" ${p?.status === 'encerrada' ? 'selected' : ''}>Encerrada</option>
          </select>
          <p class="field__hint">Campanhas ativas alteram o preço exibido na loja imediatamente.</p>
        </div>
      </form>`,
    rodape: `
      <button type="button" class="btn btn--ghost" data-fechar>Cancelar</button>
      <button type="button" class="btn btn--primary" data-salvar-promo>${p ? 'Salvar' : 'Criar promoção'}</button>`,
  });

  // Alterna a unidade conforme o tipo escolhido
  qs('[data-tipo]', m.node).addEventListener('change', (e) => {
    const tipo = e.target.value;
    qs('[data-campo-valor]', m.node).hidden = tipo === 'frete';
    qs('[data-unidade]', m.node).textContent = tipo === 'fixo' ? '(R$)' : '(%)';
  });

  qs('[data-salvar-promo]', m.node).addEventListener('click', () => {
    const form = qs('[data-form-promo]', m.node);
    const get = (n) => qs(`[name="${n}"]`, form).value.trim();

    qsa('[data-erro]', form).forEach(x => { x.hidden = true; });
    qsa('[aria-invalid]', form).forEach(x => x.removeAttribute('aria-invalid'));

    const erros = [];
    const exigir = (nome, cond, msg) => {
      if (cond) return;
      erros.push(nome);
      qs(`[name="${nome}"]`, form)?.setAttribute('aria-invalid', 'true');
      const er = qs(`[data-erro="${nome}"]`, form);
      if (er) { er.textContent = msg; er.hidden = false; }
    };

    const tipo = get('tipo');
    const valorBruto = Number(get('valor'));

    exigir('nome', get('nome').length >= 3, 'Dê um nome à campanha.');
    if (tipo !== 'frete') {
      exigir('valor', valorBruto > 0, 'Informe um valor maior que zero.');
      if (tipo === 'percentual') {
        exigir('valor', valorBruto > 0 && valorBruto <= 90, 'O desconto deve ficar entre 1% e 90%.');
      }
    }
    exigir('fim', get('fim') >= get('inicio'), 'O término precisa ser igual ou depois do início.');

    if (erros.length) {
      qs(`[name="${erros[0]}"]`, form)?.focus();
      toast({ titulo: 'Confira os campos destacados', tipo: 'danger' });
      return;
    }

    const r = salvarPromocao({
      id: p?.id,
      nome: get('nome'),
      desc: get('desc') || 'Campanha promocional.',
      tipo,
      valor: tipo === 'fixo' ? Math.round(valorBruto * 100) : (tipo === 'frete' ? 0 : valorBruto),
      categoria: get('categoria'),
      inicio: get('inicio'),
      fim: get('fim'),
      status: get('status'),
    });

    m.fechar();
    toast({
      titulo: r.criado ? 'Promoção criada' : 'Promoção atualizada',
      msg: r.promocao.status === 'ativa' ? 'Já está valendo na loja.' : r.promocao.nome,
      tipo: 'success',
    });
  });
}

/* ---------- Formulário de cupom ---------- */
function abrirCupom() {
  const m = modal({
    titulo: 'Novo cupom',
    tamanho: '',
    id: 'cup',
    conteudo: `
      <form class="stack" data-form-cupom novalidate>
        <div class="field">
          <label class="field__label" for="cp-cod">Código <span class="req">*</span></label>
          <input type="text" id="cp-cod" class="input" name="codigo" placeholder="VANTA20"
                 style="text-transform:uppercase;font-family:var(--font-mono);letter-spacing:.06em">
          <p class="field__error" data-erro="codigo" hidden></p>
        </div>
        <div class="field">
          <label class="field__label" for="cp-tipo">Tipo</label>
          <select id="cp-tipo" class="select" name="tipo">
            <option value="percentual">Percentual (%)</option>
            <option value="fixo">Valor fixo (R$)</option>
            <option value="frete">Frete grátis</option>
          </select>
        </div>
        <div class="field">
          <label class="field__label" for="cp-valor">Valor</label>
          <input type="number" id="cp-valor" class="input" name="valor" min="0" step="0.01" value="10">
          <p class="field__error" data-erro="valor" hidden></p>
        </div>
        <div class="field">
          <label class="field__label" for="cp-min">Compra mínima (R$)</label>
          <input type="number" id="cp-min" class="input" name="minimo" min="0" step="0.01" value="0">
        </div>
      </form>`,
    rodape: `
      <button type="button" class="btn btn--ghost" data-fechar>Cancelar</button>
      <button type="button" class="btn btn--primary" data-salvar-cupom>Criar cupom</button>`,
  });

  qs('[data-salvar-cupom]', m.node).addEventListener('click', () => {
    const form = qs('[data-form-cupom]', m.node);
    const get = (n) => qs(`[name="${n}"]`, form).value.trim();
    const codigo = get('codigo').toUpperCase();
    const tipo = get('tipo');
    const valor = Number(get('valor'));

    qsa('[data-erro]', form).forEach(x => { x.hidden = true; });

    if (codigo.length < 3) {
      qs('[data-erro="codigo"]', form).textContent = 'O código precisa ter ao menos 3 caracteres.';
      qs('[data-erro="codigo"]', form).hidden = false;
      qs('[name="codigo"]', form).setAttribute('aria-invalid', 'true');
      return;
    }
    if (state.cupons.some(c => c.codigo === codigo)) {
      qs('[data-erro="codigo"]', form).textContent = 'Já existe um cupom com este código.';
      qs('[data-erro="codigo"]', form).hidden = false;
      qs('[name="codigo"]', form).setAttribute('aria-invalid', 'true');
      return;
    }
    if (tipo !== 'frete' && !(valor > 0)) {
      qs('[data-erro="valor"]', form).textContent = 'Informe um valor maior que zero.';
      qs('[data-erro="valor"]', form).hidden = false;
      return;
    }

    const desc = tipo === 'percentual' ? `${valor}% de desconto`
      : tipo === 'fixo' ? `${money(Math.round(valor * 100))} de desconto`
      : 'Frete grátis';

    salvarCupom({
      codigo, tipo,
      valor: tipo === 'fixo' ? Math.round(valor * 100) : (tipo === 'frete' ? 0 : valor),
      minimo: Math.round(Number(get('minimo') || 0) * 100),
      ativo: true,
      desc,
    });

    m.fechar();
    toast({ titulo: 'Cupom criado', msg: `${codigo} — ${desc}`, tipo: 'success' });
  });
}
