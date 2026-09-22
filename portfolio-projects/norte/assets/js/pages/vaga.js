/* ============================================================
   NORTE — Detalhe da oportunidade
   Tudo o que a pessoa precisa para decidir se vale a pena:
   salário, requisitos, benefícios, onde fica e como é a empresa.
   A candidatura é simulada e fica registrada no perfil.
   ============================================================ */

import { qs, qsa, observarAnimacoes } from '../utils/dom.js';
import { icon, estrelas } from '../components/icons.js';
import {
  escapeHtml, dinheiro, num, pct, plural, km, haQuantoTempo, dataLonga,
} from '../utils/format.js';
import {
  acharVaga, acharEmpresa, acharRegiao, acharProfissao, vagasDaProfissao,
  alternarSalvo, estaSalvo, candidatar, jaCandidatou, salarioNaRegiao,
} from '../services/store.js';
import { AREA_POR_ID } from '../data/profissoes.js';
import { mapaOportunidades, ativarMapa } from '../components/mapa.js';
import {
  vagaCard, ligarSalvarVaga, salarioTexto,
  nomeModelo, nomeContrato, nomeHorario, nomeNivel,
} from '../components/vagaCard.js';
import { toast, modal } from '../components/ui.js';
import { montarUrl, ir } from '../router.js';
import { paginaNaoEncontrada } from './naoEncontrada.js';

export function paginaVaga(raiz, params) {
  const vaga = acharVaga(params.id);
  if (!vaga) return paginaNaoEncontrada(raiz);

  const emp = acharEmpresa(vaga.empresaId);
  const reg = acharRegiao(vaga.regiaoId);
  const prof = acharProfissao(vaga.profissaoId);
  const area = AREA_POR_ID[vaga.area];
  const remoto = vaga.modelo === 'remoto';
  const salario = salarioTexto(vaga);

  // Comparacao honesta: esta vaga contra a media do mesmo nivel
  const mesmoNivel = vagasDaProfissao(vaga.profissaoId)
    .filter(v => v.nivel === vaga.nivel && v.salarioVisivel && v.id !== vaga.id);
  const mediaNivel = mesmoNivel.length
    ? Math.round(mesmoNivel.reduce((s, v) => s + (v.salarioMin + v.salarioMax) / 2, 0) / mesmoNivel.length)
    : 0;
  const mediaVaga = (vaga.salarioMin + vaga.salarioMax) / 2;
  const difPct = mediaNivel ? ((mediaVaga - mediaNivel) / mediaNivel) * 100 : 0;

  const parecidas = vagasDaProfissao(vaga.profissaoId)
    .filter(v => v.id !== vaga.id)
    .sort((a, b) => Math.abs(a.distancia - vaga.distancia) - Math.abs(b.distancia - vaga.distancia))
    .slice(0, 4);

  let desligarMapa = null;

  raiz.innerHTML = `
    <div class="shell" style="padding-block:var(--sp-6) var(--sp-20)">
      <a class="btn btn--fantasma btn--sm" href="${montarUrl('/buscar', { p: vaga.profissaoId, r: vaga.regiaoId })}"
         style="margin-bottom:var(--sp-5)">
        ${icon.setaEsq({ size: 15 })} Voltar para a busca
      </a>

      <div class="res-layout" style="padding-block:0;grid-template-columns:minmax(0,1fr) 330px">
        <div style="display:grid;gap:var(--sp-8);min-width:0">
          ${htmlCabeca()}
          ${htmlSalarioBloco()}
          ${htmlDescricao()}
          ${htmlRequisitos()}
          ${htmlBeneficios()}
          ${htmlLocal()}
          ${htmlEmpresa()}
        </div>

        <aside style="display:grid;gap:var(--sp-5);position:sticky;top:calc(var(--header-h) + var(--sp-5))">
          ${htmlAcoes()}
          ${htmlCarreira()}
        </aside>
      </div>

      ${htmlParecidas()}
    </div>`;

  /* ---------------- Blocos ---------------- */
  function htmlCabeca() {
    return `
    <header>
      <div class="linha" style="gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-4)">
        ${vaga.destaque ? '<span class="selo selo--marca">Destaque</span>' : ''}
        ${vaga.urgente ? `<span class="selo selo--aviso">${icon.raio({ size: 11 })} Contratação urgente</span>` : ''}
        ${vaga.vagas > 1 ? `<span class="selo selo--info">${vaga.vagas} posições abertas</span>` : ''}
        <span class="selo selo--contorno">${icon.calendario({ size: 11 })} Publicada ${haQuantoTempo(vaga.publicadaEm)}</span>
      </div>

      <div class="linha" style="gap:var(--sp-4);align-items:flex-start">
        <span class="logo-emp" style="background:${emp?.cor || 'var(--acento)'};width:60px;height:60px;font-size:var(--fs-lg);border-radius:var(--r-md)"
              aria-hidden="true">${escapeHtml(emp?.sigla || '??')}</span>
        <div style="flex:1;min-width:0">
          <h1 style="font-size:var(--fs-2xl);letter-spacing:-0.03em;line-height:var(--lh-titulo)">
            ${escapeHtml(vaga.titulo)}
          </h1>
          <p style="margin-top:var(--sp-2);color:var(--txt-suave)">
            <a href="#/empresa/${vaga.empresaId}" style="font-weight:600;color:var(--txt-forte)">
              ${escapeHtml(emp?.nome || 'Empresa')}
            </a>
            <span aria-hidden="true"> · </span>
            ${escapeHtml(remoto ? 'Trabalho remoto' : `${vaga.bairro}, ${reg?.cidade || ''}`)}
          </p>
        </div>
      </div>

      <div class="linha" style="gap:var(--sp-2);flex-wrap:wrap;margin-top:var(--sp-5)">
        <span class="selo selo--neutro">${icon.raio({ size: 11 })} ${nomeModelo(vaga.modelo)}</span>
        <span class="selo selo--neutro">${icon.escada({ size: 11 })} ${nomeNivel(vaga.nivel)}</span>
        <span class="selo selo--neutro">${icon.arquivo({ size: 11 })} ${nomeContrato(vaga.contrato)}</span>
        <span class="selo selo--neutro">${icon.relogio({ size: 11 })} ${nomeHorario(vaga.horario)}</span>
        ${!remoto ? `<span class="selo selo--neutro">${icon.local({ size: 11 })} ${km(vaga.distancia)} do centro</span>` : ''}
      </div>
    </header>`;
  }

  function htmlSalarioBloco() {
    const acima = difPct > 3;
    const abaixo = difPct < -3;

    return `
    <section class="cartao cartao--pad" style="display:grid;gap:var(--sp-4)">
      <div>
        <p class="campo__dica">Remuneração mensal</p>
        <p style="font-family:var(--fonte-display);font-size:var(--fs-2xl);font-weight:700;color:var(--txt-forte);letter-spacing:-0.03em;margin-top:4px">
          ${salario || 'A combinar'}
        </p>
      </div>

      ${salario && mediaNivel ? `
        <div style="padding-top:var(--sp-4);border-top:1px solid var(--bd-sutil)">
          <div class="linha" style="gap:var(--sp-3);flex-wrap:wrap">
            <span class="delta ${acima ? 'delta--sobe' : abaixo ? 'delta--desce' : 'delta--neutro'}">
              ${acima ? icon.tendencia({ size: 13 }) : abaixo ? icon.chevronD({ size: 13 }) : icon.menos({ size: 13 })}
              ${difPct > 0 ? '+' : ''}${pct(difPct)}
            </span>
            <span style="font-size:var(--fs-sm);color:var(--txt-suave)">
              em relação à média de ${dinheiro(mediaNivel)} para
              ${nomeNivel(vaga.nivel).toLowerCase()} nesta profissão
            </span>
          </div>
          <p class="campo__dica" style="margin-top:var(--sp-2)">
            Comparação com ${plural(mesmoNivel.length, 'outra vaga', 'outras vagas')} do mesmo nível na plataforma.
          </p>
        </div>` : ''}

      ${!salario ? `
        <p class="campo__dica">
          A empresa não divulgou o valor. Para referência, ${escapeHtml(prof?.nome || 'a profissão')}
          ${nomeNivel(vaga.nivel).toLowerCase()} costuma ganhar
          ${dinheiro(salarioNaRegiao(prof, vaga.regiaoId)[vaga.nivel === 'senior' ? 'senior' : vaga.nivel === 'pleno' ? 'pleno' : 'junior'] || 0)} por mês.
        </p>` : ''}
    </section>`;
  }

  function htmlDescricao() {
    return `
    <section>
      <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-4)">Sobre a vaga</h2>
      <p class="prof-texto">
        ${escapeHtml(emp?.nome || 'A empresa')} procura ${escapeHtml(vaga.titulo.toLowerCase())}
        para ${remoto ? 'atuar remotamente' : `atuar ${nomeModelo(vaga.modelo).toLowerCase()} em ${vaga.bairro}`}.
        ${escapeHtml(prof?.descricao || '')}
      </p>
      ${prof ? `
        <div style="margin-top:var(--sp-5)">
          <p class="filtro-bloco__t">O que você vai fazer</p>
          <ul class="lista-check">
            ${prof.responsabilidades.slice(0, 5).map(r => `
              <li><span>${icon.ok({ size: 16 })}</span> ${escapeHtml(r)}</li>`).join('')}
          </ul>
        </div>` : ''}
    </section>`;
  }

  function htmlRequisitos() {
    return `
    <section class="skills-grade">
      <div>
        <p class="filtro-bloco__t">Requisitos</p>
        <ul class="lista-check">
          ${vaga.requisitos.map(r => `
            <li><span>${icon.ok({ size: 16 })}</span> ${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>
      ${vaga.diferenciais.length ? `
        <div>
          <p class="filtro-bloco__t">Diferenciais</p>
          <ul class="lista-check">
            ${vaga.diferenciais.map(d => `
              <li><span style="color:var(--ambar-500)">${icon.estrela({ size: 16 })}</span> ${escapeHtml(d)}</li>`).join('')}
          </ul>
        </div>` : ''}
    </section>`;
  }

  function htmlBeneficios() {
    if (!vaga.beneficios.length) return '';
    return `
    <section>
      <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-4)">Benefícios</h2>
      <div class="skill-lista">
        ${vaga.beneficios.map(b => `
          <span class="skill skill--hard">${icon.coracao({ size: 13 })} ${escapeHtml(b)}</span>`).join('')}
      </div>
    </section>`;
  }

  function htmlLocal() {
    if (remoto) {
      return `
      <section>
        <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-4)">Onde você vai trabalhar</h2>
        <div class="cartao cartao--pad linha" style="gap:var(--sp-4)">
          <span class="prof-capa__ic" style="color:var(--dado-2);width:44px;height:44px;flex-shrink:0">
            ${icon.raio({ size: 21 })}
          </span>
          <div>
            <p style="font-weight:600;color:var(--txt-forte)">Cem por cento remoto</p>
            <p style="font-size:var(--fs-sm);color:var(--txt-suave);margin-top:2px">
              Sem exigência de endereço: dá para morar em qualquer cidade do país.
            </p>
          </div>
        </div>
      </section>`;
    }

    return `
    <section>
      <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-4)">Onde você vai trabalhar</h2>
      <p style="color:var(--txt-suave);margin-bottom:var(--sp-4)">
        ${icon.local({ size: 14 })} ${escapeHtml(vaga.bairro)}, ${escapeHtml(reg?.cidade || '')}
        · ${km(vaga.distancia)} do centro
      </p>
      <div data-mapa-vaga>
        ${mapaOportunidades([vaga], { regiaoId: vaga.regiaoId, alturaClasse: 'mapa--baixo' })}
      </div>
    </section>`;
  }

  function htmlEmpresa() {
    if (!emp) return '';
    return `
    <section>
      <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-4)">Sobre ${escapeHtml(emp.nome)}</h2>
      <div class="cartao cartao--pad" style="display:grid;gap:var(--sp-4)">
        <div class="linha" style="gap:var(--sp-3);flex-wrap:wrap">
          ${estrelas(emp.nota, 15)}
          <span style="font-weight:600;color:var(--txt-forte)">${String(emp.nota).replace('.', ',')}</span>
          <span style="font-size:var(--fs-sm);color:var(--txt-fraco)">
            ${plural(emp.totalAvaliacoes, 'avaliação', 'avaliações')}
          </span>
          <span class="selo selo--neutro">${escapeHtml(emp.setor)}</span>
          <span class="selo selo--neutro">${num(emp.funcionarios)} pessoas</span>
        </div>
        <p style="font-size:var(--fs-base);color:var(--txt-suave);line-height:var(--lh-solto)">
          ${escapeHtml(emp.descricao)}
        </p>
        <a class="btn btn--contorno btn--sm" href="#/empresa/${emp.id}" style="justify-self:start">
          Ver perfil completo ${icon.chevronR({ size: 14 })}
        </a>
      </div>
    </section>`;
  }

  function htmlAcoes() {
    const salvo = estaSalvo('vagas', vaga.id);
    const aplicado = jaCandidatou(vaga.id);

    return `
    <div class="painel">
      <div class="painel__corpo" style="display:grid;gap:var(--sp-4)">
        <div data-area-candidatura>${htmlBotaoCandidatura(aplicado)}</div>

        <button type="button" class="btn btn--contorno btn--bloco" data-salvar-vaga-topo aria-pressed="${salvo}">
          <span data-salvar-ic>${icon.marcador({ size: 16, fill: salvo ? 'currentColor' : 'none' })}</span>
          <span data-salvar-txt>${salvo ? 'Salva' : 'Salvar vaga'}</span>
        </button>

        <button type="button" class="btn btn--fantasma btn--bloco" data-compartilhar>
          ${icon.compartilhar({ size: 16 })} Copiar link
        </button>

        <dl style="padding-top:var(--sp-4);border-top:1px solid var(--bd-sutil)">
          <div class="prof-painel__linha">
            <dt>${icon.usuarios({ size: 13 })} Candidatos</dt>
            <dd data-candidatos>${num(vaga.candidaturas)}</dd>
          </div>
          <div class="prof-painel__linha">
            <dt>${icon.calendario({ size: 13 })} Publicada em</dt>
            <dd>${dataLonga(vaga.publicadaEm)}</dd>
          </div>
          <div class="prof-painel__linha">
            <dt>${icon.maleta({ size: 13 })} Posições</dt>
            <dd>${vaga.vagas}</dd>
          </div>
        </dl>
      </div>
    </div>`;
  }

  function htmlBotaoCandidatura(aplicado) {
    return aplicado
      ? `<div class="vazio" style="padding:var(--sp-5) 0;gap:var(--sp-2)">
           <span class="vazio__icone" style="background:var(--ok-fraco);color:var(--verde-600)">
             ${icon.ok({ size: 22 })}
           </span>
           <p style="font-weight:600;color:var(--txt-forte)">Candidatura enviada</p>
           <p style="font-size:var(--fs-xs);color:var(--txt-fraco);text-align:center">
             Acompanhe pelo seu perfil.
           </p>
           <a class="btn btn--fantasma btn--sm" href="#/perfil/painel">Ver candidaturas</a>
         </div>`
      : `<button type="button" class="btn btn--primario btn--lg btn--bloco" data-candidatar>
           ${icon.foguete({ size: 18 })} Candidatar-se
         </button>
         <p class="campo__dica" style="text-align:center;margin-top:var(--sp-2)">
           Demonstração: nenhum dado é enviado a terceiros.
         </p>`;
  }

  function htmlCarreira() {
    if (!prof) return '';
    const a = AREA_POR_ID[prof.area];
    return `
    <a class="cartao cartao--pad" href="#/profissao/${prof.id}" style="display:grid;gap:var(--sp-3)">
      <span class="linha" style="gap:var(--sp-3)">
        <span class="prof-capa__ic" style="color:${a?.cor || 'var(--acento)'};width:38px;height:38px">
          ${icon[a?.icone || 'maleta']({ size: 18 })}
        </span>
        <span>
          <span style="display:block;font-size:var(--fs-xs);color:var(--txt-fraco)">Sobre a carreira</span>
          <span style="display:block;font-weight:600;color:var(--txt-forte)">${escapeHtml(prof.nome)}</span>
        </span>
      </span>
      <span style="font-size:var(--fs-sm);color:var(--txt-suave);line-height:var(--lh-normal)">
        Salário por nível, o que estudar, habilidades exigidas e o caminho completo até a senioridade.
      </span>
      <span class="linha" style="gap:4px;color:var(--txt-marca);font-weight:600;font-size:var(--fs-sm)">
        Ver o guia ${icon.chevronR({ size: 14 })}
      </span>
    </a>`;
  }

  function htmlParecidas() {
    if (!parecidas.length) return '';
    return `
    <section style="margin-top:var(--sp-12)">
      <h2 style="font-size:var(--fs-xl);margin-bottom:var(--sp-5)">Vagas parecidas</h2>
      <div class="res-grade res-grade--2">
        ${parecidas.map(v => vagaCard(v)).join('')}
      </div>
    </section>`;
  }

  /* ---------------- Interação ---------------- */
  if (!remoto) {
    desligarMapa = ativarMapa(qs('[data-mapa-vaga]', raiz), [vaga], {});
  }

  raiz.addEventListener('click', async (e) => {
    if (e.target.closest('[data-candidatar]')) {
      const btn = e.target.closest('[data-candidatar]');
      btn.classList.add('carregando');
      btn.disabled = true;

      // Espera curta so para a acao parecer o que e: um envio
      await new Promise(r => setTimeout(r, 620));

      const res = candidatar(vaga.id);
      if (!res.ok) {
        btn.classList.remove('carregando');
        btn.disabled = false;
        toast('Não foi possível enviar', { tipo: 'erro', texto: res.motivo });
        return;
      }

      qs('[data-area-candidatura]', raiz).innerHTML = htmlBotaoCandidatura(true);
      qs('[data-candidatos]', raiz).textContent = num(vaga.candidaturas);

      modal({
        titulo: 'Candidatura enviada',
        sub: escapeHtml(vaga.titulo),
        conteudo: `
          <div style="display:grid;gap:var(--sp-4)">
            <p style="color:var(--txt-suave);line-height:var(--lh-solto)">
              Seu perfil foi enviado para ${escapeHtml(emp?.nome || 'a empresa')}.
              Nesta demonstração nada sai do seu navegador: a candidatura fica
              registrada apenas no seu perfil, para você ver como o fluxo funciona.
            </p>
            <div class="cartao cartao--pad" style="display:grid;gap:var(--sp-3)">
              <p class="filtro-bloco__t" style="margin:0">Enquanto espera</p>
              <a class="linha" href="#/profissao/${vaga.profissaoId}" style="gap:var(--sp-3);color:var(--txt-base)">
                ${icon.livro({ size: 16 })} Revise o que a vaga exige no guia da carreira
              </a>
              <a class="linha" href="${montarUrl('/buscar', { p: vaga.profissaoId, r: vaga.regiaoId })}"
                 style="gap:var(--sp-3);color:var(--txt-base)">
                ${icon.lupa({ size: 16 })} Candidate-se a outras vagas parecidas
              </a>
            </div>
          </div>`,
        rodape: `
          <button type="button" class="btn btn--contorno" data-fechar>Continuar aqui</button>
          <a class="btn btn--primario" href="#/perfil/painel" data-fechar>Ver minhas candidaturas</a>`,
      });

      toast('Candidatura registrada', { tipo: 'ok', duracao: 3200 });
      return;
    }

    const btnSalvar = e.target.closest('[data-salvar-vaga-topo]');
    if (btnSalvar) {
      const virou = alternarSalvo('vagas', vaga.id);
      btnSalvar.setAttribute('aria-pressed', String(virou));
      qs('[data-salvar-ic]', btnSalvar).innerHTML = icon.marcador({ size: 16, fill: virou ? 'currentColor' : 'none' });
      qs('[data-salvar-txt]', btnSalvar).textContent = virou ? 'Salva' : 'Salvar vaga';
      toast(virou ? 'Vaga salva' : 'Vaga removida', {
        tipo: virou ? 'ok' : 'info',
        acao: virou ? { rotulo: 'Ver salvas', fn: () => ir('/perfil/salvos') } : null,
      });
      return;
    }

    if (e.target.closest('[data-compartilhar]')) {
      const url = `${location.origin}${location.pathname}#/vaga/${vaga.id}`;
      try {
        await navigator.clipboard.writeText(url);
        toast('Link copiado', { tipo: 'ok', texto: 'Cole onde quiser compartilhar.' });
      } catch {
        toast('Não foi possível copiar', { tipo: 'erro', texto: url });
      }
    }
  });

  const desligarFav = ligarSalvarVaga(raiz, (id, btn) => {
    const virou = alternarSalvo('vagas', id);
    btn.classList.toggle('is-on', virou);
    btn.setAttribute('aria-pressed', String(virou));
    btn.innerHTML = icon.marcador({ size: 16, fill: virou ? 'currentColor' : 'none' });
    toast(virou ? 'Vaga salva' : 'Vaga removida', { tipo: virou ? 'ok' : 'info' });
  });

  observarAnimacoes(raiz);
  document.title = `${vaga.titulo} — ${emp?.nome || ''} | NORTE`;

  return () => {
    desligarMapa?.();
    desligarFav?.();
  };
}
