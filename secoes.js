/* Seções "O que fazemos de melhor" e "Do primeiro contato ao site no ar".
   JavaScript puro, sem dependências. Tudo funciona sem este arquivo (conteúdo visível,
   cenas no estado final); aqui só entram o movimento e a leitura guiada pelo scroll. */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* Agenda de timeouts que pode ser cancelada de uma vez (pausa fora da tela). */
  function clock() {
    const ids = new Set();
    return {
      after(fn, ms) {
        const id = setTimeout(() => { ids.delete(id); fn(); }, ms);
        ids.add(id);
      },
      clear() { ids.forEach(clearTimeout); ids.clear(); },
    };
  }

  /* =================================================================
     O QUE FAZEMOS DE MELHOR
     ================================================================= */
  const grid = document.querySelector('.svc-grid');

  if (grid) {
    const cards = Array.from(grid.querySelectorAll('.svc'));

    // luz e borda que seguem o cursor (assinatura dos cards do site)
    cards.forEach(card => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    });

    // entrada: cada linha da grade chega em sequência, com profundidade
    if (!reduced && hasIO) {
      grid.classList.add('is-armed');
      const enter = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const i = cards.indexOf(entry.target);
          entry.target.style.setProperty('--svc-delay', `${(i % 2) * 130}ms`);
          entry.target.classList.add('is-in');
          enter.unobserve(entry.target);
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -60px 0px' });
      cards.forEach(c => enter.observe(c));
    }

    /* ---------- Agendamento: horários livres vão sendo reservados ---------- */
    function agenda(card) {
      const root = card.querySelector('.agenda');
      const slots = Array.from(root.querySelectorAll('.agenda-slots li'));
      const days = Array.from(root.querySelectorAll('.agenda-days i'));
      const services = [['Avaliação', 'Marcos'], ['Corte', 'Diego'], ['Retorno', 'Camila'], ['Massagem', 'Bruna'], ['Consulta', 'Paula'], ['Corte e barba', 'André']];
      const t = clock();
      let k = 0;
      let day = 1;

      const book = (li) => {
        const [s, n] = services[k++ % services.length];
        li.querySelector('span').textContent = s;
        li.querySelector('em').textContent = n;
        li.classList.remove('is-target');
        li.classList.add('is-booked');
        root.classList.add('has-toast');
        t.after(() => root.classList.remove('has-toast'), 1500);
      };

      function step() {
        const free = slots.filter(li => !li.classList.contains('is-booked'));
        if (!free.length) {
          // dia cheio: a agenda vira para o próximo dia útil
          slots.forEach(li => {
            li.classList.remove('is-booked');
            li.querySelector('span').textContent = 'Livre';
            li.querySelector('em').textContent = '';
          });
          day = (day + 1) % days.length;
          days.forEach((d, i) => d.classList.toggle('is-on', i === day));
          t.after(step, 1100);
          return;
        }
        const li = free[Math.floor(free.length / 2)];
        li.classList.add('is-target');
        t.after(() => book(li), 520);
        t.after(step, 2700);
      }

      return {
        start() { t.after(step, 600); },
        stop() { t.clear(); root.classList.remove('has-toast'); slots.forEach(li => li.classList.remove('is-target')); },
        nudge() { t.clear(); step(); },
      };
    }

    /* ---------- Marketplace: a vitrine se reorganiza por categoria ---------- */
    function shop(card) {
      const root = card.querySelector('.shop');
      const list = root.querySelector('.shop-grid');
      const items = Array.from(list.children);
      const base = new Map(items.map((el, i) => [el, i]));
      const chips = Array.from(root.querySelectorAll('.shop-chips i'));
      const count = root.querySelector('.shop-count');
      const cats = ['all', 'casa', 'moda', 'tech'];
      const t = clock();
      let c = 0;
      let n = Number(count.textContent) || 0;

      function apply(cat) {
        const match = el => cat === 'all' || el.dataset.cat === cat;
        // FLIP: guarda a posição, reordena, anima de onde estava até onde ficou
        const first = new Map(items.map(el => [el, el.getBoundingClientRect()]));
        chips.forEach(ch => ch.classList.toggle('is-on', ch.dataset.cat === cat));
        items.slice()
          .sort((a, b) => (match(b) - match(a)) || (base.get(a) - base.get(b)))
          .forEach(el => list.appendChild(el));
        items.forEach(el => {
          el.classList.toggle('is-out', !match(el));
          el.classList.remove('is-pick');
          const a = first.get(el);
          const b = el.getBoundingClientRect();
          const dx = a.left - b.left;
          const dy = a.top - b.top;
          if (dx || dy) {
            el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 750, easing: EASE });
          }
        });
        if (cat !== 'all') t.after(() => pick(items.find(match)), 950);
      }

      function pick(el) {
        if (!el) return;
        el.classList.add('is-pick');
        n = n >= 9 ? 1 : n + 1;
        count.textContent = n;
        count.classList.remove('is-bump');
        void count.offsetWidth;
        count.classList.add('is-bump');
      }

      function step() {
        c = (c + 1) % cats.length;
        apply(cats[c]);
        t.after(step, 2900);
      }

      return {
        start() { t.after(step, 900); },
        stop() { t.clear(); },
        nudge() { t.clear(); step(); },
      };
    }

    /* ---------- Gestão de Dados: gráfico que se desenha e troca de série ---------- */
    function data(card) {
      const root = card.querySelector('.data');
      const line = root.querySelector('.data-line');
      const area = root.querySelector('.data-area');
      const dotsG = root.querySelector('.data-dots');
      const valueEl = root.querySelector('.data-value');
      const W = 320, H = 130, TOP = 14, BOTTOM = 120;
      const SERIES = [
        { v: [22, 36, 30, 52, 46, 68, 62, 86], total: 1284 },
        { v: [34, 30, 48, 44, 60, 56, 78, 74], total: 1462 },
        { v: [18, 28, 42, 38, 55, 70, 66, 92], total: 1719 },
      ];
      const fmt = new Intl.NumberFormat('pt-BR');
      const t = clock();
      let cur = SERIES[0].v.slice();
      let total = SERIES[0].total;
      let s = 0;
      let raf = 0;

      const pts = (vals) => vals.map((v, i) => [(i / (vals.length - 1)) * W, BOTTOM - (v / 100) * (BOTTOM - TOP)]);
      // curva suave (Catmull-Rom convertida em Bézier)
      const pathOf = (p) => p.reduce((d, [x, y], i, a) => {
        if (!i) return `M${x} ${y}`;
        const [x0, y0] = a[i - 2] || a[i - 1];
        const [x1, y1] = a[i - 1];
        const [x3, y3] = a[i + 1] || [x, y];
        const c1x = x1 + (x - x0) / 6, c1y = y1 + (y - y0) / 6;
        const c2x = x - (x3 - x1) / 6, c2y = y - (y3 - y1) / 6;
        return `${d} C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }, '');

      const dots = SERIES[0].v.map(() => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('r', '3.2');
        dotsG.appendChild(c);
        return c;
      });

      function render(vals, tot) {
        const p = pts(vals);
        const d = pathOf(p);
        line.setAttribute('d', d);
        area.setAttribute('d', `${d} L${W} ${H} L0 ${H} Z`);
        p.forEach(([x, y], i) => { dots[i].setAttribute('cx', x.toFixed(1)); dots[i].setAttribute('cy', y.toFixed(1)); });
        valueEl.textContent = fmt.format(Math.round(tot));
      }

      // os pontos aparecem um a um logo depois da linha
      dots.forEach((c, i) => { c.style.transitionDelay = `${0.35 + i * 0.09}s`; });
      render(cur, total);

      function morph(to) {
        const from = cur.slice();
        const fromT = total;
        const t0 = performance.now();
        cancelAnimationFrame(raf);
        const tick = (now) => {
          const k = clamp((now - t0) / 1000);
          const e = 1 - Math.pow(1 - k, 4);
          cur = from.map((v, i) => v + (to.v[i] - v) * e);
          total = fromT + (to.total - fromT) * e;
          render(cur, total);
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }

      function step() {
        s = (s + 1) % SERIES.length;
        morph(SERIES[s]);
        t.after(step, 4200);
      }

      return {
        start() {
          root.classList.add('is-drawn');
          t.after(step, 3200);
        },
        stop() { t.clear(); cancelAnimationFrame(raf); },
        nudge() { t.clear(); step(); },
        still() { root.classList.add('is-drawn'); },
      };
    }

    /* ---------- Design & Animações: camadas em profundidade + curva ---------- */
    function motion(card) {
      const root = card.querySelector('.motion');
      const t = clock();
      let hold = false;

      function loop() {
        if (hold) return;
        root.classList.add('is-spread');
        t.after(() => { if (!hold) root.classList.remove('is-spread'); }, 2800);
        t.after(loop, 4600);
      }

      card.addEventListener('pointerenter', () => { hold = true; t.clear(); root.classList.add('is-spread'); });
      card.addEventListener('pointerleave', () => { hold = false; t.after(loop, 1400); });

      return {
        start() {
          root.classList.add('is-drawn', 'is-live');
          t.after(loop, 500);
        },
        stop() { t.clear(); root.classList.remove('is-live'); },
        nudge() {},
        still() { root.classList.add('is-drawn', 'is-spread'); },
      };
    }

    const factories = { agenda, shop, data, motion };
    const ctrls = new Map();
    cards.forEach(card => {
      const make = factories[card.dataset.svc];
      if (make) ctrls.set(card, make(card));
    });

    if (reduced || !hasIO) {
      // sem movimento: cada sistema já aparece no estado final
      ctrls.forEach(c => c.still && c.still());
    } else {
      const visible = new Set();
      const live = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const card = entry.target;
          const c = ctrls.get(card);
          if (entry.isIntersecting) {
            if (visible.has(card)) return;
            visible.add(card);
            card.classList.add('is-live');
            c.start();
          } else if (visible.has(card)) {
            visible.delete(card);
            card.classList.remove('is-live');
            c.stop();
          }
        });
      }, { threshold: 0.35 });
      ctrls.forEach((_, card) => live.observe(card));

      // o hover adianta a demonstração do card
      ctrls.forEach((c, card) => {
        let last = 0;
        card.addEventListener('pointerenter', (e) => {
          if (e.pointerType !== 'mouse' || !visible.has(card)) return;
          const now = performance.now();
          if (now - last < 900) return;
          last = now;
          c.nudge();
        });
      });

      // aba em segundo plano: nada roda
      document.addEventListener('visibilitychange', () => {
        visible.forEach(card => {
          const c = ctrls.get(card);
          if (document.hidden) c.stop();
          else c.start();
        });
      });
    }
  }

  /* =================================================================
     DO PRIMEIRO CONTATO AO SITE NO AR
     ================================================================= */
  const sec = document.querySelector('[data-processo]');
  if (!sec) return;

  const steps = Array.from(sec.querySelectorAll('.proc-step'));
  const scenes = steps.map(li => li.querySelector('.scene'));
  const track = sec.querySelector('.proc-track');
  const rail = sec.querySelector('.proc-rail');
  const stage = sec.querySelector('.proc-stage');
  const frame = sec.querySelector('.proc-frame');
  const titles = steps.map(li => li.querySelector('h3').textContent);

  if (reduced) {
    // tudo legível de uma vez: trilha completa e cenas no estado final
    rail.style.setProperty('--p', '1');
    steps.forEach(li => li.classList.add('is-done'));
    scenes.forEach(s => s.classList.add('is-active'));
    return;
  }

  // legenda abaixo da peça (modo fixo)
  const caption = document.createElement('div');
  caption.className = 'proc-caption';
  caption.innerHTML = '<b>01</b><span class="proc-caption-title"></span><span class="proc-caption-bar"><i></i></span><span>04</span>';
  stage.appendChild(caption);
  const capNum = caption.querySelector('b');
  const capTitle = caption.querySelector('.proc-caption-title');
  const capBar = caption.querySelector('.proc-caption-bar');

  sec.classList.add('is-tracking');
  scenes.forEach(s => s.classList.remove('is-active'));

  const pinQuery = window.matchMedia('(min-width: 1000px) and (min-height: 640px)');
  let pinned = null;
  let active = -1;

  function setMode() {
    const want = pinQuery.matches;
    if (want === pinned) return;
    pinned = want;
    sec.classList.toggle('is-pinned', pinned);
    scenes.forEach((s, i) => (pinned ? frame.appendChild(s) : steps[i].appendChild(s)));
    active = -1;
  }

  function setActive(idx) {
    if (idx === active) return;
    active = idx;
    steps.forEach((li, i) => {
      li.classList.toggle('is-active', i === idx);
      li.classList.toggle('is-done', i < idx);
    });
    scenes.forEach((s, i) => {
      // no modo fixo só a cena atual fica na frente; na lista, as já vistas permanecem prontas
      s.classList.toggle('is-active', pinned ? i === idx : i <= idx);
      s.classList.toggle('is-past', pinned && i < idx);
    });
    capNum.textContent = String(Math.max(idx, 0) + 1).padStart(2, '0');
    capTitle.textContent = titles[Math.max(idx, 0)];
  }

  function update() {
    const vh = window.innerHeight;
    if (pinned) {
      const r = sec.getBoundingClientRect();
      const total = sec.offsetHeight - vh;
      const p = clamp(-r.top / total);
      rail.style.setProperty('--p', p.toFixed(4));
      capBar.style.setProperty('--p', p.toFixed(4));
      setActive(Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999 + 0.0001)));
    } else {
      const line = vh * 0.62;
      const tr = track.getBoundingClientRect();
      rail.style.setProperty('--p', clamp((line - tr.top) / tr.height).toFixed(4));
      let idx = -1;
      steps.forEach((li, i) => { if (li.getBoundingClientRect().top < line) idx = i; });
      setActive(idx);
    }
  }

  // no modo fixo, clicar numa etapa leva o scroll até ela
  steps.forEach((li, i) => {
    li.addEventListener('click', () => {
      if (!pinned) return;
      const total = sec.offsetHeight - window.innerHeight;
      const y = sec.getBoundingClientRect().top + window.scrollY + ((i + 0.5) / steps.length) * total;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  };

  setMode();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { setMode(); update(); });
  if (pinQuery.addEventListener) pinQuery.addEventListener('change', () => { setMode(); update(); });
})();
