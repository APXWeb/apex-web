(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile nav toggle
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Scroll-triggered reveal animations
  const revealEls = document.querySelectorAll('[data-reveal]');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.getAttribute('data-delay') || 0;
          entry.target.style.transitionDelay = `${delay * 90}ms`;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => revealObserver.observe(el));
  }

  // Header shrink + scroll progress + active nav link + back-to-top
  const header = document.getElementById('site-header');
  const progressBar = document.getElementById('scroll-progress');
  const backToTop = document.getElementById('back-to-top');
  const bttBar = document.getElementById('btt-bar');
  const sections = document.querySelectorAll('main section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

  // Sublinhado unico que desliza entre os itens do menu
  const navIndicator = document.getElementById('nav-indicator');
  const navItems = Array.from(navLinks.querySelectorAll('a:not(.nav-cta)'));
  let navHovering = false;

  function moveIndicator(el) {
    if (!navIndicator) return;
    if (!el) {
      navIndicator.style.opacity = '0';
      return;
    }
    navIndicator.style.opacity = '1';
    navIndicator.style.width = `${el.offsetWidth}px`;
    navIndicator.style.top = `${el.offsetTop + el.offsetHeight - 2}px`;
    navIndicator.style.transform = `translateX(${el.offsetLeft}px)`;
  }

  function updateIndicator() {
    if (!navIndicator) return;
    if (window.innerWidth <= 900) {
      navLinks.classList.remove('has-indicator');
      navIndicator.style.opacity = '0';
      return;
    }
    navLinks.classList.add('has-indicator');
    moveIndicator(navItems.find(a => a.classList.contains('active')) || null);
  }

  if (navIndicator) {
    navItems.forEach(a => {
      a.addEventListener('pointerenter', () => {
        if (window.innerWidth > 900) {
          navHovering = true;
          moveIndicator(a);
        }
      });
    });
    const leaveNav = () => {
      navHovering = false;
      updateIndicator();
    };
    navLinks.addEventListener('pointerleave', leaveNav);
    header.addEventListener('pointerleave', leaveNav);
    window.addEventListener('blur', leaveNav);
    window.addEventListener('resize', updateIndicator);
  }

  function onScroll() {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
    progressBar.style.width = `${progress}%`;

    if (bttBar) {
      const ring = 151;
      bttBar.style.strokeDashoffset = `${ring - (ring * progress) / 100}`;
    }

    header.classList.toggle('scrolled', scrollY > 20);
    backToTop.classList.toggle('show', scrollY > 600);

    let currentId = '';
    sections.forEach(section => {
      const top = section.offsetTop - 140;
      if (scrollY >= top) currentId = section.id;
    });

    navAnchors.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${currentId}`);
    });

    if (!navHovering) updateIndicator();
  }

  let scrollScheduled = false;
  window.addEventListener('scroll', () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    setTimeout(() => { onScroll(); scrollScheduled = false; }, 50);
  });

  onScroll();

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

  // Spotlight + borda que acende acompanhando o cursor nos cards
  if (!prefersReducedMotion) {
    document.querySelectorAll('.spec-card, .portfolio-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        card.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
      });
    });

    // O preenchimento do botao nasce do ponto por onde o cursor entrou
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('mouseenter', (e) => {
        const rect = btn.getBoundingClientRect();
        btn.style.setProperty('--bx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        btn.style.setProperty('--by', `${((e.clientY - rect.top) / rect.height) * 100}%`);
      });
    });
  }

  // Formulário de depoimento: sem backend (GitHub Pages), então em vez de
  // guardar a resposta em algum servidor, montamos a mensagem e abrimos o
  // WhatsApp da APX Web já com ela pronta pra enviar.
  const APX_WHATSAPP = '5511944815707';
  const testimonialForm = document.getElementById('testimonial-form');
  if (testimonialForm) {
    testimonialForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('testimonial-error');
      errorEl.hidden = true;

      // Honeypot: bot preencheu um campo escondido do usuário -> ignora silenciosamente.
      if (testimonialForm.elements['bot-field'].value) return;

      const nome = testimonialForm.elements['nome'].value.trim();
      const empresa = testimonialForm.elements['empresa'].value.trim();
      const depoimento = testimonialForm.elements['depoimento'].value.trim();

      if (!nome || !depoimento) {
        errorEl.textContent = 'Preencha seu nome e o depoimento.';
        errorEl.hidden = false;
        return;
      }

      let mensagem = `Olá! Quero deixar um depoimento sobre a APX Web:\n\nNome: ${nome}`;
      if (empresa) mensagem += `\nEmpresa: ${empresa}`;
      mensagem += `\nDepoimento: ${depoimento}`;

      window.open(`https://wa.me/${APX_WHATSAPP}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener');

      testimonialForm.hidden = true;
      document.getElementById('testimonial-success').hidden = false;
    });
  }

  // Mouse parallax on floating hero cards
  const hero = document.querySelector('.hero');
  const parallaxEls = document.querySelectorAll('[data-parallax]');

  if (hero && parallaxEls.length && !prefersReducedMotion) {
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const offsetX = (e.clientX - rect.left) / rect.width - 0.5;
      const offsetY = (e.clientY - rect.top) / rect.height - 0.5;

      parallaxEls.forEach(el => {
        const strength = Number(el.getAttribute('data-parallax-strength')) || 20;
        el.style.transform = `translate(${offsetX * strength}px, ${offsetY * strength}px)`;
      });
    });

    hero.addEventListener('mouseleave', () => {
      parallaxEls.forEach(el => {
        el.style.transform = '';
      });
    });
  }

  // Titulo da home entrando palavra por palavra.
  // As classes sao adicionadas pelo JS: se o script falhar, o texto ja aparece normal.
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle && !prefersReducedMotion) {
    const words = heroTitle.querySelectorAll('.word');
    heroTitle.classList.add('words-ready');
    words.forEach((word, i) => {
      word.style.transitionDelay = `${120 + i * 90}ms`;
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => heroTitle.classList.add('words-in'));
    });
  }

  // Passos do "Como Funcionamos" se desenhando conforme entram na tela
  const steps = Array.from(document.querySelectorAll('.step'));
  if (steps.length && 'IntersectionObserver' in window && !prefersReducedMotion) {
    const stepObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const index = steps.indexOf(entry.target);
        setTimeout(() => entry.target.classList.add('is-drawn'), index * 170);
        stepObserver.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    steps.forEach(step => stepObserver.observe(step));
  }
})();
