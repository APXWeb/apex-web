/* ============================================================
   VANTA — Checkout em 5 etapas
   Identificacao -> Endereco -> Entrega -> Pagamento -> Revisao
   ============================================================ */

import { qs, qsa, delegate } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { arteProduto } from '../components/media.js';
import { money, escapeHtml, num, dataMedia, somaDias, hoje } from '../utils/format.js';
import { totais, state, finalizarPedido } from '../services/store.js';
import { toast, vazio } from '../components/ui.js';
import { ir } from '../router.js';

const PASSOS = [
  { id: 1, label: 'Identificação' },
  { id: 2, label: 'Endereço' },
  { id: 3, label: 'Entrega' },
  { id: 4, label: 'Pagamento' },
  { id: 5, label: 'Revisão' },
];

const ENTREGAS = [
  { id: 'expressa', nome: 'Entrega expressa', dias: 2, preco: 3990, desc: 'Chega em até 2 dias úteis' },
  { id: 'padrao',   nome: 'Entrega padrão',   dias: 6, preco: 2490, desc: 'Entre 4 e 6 dias úteis' },
  { id: 'retirada', nome: 'Retirar no ponto', dias: 3, preco: 0,    desc: 'Disponível em 3 dias no ponto parceiro' },
];

export function paginaCheckout(root) {
  const t = totais();

  if (!t.itens.length) {
    root.innerHTML = `
      <div class="shell section">
        ${vazio({
          icone: 'sacola',
          titulo: 'Não há nada para finalizar',
          texto: 'Adicione produtos ao carrinho antes de ir para o checkout.',
          acao: `<a href="#/catalogo" class="btn btn--primary">Ver produtos</a>`,
        })}
      </div>`;
    return () => {};
  }

  // Dados do pedido em andamento
  const enderecoPadrao = state.enderecos.find(e => e.padrao) || state.enderecos[0];
  const dados = {
    nome: state.perfil.nome,
    email: state.perfil.email,
    telefone: state.perfil.telefone,
    cpf: state.perfil.cpf,
    enderecoId: enderecoPadrao?.id || null,
    novoEndereco: null,
    entrega: t.freteGratis ? 'padrao' : 'padrao',
    pagamento: 'pix',
    parcelas: 12,
  };

  let passo = 1;

  root.innerHTML = `
    <div class="shell">
      <nav class="crumbs" aria-label="Você está em">
        <a href="#/carrinho">Carrinho</a>
        <span class="crumbs__sep">${icon.chevronR({ size: 13 })}</span>
        <span aria-current="page">Checkout</span>
      </nav>

      <div class="passos" data-passos role="list" aria-label="Etapas do checkout"></div>

      <div class="checkout-layout">
        <div>
          <div class="panel">
            <div class="panel__body" data-etapa></div>
          </div>
        </div>
        <aside class="resumo-card" aria-label="Resumo do pedido" data-resumo></aside>
      </div>
    </div>`;

  const elPassos = qs('[data-passos]', root);
  const elEtapa = qs('[data-etapa]', root);
  const elResumo = qs('[data-resumo]', root);

  /* ---------- Cabecalho de etapas ---------- */
  function pintarPassos() {
    elPassos.innerHTML = PASSOS.map((p, i) => `
      ${i > 0 ? '<span class="passo__linha" aria-hidden="true"></span>' : ''}
      <div class="passo ${p.id === passo ? 'is-atual' : p.id < passo ? 'is-feito' : ''}" role="listitem"
           ${p.id === passo ? 'aria-current="step"' : ''}>
        <span class="passo__n">${p.id < passo ? icon.check({ size: 15 }) : p.id}</span>
        <span class="passo__l">${p.label}</span>
      </div>`).join('');
  }

  /* ---------- Resumo lateral ---------- */
  function pintarResumo() {
    const entrega = ENTREGAS.find(e => e.id === dados.entrega);
    const frete = t.freteGratis && entrega.id !== 'expressa' ? 0 : entrega.preco;
    const total = Math.max(0, t.subtotal - t.descontoCupom + frete);
    const noPix = dados.pagamento === 'pix';
    const totalFinal = noPix ? Math.round(total * 0.92) : total;

    elResumo.innerHTML = `
      <h2 style="font-size:var(--fs-lg)">Seu pedido</h2>

      <div>
        ${t.itens.map(i => `
          <div class="mini-item">
            <span class="mini-item__art">
              ${arteProduto(i.produto, { cor: i.cor, mini: true })}
              <span class="mini-item__qtd">${i.qtd}</span>
            </span>
            <span class="mini-item__n">${escapeHtml(i.produto.nome)}</span>
            <span class="price">${money(i.subtotal)}</span>
          </div>`).join('')}
      </div>

      <dl class="tot">
        <div class="tot__row"><dt>Subtotal</dt><dd class="price">${money(t.subtotal)}</dd></div>
        ${t.descontoCupom ? `<div class="tot__row tot__row--ok"><dt>Cupom</dt><dd class="price">-${money(t.descontoCupom)}</dd></div>` : ''}
        <div class="tot__row"><dt>Frete (${escapeHtml(entrega.nome.toLowerCase())})</dt>
          <dd class="price">${frete === 0 ? '<span class="tot__free">Grátis</span>' : money(frete)}</dd></div>
        ${noPix ? `<div class="tot__row tot__row--ok"><dt>Desconto PIX (8%)</dt><dd class="price">-${money(total - totalFinal)}</dd></div>` : ''}
        <div class="tot__row tot__row--total"><dt>Total</dt><dd class="price">${money(totalFinal)}</dd></div>
      </dl>

      ${!noPix && dados.pagamento === 'cartao' ? `
        <p class="dim" style="font-size:var(--fs-sm);text-align:center">
          em ${dados.parcelas}x de <strong style="color:var(--text-primary)">${money(Math.round(total / dados.parcelas))}</strong> sem juros
        </p>` : ''}

      <div class="stack stack--sm" style="font-size:var(--fs-xs);color:var(--text-tertiary)">
        <span class="row" style="gap:8px">${icon.escudo({ size: 14 })} Ambiente de demonstração, nenhum pagamento real</span>
      </div>`;
  }

  /* ---------- Etapas ---------- */
  function etapa1() {
    return `
      <h2 style="font-size:var(--fs-lg);margin-bottom:6px">Identificação</h2>
      <p class="dim" style="font-size:var(--fs-sm);margin-bottom:24px">Para onde mandamos a confirmação do pedido.</p>
      <form class="form-grid" data-form novalidate>
        <div class="field span-2">
          <label class="field__label" for="ck-nome">Nome completo <span class="req">*</span></label>
          <input type="text" id="ck-nome" class="input" name="nome" value="${escapeHtml(dados.nome)}" autocomplete="name" required>
          <p class="field__error" data-erro="nome" hidden></p>
        </div>
        <div class="field">
          <label class="field__label" for="ck-email">E-mail <span class="req">*</span></label>
          <input type="email" id="ck-email" class="input" name="email" value="${escapeHtml(dados.email)}" autocomplete="email" required>
          <p class="field__error" data-erro="email" hidden></p>
        </div>
        <div class="field">
          <label class="field__label" for="ck-tel">Telefone <span class="req">*</span></label>
          <input type="tel" id="ck-tel" class="input" name="telefone" value="${escapeHtml(dados.telefone)}" autocomplete="tel" required>
          <p class="field__error" data-erro="telefone" hidden></p>
        </div>
        <div class="field span-2">
          <label class="field__label" for="ck-cpf">CPF</label>
          <input type="text" id="ck-cpf" class="input" name="cpf" value="${escapeHtml(dados.cpf)}" inputmode="numeric">
          <p class="field__hint">Usado apenas para a emissão da nota fiscal.</p>
        </div>
      </form>`;
  }

  function etapa2() {
    return `
      <h2 style="font-size:var(--fs-lg);margin-bottom:6px">Endereço de entrega</h2>
      <p class="dim" style="font-size:var(--fs-sm);margin-bottom:24px">Escolha um endereço salvo ou cadastre outro.</p>
      <div class="stack" data-form>
        ${state.enderecos.map(e => `
          <label class="opcao">
            <input type="radio" name="end" value="${e.id}" ${dados.enderecoId === e.id ? 'checked' : ''}>
            <span class="opcao__body">
              <span class="opcao__t">${escapeHtml(e.rotulo)}
                ${e.padrao ? '<span class="badge badge--neutral">Padrão</span>' : ''}</span>
              <span class="opcao__d">
                ${escapeHtml(e.rua)}${e.complemento ? `, ${escapeHtml(e.complemento)}` : ''}<br>
                ${escapeHtml(e.bairro)} — ${escapeHtml(e.cidade)}/${escapeHtml(e.uf)} · CEP ${escapeHtml(e.cep)}
              </span>
            </span>
          </label>`).join('')}
        <label class="opcao">
          <input type="radio" name="end" value="novo" ${dados.enderecoId === 'novo' ? 'checked' : ''}>
          <span class="opcao__body">
            <span class="opcao__t">${icon.mais({ size: 15 })} Usar outro endereço</span>
            <span class="opcao__d">Cadastrar um endereço novo para esta entrega</span>
          </span>
        </label>

        <div data-novo-end ${dados.enderecoId === 'novo' ? '' : 'hidden'}>
          <div class="form-grid" style="padding-top:8px">
            <div class="field">
              <label class="field__label" for="ne-cep">CEP <span class="req">*</span></label>
              <input type="text" id="ne-cep" class="input" name="cep" maxlength="9" inputmode="numeric" autocomplete="postal-code">
              <p class="field__error" data-erro="cep" hidden></p>
            </div>
            <div class="field">
              <label class="field__label" for="ne-num">Número <span class="req">*</span></label>
              <input type="text" id="ne-num" class="input" name="numero" inputmode="numeric">
              <p class="field__error" data-erro="numero" hidden></p>
            </div>
            <div class="field span-2">
              <label class="field__label" for="ne-rua">Rua <span class="req">*</span></label>
              <input type="text" id="ne-rua" class="input" name="rua" autocomplete="street-address">
              <p class="field__error" data-erro="rua" hidden></p>
            </div>
            <div class="field">
              <label class="field__label" for="ne-bairro">Bairro</label>
              <input type="text" id="ne-bairro" class="input" name="bairro">
            </div>
            <div class="field">
              <label class="field__label" for="ne-comp">Complemento</label>
              <input type="text" id="ne-comp" class="input" name="complemento">
            </div>
            <div class="field">
              <label class="field__label" for="ne-cidade">Cidade <span class="req">*</span></label>
              <input type="text" id="ne-cidade" class="input" name="cidade">
              <p class="field__error" data-erro="cidade" hidden></p>
            </div>
            <div class="field">
              <label class="field__label" for="ne-uf">Estado <span class="req">*</span></label>
              <select id="ne-uf" class="select" name="uf">
                ${['SP','RJ','MG','PR','RS','SC','BA','PE','CE','DF','GO','ES']
                  .map(uf => `<option value="${uf}">${uf}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
      </div>`;
  }

  function etapa3() {
    return `
      <h2 style="font-size:var(--fs-lg);margin-bottom:6px">Forma de entrega</h2>
      <p class="dim" style="font-size:var(--fs-sm);margin-bottom:24px">Prazos contados a partir da confirmação do pagamento.</p>
      <div class="stack" data-form>
        ${ENTREGAS.map(e => {
          const gratis = t.freteGratis && e.id !== 'expressa';
          return `
          <label class="opcao">
            <input type="radio" name="entrega" value="${e.id}" ${dados.entrega === e.id ? 'checked' : ''}>
            <span class="opcao__body">
              <span class="opcao__t">
                ${icon.caminhao({ size: 16 })} ${escapeHtml(e.nome)}
              </span>
              <span class="opcao__d">${escapeHtml(e.desc)} · chega até ${dataMedia(somaDias(hoje(), e.dias))}</span>
            </span>
            <span class="opcao__preco ${gratis || e.preco === 0 ? 'tot__free' : ''}">
              ${gratis || e.preco === 0 ? 'Grátis' : money(e.preco)}
            </span>
          </label>`;
        }).join('')}
      </div>`;
  }

  function etapa4() {
    const entrega = ENTREGAS.find(e => e.id === dados.entrega);
    const frete = t.freteGratis && entrega.id !== 'expressa' ? 0 : entrega.preco;
    const total = Math.max(0, t.subtotal - t.descontoCupom + frete);

    return `
      <h2 style="font-size:var(--fs-lg);margin-bottom:6px">Pagamento</h2>
      <p class="dim" style="font-size:var(--fs-sm);margin-bottom:24px">
        Este é um ambiente de demonstração: nenhuma cobrança é feita.
      </p>
      <div class="stack" data-form>
        <label class="opcao">
          <input type="radio" name="pag" value="pix" ${dados.pagamento === 'pix' ? 'checked' : ''}>
          <span class="opcao__body">
            <span class="opcao__t">${icon.pix({ size: 16 })} PIX
              <span class="badge badge--success">8% de desconto</span></span>
            <span class="opcao__d">Aprovação imediata · ${money(Math.round(total * 0.92))} à vista</span>
          </span>
        </label>

        <label class="opcao">
          <input type="radio" name="pag" value="cartao" ${dados.pagamento === 'cartao' ? 'checked' : ''}>
          <span class="opcao__body">
            <span class="opcao__t">${icon.cartao({ size: 16 })} Cartão de crédito</span>
            <span class="opcao__d">Em até 12x sem juros</span>
          </span>
        </label>

        <div data-cartao ${dados.pagamento === 'cartao' ? '' : 'hidden'}>
          <div class="form-grid" style="padding:8px 0 8px 52px">
            <div class="field span-2">
              <label class="field__label" for="cc-num">Número do cartão</label>
              <input type="text" id="cc-num" class="input" placeholder="0000 0000 0000 0000" inputmode="numeric" maxlength="19" autocomplete="cc-number">
            </div>
            <div class="field span-2">
              <label class="field__label" for="cc-nome">Nome impresso no cartão</label>
              <input type="text" id="cc-nome" class="input" autocomplete="cc-name">
            </div>
            <div class="field">
              <label class="field__label" for="cc-val">Validade</label>
              <input type="text" id="cc-val" class="input" placeholder="MM/AA" maxlength="5" inputmode="numeric" autocomplete="cc-exp">
            </div>
            <div class="field">
              <label class="field__label" for="cc-cvv">CVV</label>
              <input type="text" id="cc-cvv" class="input" placeholder="000" maxlength="4" inputmode="numeric" autocomplete="cc-csc">
            </div>
            <div class="field span-2">
              <label class="field__label" for="cc-par">Parcelamento</label>
              <select id="cc-par" class="select" data-parcelas>
                ${Array.from({ length: 12 }, (_, i) => i + 1)
                  .filter(n => total / n >= 5000 || n === 1)
                  .map(n => `<option value="${n}" ${dados.parcelas === n ? 'selected' : ''}>
                    ${n}x de ${money(Math.round(total / n))} sem juros</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <label class="opcao">
          <input type="radio" name="pag" value="boleto" ${dados.pagamento === 'boleto' ? 'checked' : ''}>
          <span class="opcao__body">
            <span class="opcao__t">${icon.caixa({ size: 16 })} Boleto bancário</span>
            <span class="opcao__d">Vence em 3 dias · o pedido é liberado após a compensação</span>
          </span>
        </label>
      </div>`;
  }

  function etapa5() {
    const entrega = ENTREGAS.find(e => e.id === dados.entrega);
    const end = dados.enderecoId === 'novo'
      ? dados.novoEndereco
      : state.enderecos.find(e => e.id === dados.enderecoId);
    const rotuloPag = { pix: 'PIX', cartao: `Cartão de crédito (${dados.parcelas}x)`, boleto: 'Boleto bancário' }[dados.pagamento];

    return `
      <h2 style="font-size:var(--fs-lg);margin-bottom:6px">Revisão do pedido</h2>
      <p class="dim" style="font-size:var(--fs-sm);margin-bottom:24px">Confira tudo antes de confirmar.</p>

      <div class="stack stack--lg">
        ${[
          ['Identificação', 1, `${escapeHtml(dados.nome)}<br>${escapeHtml(dados.email)} · ${escapeHtml(dados.telefone)}`],
          ['Entrega em', 2, end
            ? `${escapeHtml(end.rua || '')}${end.numero ? `, ${escapeHtml(end.numero)}` : ''}${end.complemento ? ` — ${escapeHtml(end.complemento)}` : ''}<br>
               ${escapeHtml(end.bairro || '')} · ${escapeHtml(end.cidade || '')}/${escapeHtml(end.uf || '')} · CEP ${escapeHtml(end.cep || '')}`
            : 'Endereço não informado'],
          ['Forma de entrega', 3, `${escapeHtml(entrega.nome)} · chega até ${dataMedia(somaDias(hoje(), entrega.dias))}`],
          ['Pagamento', 4, rotuloPag],
        ].map(([titulo, paraEtapa, corpo]) => `
          <div>
            <div class="row row--between" style="margin-bottom:8px">
              <p style="font-size:var(--fs-xs);font-weight:600;letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--text-tertiary)">
                ${titulo}
              </p>
              <button type="button" class="btn btn--ghost btn--sm" data-voltar-para="${paraEtapa}">Alterar</button>
            </div>
            <p style="font-size:var(--fs-base);color:var(--text-secondary);line-height:1.6">${corpo}</p>
          </div>`).join('')}

        <div>
          <p style="font-size:var(--fs-xs);font-weight:600;letter-spacing:var(--tracking-caps);text-transform:uppercase;color:var(--text-tertiary);margin-bottom:12px">
            Itens (${num(t.qtd)})
          </p>
          ${t.itens.map(i => `
            <div class="mini-item">
              <span class="mini-item__art">
                ${arteProduto(i.produto, { cor: i.cor, mini: true })}
                <span class="mini-item__qtd">${i.qtd}</span>
              </span>
              <span class="mini-item__n">${escapeHtml(i.produto.nome)}</span>
              <span class="price">${money(i.subtotal)}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }

  const ETAPAS = { 1: etapa1, 2: etapa2, 3: etapa3, 4: etapa4, 5: etapa5 };

  /* ---------- Navegacao ---------- */
  function pintarEtapa() {
    elEtapa.innerHTML = `
      ${ETAPAS[passo]()}
      <div class="row row--between" style="padding-top:28px;margin-top:24px;border-top:1px solid var(--border-subtle);gap:12px;flex-wrap:wrap">
        ${passo > 1
          ? `<button type="button" class="btn btn--ghost" data-anterior>${icon.chevronL({ size: 16 })} Voltar</button>`
          : `<a href="#/carrinho" class="btn btn--ghost">${icon.chevronL({ size: 16 })} Voltar ao carrinho</a>`}
        <button type="button" class="btn btn--primary btn--lg" data-proximo style="margin-left:auto">
          ${passo === 5 ? 'Confirmar pedido' : 'Continuar'} ${icon.seta({ size: 17 })}
        </button>
      </div>`;

    pintarPassos();
    pintarResumo();
    ligarEtapa();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function ligarEtapa() {
    // Etapa 2: revelar formulario de endereco novo
    delegate(elEtapa, 'change', 'input[name="end"]', (e, input) => {
      dados.enderecoId = input.value;
      const bloco = qs('[data-novo-end]', elEtapa);
      if (bloco) bloco.hidden = input.value !== 'novo';
    });

    delegate(elEtapa, 'change', 'input[name="entrega"]', (e, input) => {
      dados.entrega = input.value;
      pintarResumo();
    });

    delegate(elEtapa, 'change', 'input[name="pag"]', (e, input) => {
      dados.pagamento = input.value;
      const bloco = qs('[data-cartao]', elEtapa);
      if (bloco) bloco.hidden = input.value !== 'cartao';
      pintarResumo();
    });

    delegate(elEtapa, 'change', '[data-parcelas]', (e, sel) => {
      dados.parcelas = Number(sel.value);
      pintarResumo();
    });

    // Mascara de CEP
    const cepNovo = qs('#ne-cep', elEtapa);
    cepNovo?.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 8);
      if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
      e.target.value = v;
    });

    // Mascara do cartao
    qs('#cc-num', elEtapa)?.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    });
    qs('#cc-val', elEtapa)?.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 4);
      if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
      e.target.value = v;
    });
  }

  /* ---------- Validacao por etapa ---------- */
  function validar() {
    const erros = [];
    const marcar = (nome, msg) => {
      erros.push({ nome, msg });
      const campo = qs(`[name="${nome}"]`, elEtapa);
      const alvoErro = qs(`[data-erro="${nome}"]`, elEtapa);
      if (campo) campo.setAttribute('aria-invalid', 'true');
      if (alvoErro) { alvoErro.textContent = msg; alvoErro.hidden = false; }
    };

    qsa('[data-erro]', elEtapa).forEach(e => { e.hidden = true; });
    qsa('[aria-invalid]', elEtapa).forEach(e => e.removeAttribute('aria-invalid'));

    if (passo === 1) {
      const nome = qs('[name="nome"]', elEtapa).value.trim();
      const email = qs('[name="email"]', elEtapa).value.trim();
      const tel = qs('[name="telefone"]', elEtapa).value.trim();
      if (nome.length < 3) marcar('nome', 'Informe seu nome completo.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) marcar('email', 'Informe um e-mail válido.');
      if (tel.replace(/\D/g, '').length < 10) marcar('telefone', 'Informe um telefone com DDD.');
      if (!erros.length) Object.assign(dados, { nome, email, telefone: tel, cpf: qs('[name="cpf"]', elEtapa).value.trim() });
    }

    if (passo === 2) {
      if (!dados.enderecoId) marcar('end', 'Escolha um endereço.');
      if (dados.enderecoId === 'novo') {
        const get = (n) => qs(`[name="${n}"]`, elEtapa)?.value.trim() || '';
        if (get('cep').replace(/\D/g, '').length !== 8) marcar('cep', 'CEP deve ter 8 dígitos.');
        if (!get('rua')) marcar('rua', 'Informe a rua.');
        if (!get('numero')) marcar('numero', 'Informe o número.');
        if (!get('cidade')) marcar('cidade', 'Informe a cidade.');
        if (!erros.length) {
          dados.novoEndereco = {
            cep: get('cep'), rua: get('rua'), numero: get('numero'), complemento: get('complemento'),
            bairro: get('bairro'), cidade: get('cidade'), uf: get('uf'),
          };
        }
      }
    }

    if (erros.length) {
      const primeiro = qs(`[name="${erros[0].nome}"]`, elEtapa);
      primeiro?.focus();
      toast({
        titulo: erros.length === 1 ? 'Confira um campo' : `Confira ${erros.length} campos`,
        msg: erros[0].msg,
        tipo: 'danger',
      });
      return false;
    }
    return true;
  }

  /* ---------- Fluxo ---------- */
  delegate(root, 'click', '[data-proximo]', (e, botao) => {
    if (!validar()) return;

    if (passo < 5) { passo++; pintarEtapa(); return; }

    // Confirmacao final
    botao.classList.add('is-loading');
    botao.disabled = true;

    setTimeout(() => {
      const entrega = ENTREGAS.find(x => x.id === dados.entrega);
      const end = dados.enderecoId === 'novo'
        ? dados.novoEndereco
        : state.enderecos.find(x => x.id === dados.enderecoId);

      const r = finalizarPedido({
        nome: dados.nome,
        email: dados.email,
        pagamento: { pix: 'Pix', cartao: 'Cartão de crédito', boleto: 'Boleto' }[dados.pagamento],
        prazoDias: entrega.dias,
        endereco: end
          ? `${end.rua}${end.numero ? `, ${end.numero}` : ''} — ${end.cidade}/${end.uf}`
          : 'Endereço não informado',
      });

      if (!r.ok) {
        botao.classList.remove('is-loading');
        botao.disabled = false;
        toast({ titulo: 'Não foi possível concluir', msg: r.motivo, tipo: 'danger' });
        return;
      }

      ir(`/pedido/${r.pedido.id}`);
    }, 1100);
  });

  delegate(root, 'click', '[data-anterior]', () => {
    if (passo > 1) { passo--; pintarEtapa(); }
  });

  delegate(root, 'click', '[data-voltar-para]', (e, b) => {
    passo = Number(b.dataset.voltarPara);
    pintarEtapa();
  });

  pintarEtapa();
  return () => {};
}
