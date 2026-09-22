/* VANTA — Rodape da vitrine */

import { el, qs } from '../utils/dom.js';
import { icon } from './icons.js';
import { toast } from './ui.js';

export function montarFooter() {
  const ano = 2026;

  const footer = el(`
    <footer class="site-footer">
      <div class="shell">
        <section class="newsletter" style="margin-top:-56px;position:relative;z-index:2">
          <div>
            <h3 style="font-size:var(--fs-xl)">Novidades antes de todo mundo</h3>
            <p class="muted" style="margin-top:8px;font-size:var(--fs-base)">
              Lançamentos e promoções no seu e-mail. Sem spam, dá pra sair quando quiser.
            </p>
          </div>
          <form class="newsletter__form" novalidate>
            <label class="sr-only" for="news-email">Seu e-mail</label>
            <input type="email" id="news-email" class="input" placeholder="seu@email.com" autocomplete="email" required>
            <button type="submit" class="btn btn--primary">Assinar</button>
          </form>
        </section>

        <div class="footer-grid">
          <div class="footer-col">
            <a href="#/" class="brand" style="margin-bottom:16px">
              <span class="brand__mark" aria-hidden="true">V</span>
              <span class="brand__word">VANTA</span>
            </a>
            <p class="muted" style="font-size:var(--fs-base);max-width:38ch">
              Marketplace de objetos de tecnologia, setup e design. Curadoria de produtos
              que duram e que valem o que custam.
            </p>
            <p class="dim" style="font-size:var(--fs-xs);margin-top:20px;line-height:1.7">
              Projeto de demonstração criado pela APX Web.<br>
              Loja, marcas, preços e avaliações são fictícios. As fotos
              são ilustrativas e não representam os fabricantes mostrados.
            </p>
          </div>

          <div class="footer-col">
            <h4>Comprar</h4>
            <a href="#/catalogo">Todos os produtos</a>
            <a href="#/catalogo?cat=cozinha">Cozinha</a>
            <a href="#/catalogo?cat=info">Informática</a>
            <a href="#/catalogo?promo=1">Ofertas</a>
            <a href="#/catalogo?novo=1">Novidades</a>
          </div>

          <div class="footer-col">
            <h4>Conta</h4>
            <a href="#/conta">Minha conta</a>
            <a href="#/conta/pedidos">Meus pedidos</a>
            <a href="#/favoritos">Favoritos</a>
            <a href="#/conta/enderecos">Endereços</a>
            <a href="#/carrinho">Carrinho</a>
          </div>

          <div class="footer-col">
            <h4>Institucional</h4>
            <a href="#/admin">Painel administrativo</a>
            <a href="#/catalogo">Central de ajuda</a>
            <a href="#/catalogo">Trocas e devoluções</a>
            <a href="#/catalogo">Política de privacidade</a>
            <a href="../../index.html" target="_blank" rel="noopener">Feito pela APX Web</a>
          </div>
        </div>

        <div class="footer-bottom">
          <p>&copy; ${ano} VANTA. Projeto fictício de demonstração.</p>
          <div class="pay-methods" aria-label="Formas de pagamento aceitas">
            <span class="pay-chip">PIX</span>
            <span class="pay-chip">VISA</span>
            <span class="pay-chip">MASTER</span>
            <span class="pay-chip">ELO</span>
            <span class="pay-chip">BOLETO</span>
          </div>
        </div>
      </div>
    </footer>`);

  qs('.newsletter__form', footer).addEventListener('submit', (e) => {
    e.preventDefault();
    const campo = qs('#news-email', footer);
    const valor = campo.value.trim();
    if (!valor || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) {
      campo.setAttribute('aria-invalid', 'true');
      campo.focus();
      toast({ titulo: 'E-mail inválido', msg: 'Confira o endereço digitado.', tipo: 'danger' });
      return;
    }
    campo.removeAttribute('aria-invalid');
    campo.value = '';
    toast({ titulo: 'Assinatura confirmada', msg: 'Você vai receber as novidades por e-mail.', tipo: 'success' });
  });

  return footer;
}
