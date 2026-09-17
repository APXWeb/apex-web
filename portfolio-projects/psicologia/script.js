(() => {
  'use strict';

  const STORAGE_KEY = 'anima_sessoes_v2';
  const CLIENT_KEY = 'anima_cliente_v2';
  const LOGIN_KEY = 'anima_login_v2';
  const TIME_ZONE = 'America/Sao_Paulo';
  const DAYS_AHEAD = 21;
  const ADDRESS = 'Rua das Acácias, 210 · Vila Mariana, São Paulo (endereço fictício)';

  const TYPES = [
    { id: 'individual', name: 'Terapia individual', minutes: 50, desc: 'Para adultos · 50 min' },
    { id: 'casal', name: 'Terapia de casal', minutes: 60, desc: 'Para parceiros · 60 min' },
    { id: 'infantojuvenil', name: 'Infantojuvenil', minutes: 50, desc: 'Crianças e adolescentes · 50 min' },
    { id: 'inicial', name: 'Conversa inicial', minutes: 30, desc: 'Primeiro contato · 30 min' }
  ];
  const MODES = { online: 'Online', presencial: 'Presencial' };

  // Agenda fictícia: seg a sex 8h–20h, sábado 8h–12h, domingo fechado. Sessões começam de hora em hora.
  const HOURS = { 0: null, 1: [8, 20], 2: [8, 20], 3: [8, 20], 4: [8, 20], 5: [8, 20], 6: [8, 12] };

  const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const pad = (n) => String(n).padStart(2, '0');
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const typeById = (id) => TYPES.find((t) => t.id === id);
  const scrollOpts = (block = 'start') => ({ behavior: reducedMotion ? 'auto' : 'smooth', block });

  /* Datas no fuso de São Paulo ------------------------------------------ */

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
    return { y, m, d, iso: toIso(y, m, d), minutes: Number(parts.hour) * 60 + Number(parts.minute), dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
  }

  function addDays(y, m, d, n) {
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay() };
  }

  function parseIso(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
  }

  const formatDateLong = (iso) => { const p = parseIso(iso); return `${WEEKDAYS[p.dow]}, ${pad(p.d)} de ${MONTHS[p.m - 1]}`; };
  const formatDateShort = (iso) => { const p = parseIso(iso); return `${WEEKDAYS_SHORT[p.dow]} ${pad(p.d)}/${pad(p.m)}`; };
  const addMinutes = (time, minutes) => { const [h, mm] = time.split(':').map(Number); const t = h * 60 + mm + minutes; return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; };

  /* Armazenamento ------------------------------------------------------- */

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
  function isUpcoming(b) {
    const now = nowInSaoPaulo();
    if (b.date > now.iso) return true;
    if (b.date < now.iso) return false;
    const [h, m] = b.time.split(':').map(Number);
    return h * 60 + m > now.minutes;
  }
  const upcomingBookings = () => loadBookings().filter(isUpcoming).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  /* Agenda: horários livres --------------------------------------------- */

  function hashSlot(key) {
    let hash = 7;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 1009;
    return hash % 100;
  }

  function slotsFor(iso, ignoreId) {
    const hours = HOURS[parseIso(iso).dow];
    if (!hours) return [];
    const now = nowInSaoPaulo();
    const mine = new Set(loadBookings().filter((b) => b.id !== ignoreId).map((b) => `${b.date} ${b.time}`));
    const slots = [];
    for (let h = hours[0]; h < hours[1]; h++) {
      const label = `${pad(h)}:00`;
      const past = iso === now.iso && h * 60 <= now.minutes + 30;
      const taken = hashSlot(`${iso}-${h}`) < 32 || mine.has(`${iso} ${label}`);
      slots.push({ h, label, past, taken, free: !past && !taken });
    }
    return slots;
  }

  function findNextFreeSlot() {
    const now = nowInSaoPaulo();
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const day = addDays(now.y, now.m, now.d, i);
      const iso = toIso(day.y, day.m, day.d);
      const slot = slotsFor(iso).find((s) => s.free);
      if (slot) return { iso, time: slot.label, offset: i };
    }
    return null;
  }

  /* Estado do agendamento ------------------------------------------------ */

  const state = { type: null, mode: 'online', date: null, time: null, rescheduleId: null };

  const form = $('#booking-form');
  const typeWrap = $('#type-options');
  const modeWrap = $('#mode-options');
  const dateWrap = $('#date-options');
  const timeWrap = $('#time-options');
  const errorEl = $('#bk-error');
  const submitBtn = $('.bk-submit');
  const nameEl = $('#bk-name');
  const phoneEl = $('#bk-phone');
  const emailEl = $('#bk-email');
  const firstEl = $('#bk-first');
  const noteEl = $('#bk-note');

  function renderTypes() {
    typeWrap.innerHTML = TYPES.map((t) => `
      <button type="button" class="type-opt" data-type="${t.id}" aria-pressed="${state.type === t.id}">
        <strong>${t.name}</strong>
        <small>${t.desc}</small>
        <span class="check-dot" aria-hidden="true"><svg class="icon"><use href="#i-check"/></svg></span>
      </button>`).join('');
  }

  function setType(id) {
    state.type = id;
    $$('.type-opt', typeWrap).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === id)));
    updateSummary();
    clearError();
  }

  function setMode(mode) {
    state.mode = mode;
    $$('.mode-opt', modeWrap).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    updateSummary();
  }

  function renderDates() {
    const now = nowInSaoPaulo();
    let html = '';
    let selectedStillValid = false;
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const day = addDays(now.y, now.m, now.d, i);
      const iso = toIso(day.y, day.m, day.d);
      const open = Boolean(HOURS[day.dow]);
      const slots = open ? slotsFor(iso, state.rescheduleId) : [];
      const free = slots.some((s) => s.free);
      if (iso === state.date && free) selectedStillValid = true;
      const label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : WEEKDAYS_SHORT[day.dow];
      // "encerrado" quando os horários do dia já passaram; "lotado" quando ainda há horário à frente, mas ocupado
      const sub = !open ? 'fechado' : free ? MONTHS[day.m - 1] : slots.some((s) => !s.past) ? 'lotado' : 'encerrado';
      const aria = `${formatDateLong(iso)}${free ? '' : open ? ', sem horários livres' : ', fechado'}`;
      html += `<button type="button" class="date-chip" data-date="${iso}" aria-pressed="${state.date === iso}" aria-label="${aria}"${free ? '' : ' disabled'}><span class="dw">${label}</span><span class="dd">${day.d}</span><span class="dm">${sub}</span></button>`;
    }
    dateWrap.innerHTML = html;
    if (state.date && !selectedStillValid) {
      state.date = null;
      state.time = null;
    }
  }

  function renderTimes() {
    if (!state.date) {
      timeWrap.innerHTML = '<p class="bk-empty">Escolha um dia para ver os horários livres.</p>';
      return;
    }
    const slots = slotsFor(state.date, state.rescheduleId);
    if (state.time && !slots.some((s) => s.label === state.time && s.free)) state.time = null;
    const groups = [
      ['Manhã', 'i-sun', (s) => s.h < 12],
      ['Tarde', 'i-clock', (s) => s.h >= 12 && s.h < 18],
      ['Noite', 'i-moon', (s) => s.h >= 18]
    ];
    timeWrap.innerHTML = groups.map(([title, icon, match]) => {
      const list = slots.filter(match);
      if (!list.length) return '';
      return `<div class="time-group">
        <p class="time-group-title"><svg class="icon" aria-hidden="true"><use href="#${icon}"/></svg>${title}</p>
        <div class="time-grid">${list.map((s) => `<button type="button" class="time-chip" data-time="${s.label}" aria-pressed="${state.time === s.label}"${s.free ? '' : ` disabled aria-label="${s.label}, ${s.past ? 'já passou' : 'ocupado'}"`}>${s.label}</button>`).join('')}</div>
      </div>`;
    }).join('');
  }

  function setSummary(id, value, empty) {
    const el = document.getElementById(id);
    el.textContent = value || empty;
    el.classList.toggle('is-empty', !value);
  }

  function updateSummary() {
    const type = typeById(state.type);
    setSummary('sum-type', type ? `${type.name} · ${type.minutes} min` : '', 'A escolher');
    setSummary('sum-mode', MODES[state.mode], 'A escolher');
    setSummary('sum-date', state.date ? formatDateLong(state.date) : '', 'A escolher');
    setSummary('sum-time', state.time ? (type ? `${state.time} – ${addMinutes(state.time, type.minutes)}` : state.time) : '', 'A escolher');
    $('#sum-note').textContent = state.mode === 'online'
      ? 'O link da videochamada chega pelo WhatsApp 30 minutos antes.'
      : `${ADDRESS}. Chegue 5 minutos antes.`;
  }

  typeWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.type-opt');
    if (btn) setType(btn.dataset.type);
  });

  modeWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-opt');
    if (btn) setMode(btn.dataset.mode);
  });

  dateWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.date-chip');
    if (!btn || btn.disabled) return;
    state.date = btn.dataset.date;
    $$('.date-chip', dateWrap).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    renderTimes();
    updateSummary();
    clearError();
  });

  timeWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.time-chip');
    if (!btn || btn.disabled) return;
    state.time = btn.dataset.time;
    $$('.time-chip', timeWrap).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    updateSummary();
    clearError();
  });

  /* Validação ------------------------------------------------------------ */

  function maskPhone(value) {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  phoneEl.addEventListener('input', () => { phoneEl.value = maskPhone(phoneEl.value); clearError(); });
  [nameEl, emailEl].forEach((el) => el.addEventListener('input', clearError));

  const submitParent = errorEl.parentElement;

  function showError(message, target) {
    const step = target.closest('.bk-step');
    errorEl.textContent = message;
    (step || submitParent).appendChild(errorEl);
    errorEl.hidden = false;
    const field = target.closest('.field');
    if (field) field.classList.add('has-error');
    (step || target).scrollIntoView(scrollOpts('center'));
    const focusable = target.matches('input, textarea') ? target : target.querySelector('button:not(:disabled)');
    if (focusable) focusable.focus({ preventScroll: true });
  }

  function clearError() {
    if (errorEl.hidden) return;
    errorEl.hidden = true;
    submitParent.insertBefore(errorEl, submitBtn);
    $$('.field.has-error').forEach((f) => f.classList.remove('has-error'));
  }

  /* Envio, remarcar e cancelar ------------------------------------------ */

  const banner = $('#reschedule-banner');

  function setReschedule(booking) {
    state.rescheduleId = booking ? booking.id : null;
    banner.hidden = !booking;
    $('#bk-submit-text').textContent = booking ? 'Confirmar nova data' : 'Confirmar agendamento';
    if (booking) $('#reschedule-text').textContent = `Remarcando: ${formatDateLong(booking.date)} às ${booking.time}`;
  }

  $('#reschedule-cancel').addEventListener('click', () => {
    setReschedule(null);
    state.date = null;
    state.time = null;
    renderDates();
    renderTimes();
    updateSummary();
    showToast('Remarcação cancelada. Sua sessão continua como estava.');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();

    const name = nameEl.value.trim();
    const phoneDigits = phoneEl.value.replace(/\D/g, '');
    const email = emailEl.value.trim();

    if (!state.type) return showError('Escolha o tipo de atendimento.', typeWrap);
    if (!state.date) return showError('Escolha o dia da sessão.', dateWrap);
    if (!state.time) return showError('Escolha um horário.', timeWrap);
    if (name.length < 2) return showError('Informe seu nome.', nameEl);
    if (phoneDigits.length < 10) return showError('Informe um WhatsApp válido, com DDD.', phoneEl);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showError('Confira o e-mail — ou deixe em branco.', emailEl);

    const data = {
      type: state.type, mode: state.mode, date: state.date, time: state.time,
      name, phone: phoneEl.value, email, first: firstEl.checked, note: noteEl.value.trim()
    };

    const list = loadBookings();
    const wasReschedule = Boolean(state.rescheduleId);
    if (wasReschedule) {
      const idx = list.findIndex((b) => b.id === state.rescheduleId);
      if (idx >= 0) list[idx] = { ...list[idx], ...data };
      else list.unshift({ id: state.rescheduleId, ...data });
    } else {
      list.unshift({ id: String(Date.now()), ...data });
    }
    saveBookings(list);
    try { localStorage.setItem(CLIENT_KEY, JSON.stringify({ name, phone: phoneEl.value, email })); } catch (err) { /* ignore */ }

    const when = `${formatDateLong(data.date)} às ${data.time}`;
    setReschedule(null);
    state.type = null;
    state.date = null;
    state.time = null;
    noteEl.value = '';
    renderTypes();
    renderDates();
    renderTimes();
    updateSummary();
    renderBookings();
    renderNextSlot();
    showToast(wasReschedule ? `Sessão remarcada para ${when}.` : `Sessão agendada para ${when}.`);
    $('#my-bookings').scrollIntoView(scrollOpts('nearest'));
  });

  function renderBookings() {
    const list = upcomingBookings();
    const box = $('#my-bookings');
    box.hidden = list.length === 0;
    $('#bookings-list').innerHTML = list.map((b) => {
      const type = typeById(b.type) || { name: 'Sessão', minutes: 50 };
      return `<div class="booking-item">
        <strong>${escapeHtml(type.name)} · ${escapeHtml(MODES[b.mode] || '')}</strong>
        <span>${escapeHtml(formatDateLong(b.date))} às ${escapeHtml(b.time)}</span>
        <div class="booking-actions">
          <button type="button" class="mini-btn" data-action="ics" data-id="${escapeHtml(b.id)}"><svg class="icon" aria-hidden="true"><use href="#i-calendar-plus"/></svg>Agenda</button>
          <button type="button" class="mini-btn" data-action="reschedule" data-id="${escapeHtml(b.id)}"><svg class="icon" aria-hidden="true"><use href="#i-refresh"/></svg>Remarcar</button>
          <button type="button" class="mini-btn danger" data-action="cancel" data-id="${escapeHtml(b.id)}">Cancelar</button>
        </div>
      </div>`;
    }).join('');
  }

  function icsText(b) {
    const type = typeById(b.type) || { name: 'Sessão', minutes: 50 };
    const { y, m, d } = parseIso(b.date);
    const [h, mm] = b.time.split(':').map(Number);
    // São Paulo está em UTC-3 (sem horário de verão desde 2019).
    const utc = (minutesExtra) => new Date(Date.UTC(y, m - 1, d, h + 3, mm + minutesExtra)).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
    const location = b.mode === 'online' ? 'Online (videochamada)' : ADDRESS;
    const description = b.mode === 'online'
      ? 'O link da videochamada chega pelo WhatsApp 30 minutos antes. (Ambiente de demonstração)'
      : 'Chegue 5 minutos antes. (Ambiente de demonstração)';
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Anima Psicologia//Demonstracao//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${b.id}@anima-psicologia.demo`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
      `DTSTART:${utc(0)}`,
      `DTEND:${utc(type.minutes)}`,
      `SUMMARY:${esc(`${type.name} — Ânima Psicologia`)}`,
      `DESCRIPTION:${esc(description)}`,
      `LOCATION:${esc(location)}`,
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Lembrete da sessão', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
  }

  function downloadIcs(b) {
    const blob = new Blob([icsText(b)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessao-anima-${b.date}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Arquivo de agenda baixado — abra para adicionar ao seu calendário.');
  }

  $('#bookings-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const list = loadBookings();
    const booking = list.find((b) => b.id === btn.dataset.id);
    if (!booking) return;

    if (btn.dataset.action === 'ics') {
      downloadIcs(booking);
      return;
    }

    if (btn.dataset.action === 'reschedule') {
      setReschedule(booking);
      setType(booking.type);
      setMode(booking.mode);
      state.date = null;
      state.time = null;
      renderDates();
      renderTimes();
      updateSummary();
      $('#step-when').scrollIntoView(scrollOpts('center'));
      showToast('Escolha a nova data e o novo horário.');
      return;
    }

    // Cancelar pede um segundo toque, para ninguém cancelar sem querer.
    if (!btn.hasAttribute('data-armed')) {
      btn.setAttribute('data-armed', '');
      btn.textContent = 'Confirmar cancelamento';
      setTimeout(() => {
        if (btn.isConnected) { btn.removeAttribute('data-armed'); btn.textContent = 'Cancelar'; }
      }, 4000);
      return;
    }
    saveBookings(list.filter((b) => b.id !== booking.id));
    if (state.rescheduleId === booking.id) setReschedule(null);
    renderBookings();
    renderDates();
    renderTimes();
    renderNextSlot();
    showToast('Sessão cancelada.');
  });

  /* Próxima vaga livre (topo) ------------------------------------------- */

  let nextSlot = null;
  function renderNextSlot() {
    nextSlot = findNextFreeSlot();
    const el = $('#next-slot-value');
    if (!nextSlot) { el.textContent = 'Consulte a agenda'; return; }
    const day = nextSlot.offset === 0 ? 'Hoje' : nextSlot.offset === 1 ? 'Amanhã' : formatDateShort(nextSlot.iso);
    el.textContent = `${day}, ${nextSlot.time}`;
  }

  $('#next-slot-card').addEventListener('click', () => {
    if (!nextSlot) { $('#agendar').scrollIntoView(scrollOpts()); return; }
    state.date = nextSlot.iso;
    state.time = nextSlot.time;
    renderDates();
    renderTimes();
    updateSummary();
    $('#agendar').scrollIntoView(scrollOpts());
    showToast(`Horário de ${formatDateLong(nextSlot.iso)} às ${nextSlot.time} selecionado. Agora escolha o tipo de atendimento.`);
  });

  $$('[data-book-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setType(btn.dataset.bookType);
      $('#agendar').scrollIntoView(scrollOpts());
      showToast(`${typeById(btn.dataset.bookType).name} selecionada.`);
    });
  });

  /* Pausa para respirar -------------------------------------------------- */

  const PATTERNS = {
    quadrada: [['Inspire', 4, 1], ['Segure', 4, 1], ['Expire', 4, 0.55], ['Segure', 4, 0.55]],
    relaxante: [['Inspire', 4, 1], ['Segure', 7, 1], ['Expire', 8, 0.55]]
  };
  const breath = { pattern: 'quadrada', started: false, running: false, phase: 0, remaining: 0, cycles: 0, timer: null };
  const core = $('#breathe-circle .core');
  const phaseEl = $('#breathe-phase');
  const countEl = $('#breathe-count');
  const cyclesEl = $('#breathe-cycles');
  const toggleBtn = $('#breathe-toggle');

  function setToggle(mode) {
    const icon = mode === 'pause' ? '#i-pause' : '#i-play';
    const label = mode === 'pause' ? 'Pausar' : mode === 'resume' ? 'Continuar' : 'Começar';
    toggleBtn.querySelector('use').setAttribute('href', icon);
    toggleBtn.querySelector('span').textContent = label;
  }

  function applyPhase() {
    const [label, , scale] = PATTERNS[breath.pattern][breath.phase];
    phaseEl.textContent = label;
    countEl.textContent = breath.remaining;
    core.style.transitionDuration = `${breath.remaining}s`;
    core.style.transform = `scale(${scale})`;
  }

  function tick() {
    breath.remaining -= 1;
    if (breath.remaining <= 0) {
      breath.phase += 1;
      if (breath.phase >= PATTERNS[breath.pattern].length) {
        breath.phase = 0;
        breath.cycles += 1;
        cyclesEl.textContent = breath.cycles;
      }
      breath.remaining = PATTERNS[breath.pattern][breath.phase][1];
      applyPhase();
    } else {
      countEl.textContent = breath.remaining;
    }
  }

  function startBreath() {
    if (!breath.started) {
      breath.started = true;
      breath.phase = 0;
      breath.remaining = PATTERNS[breath.pattern][0][1];
    }
    breath.running = true;
    applyPhase();
    clearInterval(breath.timer);
    breath.timer = setInterval(tick, 1000);
    setToggle('pause');
  }

  function pauseBreath() {
    breath.running = false;
    clearInterval(breath.timer);
    const current = getComputedStyle(core).transform;
    core.style.transitionDuration = '0s';
    core.style.transform = current === 'none' ? 'scale(0.55)' : current;
    phaseEl.textContent = 'Pausado';
    setToggle('resume');
  }

  function resetBreath() {
    clearInterval(breath.timer);
    Object.assign(breath, { started: false, running: false, phase: 0, remaining: 0, cycles: 0, timer: null });
    core.style.transitionDuration = '0.8s';
    core.style.transform = 'scale(0.55)';
    phaseEl.textContent = 'Pronto?';
    countEl.textContent = '—';
    cyclesEl.textContent = '0';
    setToggle('start');
  }

  toggleBtn.addEventListener('click', () => (breath.running ? pauseBreath() : startBreath()));
  $('#breathe-reset').addEventListener('click', resetBreath);
  $$('.seg').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (breath.pattern === btn.dataset.pattern) return;
      resetBreath();
      breath.pattern = btn.dataset.pattern;
      $$('.seg').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    });
  });

  /* Modais --------------------------------------------------------------- */

  let lastFocus = null;
  const focusableSel = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])';

  function visibleFocusables(modal) {
    return $$(focusableSel, modal).filter((el) => el.offsetParent !== null);
  }

  function openModal(id) {
    const modal = $(`#modal-${id}`);
    if (!modal) return;
    setMenu(false);
    lastFocus = document.activeElement;
    if (id === 'patient') showPatientView(sessionStorage.getItem(LOGIN_KEY) ? 'dashboard' : 'login');
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    const first = visibleFocusables(modal).find((el) => el.matches('input')) || visibleFocusables(modal)[0];
    if (first) first.focus();
  }

  function closeModal(modal) {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
    if (modal.id === 'modal-contact') {
      $('#contact-form').reset();
      $('[data-view="form"]', modal).hidden = false;
      $('[data-view="success"]', modal).hidden = true;
      $('#ct-error').hidden = true;
    }
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  $$('[data-open-modal]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(btn.dataset.openModal);
    });
  });

  $$('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close-modal]')) closeModal(modal);
    });
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const items = visibleFocusables(modal);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });

  // Área do paciente (simulada)
  function showPatientView(view) {
    const modal = $('#modal-patient');
    $('[data-view="login"]', modal).hidden = view !== 'login';
    $('[data-view="dashboard"]', modal).hidden = view !== 'dashboard';
    if (view === 'dashboard') renderPatientSessions();
  }

  function renderPatientSessions() {
    let client = null;
    try { client = JSON.parse(localStorage.getItem(CLIENT_KEY)); } catch (err) { /* ignore */ }
    const loginName = sessionStorage.getItem(LOGIN_KEY) || '';
    const first = (client && client.name ? client.name : loginName).split(/\s+/)[0];
    $('#pt-hello').textContent = first ? `, ${first}` : '';
    const list = upcomingBookings().slice(0, 4);
    $('#pt-sessions').innerHTML = list.length
      ? list.map((b) => {
        const p = parseIso(b.date);
        const type = typeById(b.type) || { name: 'Sessão' };
        return `<div class="pt-session">
          <span class="pt-date"><b>${p.d}</b><small>${MONTHS[p.m - 1]}</small></span>
          <div><strong>${escapeHtml(type.name)}</strong><span>${escapeHtml(WEEKDAYS[p.dow])} às ${escapeHtml(b.time)} · ${escapeHtml(MODES[b.mode] || '')}</span></div>
        </div>`;
      }).join('')
      : '<p class="pt-empty">Nenhuma sessão agendada ainda.</p>';
  }

  $('#patient-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#pt-email').value.trim();
    const pass = $('#pt-pass').value;
    const err = $('#pt-error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = 'Informe um e-mail válido.'; err.hidden = false; $('#pt-email').focus(); return; }
    if (!pass) { err.textContent = 'Informe a senha.'; err.hidden = false; $('#pt-pass').focus(); return; }
    err.hidden = true;
    try { sessionStorage.setItem(LOGIN_KEY, email.split('@')[0]); } catch (er) { /* ignore */ }
    $('#patient-form').reset();
    showPatientView('dashboard');
    const firstAction = $('#modal-patient .pt-actions .btn');
    if (firstAction) firstAction.focus();
  });

  $('#pt-logout').addEventListener('click', () => {
    try { sessionStorage.removeItem(LOGIN_KEY); } catch (er) { /* ignore */ }
    showPatientView('login');
    $('#pt-email').focus();
    showToast('Você saiu da área do paciente.');
  });

  // Tirar dúvida (simulado)
  $('#contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('#ct-error');
    const name = $('#ct-name').value.trim();
    const reply = $('#ct-reply').value.trim();
    const msg = $('#ct-msg').value.trim();
    if (name.length < 2) { err.textContent = 'Informe seu nome.'; err.hidden = false; $('#ct-name').focus(); return; }
    if (reply.length < 5) { err.textContent = 'Informe um e-mail ou WhatsApp para a resposta.'; err.hidden = false; $('#ct-reply').focus(); return; }
    if (msg.length < 5) { err.textContent = 'Escreva sua dúvida.'; err.hidden = false; $('#ct-msg').focus(); return; }
    err.hidden = true;
    const modal = $('#modal-contact');
    $('[data-view="form"]', modal).hidden = true;
    $('[data-view="success"]', modal).hidden = false;
    $('[data-view="success"] .btn', modal).focus();
  });

  /* Cabeçalho, menu e navegação ----------------------------------------- */

  const note = $('.demo-note');
  function syncNoteHeight() {
    document.documentElement.style.setProperty('--note-h', `${note ? note.offsetHeight : 0}px`);
  }
  syncNoteHeight();
  window.addEventListener('resize', syncNoteHeight);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncNoteHeight);

  const header = $('.site-header');
  const toTop = $('.to-top');
  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 16);
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
    if (open) document.body.classList.add('no-scroll');
    else if ($$('.modal').every((m) => m.hidden)) document.body.classList.remove('no-scroll');
  }
  menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  mobileMenu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  window.matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openModalEl = $$('.modal').find((m) => !m.hidden);
    if (openModalEl) { closeModal(openModalEl); return; }
    if (mobileMenu.classList.contains('is-open')) { setMenu(false); menuToggle.focus(); }
  });

  const navLinks = $$('.nav a');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['#inicio', '#sobre', '#especialidades', '#respirar', '#como-funciona', '#agendar', '#duvidas'].forEach((sel) => {
    const el = $(sel);
    if (el) sectionObserver.observe(el);
  });

  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => revealObserver.observe(el));

  $$('[data-demo]').forEach((btn) => {
    btn.addEventListener('click', () => showToast('Demonstração: num site real, isso abriria o contato do consultório.'));
  });

  /* Aviso (toast) -------------------------------------------------------- */

  let toastTimer;
  function showToast(message) {
    const toast = $('#toast');
    $('#toast-text').textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 4600);
  }

  /* Início --------------------------------------------------------------- */

  try {
    const client = JSON.parse(localStorage.getItem(CLIENT_KEY));
    if (client) {
      nameEl.value = client.name || '';
      phoneEl.value = client.phone || '';
      emailEl.value = client.email || '';
    }
  } catch (err) { /* ignore */ }

  renderTypes();
  renderDates();
  renderTimes();
  updateSummary();
  renderBookings();
  renderNextSlot();

  setInterval(() => {
    renderDates();
    renderTimes();
    updateSummary();
    renderBookings();
    renderNextSlot();
  }, 60000);
})();
