/* ============================================================
   VANTA Admin — Produtos, Estoque e Categorias
   ============================================================ */

import { qs, qsa, delegate, debounce } from '../../utils/dom.js';
import { icon } from '../../components/icons.js';
import { productArt, ARCHETYPES, FINISHES } from '../../data/artwork.js';
import { arteProduto } from '../../components/media.js';
import { money, num, escapeHtml, norm, dataCurta } from '../../utils/format.js';
import {
  state, salvarProduto, excluirProduto, restaurarProduto, alternarPublicado,
  ajustarEstoque, subscribe, estoqueBaixo, acharProduto,
} from '../../services/store.js';
import { toast, modal, confirmar, vazio } from '../../components/ui.js';

/* ============================================================
   PRODUTOS
   ============================================================ */
export function secaoProdutos(corpo, acoes) {
  const f = { q: '', cat: '', status: '', ord: 'criadoEm', dir: -1 };

  acoes.innerHTML = `
    <button type="button" class="btn btn--primary btn--sm" data-novo>
      ${icon.mais({ size: 16 })} Novo produto
    </button>`;

  function filtrados() {
    let l = [...state.produtos];
    if (f.q) l = l.filter(p => norm(`${p.nome} ${p.sku} ${p.marca}`).includes(norm(f.q)));
    if (f.cat) l = l.filter(p => p.cat === f.cat);
    if (f.status === 'publicado') l = l.filter(p => p.publicado);
    if (f.status === 'oculto') l = l.filter(p => !p.publicado);
    if (f.status === 'esgotado') l = l.filter(p => p.estoque === 0);

    return l.sort((a, b) => {
      const va = a[f.ord], vb = b[f.ord];
      if (typeof va === 'string') return va.localeCompare(vb) * f.dir;
      return (va - vb) * f.dir;
    });
  }

  function pintar() {
    const lista = filtrados();

    corpo.innerHTML = `
      <div class="panel">
        <div class="admin-tabela-topo">
          <div class="input-group search-mini">
            <span class="input-group__icon">${icon.busca({ size: 16 })}</span>
            <input type="search" class="input" placeholder="Buscar por nome, SKU ou marca"
                   value="${escapeHtml(f.q)}" data-busca style="min-height:40px">
          </div>

          <select class="select" data-filtro="cat" style="min-height:40px;width:auto">
            <option value="">Todas as categorias</option>
            ${state.categorias.map(c =>
              `<option value="${c.id}" ${f.cat === c.id ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('')}
          </select>

          <select class="select" data-filtro="status" style="min-height:40px;width:auto">
            <option value="">Todos os status</option>
            <option value="publicado" ${f.status === 'publicado' ? 'selected' : ''}>Publicados</option>
            <option value="oculto" ${f.status === 'oculto' ? 'selected' : ''}>Ocultos</option>
            <option value="esgotado" ${f.status === 'esgotado' ? 'selected' : ''}>Esgotados</option>
          </select>

          <span class="dim" style="font-size:var(--fs-sm);margin-left:auto">
            ${num(lista.length)} de ${num(state.produtos.length)}
          </span>
        </div>

        <div class="panel__body panel__body--flush tabela-cards">
          ${lista.length ? `
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    ${cabecalho('nome', 'Produto', f)}
                    <th>Categoria</th>
                    ${cabecalho('preco', 'Preço', f, true)}
                    ${cabecalho('estoque', 'Estoque', f, true)}
                    <th>Status</th>
                    ${cabecalho('vendidos', 'Vendas', f, true)}
                    ${cabecalho('criadoEm', 'Criado em', f)}
                    <th style="text-align:right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${lista.map(p => linha(p)).join('')}
                </tbody>
              </table>
            </div>` : vazio({
              icone: 'sacola',
              titulo: 'Nenhum produto encontrado',
              texto: 'Ajuste os filtros ou cadastre um produto novo.',
              acao: `<button type="button" class="btn btn--primary" data-novo>Novo produto</button>`,
            })}
        </div>
      </div>`;
  }

  function linha(p) {
    const cat = state.categorias.find(c => c.id === p.cat);
    const pctEstoque = Math.min(100, (p.estoque / Math.max(1, p.estoqueMin * 4)) * 100);
    const corEstoque = p.estoque === 0 ? 'var(--danger)'
      : p.estoque <= p.estoqueMin ? 'var(--warning)' : 'var(--success)';

    return `
      <tr data-id="${p.id}">
        <td class="cel-destaque" data-rotulo="Produto">
          <div class="prod-cel">
            <span class="prod-cel__art">${arteProduto(p, { mini: true })}</span>
            <span style="min-width:0">
              <span class="prod-cel__n">${escapeHtml(p.nome)}</span>
              <span class="prod-cel__sku">${escapeHtml(p.sku)} · ${escapeHtml(p.marca)}</span>
            </span>
          </div>
        </td>
        <td data-rotulo="Categoria">${escapeHtml(cat?.nome || '—')}</td>
        <td class="num cell-strong" data-rotulo="Preço">
          ${money(p.preco)}
          ${p.precoAnterior ? `<br><span class="dim" style="font-size:var(--fs-2xs);text-decoration:line-through">${money(p.precoAnterior)}</span>` : ''}
        </td>
        <td data-rotulo="Estoque">
          <div class="estoque-cel">
            <span class="estoque-cel__n" style="color:${corEstoque}">${num(p.estoque)} un.</span>
            <span class="estoque-cel__bar">
              <span class="estoque-cel__fill" style="width:${pctEstoque}%;background:${corEstoque}"></span>
            </span>
          </div>
        </td>
        <td data-rotulo="Status">
          <span class="badge badge--${p.publicado ? 'success' : 'neutral'}">
            <span class="badge__dot"></span> ${p.publicado ? 'Publicado' : 'Oculto'}
          </span>
        </td>
        <td class="num" data-rotulo="Vendas">${num(p.vendidos)}</td>
        <td class="dim" data-rotulo="Criado em">${dataCurta(p.criadoEm)}</td>
        <td data-rotulo="Ações">
          <div class="acoes-cel">
            <button type="button" class="btn-icon btn-icon--sm tip" data-editar="${p.id}" aria-label="Editar ${escapeHtml(p.nome)}">
              ${icon.editar({ size: 16 })}<span class="tip__pop">Editar</span>
            </button>
            <button type="button" class="btn-icon btn-icon--sm tip" data-publicar="${p.id}"
                    aria-label="${p.publicado ? 'Ocultar' : 'Publicar'} ${escapeHtml(p.nome)}">
              ${p.publicado ? icon.olhoOff({ size: 16 }) : icon.olho({ size: 16 })}
              <span class="tip__pop">${p.publicado ? 'Tirar da loja' : 'Publicar'}</span>
            </button>
            <button type="button" class="btn-icon btn-icon--sm tip" data-excluir="${p.id}"
                    aria-label="Excluir ${escapeHtml(p.nome)}" style="color:var(--danger)">
              ${icon.lixeira({ size: 16 })}<span class="tip__pop">Excluir</span>
            </button>
          </div>
        </td>
      </tr>`;
  }

  /* ---------- Eventos ---------- */
  const buscarDebounced = debounce(() => pintar(), 240);
  delegate(corpo, 'input', '[data-busca]', (e, input) => {
    f.q = input.value;
    buscarDebounced();
  });

  delegate(corpo, 'change', '[data-filtro]', (e, sel) => {
    f[sel.dataset.filtro] = sel.value;
    pintar();
  });

  delegate(corpo, 'click', 'th[data-ord]', (e, th) => {
    const campo = th.dataset.ord;
    if (f.ord === campo) f.dir *= -1;
    else { f.ord = campo; f.dir = 1; }
    pintar();
  });

  delegate(acoes, 'click', '[data-novo]', () => abrirFormProduto(null));
  delegate(corpo, 'click', '[data-novo]', () => abrirFormProduto(null));
  delegate(corpo, 'click', '[data-editar]', (e, b) => abrirFormProduto(b.dataset.editar));

  delegate(corpo, 'click', '[data-publicar]', (e, b) => {
    const r = alternarPublicado(b.dataset.publicar);
    const p = acharProduto(b.dataset.publicar);
    toast({
      titulo: r.publicado ? 'Produto publicado' : 'Produto retirado da loja',
      msg: p?.nome,
      tipo: r.publicado ? 'success' : 'info',
    });
  });

  delegate(corpo, 'click', '[data-excluir]', async (e, b) => {
    const p = acharProduto(b.dataset.excluir);
    if (!p) return;
    const ok = await confirmar({
      titulo: 'Excluir produto',
      msg: `"${p.nome}" será removido do catálogo. Você pode desfazer logo depois.`,
      confirmarLabel: 'Excluir produto',
    });
    if (!ok) return;

    const pos = state.produtos.findIndex(x => x.id === p.id);
    const r = excluirProduto(p.id);
    if (r.ok) {
      toast({
        titulo: 'Produto excluído',
        msg: p.nome,
        tipo: 'info',
        duracao: 6000,
        acao: { label: 'Desfazer', onClick: () => restaurarProduto(r.removido, pos) },
      });
    }
  });

  const desassinar = subscribe((ev) => {
    if (['produtos', 'reset'].includes(ev)) pintar();
  });

  pintar();
  return () => desassinar();
}

function cabecalho(campo, rotulo, f, num = false) {
  const ativo = f.ord === campo;
  const sort = ativo ? (f.dir === 1 ? 'ascending' : 'descending') : 'none';
  return `<th data-ord="${campo}" aria-sort="${sort}" ${num ? 'class="num"' : ''}>
    ${rotulo}<span class="sort-ind">${ativo && f.dir === -1 ? '↓' : '↑'}</span>
  </th>`;
}

/* ============================================================
   FORMULARIO DE PRODUTO
   ============================================================ */
export function abrirFormProduto(id) {
  const p = id ? acharProduto(id) : null;
  const v = (campo, padrao = '') => escapeHtml(String(p?.[campo] ?? padrao));

  const temFoto = !!p?.fotos?.length;
  let artSel = p?.art || 'notebook';
  let finishSel = p?.finish || 'graphite';
  let specs = p?.specs ? p.specs.map(s => [...s]) : [['', '']];

  const m = modal({
    titulo: p ? 'Editar produto' : 'Novo produto',
    sub: p ? p.sku : 'Preencha os dados do novo item do catálogo',
    tamanho: 'xl',
    id: 'prod',
    conteudo: `
      <div class="form-produto">
        <form data-form-prod novalidate class="stack">
          <div class="form-grid">
            <div class="field span-2">
              <label class="field__label" for="pd-nome">Nome do produto <span class="req">*</span></label>
              <input type="text" id="pd-nome" class="input" name="nome" value="${v('nome')}">
              <p class="field__error" data-erro="nome" hidden></p>
            </div>

            <div class="field">
              <label class="field__label" for="pd-sku">SKU</label>
              <input type="text" id="pd-sku" class="input" name="sku" value="${v('sku')}"
                     placeholder="VNT-XXX-0000">
              <p class="field__hint">Gerado automaticamente se ficar vazio.</p>
            </div>

            <div class="field">
              <label class="field__label" for="pd-marca">Marca <span class="req">*</span></label>
              <input type="text" id="pd-marca" class="input" name="marca" value="${v('marca')}" list="marcas-lista">
              <datalist id="marcas-lista">
                ${[...new Set(state.produtos.map(x => x.marca))].map(mm => `<option value="${escapeHtml(mm)}">`).join('')}
              </datalist>
              <p class="field__error" data-erro="marca" hidden></p>
            </div>

            <div class="field">
              <label class="field__label" for="pd-cat">Categoria <span class="req">*</span></label>
              <select id="pd-cat" class="select" name="cat">
                ${state.categorias.map(c =>
                  `<option value="${c.id}" ${p?.cat === c.id ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('')}
              </select>
            </div>

            <div class="field">
              <label class="field__label" for="pd-preco">Preço (R$) <span class="req">*</span></label>
              <input type="number" id="pd-preco" class="input" name="preco" step="0.01" min="0"
                     value="${p ? (p.preco / 100).toFixed(2) : ''}">
              <p class="field__error" data-erro="preco" hidden></p>
            </div>

            <div class="field">
              <label class="field__label" for="pd-preco-ant">Preço anterior (R$)</label>
              <input type="number" id="pd-preco-ant" class="input" name="precoAnterior" step="0.01" min="0"
                     value="${p?.precoAnterior ? (p.precoAnterior / 100).toFixed(2) : ''}">
              <p class="field__hint">Preenchido, exibe o selo de desconto.</p>
            </div>

            <div class="field">
              <label class="field__label" for="pd-estoque">Estoque <span class="req">*</span></label>
              <input type="number" id="pd-estoque" class="input" name="estoque" min="0" value="${v('estoque', 0)}">
              <p class="field__error" data-erro="estoque" hidden></p>
            </div>

            <div class="field">
              <label class="field__label" for="pd-min">Estoque mínimo</label>
              <input type="number" id="pd-min" class="input" name="estoqueMin" min="0" value="${v('estoqueMin', 5)}">
              <p class="field__hint">Abaixo disso, entra no alerta de reposição.</p>
            </div>

            <div class="field span-2">
              <label class="field__label" for="pd-resumo">Resumo <span class="req">*</span></label>
              <input type="text" id="pd-resumo" class="input" name="resumo" value="${v('resumo')}"
                     placeholder="Uma frase que aparece no card e no topo da página">
              <p class="field__error" data-erro="resumo" hidden></p>
            </div>

            <div class="field span-2">
              <label class="field__label" for="pd-desc">Descrição completa</label>
              <textarea id="pd-desc" class="textarea" name="desc" rows="4">${v('desc')}</textarea>
            </div>
          </div>

          <div class="field">
            <span class="field__label">Especificações técnicas</span>
            <div class="specs-editor" data-specs></div>
            <button type="button" class="btn btn--ghost btn--sm" data-add-spec style="justify-self:start">
              ${icon.mais({ size: 15 })} Adicionar especificação
            </button>
          </div>

          <div class="row" style="gap:24px;flex-wrap:wrap;padding-top:8px">
            <label class="switch">
              <input type="checkbox" name="publicado" ${p ? (p.publicado ? 'checked' : '') : 'checked'}>
              <span>Publicado na loja</span>
            </label>
            <label class="switch">
              <input type="checkbox" name="destaque" ${p?.destaque ? 'checked' : ''}>
              <span>Exibir em destaque na home</span>
            </label>
            <label class="switch">
              <input type="checkbox" name="novo" ${p?.novo ? 'checked' : ''}>
              <span>Marcar como novidade</span>
            </label>
          </div>
        </form>

        <aside class="form-produto__previa">
          <p class="field__label">Pré-visualização</p>
          <div class="previa-art" data-previa>
            ${temFoto ? arteProduto(p) : productArt(artSel, finishSel)}
          </div>

          ${temFoto ? `
            <div class="field">
              <span class="field__label">Imagens</span>
              <div class="previa-fotos">
                ${p.fotos.map((f, i) => `
                  <span class="previa-fotos__item">${arteProduto(p, { indice: i, mini: true })}</span>`).join('')}
              </div>
              <p class="field__hint">
                Este item usa fotografia de catálogo. O envio de novas imagens
                fica fora desta demonstração.
              </p>
            </div>
          ` : `
            <div class="field">
              <span class="field__label">Ilustração</span>
              <div class="art-picker" data-art-picker>
                ${ARCHETYPES.map(a => `
                  <button type="button" class="art-opt" data-art="${a}" aria-pressed="${a === artSel}"
                          aria-label="Ilustração ${a}">${productArt(a, finishSel)}</button>`).join('')}
              </div>
              <p class="field__hint">Produtos sem foto recebem uma ilustração gerada.</p>
            </div>

            <div class="field">
              <span class="field__label">Acabamento</span>
              <div class="cores" data-finish-picker>
                ${Object.keys(FINISHES).map(c => `
                  <button type="button" class="cor-opt" data-finish="${c}" aria-pressed="${c === finishSel}"
                          style="background:${FINISHES[c].body};width:30px;height:30px" aria-label="Cor ${c}"></button>`).join('')}
              </div>
            </div>
          `}
        </aside>
      </div>`,
    rodape: `
      <button type="button" class="btn btn--ghost" data-fechar>Cancelar</button>
      <button type="button" class="btn btn--primary" data-salvar>
        ${p ? 'Salvar alterações' : 'Cadastrar produto'}
      </button>`,
  });

  /* Editor de especificações */
  const elSpecs = qs('[data-specs]', m.node);
  function pintarSpecs() {
    elSpecs.innerHTML = specs.map((s, i) => `
      <div class="spec-linha" data-spec="${i}">
        <input type="text" class="input" placeholder="Atributo" value="${escapeHtml(s[0])}" data-spec-k="${i}" style="min-height:40px">
        <input type="text" class="input" placeholder="Valor" value="${escapeHtml(s[1])}" data-spec-v="${i}" style="min-height:40px">
        <button type="button" class="btn-icon btn-icon--sm" data-rm-spec="${i}" aria-label="Remover especificação">
          ${icon.fechar({ size: 15 })}
        </button>
      </div>`).join('');
  }
  pintarSpecs();

  delegate(m.node, 'click', '[data-add-spec]', () => { specs.push(['', '']); pintarSpecs(); });
  delegate(m.node, 'click', '[data-rm-spec]', (e, b) => {
    specs.splice(Number(b.dataset.rmSpec), 1);
    if (!specs.length) specs.push(['', '']);
    pintarSpecs();
  });
  delegate(m.node, 'input', '[data-spec-k]', (e, i) => { specs[Number(i.dataset.specK)][0] = i.value; });
  delegate(m.node, 'input', '[data-spec-v]', (e, i) => { specs[Number(i.dataset.specV)][1] = i.value; });

  /* Escolha de ilustração e acabamento (só para item sem foto) */
  const previa = qs('[data-previa]', m.node);
  function atualizarPrevia() {
    if (temFoto) return;
    previa.innerHTML = productArt(artSel, finishSel);
    qsa('[data-art]', m.node).forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.art === artSel));
      b.innerHTML = productArt(b.dataset.art, finishSel);
    });
    qsa('[data-finish]', m.node).forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.finish === finishSel)));
  }

  delegate(m.node, 'click', '[data-art]', (e, b) => { artSel = b.dataset.art; atualizarPrevia(); });
  delegate(m.node, 'click', '[data-finish]', (e, b) => { finishSel = b.dataset.finish; atualizarPrevia(); });

  /* Salvar */
  qs('[data-salvar]', m.node).addEventListener('click', () => {
    const form = qs('[data-form-prod]', m.node);
    const get = (n) => qs(`[name="${n}"]`, form)?.value.trim() ?? '';
    const check = (n) => qs(`[name="${n}"]`, form)?.checked ?? false;

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

    const preco = Math.round(Number(get('preco')) * 100);
    const precoAnt = get('precoAnterior') ? Math.round(Number(get('precoAnterior')) * 100) : null;

    exigir('nome', get('nome').length >= 3, 'Informe um nome com ao menos 3 caracteres.');
    exigir('marca', get('marca').length >= 2, 'Informe a marca.');
    exigir('resumo', get('resumo').length >= 10, 'Escreva um resumo com ao menos 10 caracteres.');
    exigir('preco', preco > 0, 'Informe um preço maior que zero.');
    exigir('estoque', Number(get('estoque')) >= 0 && get('estoque') !== '', 'Informe o estoque.');

    if (precoAnt !== null && precoAnt <= preco) {
      exigir('precoAnterior', false, 'O preço anterior precisa ser maior que o preço atual.');
    }

    if (erros.length) {
      qs(`[name="${erros[0]}"]`, form)?.focus();
      toast({
        titulo: erros.length === 1 ? 'Confira um campo' : `Confira ${erros.length} campos`,
        msg: 'Os campos com problema estão destacados.',
        tipo: 'danger',
      });
      return;
    }

    const limpos = specs.filter(s => s[0].trim() && s[1].trim());

    const r = salvarProduto({
      id: p?.id,
      nome: get('nome'),
      sku: get('sku') || undefined,
      marca: get('marca'),
      cat: get('cat'),
      preco,
      precoAnterior: precoAnt,
      estoque: Number(get('estoque')),
      estoqueMin: Number(get('estoqueMin')) || 5,
      resumo: get('resumo'),
      desc: get('desc') || get('resumo'),
      specs: limpos,
      art: artSel,
      finish: finishSel,
      cores: [finishSel],
      publicado: check('publicado'),
      destaque: check('destaque'),
      novo: check('novo'),
    });

    m.fechar();
    toast({
      titulo: r.criado ? 'Produto cadastrado' : 'Produto atualizado',
      msg: r.produto.nome,
      tipo: 'success',
    });
  });
}

/* ============================================================
   ESTOQUE
   ============================================================ */
export function secaoEstoque(corpo, acoes) {
  acoes.innerHTML = `<span class="dim" style="font-size:var(--fs-sm)">Ajuste direto na tabela</span>`;

  function pintar() {
    const criticos = estoqueBaixo();
    const total = state.produtos.reduce((s, p) => s + p.estoque, 0);
    const valorParado = state.produtos.reduce((s, p) => s + p.estoque * p.preco, 0);
    const esgotados = state.produtos.filter(p => p.estoque === 0);

    corpo.innerHTML = `
      <div class="stat-grid">
        <article class="stat">
          <div class="stat__head"><span class="stat__l">Unidades em estoque</span>
            <span class="stat__ico">${icon.estoque({ size: 16 })}</span></div>
          <p class="stat__v">${num(total)}</p>
        </article>
        <article class="stat">
          <div class="stat__head"><span class="stat__l">Valor imobilizado</span>
            <span class="stat__ico">${icon.raio({ size: 16 })}</span></div>
          <p class="stat__v">${money(valorParado)}</p>
        </article>
        <article class="stat">
          <div class="stat__head"><span class="stat__l">Abaixo do mínimo</span>
            <span class="stat__ico">${icon.alerta({ size: 16 })}</span></div>
          <p class="stat__v" style="color:${criticos.length ? 'var(--warning)' : 'inherit'}">${num(criticos.length)}</p>
        </article>
        <article class="stat">
          <div class="stat__head"><span class="stat__l">Esgotados</span>
            <span class="stat__ico">${icon.fechar({ size: 16 })}</span></div>
          <p class="stat__v" style="color:${esgotados.length ? 'var(--danger)' : 'inherit'}">${num(esgotados.length)}</p>
        </article>
      </div>

      <section class="panel">
        <header class="panel__head">
          <div>
            <h2 class="panel__title">Reposição necessária</h2>
            <p class="dim" style="font-size:var(--fs-xs)">Produtos no nível mínimo ou abaixo</p>
          </div>
        </header>
        <div class="panel__body panel__body--flush tabela-cards">
          ${criticos.length ? tabelaEstoque(criticos) : `
            <p class="muted" style="padding:40px;text-align:center">
              ${icon.checkCirculo({ size: 20 })} Nenhum produto precisa de reposição agora.
            </p>`}
        </div>
      </section>

      <section class="panel">
        <header class="panel__head"><h2 class="panel__title">Todo o estoque</h2></header>
        <div class="panel__body panel__body--flush tabela-cards">
          ${tabelaEstoque([...state.produtos].sort((a, b) => a.estoque - b.estoque))}
        </div>
      </section>`;
  }

  function tabelaEstoque(lista) {
    return `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Produto</th><th class="num">Mínimo</th><th class="num">Atual</th>
              <th style="width:200px">Ajustar</th><th class="num">Valor parado</th>
            </tr>
          </thead>
          <tbody>
            ${lista.map(p => `
              <tr data-id="${p.id}">
                <td class="cel-destaque" data-rotulo="Produto">
                  <div class="prod-cel">
                    <span class="prod-cel__art">${arteProduto(p, { mini: true })}</span>
                    <span style="min-width:0">
                      <span class="prod-cel__n">${escapeHtml(p.nome)}</span>
                      <span class="prod-cel__sku">${escapeHtml(p.sku)}</span>
                    </span>
                  </div>
                </td>
                <td class="num dim" data-rotulo="Mínimo">${p.estoqueMin}</td>
                <td class="num" data-rotulo="Atual">
                  <span class="badge badge--${p.estoque === 0 ? 'danger' : p.estoque <= p.estoqueMin ? 'warning' : 'success'}">
                    ${num(p.estoque)}
                  </span>
                </td>
                <td data-rotulo="Ajustar">
                  <div class="row" style="gap:8px;justify-content:flex-end">
                    <div class="qty">
                      <button type="button" class="qty__btn" data-est="-10" data-p="${p.id}" aria-label="Reduzir 10">−10</button>
                      <input type="number" class="qty__n input" value="${p.estoque}" min="0" data-est-input="${p.id}"
                             style="width:68px;min-height:38px;text-align:center;border:0;background:transparent;padding:0"
                             aria-label="Estoque de ${escapeHtml(p.nome)}">
                      <button type="button" class="qty__btn" data-est="10" data-p="${p.id}" aria-label="Aumentar 10">+10</button>
                    </div>
                  </div>
                </td>
                <td class="num" data-rotulo="Valor parado">${money(p.estoque * p.preco)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  delegate(corpo, 'click', '[data-est]', (e, b) => {
    const p = acharProduto(b.dataset.p);
    if (!p) return;
    const novo = Math.max(0, p.estoque + Number(b.dataset.est));
    ajustarEstoque(p.id, novo);
    toast({ titulo: 'Estoque atualizado', msg: `${p.nome}: ${novo} unidades`, tipo: 'success', duracao: 2200 });
  });

  delegate(corpo, 'change', '[data-est-input]', (e, input) => {
    const id = input.dataset.estInput;
    const p = acharProduto(id);
    const valor = Math.max(0, Number(input.value) || 0);
    ajustarEstoque(id, valor);
    toast({ titulo: 'Estoque atualizado', msg: `${p?.nome}: ${valor} unidades`, tipo: 'success', duracao: 2200 });
  });

  const desassinar = subscribe((ev) => {
    if (['produtos', 'reset'].includes(ev)) pintar();
  });

  pintar();
  return () => desassinar();
}

/* ============================================================
   CATEGORIAS
   ============================================================ */
export function secaoCategorias(corpo, acoes) {
  acoes.innerHTML = '';

  function pintar() {
    corpo.innerHTML = `
      <div class="grid-auto" style="grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))">
        ${state.categorias.map(c => {
          const produtos = state.produtos.filter(p => p.cat === c.id);
          const receita = produtos.reduce((s, p) => s + p.vendidos * p.preco, 0);
          const estoque = produtos.reduce((s, p) => s + p.estoque, 0);
          return `
            <article class="panel" data-anim>
              <div class="panel__body">
                <div class="row" style="gap:14px;align-items:flex-start">
                  <span class="prod-cel__art" style="width:52px;height:52px">${productArt(c.art, 'volt')}</span>
                  <div style="flex:1;min-width:0">
                    <h3 style="font-size:var(--fs-lg)">${escapeHtml(c.nome)}</h3>
                    <p class="dim" style="font-size:var(--fs-sm);margin-top:4px">${escapeHtml(c.desc)}</p>
                  </div>
                </div>
                <dl class="det-lista" style="margin-top:20px">
                  <div class="det-linha"><dt>Produtos</dt><dd class="tabular">${num(produtos.length)}</dd></div>
                  <div class="det-linha"><dt>Em estoque</dt><dd class="tabular">${num(estoque)} un.</dd></div>
                  <div class="det-linha"><dt>Receita acumulada</dt><dd class="tabular">${money(receita)}</dd></div>
                </dl>
                <a href="#/admin/produtos" class="btn btn--secondary btn--sm btn--block" style="margin-top:16px">
                  Ver produtos
                </a>
              </div>
            </article>`;
        }).join('')}
      </div>`;
  }

  const desassinar = subscribe((ev) => { if (['produtos', 'reset'].includes(ev)) pintar(); });
  pintar();
  return () => desassinar();
}
