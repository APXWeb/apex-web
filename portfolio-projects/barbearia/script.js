(() => {
  'use strict';

  const STORAGE_KEY = 'imperio_agendamentos_v1';
  const CLIENT_KEY = 'imperio_cliente_v1';
  const TIME_ZONE = 'America/Sao_Paulo';
  const DAYS_AHEAD = 21;
  const SLOT_MINUTES = 30;

  const SERVICES = [
    { id: 'corte-classico', name: 'Corte Clássico', price: 50 },
    { id: 'corte-barba', name: 'Corte + Barba', price: 90 },
    { id: 'barba', name: 'Barba', price: 45 },
    { id: 'corte-maquina', name: 'Corte à Máquina', price: 35 },
    { id: 'maquina-barba', name: 'Máquina + Barba', price: 75 },
    { id: 'corte-infantil', name: 'Corte Infantil', price: 50 },
    { id: 'sobrancelha', name: 'Sobrancelha', price: 20 },
    { id: 'pezinho', name: 'Pezinho', price: 20 }
  ];

  // Horário (fictício): segunda 9h–18h, terça a sexta 9h–20h, sábado 8h–18h, domingo fechado.
  const HOURS = { 0: null, 1: [540, 1080], 2: [540, 1200], 3: [540, 1200], 4: [540, 1200], 5: [540, 1200], 6: [480, 1080] };

  const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  /* Datas no fuso de São Paulo ------------------------------------------ */

  const pad = (n) => String(n).padStart(2, '0');
  const toIso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

  function nowInSaoPaulo() {
    const parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
    const y = Number(parts.year);
    const m = Number(parts.month);
    const d = Number(parts.day);
    return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), minutes: Number(parts.hour) * 60 + Number(parts.minute), iso: toIso(y, m, d) };
  }

  function addDays(y, m, d, n) {
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay() };
  }

  function parseIso(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
  }

  const formatHour = (min) => (min % 60 ? `${Math.floor(min / 60)}h${pad(min % 60)}` : `${Math.floor(min / 60)}h`);
  const formatTime = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  const formatMoney = (value) => `R$ ${value.toLocaleString('pt-BR')}`;

  function formatDateLong(iso) {
    const p = parseIso(iso);
    return `${WEEKDAYS[p.dow]}, ${pad(p.d)} de ${MONTHS[p.m - 1]}`;
  }

  /* Aberto agora / fechado ---------------------------------------------- */

  function getStatus() {
    const now = nowInSaoPaulo();
    const today = HOURS[now.dow];
    if (today && now.minutes >= today[0] && now.minutes < today[1]) {
      return { open: true, title: 'Aberto agora', detail: `até ${formatHour(today[1])}` };
    }
    for (let i = 0; i < 8; i++) {
      const day = addDays(now.y, now.m, now.d, i);
      const hours = HOURS[day.dow];
      if (!hours || (i === 0 && now.minutes >= hours[0])) continue;
      const when = i === 0 ? 'hoje' : i === 1 ? 'amanhã' : WEEKDAYS[day.dow];
      return { open: false, title: 'Fechado agora', detail: `abre ${when} às ${formatHour(hours[0])}` };
    }
    return { open: false, title: 'Fechado agora', detail: '' };
  }

  function renderStatus() {
    const status = getStatus();
    $$('[data-status]').forEach((el) => {
      el.classList.toggle('is-open', status.open);
      el.classList.toggle('is-closed', !status.open);
      const title = $('[data-status-title]', el);
      const detail = $('[data-status-detail]', el);
      if (title) title.textContent = status.title;
      if (detail) {
        const capitalize = el.classList.contains('hero-fact');
        detail.textContent = capitalize ? status.detail.charAt(0).toUpperCase() + status.detail.slice(1) : status.detail;
      }
    });
    const dow = nowInSaoPaulo().dow;
    $$('.hours li').forEach((li) => {
      li.classList.toggle('is-today', li.dataset.days.split(' ').map(Number).includes(dow));
    });
  }

  /* Faixa de aviso ---------------------------------------------------------
     Mede a altura real da faixa "projeto demonstrativo" (que quebra em duas
     linhas em telas estreitas) e empurra o cabeçalho fixo pra baixo dela. */

  const proposalNote = $('.proposal-note');
  function syncNoteHeight() {
    if (!proposalNote) return;
    document.documentElement.style.setProperty('--note-h', `${proposalNote.offsetHeight}px`);
  }
  if (proposalNote) {
    syncNoteHeight();
    window.addEventListener('resize', syncNoteHeight);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncNoteHeight);
  }

  /* Header, menu e navegação --------------------------------------------- */

  const header = $('.site-header');
  const toTop = $('.to-top');

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 20);
    toTop.classList.toggle('is-visible', y > 900);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));

  const menuToggle = $('.menu-toggle');
  const mobileMenu = $('#mobile-menu');

  function setMenu(open) {
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.toggleAttribute('inert', !open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
  }

  menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  mobileMenu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
      setMenu(false);
      menuToggle.focus();
    }
  });
  window.matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  const navLinks = $$('.nav a');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['#inicio', ...navLinks.map((a) => a.getAttribute('href'))].forEach((sel) => {
    const section = $(sel);
    if (section) sectionObserver.observe(section);
  });

  /* Animações de entrada e contadores ------------------------------------ */

  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || '';
    const format = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (reducedMotion) { el.textContent = format(target); return; }
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = format(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    // Garante o valor final mesmo se a aba ficar em segundo plano (rAF pausa).
    setTimeout(() => { el.textContent = format(target); }, duration + 150);
  }

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      $$('[data-count]', entry.target).forEach(animateCount);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => revealObserver.observe(el));

  /* Filtro de serviços ---------------------------------------------------- */

  const filters = $$('.filter');
  const serviceCards = $$('.service-card');
  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      serviceCards.forEach((card) => {
        card.hidden = filter !== 'todos' && card.dataset.cat !== filter;
        if (!card.hidden) card.classList.add('is-visible');
      });
    });
  });

  /* Agendamento ----------------------------------------------------------- */

  const state = { services: new Set(), date: null, time: null };
  const form = $('#booking-form');
  const svcWrap = $('#svc-options');
  const dateWrap = $('#date-options');
  const timeWrap = $('#time-options');
  const errorEl = $('#bk-error');
  const nameEl = $('#bk-name');
  const phoneEl = $('#bk-phone');
  const notesEl = $('#bk-notes');
  const submitWrap = errorEl.parentElement;
  const submitBtn = $('.bk-submit');

  function renderServiceOptions() {
    svcWrap.innerHTML = SERVICES.map((s) => `
      <button type="button" class="chip" data-id="${s.id}" aria-pressed="false">
        <span class="chip-left">
          <span class="chip-check" aria-hidden="true"><svg class="icon"><use href="#i-check"/></svg></span>
          <span class="chip-name">${s.name}</span>
        </span>
        <span class="chip-price">${formatMoney(s.price)}</span>
      </button>`).join('');
  }

  function setService(id, on) {
    if (on) state.services.add(id); else state.services.delete(id);
    const chip = svcWrap.querySelector(`[data-id="${id}"]`);
    if (chip) chip.setAttribute('aria-pressed', String(on));
    updateSummary();
    clearError();
  }

  svcWrap.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) setService(chip.dataset.id, !state.services.has(chip.dataset.id));
  });

  function slotsFor(iso) {
    const hours = HOURS[parseIso(iso).dow];
    if (!hours) return [];
    const now = nowInSaoPaulo();
    const isToday = iso === now.iso;
    const slots = [];
    for (let t = hours[0]; t <= hours[1] - SLOT_MINUTES; t += SLOT_MINUTES) {
      slots.push({ t, label: formatTime(t), past: isToday && t <= now.minutes + 15 });
    }
    return slots;
  }

  function renderDateOptions() {
    const now = nowInSaoPaulo();
    let html = '';
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const day = addDays(now.y, now.m, now.d, i);
      const iso = toIso(day.y, day.m, day.d);
      const open = Boolean(HOURS[day.dow]);
      const available = open && slotsFor(iso).some((s) => !s.past);
      const label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : WEEKDAYS_SHORT[day.dow];
      const sub = !open ? 'Fechado' : !available ? 'Encerrado' : MONTHS[day.m - 1];
      const aria = `${formatDateLong(iso)}${available ? '' : open ? ', sem horários' : ', fechado'}`;
      html += `<button type="button" class="date-chip" data-date="${iso}" aria-pressed="${state.date === iso}" aria-label="${aria}"${available ? '' : ' disabled'}>
        <span class="dw">${label}</span><span class="dd">${day.d}</span><span class="dm">${sub}</span>
      </button>`;
    }
    dateWrap.innerHTML = html;
  }

  function renderTimeOptions() {
    if (!state.date) {
      timeWrap.innerHTML = '<p class="bk-empty">Escolha um dia para ver os horários.</p>';
      return;
    }
    const slots = slotsFor(state.date);
    const groups = [
      ['Manhã', 'i-sun', (s) => s.t < 720],
      ['Tarde', 'i-clock', (s) => s.t >= 720 && s.t < 1080],
      ['Noite', 'i-moon', (s) => s.t >= 1080]
    ];
    timeWrap.innerHTML = groups.map(([title, icon, match]) => {
      const list = slots.filter(match);
      if (!list.length) return '';
      return `<div class="time-group">
        <p class="time-group-title"><svg class="icon" aria-hidden="true"><use href="#${icon}"/></svg>${title}</p>
        <div class="time-grid">${list.map((s) => `<button type="button" class="time-chip" data-time="${s.label}" aria-pressed="${state.time === s.label}"${s.past ? ` disabled aria-label="${s.label}, indisponível"` : ''}>${s.label}</button>`).join('')}</div>
      </div>`;
    }).join('');
  }

  dateWrap.addEventListener('click', (e) => {
    const chip = e.target.closest('.date-chip');
    if (!chip || chip.disabled) return;
    state.date = chip.dataset.date;
    $$('.date-chip', dateWrap).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    if (state.time && !slotsFor(state.date).some((s) => s.label === state.time && !s.past)) state.time = null;
    renderTimeOptions();
    updateSummary();
    clearError();
  });

  timeWrap.addEventListener('click', (e) => {
    const chip = e.target.closest('.time-chip');
    if (!chip || chip.disabled) return;
    state.time = chip.dataset.time;
    $$('.time-chip', timeWrap).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    updateSummary();
    clearError();
  });

  const selectedServices = () => SERVICES.filter((s) => state.services.has(s.id));

  function setSummary(id, value, empty) {
    const el = document.getElementById(id);
    el.textContent = value || empty;
    el.classList.toggle('is-empty', !value);
  }

  function updateSummary() {
    const list = selectedServices();
    setSummary('sum-services', list.map((s) => s.name).join(', '), 'Nenhum');
    setSummary('sum-date', state.date ? formatDateLong(state.date) : '', 'A escolher');
    setSummary('sum-time', state.time || '', 'A escolher');
    $('#sum-total').textContent = formatMoney(list.reduce((sum, s) => sum + s.price, 0));
  }

  function maskPhone(value) {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  phoneEl.addEventListener('input', () => { phoneEl.value = maskPhone(phoneEl.value); clearError(); });
  nameEl.addEventListener('input', clearError);

  function showError(message, target) {
    const step = target.closest('.bk-step');
    errorEl.textContent = message;
    (step || submitWrap).appendChild(errorEl);
    errorEl.hidden = false;
    if (target.matches('input')) target.closest('.field').classList.add('has-error');
    (step || target).scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    const focusable = target.matches('input, textarea') ? target : target.querySelector('button:not(:disabled)');
    if (focusable) focusable.focus({ preventScroll: true });
  }

  function clearError() {
    if (errorEl.hidden) return;
    errorEl.hidden = true;
    submitWrap.insertBefore(errorEl, submitBtn);
    $$('.field.has-error').forEach((f) => f.classList.remove('has-error'));
  }

  // A barbearia é fictícia, então nada é enviado de verdade: os botões de
  // WhatsApp e o "remarcar" apenas explicam o que aconteceria num site real.
  const DEMO_MESSAGE = 'Demonstração: em um site real, isso abriria o WhatsApp da barbearia.';

  function loadBookings() {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return [];
    }
  }

  function saveBookings(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (err) { /* armazenamento indisponível */ }
  }

  function renderBookings() {
    const today = nowInSaoPaulo().iso;
    const list = loadBookings().filter((b) => b.date >= today);
    $('#my-bookings').hidden = list.length === 0;
    $('#bookings-list').innerHTML = list.map((b) => `
      <div class="booking-item">
        <strong>${escapeHtml(b.services.map((s) => s.name).join(' + '))}</strong>
        <span>${escapeHtml(formatDateLong(b.date))} às ${escapeHtml(b.time)} · ${escapeHtml(formatMoney(b.services.reduce((sum, s) => sum + s.price, 0)))}</span>
        <div class="booking-actions">
          <button type="button" class="mini-btn" data-action="reschedule" data-id="${escapeHtml(b.id)}">Remarcar</button>
          <button type="button" class="mini-btn danger" data-action="cancel" data-id="${escapeHtml(b.id)}">Cancelar</button>
        </div>
      </div>`).join('');
  }

  $('#bookings-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const list = loadBookings();
    const booking = list.find((b) => String(b.id) === btn.dataset.id);
    if (!booking) return;

    if (btn.dataset.action === 'reschedule') {
      showToast(DEMO_MESSAGE);
      return;
    }

    // Cancelar pede um segundo toque, para evitar cancelamento sem querer.
    if (!btn.hasAttribute('data-armed')) {
      btn.setAttribute('data-armed', '');
      btn.textContent = 'Confirmar cancelamento';
      setTimeout(() => {
        if (btn.isConnected) { btn.removeAttribute('data-armed'); btn.textContent = 'Cancelar'; }
      }, 4000);
      return;
    }
    saveBookings(list.filter((b) => b !== booking));
    renderBookings();
    showToast('Agendamento cancelado.');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();

    const name = nameEl.value.trim();
    const phoneDigits = phoneEl.value.replace(/\D/g, '');

    if (!state.services.size) return showError('Escolha pelo menos um serviço.', svcWrap);
    if (!state.date) return showError('Escolha o dia do atendimento.', dateWrap);
    if (!state.time) return showError('Escolha um horário.', timeWrap);
    if (name.length < 2) return showError('Informe seu nome.', nameEl);
    if (phoneDigits.length < 10) return showError('Informe um WhatsApp válido, com DDD.', phoneEl);

    const booking = {
      id: String(Date.now()),
      services: selectedServices().map(({ name: n, price }) => ({ name: n, price })),
      date: state.date,
      time: state.time,
      name,
      phone: phoneEl.value,
      notes: notesEl.value.trim()
    };

    const list = loadBookings();
    list.unshift(booking);
    saveBookings(list);
    try { localStorage.setItem(CLIENT_KEY, JSON.stringify({ name, phone: phoneEl.value })); } catch (err) { /* ignore */ }

    resetBooking();
    renderBookings();
    showToast('Agendamento confirmado! (ambiente de demonstração)');
  });

  // Botões de contato: mostram o aviso de demonstração em vez de abrir link real.
  $$('[data-demo]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showToast(DEMO_MESSAGE);
    });
  });

  function resetBooking() {
    state.services.clear();
    state.date = null;
    state.time = null;
    notesEl.value = '';
    $$('.chip', svcWrap).forEach((c) => c.setAttribute('aria-pressed', 'false'));
    renderDateOptions();
    renderTimeOptions();
    updateSummary();
  }

  $$('[data-book]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setService(btn.dataset.book, true);
      $('#agendar').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      showToast(`${SERVICES.find((s) => s.id === btn.dataset.book).name} adicionado ao agendamento.`);
    });
  });

  let toastTimer;
  function showToast(message) {
    const toast = $('#toast');
    $('#toast-text').textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 4200);
  }

  try {
    const client = JSON.parse(localStorage.getItem(CLIENT_KEY));
    if (client) {
      nameEl.value = client.name || '';
      phoneEl.value = client.phone || '';
    }
  } catch (err) { /* ignore */ }

  renderServiceOptions();
  renderDateOptions();
  renderTimeOptions();
  updateSummary();
  renderBookings();
  renderStatus();

  setInterval(() => {
    renderStatus();
    renderDateOptions();
    if (state.date) renderTimeOptions();
  }, 60000);
})();
