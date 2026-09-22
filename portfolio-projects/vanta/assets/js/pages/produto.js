/* ============================================================
   VANTA — Pagina de produto
   Estrutura de marketplace: galeria + identificacao + buy box
   separada, com frete por CEP, notas detalhadas e perguntas.
   ============================================================ */

import { qs, qsa, delegate, observarAnimacoes } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { arteDeSlide, galeriaDe, coresDe, nomeCor } from '../components/media.js';
import { estrelas, blocoAvaliacao, miniProduto } from '../components/productCard.js';
import {
  money, parcelas, num, escapeHtml, dataMedia, haQuantoTempo, iniciais, dataLonga,
} from '../utils/format.js';
import {
  acharProduto, precoVigente, avaliacoesDe, relacionados, ehFavorito,
  adicionarAoCarrinho, state, FRETE_GRATIS_ACIMA,
} from '../services/store.js';
import { toast } from '../components/ui.js';
import { ir } from '../router.js';

/* Perguntas ficticias, variadas por produto para nao repetir */
const PERGUNTAS = [
  ['Tem garantia no Brasil?', 'Sim. A garantia é de {garantia} e o atendimento é feito direto pela VANTA, sem intermediário.'],
  ['Qual o prazo de entrega para o interior?', 'Depende do CEP. Você pode simular na calculadora de frete aqui na página, é instantâneo.'],
  ['Vem com nota fiscal?', 'Vem sim, nota fiscal eletrônica enviada por e-mail junto com o código de rastreio.'],
  ['Posso trocar se não gostar?', 'Pode. São 30 dias corridos para devolução, com frete de retorno por nossa conta.'],
  ['É original ou paralelo?', 'Todos os produtos vêm direto do distribuidor oficial da marca.'],
];

export function paginaProduto(root, id) {
  const p = acharProduto(id);

  if (!p || !p.publicado) {
    root.innerHTML = `
      <div class="shell section">
        <div class="empty">
          <span class="empty__icon">${icon.vazio({ size: 28 })}</span>
          <h1 class="empty__title">Produto não encontrado</h1>
          <p class="empty__text">Este item pode ter saído do catálogo.</p>
          <a href="#/catalogo" class="btn btn--primary">Ver catálogo</a>
        </div>
      </div>`;
    document.title = 'Produto não encontrado | VANTA';
    return () => {};
  }

  document.title = `${p.nome} | VANTA`;

  const pr = precoVigente(p);
  const par = parcelas(pr.preco);
  const pix = Math.round(pr.preco * 0.92);
  const off = pr.de && pr.de > pr.preco ? Math.round((1 - pr.preco / pr.de) * 100) : 0;
  const reviews = avaliacoesDe(p.id);
  const cat = state.categorias.find(c => c.id === p.cat);
  const freteGratis = pr.preco >= FRETE_GRATIS_ACIMA;

  // Estado local desta pagina
  const cores = coresDe(p);
  let corAtiva = cores[0]?.id || p.finish;
  let qtd = 1;
  let slideAtivo = 0;

  // Galeria da cor escolhida; muda junto com a cor
  let galeria = galeriaDe(p, corAtiva);

  const SIZES_PALCO = '(max-width: 720px) 92vw, (max-width: 1180px) 60vw, 560px';
  const htmlPalco = () => arteDeSlide(galeria[slideAtivo] || galeria[0], p, {
    eager: true, sizes: SIZES_PALCO,
  });
  const htmlThumbs = () => galeria.map((s, i) => `
    <button type="button" class="pdp__thumb" role="tab" data-slide="${i}"
            aria-current="${i === slideAtivo}"
            aria-label="Ver imagem ${i + 1} de ${galeria.length}">
      ${arteDeSlide(s, p, { mini: true })}
    </button>`).join('');

  // Distribuicao das notas
  const dist = [5, 4, 3, 2, 1].map(n => ({
    n,
    qtd: reviews.filter(r => r.nota === n).length,
  }));
  const maxDist = Math.max(1, ...dist.map(d => d.qtd));

  const garantia = (p.specs.find(([k]) => /garantia/i.test(k)) || [, '12 meses'])[1];

  root.innerHTML = `
  <div class="shell">
    <nav class="crumbs" aria-label="Você está em">
      <a href="#/">Início</a>
      <span class="crumbs__sep">${icon.chevronR({ size: 13 })}</span>
      <a href="#/catalogo">Catálogo</a>
      <span class="crumbs__sep">${icon.chevronR({ size: 13 })}</span>
      <a href="#/catalogo?cat=${p.cat}">${escapeHtml(cat?.nome || '')}</a>
      <span class="crumbs__sep">${icon.chevronR({ size: 13 })}</span>
      <span aria-current="page">${escapeHtml(p.nome)}</span>
    </nav>

    <div class="pdp ${galeria.length < 2 ? 'pdp--unica' : ''}">
      <!-- Miniaturas -->
      <div class="pdp__thumbs" role="tablist" aria-label="Imagens do produto"
           ${galeria.length < 2 ? 'hidden' : ''} data-thumbs>
        ${htmlThumbs()}
      </div>

      <!-- Galeria -->
      <div class="pdp__galeria">
        <div class="pdp__palco" data-palco>
          <div class="pdp__palco-flags">
            ${p.vendidos > 600 ? `<span class="pcard__flag pcard__flag--top">${icon.medalha({ size: 12 })} Mais vendido</span>` : ''}
            ${p.novo ? `<span class="pcard__flag pcard__flag--new">Novo</span>` : ''}
            ${off ? `<span class="pcard__flag pcard__flag--off">${off}% OFF</span>` : ''}
          </div>
          <div data-arte-grande>${htmlPalco()}</div>
          <span class="pdp__zoom-dica">${icon.olho({ size: 13 })} Passe o mouse para ampliar</span>
        </div>
      </div>

      <!-- Identificacao -->
      <div class="pdp__info">
        <p class="pdp__marca">${escapeHtml(p.marca)}</p>
        <h1 class="pdp__nome">${escapeHtml(p.nome)}</h1>

        <div class="pdp__meta">
          ${blocoAvaliacao(p, 15)}
          <a href="#avaliacoes">${num(reviews.length)} avaliações</a>
          <span>·</span>
          <span>${num(p.vendidos)} vendidos</span>
          <span>·</span>
          <span class="tabular">SKU ${escapeHtml(p.sku)}</span>
        </div>

        <p class="pdp__resumo">${escapeHtml(p.resumo)}</p>

        ${cores.length > 1 ? `
          <div class="stack stack--sm" style="padding-bottom:20px">
            <p style="font-size:var(--fs-sm);font-weight:600">
              Cor: <span class="muted" style="font-weight:400" data-cor-nome>${escapeHtml(nomeCor(p, corAtiva))}</span>
            </p>
            <div class="cores">
              ${cores.map((c) => `
                <button type="button" class="cor-opt" data-cor="${c.id}" aria-pressed="${c.id === corAtiva}"
                        style="background:${c.hex || amostraCor(c.id)}"
                        aria-label="Cor ${escapeHtml(c.nome)}"></button>`).join('')}
            </div>
          </div>` : ''}

        <ul class="stack stack--sm" style="padding-block:20px;border-top:1px solid var(--border-subtle)">
          ${p.specs.slice(0, 4).map(([k, v]) => `
            <li style="display:flex;gap:12px;font-size:var(--fs-base)">
              <span class="dim" style="min-width:120px">${escapeHtml(k)}</span>
              <span>${escapeHtml(v)}</span>
            </li>`).join('')}
        </ul>
      </div>

      <!-- Buy box -->
      <aside class="buybox" aria-label="Compra">
        <div class="buybox__preco">
          ${pr.de && pr.de > pr.preco ? `<span class="buybox__was">${money(pr.de)}</span>` : ''}
          <div class="buybox__now">
            <span class="buybox__valor price">${money(pr.preco)}</span>
            ${off ? `<span class="buybox__off">${off}% OFF</span>` : ''}
          </div>
          <p class="buybox__inst">em <strong>${par.n}x ${money(par.valor)}</strong> sem juros</p>
          <p class="buybox__pix">${icon.pix({ size: 14 })} ${money(pix)} à vista no PIX (8% off)</p>
        </div>

        <div class="buybox__entrega">
          <div class="buybox__linha">
            ${icon.caminhao({ size: 17 })}
            <span>
              ${freteGratis
                ? `<strong style="color:var(--success)">Frete grátis</strong> para todo o Brasil`
                : `Frete a partir de <strong>R$ 24,90</strong>`}
              <br><span class="dim">Chega entre ${dataMedia(prazo(3))} e ${dataMedia(prazo(7))}</span>
            </span>
          </div>
          <div class="buybox__linha">
            ${icon.retorno({ size: 17 })}
            <span><strong>Devolução grátis</strong> em até 30 dias</span>
          </div>
          <div class="buybox__linha">
            ${icon.escudo({ size: 17 })}
            <span>Garantia de <strong>${escapeHtml(garantia)}</strong></span>
          </div>
        </div>

        <!-- Calculadora de frete -->
        <div class="cep-calc">
          <label for="cep" style="font-size:var(--fs-sm);font-weight:600">Calcular frete e prazo</label>
          <form class="cep-calc__form" data-cep-form novalidate>
            <input type="text" id="cep" class="input" placeholder="00000-000" inputmode="numeric"
                   maxlength="9" autocomplete="postal-code" aria-describedby="cep-erro">
            <button type="submit" class="btn btn--secondary btn--sm">Calcular</button>
          </form>
          <p class="field__error" id="cep-erro" hidden></p>
          <div data-cep-res></div>
        </div>

        <p class="buybox__estoque ${p.estoque === 0 ? 'buybox__estoque--out' : p.estoque <= 5 ? 'buybox__estoque--low' : 'buybox__estoque--ok'}">
          ${p.estoque === 0
            ? `${icon.alerta({ size: 14 })} Produto esgotado`
            : p.estoque <= 5
              ? `${icon.fogo({ size: 14 })} Últimas ${p.estoque} unidades`
              : `${icon.checkCirculo({ size: 14 })} Em estoque (${num(p.estoque)} disponíveis)`}
        </p>

        ${p.estoque > 0 ? `
          <div class="row row--between">
            <label for="qtd-sel" style="font-size:var(--fs-sm)">Quantidade</label>
            <div class="qty qty--lg">
              <button type="button" class="qty__btn" data-q="-1" aria-label="Diminuir">${icon.menos({ size: 16 })}</button>
              <span class="qty__n" id="qtd-sel" aria-live="polite" data-qtd>1</span>
              <button type="button" class="qty__btn" data-q="1" aria-label="Aumentar">${icon.mais({ size: 16 })}</button>
            </div>
          </div>` : ''}

        <div class="stack stack--sm">
          <button type="button" class="btn btn--primary btn--lg btn--block" data-comprar ${p.estoque === 0 ? 'disabled' : ''}>
            ${p.estoque === 0 ? 'Produto indisponível' : 'Comprar agora'}
          </button>
          <button type="button" class="btn btn--outline btn--block" data-add-pdp ${p.estoque === 0 ? 'disabled' : ''}>
            ${icon.carrinho({ size: 17 })} Adicionar ao carrinho
          </button>
          <button type="button" class="btn btn--ghost btn--block ${ehFavorito(p.id) ? 'is-on' : ''}" data-fav="${p.id}"
                  aria-pressed="${ehFavorito(p.id)}">
            ${icon.coracao({ size: 17, fill: ehFavorito(p.id) })} Salvar nos favoritos
          </button>
        </div>

        <div class="pay-methods" style="justify-content:center;flex-wrap:wrap;padding-top:4px">
          <span class="pay-chip">PIX</span>
          <span class="pay-chip">VISA</span>
          <span class="pay-chip">MASTER</span>
          <span class="pay-chip">ELO</span>
          <span class="pay-chip">BOLETO</span>
        </div>
      </aside>

      <!-- Conteudo longo -->
      <div class="pdp__detalhe">
        <div class="tabs" role="tablist" aria-label="Detalhes do produto">
          <button class="tab" role="tab" aria-selected="true" data-aba="desc">Descrição</button>
          <button class="tab" role="tab" aria-selected="false" data-aba="specs">Especificações</button>
          <button class="tab" role="tab" aria-selected="false" data-aba="aval">Avaliações (${num(reviews.length)})</button>
          <button class="tab" role="tab" aria-selected="false" data-aba="perg">Perguntas</button>
        </div>

        <div style="padding-top:32px">
          <!-- Descricao -->
          <section data-painel="desc">
            <div style="max-width:70ch">
              <p style="font-size:var(--fs-lg);line-height:var(--lh-relaxed);color:var(--text-secondary)">
                ${escapeHtml(p.desc)}
              </p>
            </div>
            <div class="trust" style="border-bottom:0;margin-top:20px">
              ${[
                ['caminhao', 'Entrega rastreada', 'Código enviado assim que despachar'],
                ['retorno', '30 dias para trocar', 'Sem custo de devolução'],
                ['escudo', `Garantia de ${garantia}`, 'Atendimento direto com a VANTA'],
                ['cartao', 'Parcelamento', `Até ${par.n}x sem juros no cartão`],
              ].map(([ic, t, d]) => `
                <div class="trust__item">
                  <span class="trust__icon">${icon[ic]({ size: 19 })}</span>
                  <div><p class="trust__t">${t}</p><p class="trust__d">${d}</p></div>
                </div>`).join('')}
            </div>
          </section>

          <!-- Especificacoes -->
          <section data-painel="specs" hidden>
            <div style="max-width:720px">
              <table class="specs-tabela">
                <tbody>
                  ${p.specs.map(([k, v]) => `
                    <tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}
                  <tr><td>SKU</td><td class="tabular">${escapeHtml(p.sku)}</td></tr>
                  <tr><td>Marca</td><td>${escapeHtml(p.marca)}</td></tr>
                  <tr><td>Categoria</td><td>${escapeHtml(cat?.nome || '')}</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Avaliacoes -->
          <section data-painel="aval" hidden id="avaliacoes">
            ${reviews.length ? `
              <div class="notas-resumo">
                <div class="notas-media">
                  <p class="notas-media__n">${String(p.nota).replace('.', ',')}</p>
                  <div style="display:flex;justify-content:center;margin:8px 0">${estrelas(p.nota, 17)}</div>
                  <p class="dim" style="font-size:var(--fs-sm)">${num(reviews.length)} avaliações</p>
                </div>
                <div class="notas-barras">
                  ${dist.map(d => `
                    <div class="notas-barra">
                      <span>${d.n} ${d.n === 1 ? 'estrela' : 'estrelas'}</span>
                      <span class="notas-barra__trilho">
                        <span class="notas-barra__fill" style="width:${(d.qtd / maxDist) * 100}%"></span>
                      </span>
                      <span class="notas-barra__n">${d.qtd}</span>
                    </div>`).join('')}
                </div>
              </div>

              <div style="margin-top:32px;max-width:760px">
                ${reviews.slice(0, 6).map(r => `
                  <article class="review">
                    <div class="review__head">
                      <span class="avatar" aria-hidden="true">${iniciais(r.cliente)}</span>
                      <div style="flex:1;min-width:0">
                        <p class="review__nome">${escapeHtml(r.cliente)}</p>
                        <p class="review__data">${haQuantoTempo(r.data)}</p>
                      </div>
                      ${estrelas(r.nota, 14)}
                    </div>
                    ${r.verificada ? `<span class="badge badge--success" style="margin-bottom:10px">
                      <span class="badge__dot"></span> Compra verificada</span>` : ''}
                    <p class="review__titulo">${escapeHtml(r.titulo)}</p>
                    <p class="review__texto">${escapeHtml(r.texto)}</p>
                    <div class="review__util">
                      <span>${r.util} pessoas acharam útil</span>
                    </div>
                  </article>`).join('')}
              </div>` : `
              <p class="muted">Este produto ainda não recebeu avaliações.</p>`}
          </section>

          <!-- Perguntas -->
          <section data-painel="perg" hidden>
            <div class="qa" style="max-width:760px">
              ${PERGUNTAS.slice(0, 4).map(([q, a]) => `
                <div class="qa__item">
                  <p class="qa__p">${icon.pergunta({ size: 17 })} <span>${escapeHtml(q)}</span></p>
                  <p class="qa__r">${icon.comentario({ size: 17 })}
                    <span>${escapeHtml(a.replace('{garantia}', garantia))}</span></p>
                </div>`).join('')}
            </div>
            <form class="row" style="max-width:760px;margin-top:24px;gap:12px" data-pergunta novalidate>
              <label class="sr-only" for="nova-pergunta">Escreva sua pergunta</label>
              <input type="text" id="nova-pergunta" class="input" placeholder="Tem alguma dúvida sobre este produto?">
              <button type="submit" class="btn btn--secondary">Perguntar</button>
            </form>
          </section>
        </div>
      </div>
    </div>

    <!-- Relacionados -->
    <section class="section section--tight">
      <header class="section-head">
        <div>
          <span class="eyebrow eyebrow--accent">Da mesma categoria</span>
          <h2 class="section-head__title">Quem viu este, viu também</h2>
        </div>
        <a href="#/catalogo?cat=${p.cat}" class="btn btn--ghost btn--sm">
          Ver ${escapeHtml(cat?.nome || '')} ${icon.chevronR({ size: 15 })}
        </a>
      </header>
      <div class="rail">${relacionados(p, 6).map(miniProduto).join('')}</div>
    </section>
  </div>`;

  /* ---------- Interacoes ---------- */
  const palco = qs('[data-palco]', root);
  const arteGrande = qs('[data-arte-grande]', root);

  // Zoom que segue o cursor (a peca ampliada e a foto ou o SVG)
  const alvoZoom = () => qs('img, svg', arteGrande);
  palco.addEventListener('pointerenter', () => palco.classList.add('is-zoom'));
  palco.addEventListener('pointerleave', () => {
    palco.classList.remove('is-zoom');
    const alvo = alvoZoom();
    if (alvo) alvo.style.transformOrigin = 'center center';
  });
  palco.addEventListener('pointermove', (e) => {
    const r = palco.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    const alvo = alvoZoom();
    if (alvo) alvo.style.transformOrigin = `${x}% ${y}%`;
  });

  function pintarGaleria() {
    arteGrande.innerHTML = htmlPalco();
    const trilho = qs('[data-thumbs]', root);
    if (trilho) {
      trilho.innerHTML = htmlThumbs();
      trilho.hidden = galeria.length < 2;
    }
    qs('.pdp', root)?.classList.toggle('pdp--unica', galeria.length < 2);
  }

  function trocarCor(id) {
    if (id === corAtiva) return;
    corAtiva = id;
    galeria = galeriaDe(p, corAtiva);
    slideAtivo = 0;
    pintarGaleria();
    const nome = qs('[data-cor-nome]', root);
    if (nome) nome.textContent = nomeCor(p, corAtiva);
    qsa('[data-cor]', root).forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.cor === corAtiva)));
  }

  delegate(root, 'click', '[data-slide]', (e, b) => {
    slideAtivo = Number(b.dataset.slide);
    pintarGaleria();
  });

  delegate(root, 'click', '[data-cor]', (e, b) => trocarCor(b.dataset.cor));

  // Quantidade
  delegate(root, 'click', '[data-q]', (e, b) => {
    const delta = Number(b.dataset.q);
    qtd = Math.min(p.estoque, Math.max(1, qtd + delta));
    qs('[data-qtd]', root).textContent = qtd;
    qsa('[data-q]', root).forEach(x => {
      const d = Number(x.dataset.q);
      x.disabled = (d < 0 && qtd === 1) || (d > 0 && qtd >= p.estoque);
    });
  });

  // Adicionar / comprar
  qs('[data-add-pdp]', root)?.addEventListener('click', () => {
    const r = adicionarAoCarrinho(p.id, qtd, corAtiva);
    if (!r.ok) { toast({ titulo: 'Não foi possível adicionar', msg: r.motivo, tipo: 'danger' }); return; }
    toast({
      titulo: 'Adicionado ao carrinho',
      msg: `${qtd}× ${p.nome}`,
      tipo: 'accent',
      acao: { label: 'Ver carrinho', onClick: () => import('../components/cartDrawer.js').then(m => m.abrirCarrinho()) },
    });
  });

  qs('[data-comprar]', root)?.addEventListener('click', () => {
    const r = adicionarAoCarrinho(p.id, qtd, corAtiva);
    if (!r.ok) { toast({ titulo: 'Não foi possível comprar', msg: r.motivo, tipo: 'danger' }); return; }
    ir('/checkout');
  });

  // Abas
  delegate(root, 'click', '[data-aba]', (e, b) => {
    const alvo = b.dataset.aba;
    qsa('[data-aba]', root).forEach(t => t.setAttribute('aria-selected', String(t === b)));
    qsa('[data-painel]', root).forEach(s => { s.hidden = s.dataset.painel !== alvo; });
  });

  // Ir direto para as avaliacoes pelo link do topo
  delegate(root, 'click', 'a[href="#avaliacoes"]', (e) => {
    e.preventDefault();
    qs('[data-aba="aval"]', root).click();
    qs('#avaliacoes', root)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Calculadora de CEP
  const formCep = qs('[data-cep-form]', root);
  const erroCep = qs('#cep-erro', root);
  const resCep = qs('[data-cep-res]', root);

  qs('#cep', root).addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
    e.target.value = v;
  });

  formCep.addEventListener('submit', (e) => {
    e.preventDefault();
    const campo = qs('#cep', root);
    const digitos = campo.value.replace(/\D/g, '');

    if (digitos.length !== 8) {
      campo.setAttribute('aria-invalid', 'true');
      erroCep.textContent = 'Digite um CEP com 8 dígitos.';
      erroCep.hidden = false;
      resCep.innerHTML = '';
      campo.focus();
      return;
    }

    campo.removeAttribute('aria-invalid');
    erroCep.hidden = true;

    const botao = qs('button', formCep);
    botao.classList.add('is-loading');

    // Simula a consulta: prazo varia conforme a regiao do CEP
    setTimeout(() => {
      botao.classList.remove('is-loading');
      const regiao = Number(digitos[0]);
      const base = regiao <= 1 ? 2 : regiao <= 3 ? 3 : regiao <= 6 ? 5 : 7;
      resCep.innerHTML = `
        <div class="cep-calc__res">
          <div class="cep-calc__opt">
            <span><strong>Expressa</strong><br><span class="dim">até ${base} dias úteis</span></span>
            <span class="price" style="font-weight:600">${money(3990)}</span>
          </div>
          <hr class="rule">
          <div class="cep-calc__opt">
            <span><strong>Padrão</strong><br><span class="dim">${base + 2} a ${base + 5} dias úteis</span></span>
            <span class="price" style="font-weight:600;color:${freteGratis ? 'var(--success)' : 'inherit'}">
              ${freteGratis ? 'Grátis' : money(2490)}
            </span>
          </div>
        </div>`;
    }, 620);
  });

  // Pergunta (demonstrativa)
  qs('[data-pergunta]', root)?.addEventListener('submit', (e) => {
    e.preventDefault();
    const campo = qs('#nova-pergunta', root);
    if (!campo.value.trim()) { campo.focus(); return; }
    campo.value = '';
    toast({
      titulo: 'Pergunta enviada',
      msg: 'O vendedor costuma responder em até 24 horas.',
      tipo: 'success',
    });
  });

  observarAnimacoes(root);
  return () => {};
}

/* ---------- Auxiliares ---------- */
function prazo(dias) {
  const d = new Date('2026-09-22T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

const AMOSTRAS = {
  graphite: '#2a2f38', midnight: '#1e2a45', silver: '#c3c9d2', sand: '#d6c5ab',
  volt: '#bef264', iris: '#8b7cff', cyan: '#4cd6e3', rose: '#f4667d',
  ivory: '#f0ece4', forest: '#2f5d4e',
};

const amostraCor = (c) => AMOSTRAS[c] || '#2a2f38';
