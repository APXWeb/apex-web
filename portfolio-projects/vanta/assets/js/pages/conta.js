/* ============================================================
   VANTA — Area do cliente
   ============================================================ */

import { qs, qsa, delegate, observarAnimacoes } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { arteProduto } from '../components/media.js';
import { miniProduto } from '../components/productCard.js';
import {
  money, num, escapeHtml, dataLonga, dataMedia, haQuantoTempo, iniciais,
} from '../utils/format.js';
import {
  state, meusPedidos, produtosFavoritos, subscribe, maisVendidos,
  salvarEndereco, excluirEndereco, salvarPerfil, salvarConfig, ORDER_STATUS,
  acharProduto, alternarFavorito,
} from '../services/store.js';
import { toast, modal, confirmar, vazio } from '../components/ui.js';
import { ir } from '../router.js';

const SECOES = [
  ['visao', 'Visão geral', 'painel'],
  ['pedidos', 'Meus pedidos', 'caixa'],
  ['favoritos', 'Favoritos', 'coracao'],
  ['enderecos', 'Endereços', 'local'],
  ['dados', 'Dados pessoais', 'usuario'],
  ['config', 'Configurações', 'engrenagem'],
];

export function paginaConta(root, secao = 'visao') {
  if (!SECOES.some(([id]) => id === secao)) secao = 'visao';
  const rotulo = SECOES.find(([id]) => id === secao)[1];
  document.title = `${rotulo} | VANTA`;

  root.innerHTML = `
    <div class="shell">
      <nav class="crumbs" aria-label="Você está em">
        <a href="#/">Início</a>
        <span class="crumbs__sep">${icon.chevronR({ size: 13 })}</span>
        <a href="#/conta">Minha conta</a>
        <span class="crumbs__sep">${icon.chevronR({ size: 13 })}</span>
        <span aria-current="page">${escapeHtml(rotulo)}</span>
      </nav>

      <div class="conta-layout">
        <nav class="conta-nav" aria-label="Seções da conta">
          <div class="conta-nav__perfil">
            <span class="avatar avatar--lg">${iniciais(state.perfil.nome)}</span>
            <div style="min-width:0">
              <p style="font-size:var(--fs-base);font-weight:600">${escapeHtml(state.perfil.nome.split(' ')[0])}</p>
              <p class="dim" style="font-size:var(--fs-xs);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${escapeHtml(state.perfil.email)}
              </p>
            </div>
          </div>
          ${SECOES.map(([id, nome, ic]) => `
            <a href="#/conta/${id}" class="conta-nav__link ${id === secao ? 'is-active' : ''}"
               ${id === secao ? 'aria-current="page"' : ''}>
              ${icon[ic]({ size: 18 })} ${nome}
            </a>`).join('')}
        </nav>

        <div data-painel-conta></div>
      </div>
    </div>`;

  const alvo = qs('[data-painel-conta]', root);

  const RENDER = { visao, pedidos, favoritos, enderecos, dados, config };

  function pintar() {
    alvo.innerHTML = RENDER[secao]();
    observarAnimacoes(alvo);
  }

  /* ---------------- Visão geral ---------------- */
  function visao() {
    const lista = meusPedidos();
    const favs = produtosFavoritos();
    const gasto = lista.reduce((s, p) => s + p.total, 0);
    const emAndamento = lista.filter(p => !['entregue', 'cancelado'].includes(p.status));

    return `
      <div class="stack stack--lg">
        <div>
          <h1 style="font-size:var(--fs-2xl)">Olá, ${escapeHtml(state.perfil.nome.split(' ')[0])}</h1>
          <p class="muted" style="margin-top:6px">Aqui está um resumo da sua conta.</p>
        </div>

        <div class="kpi-row">
          <div class="kpi" data-anim>
            <p class="kpi__l">${icon.caixa({ size: 14 })} Pedidos feitos</p>
            <p class="kpi__v">${num(lista.length)}</p>
          </div>
          <div class="kpi" data-anim="1">
            <p class="kpi__l">${icon.relogio({ size: 14 })} Em andamento</p>
            <p class="kpi__v">${num(emAndamento.length)}</p>
          </div>
          <div class="kpi" data-anim="2">
            <p class="kpi__l">${icon.sacola({ size: 14 })} Total gasto</p>
            <p class="kpi__v">${money(gasto)}</p>
          </div>
          <div class="kpi" data-anim="3">
            <p class="kpi__l">${icon.coracao({ size: 14 })} Favoritos</p>
            <p class="kpi__v">${num(favs.length)}</p>
          </div>
        </div>

        <section class="panel">
          <header class="panel__head">
            <h2 class="panel__title">Últimos pedidos</h2>
            <a href="#/conta/pedidos" class="btn btn--ghost btn--sm">Ver todos ${icon.chevronR({ size: 14 })}</a>
          </header>
          <div class="panel__body">
            ${lista.length ? `
              <div class="stack">
                ${lista.slice(0, 3).map(cardPedido).join('')}
              </div>` : `
              <p class="muted" style="text-align:center;padding:24px 0">
                Você ainda não fez nenhum pedido nesta demonstração.
                <br><a href="#/catalogo" class="btn btn--primary btn--sm" style="margin-top:16px">Explorar catálogo</a>
              </p>`}
          </div>
        </section>

        ${favs.length ? `
          <section class="panel">
            <header class="panel__head">
              <h2 class="panel__title">Seus favoritos</h2>
              <a href="#/conta/favoritos" class="btn btn--ghost btn--sm">Ver todos ${icon.chevronR({ size: 14 })}</a>
            </header>
            <div class="panel__body">
              <div class="rail">${favs.slice(0, 6).map(miniProduto).join('')}</div>
            </div>
          </section>` : ''}

        <section class="panel">
          <header class="panel__head">
            <h2 class="panel__title">Recomendados para você</h2>
          </header>
          <div class="panel__body">
            <div class="rail">${maisVendidos(6).map(miniProduto).join('')}</div>
          </div>
        </section>
      </div>`;
  }

  function cardPedido(p) {
    const st = ORDER_STATUS[p.status] || { label: p.status, tone: 'neutral' };
    return `
      <article class="pedido-linha">
        <div style="min-width:0">
          <div class="row" style="gap:10px;flex-wrap:wrap">
            <span class="tabular" style="font-weight:600">${escapeHtml(p.id)}</span>
            <span class="badge badge--${st.tone}"><span class="badge__dot"></span> ${st.label}</span>
          </div>
          <p class="dim" style="font-size:var(--fs-sm);margin-top:6px">
            ${dataLonga(p.data)} · ${num(p.itens.reduce((s, i) => s + i.qtd, 0))} itens
          </p>
          <div class="pedido-linha__arts">
            ${p.itens.slice(0, 5).map(i => `
              <span class="pedido-linha__art">${arteProduto(i, { mini: true })}</span>`).join('')}
            ${p.itens.length > 5 ? `<span class="pedido-linha__art" style="display:grid;place-items:center;font-size:var(--fs-xs);color:var(--text-tertiary)">+${p.itens.length - 5}</span>` : ''}
          </div>
        </div>
        <div style="text-align:right;display:grid;gap:10px;align-content:start">
          <span class="price" style="font-size:var(--fs-lg);font-weight:600">${money(p.total)}</span>
          <a href="#/pedido/${p.id}" class="btn btn--outline btn--sm">Ver detalhes</a>
        </div>
      </article>`;
  }

  /* ---------------- Pedidos ---------------- */
  function pedidos() {
    const lista = meusPedidos();
    return `
      <div class="stack stack--lg">
        <div>
          <h1 style="font-size:var(--fs-2xl)">Meus pedidos</h1>
          <p class="muted" style="margin-top:6px">
            ${lista.length ? `${num(lista.length)} ${lista.length === 1 ? 'pedido' : 'pedidos'}` : 'Nenhum pedido ainda'}
          </p>
        </div>
        ${lista.length ? `
          <div class="stack">${lista.map(cardPedido).join('')}</div>
        ` : vazio({
          icone: 'caixa',
          titulo: 'Você ainda não comprou nada',
          texto: 'Finalize uma compra nesta demonstração e o pedido aparece aqui, com status e linha do tempo.',
          acao: `<a href="#/catalogo" class="btn btn--primary">Ver produtos</a>`,
        })}
      </div>`;
  }

  /* ---------------- Favoritos ---------------- */
  function favoritos() {
    const lista = produtosFavoritos();
    return `
      <div class="stack stack--lg">
        <div>
          <h1 style="font-size:var(--fs-2xl)">Favoritos</h1>
          <p class="muted" style="margin-top:6px">${num(lista.length)} produtos salvos</p>
        </div>
        ${lista.length ? `
          <div class="stack">
            ${lista.map(p => `
              <article class="pedido-linha" data-fav-linha="${p.id}">
                <div class="row" style="gap:16px;min-width:0">
                  <a href="#/produto/${p.id}" class="pedido-linha__art" style="width:64px;height:64px;flex-shrink:0">
                    ${arteProduto(p, { mini: true })}
                  </a>
                  <div style="min-width:0">
                    <p class="dim" style="font-size:var(--fs-xs)">${escapeHtml(p.marca)}</p>
                    <a href="#/produto/${p.id}" style="font-size:var(--fs-base);font-weight:500">${escapeHtml(p.nome)}</a>
                    <p class="price" style="font-size:var(--fs-lg);font-weight:600;margin-top:4px">${money(p.preco)}</p>
                  </div>
                </div>
                <div style="display:grid;gap:8px;align-content:start">
                  <button type="button" class="btn btn--primary btn--sm" data-add="${p.id}">Adicionar</button>
                  <button type="button" class="btn btn--ghost btn--sm" data-tirar-fav="${p.id}">Remover</button>
                </div>
              </article>`).join('')}
          </div>
        ` : vazio({
          icone: 'coracao',
          titulo: 'Nenhum favorito',
          texto: 'Salve produtos tocando no coração para encontrá-los depois.',
          acao: `<a href="#/catalogo" class="btn btn--primary">Explorar catálogo</a>`,
        })}
      </div>`;
  }

  /* ---------------- Endereços ---------------- */
  function enderecos() {
    return `
      <div class="stack stack--lg">
        <div class="row row--between" style="flex-wrap:wrap;gap:16px">
          <div>
            <h1 style="font-size:var(--fs-2xl)">Endereços</h1>
            <p class="muted" style="margin-top:6px">${num(state.enderecos.length)} cadastrados</p>
          </div>
          <button type="button" class="btn btn--primary" data-novo-endereco>
            ${icon.mais({ size: 17 })} Novo endereço
          </button>
        </div>

        ${state.enderecos.length ? `
          <div class="grid-auto" style="grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))">
            ${state.enderecos.map(e => `
              <div class="endereco-card ${e.padrao ? 'is-padrao' : ''}">
                <div class="row row--between">
                  <p style="font-weight:600">${escapeHtml(e.rotulo)}</p>
                  ${e.padrao ? '<span class="badge badge--accent">Padrão</span>' : ''}
                </div>
                <p class="muted" style="font-size:var(--fs-base);line-height:1.6">
                  ${escapeHtml(e.destinatario)}<br>
                  ${escapeHtml(e.rua)}${e.complemento ? `, ${escapeHtml(e.complemento)}` : ''}<br>
                  ${escapeHtml(e.bairro)} · ${escapeHtml(e.cidade)}/${escapeHtml(e.uf)}<br>
                  CEP ${escapeHtml(e.cep)}
                </p>
                <div class="row" style="gap:8px;flex-wrap:wrap">
                  <button type="button" class="btn btn--secondary btn--sm" data-editar-endereco="${e.id}">Editar</button>
                  ${!e.padrao ? `<button type="button" class="btn btn--ghost btn--sm" data-padrao="${e.id}">Tornar padrão</button>` : ''}
                  ${state.enderecos.length > 1 ? `<button type="button" class="btn btn--ghost btn--sm" data-excluir-endereco="${e.id}" style="color:var(--danger)">Excluir</button>` : ''}
                </div>
              </div>`).join('')}
          </div>
        ` : vazio({
          icone: 'local',
          titulo: 'Nenhum endereço cadastrado',
          texto: 'Cadastre um endereço para agilizar o checkout.',
          acao: `<button type="button" class="btn btn--primary" data-novo-endereco>Cadastrar endereço</button>`,
        })}
      </div>`;
  }

  /* ---------------- Dados pessoais ---------------- */
  function dados() {
    const p = state.perfil;
    return `
      <div class="stack stack--lg">
        <div>
          <h1 style="font-size:var(--fs-2xl)">Dados pessoais</h1>
          <p class="muted" style="margin-top:6px">Usados na emissão da nota e no contato sobre pedidos.</p>
        </div>

        <section class="panel">
          <div class="panel__body">
            <form class="form-grid" data-form-perfil novalidate>
              <div class="field span-2">
                <label class="field__label" for="pf-nome">Nome completo <span class="req">*</span></label>
                <input type="text" id="pf-nome" class="input" name="nome" value="${escapeHtml(p.nome)}" autocomplete="name" required>
                <p class="field__error" data-erro="nome" hidden></p>
              </div>
              <div class="field">
                <label class="field__label" for="pf-email">E-mail <span class="req">*</span></label>
                <input type="email" id="pf-email" class="input" name="email" value="${escapeHtml(p.email)}" autocomplete="email" required>
                <p class="field__error" data-erro="email" hidden></p>
              </div>
              <div class="field">
                <label class="field__label" for="pf-tel">Telefone</label>
                <input type="tel" id="pf-tel" class="input" name="telefone" value="${escapeHtml(p.telefone)}" autocomplete="tel">
              </div>
              <div class="field">
                <label class="field__label" for="pf-cpf">CPF</label>
                <input type="text" id="pf-cpf" class="input" name="cpf" value="${escapeHtml(p.cpf)}" inputmode="numeric">
                <p class="field__hint">Valor fictício nesta demonstração.</p>
              </div>
              <div class="field">
                <label class="field__label" for="pf-nasc">Data de nascimento</label>
                <input type="date" id="pf-nasc" class="input" name="nascimento" value="${escapeHtml(p.nascimento)}">
              </div>
              <div class="span-2 row" style="justify-content:flex-end;gap:12px;padding-top:8px">
                <button type="submit" class="btn btn--primary">Salvar alterações</button>
              </div>
            </form>
          </div>
        </section>
      </div>`;
  }

  /* ---------------- Configurações ---------------- */
  function config() {
    const c = state.config;
    const itens = [
      ['notificacoesEmail', 'Avisos por e-mail', 'Confirmação de pedido, envio e entrega.'],
      ['notificacoesPromo', 'Promoções e ofertas', 'Avisar quando um favorito baixar de preço.'],
      ['resumoSemanal', 'Resumo semanal', 'Um e-mail por semana com novidades do catálogo.'],
      ['newsletter', 'Newsletter VANTA', 'Conteúdo sobre setup, áudio e design.'],
    ];

    return `
      <div class="stack stack--lg">
        <div>
          <h1 style="font-size:var(--fs-2xl)">Configurações</h1>
          <p class="muted" style="margin-top:6px">Preferências de comunicação e da conta.</p>
        </div>

        <section class="panel">
          <header class="panel__head"><h2 class="panel__title">Notificações</h2></header>
          <div class="panel__body stack">
            ${itens.map(([chave, titulo, desc]) => `
              <label class="switch row row--between" style="width:100%;gap:24px">
                <span>
                  <span style="display:block;font-size:var(--fs-base);font-weight:500">${titulo}</span>
                  <span class="dim" style="font-size:var(--fs-sm)">${desc}</span>
                </span>
                <input type="checkbox" data-config="${chave}" ${c[chave] ? 'checked' : ''}>
              </label>`).join('')}
          </div>
        </section>

        <section class="panel">
          <header class="panel__head"><h2 class="panel__title">Dados da demonstração</h2></header>
          <div class="panel__body stack">
            <p class="muted" style="font-size:var(--fs-base)">
              Tudo o que você faz nesta loja (carrinho, favoritos, pedidos, alterações no painel)
              fica salvo apenas no seu navegador. Nada é enviado para nenhum servidor.
            </p>
            <div class="row" style="gap:12px;flex-wrap:wrap">
              <button type="button" class="btn btn--danger btn--sm" data-resetar>
                ${icon.retorno({ size: 15 })} Restaurar dados originais
              </button>
            </div>
          </div>
        </section>
      </div>`;
  }

  /* ---------------- Modal de endereço ---------------- */
  function abrirEndereco(id = null) {
    const e = id ? state.enderecos.find(x => x.id === id) : null;
    const v = (campo) => escapeHtml(e?.[campo] || '');

    const m = modal({
      titulo: e ? 'Editar endereço' : 'Novo endereço',
      tamanho: 'lg',
      conteudo: `
        <form class="form-grid" data-form-end novalidate>
          <div class="field">
            <label class="field__label" for="en-rotulo">Identificação <span class="req">*</span></label>
            <input type="text" id="en-rotulo" class="input" name="rotulo" value="${v('rotulo')}" placeholder="Casa, Escritório...">
            <p class="field__error" data-erro="rotulo" hidden></p>
          </div>
          <div class="field">
            <label class="field__label" for="en-dest">Destinatário <span class="req">*</span></label>
            <input type="text" id="en-dest" class="input" name="destinatario" value="${v('destinatario') || escapeHtml(state.perfil.nome)}">
            <p class="field__error" data-erro="destinatario" hidden></p>
          </div>
          <div class="field">
            <label class="field__label" for="en-cep">CEP <span class="req">*</span></label>
            <input type="text" id="en-cep" class="input" name="cep" value="${v('cep')}" maxlength="9" inputmode="numeric">
            <p class="field__error" data-erro="cep" hidden></p>
          </div>
          <div class="field">
            <label class="field__label" for="en-bairro">Bairro</label>
            <input type="text" id="en-bairro" class="input" name="bairro" value="${v('bairro')}">
          </div>
          <div class="field span-2">
            <label class="field__label" for="en-rua">Rua e número <span class="req">*</span></label>
            <input type="text" id="en-rua" class="input" name="rua" value="${v('rua')}">
            <p class="field__error" data-erro="rua" hidden></p>
          </div>
          <div class="field">
            <label class="field__label" for="en-comp">Complemento</label>
            <input type="text" id="en-comp" class="input" name="complemento" value="${v('complemento')}">
          </div>
          <div class="field">
            <label class="field__label" for="en-cidade">Cidade <span class="req">*</span></label>
            <input type="text" id="en-cidade" class="input" name="cidade" value="${v('cidade')}">
            <p class="field__error" data-erro="cidade" hidden></p>
          </div>
          <div class="field">
            <label class="field__label" for="en-uf">Estado</label>
            <select id="en-uf" class="select" name="uf">
              ${['SP','RJ','MG','PR','RS','SC','BA','PE','CE','DF','GO','ES']
                .map(uf => `<option value="${uf}" ${e?.uf === uf ? 'selected' : ''}>${uf}</option>`).join('')}
            </select>
          </div>
          <label class="check span-2">
            <input type="checkbox" name="padrao" ${e?.padrao ? 'checked' : ''}>
            Usar como endereço padrão
          </label>
        </form>`,
      rodape: `
        <button type="button" class="btn btn--ghost" data-fechar>Cancelar</button>
        <button type="button" class="btn btn--primary" data-salvar-end>Salvar endereço</button>`,
      id: 'end',
    });

    qs('#en-cep', m.node).addEventListener('input', (ev) => {
      let x = ev.target.value.replace(/\D/g, '').slice(0, 8);
      if (x.length > 5) x = `${x.slice(0, 5)}-${x.slice(5)}`;
      ev.target.value = x;
    });

    qs('[data-salvar-end]', m.node).addEventListener('click', () => {
      const form = qs('[data-form-end]', m.node);
      const get = (n) => qs(`[name="${n}"]`, form)?.value.trim() || '';
      const erros = [];

      qsa('[data-erro]', form).forEach(x => { x.hidden = true; });
      qsa('[aria-invalid]', form).forEach(x => x.removeAttribute('aria-invalid'));

      const exigir = (nome, cond, msg) => {
        if (cond) return;
        erros.push(nome);
        qs(`[name="${nome}"]`, form)?.setAttribute('aria-invalid', 'true');
        const er = qs(`[data-erro="${nome}"]`, form);
        if (er) { er.textContent = msg; er.hidden = false; }
      };

      exigir('rotulo', get('rotulo').length >= 2, 'Dê um nome a este endereço.');
      exigir('destinatario', get('destinatario').length >= 3, 'Informe quem vai receber.');
      exigir('cep', get('cep').replace(/\D/g, '').length === 8, 'CEP deve ter 8 dígitos.');
      exigir('rua', get('rua').length >= 4, 'Informe a rua e o número.');
      exigir('cidade', get('cidade').length >= 2, 'Informe a cidade.');

      if (erros.length) {
        qs(`[name="${erros[0]}"]`, form)?.focus();
        toast({ titulo: 'Confira os campos destacados', tipo: 'danger' });
        return;
      }

      salvarEndereco({
        id: e?.id,
        rotulo: get('rotulo'), destinatario: get('destinatario'), cep: get('cep'),
        rua: get('rua'), complemento: get('complemento'), bairro: get('bairro'),
        cidade: get('cidade'), uf: get('uf'),
        padrao: qs('[name="padrao"]', form).checked,
      });

      m.fechar();
      toast({ titulo: e ? 'Endereço atualizado' : 'Endereço cadastrado', tipo: 'success' });
    });
  }

  /* ---------------- Eventos ---------------- */
  delegate(root, 'click', '[data-novo-endereco]', () => abrirEndereco());
  delegate(root, 'click', '[data-editar-endereco]', (e, b) => abrirEndereco(b.dataset.editarEndereco));

  delegate(root, 'click', '[data-padrao]', (e, b) => {
    const alvoEnd = state.enderecos.find(x => x.id === b.dataset.padrao);
    salvarEndereco({ ...alvoEnd, padrao: true });
    toast({ titulo: 'Endereço padrão atualizado', tipo: 'success', duracao: 2600 });
  });

  delegate(root, 'click', '[data-excluir-endereco]', async (e, b) => {
    const ok = await confirmar({
      titulo: 'Excluir endereço',
      msg: 'Este endereço será removido da sua conta. Esta ação não pode ser desfeita.',
      confirmarLabel: 'Excluir',
    });
    if (!ok) return;
    excluirEndereco(b.dataset.excluirEndereco);
    toast({ titulo: 'Endereço excluído', tipo: 'info' });
  });

  delegate(root, 'click', '[data-tirar-fav]', (e, b) => {
    const p = acharProduto(b.dataset.tirarFav);
    alternarFavorito(b.dataset.tirarFav);
    toast({
      titulo: 'Removido dos favoritos',
      msg: p?.nome,
      tipo: 'info',
      acao: { label: 'Desfazer', onClick: () => alternarFavorito(b.dataset.tirarFav) },
    });
  });

  delegate(root, 'submit', '[data-form-perfil]', (e) => {
    e.preventDefault();
    const form = e.target;
    const get = (n) => qs(`[name="${n}"]`, form).value.trim();

    qsa('[data-erro]', form).forEach(x => { x.hidden = true; });
    qsa('[aria-invalid]', form).forEach(x => x.removeAttribute('aria-invalid'));

    const erros = [];
    if (get('nome').length < 3) erros.push(['nome', 'Informe seu nome completo.']);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(get('email'))) erros.push(['email', 'Informe um e-mail válido.']);

    if (erros.length) {
      erros.forEach(([n, msg]) => {
        qs(`[name="${n}"]`, form).setAttribute('aria-invalid', 'true');
        const er = qs(`[data-erro="${n}"]`, form);
        if (er) { er.textContent = msg; er.hidden = false; }
      });
      qs(`[name="${erros[0][0]}"]`, form).focus();
      toast({ titulo: 'Confira os campos destacados', tipo: 'danger' });
      return;
    }

    salvarPerfil({
      nome: get('nome'), email: get('email'), telefone: get('telefone'),
      cpf: get('cpf'), nascimento: get('nascimento'),
    });
    toast({ titulo: 'Dados salvos', msg: 'Suas informações foram atualizadas.', tipo: 'success' });
  });

  delegate(root, 'change', '[data-config]', (e, input) => {
    salvarConfig(input.dataset.config, input.checked);
    toast({ titulo: input.checked ? 'Ativado' : 'Desativado', tipo: 'info', duracao: 1800 });
  });

  delegate(root, 'click', '[data-resetar]', async () => {
    const ok = await confirmar({
      titulo: 'Restaurar dados originais',
      msg: 'Carrinho, favoritos, pedidos e todas as alterações feitas no painel administrativo voltam ao estado inicial.',
      confirmarLabel: 'Restaurar',
    });
    if (!ok) return;
    const { resetarTudo } = await import('../services/store.js');
    resetarTudo();
    toast({ titulo: 'Dados restaurados', tipo: 'success' });
    ir('/');
  });

  const desassinar = subscribe(pintar);
  pintar();
  return () => desassinar();
}
