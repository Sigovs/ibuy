(() => {
  const header = document.getElementById('topNav');
  const toggle = document.querySelector('.nav-toggle');
  const mobileNav = document.getElementById('mobileNav');

  /* Nav scrolled state */
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile nav toggle */
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    mobileNav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        mobileNav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ------------------------------------------------------------------
     GSAP cinematic motion
     — restrained, slow, atmospheric
     — reveals: opacity + slight translateY only (no horizontal)
     — parallax: hero bg, difference photo, gallery cards
  ------------------------------------------------------------------ */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canAnimate = !reduceMotion && window.gsap && window.ScrollTrigger && window.SplitType;
  if (!canAnimate) return;

  gsap.registerPlugin(ScrollTrigger);

  /* === HERO STATS — count-up from 000 === */
  const statEls = document.querySelectorAll('.hero-stats .stat-value');
  statEls.forEach((el) => {
    const raw = el.textContent.trim();
    const match = raw.match(/^(\D*)(\d+(?:[.,]\d+)?)(\D*)$/);
    if (!match) return;
    const [, prefix, numStr, suffix] = match;
    const target = parseFloat(numStr.replace(',', ''));
    const pad = numStr.replace(/[.,]/g, '').length;
    const proxy = { v: 0 };
    el.textContent = prefix + '0'.repeat(pad) + suffix;
    gsap.to(proxy, {
      v: target,
      duration: 2.2,
      ease: 'power2.out',
      delay: 0.6,
      onUpdate: () => {
        const n = Math.round(proxy.v);
        el.textContent = prefix + String(n).padStart(pad, '0') + suffix;
      },
      onComplete: () => {
        el.textContent = raw;
      },
    });
  });

  /* === STEP CARDS — restrained stagger reveal === */
  const stepCards = document.querySelectorAll('#how .step-card');
  if (stepCards.length) {
    gsap.from(stepCards, {
      opacity: 0,
      y: 30,
      duration: 1.0,
      stagger: 0.10,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#how .step-grid',
        start: 'top 85%',
        once: true,
      },
    });
  }

  /* === HERO BG PARALLAX + CINEMATIC ZOOM === */
  const heroBg = document.querySelector('.hero-band-dark.hero-fullscreen .hero-bg');
  if (heroBg) {
    gsap.fromTo(heroBg,
      { yPercent: 0, scale: 1.05 },
      {
        yPercent: -14,
        scale: 1.30,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-band-dark.hero-fullscreen',
          start: 'top top',
          end: 'bottom top',
          scrub: 1.2,
        },
      }
    );
  }

  /* === iBUY DIFFERENCE PHOTO — slide-in from bottom === */
  const diffPhoto = document.querySelector('.difference-photo');
  if (diffPhoto) {
    gsap.from(diffPhoto, {
      opacity: 0,
      yPercent: 60,
      duration: 1.4,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#difference .difference-grid',
        start: 'top 80%',
        once: true,
      },
    });
  }

  /* === WHY iBUY — cards stagger + image slide-in from bottom === */
  const whyCards = document.querySelectorAll('#why .why-card');
  if (whyCards.length) {
    gsap.from(whyCards, {
      opacity: 0,
      y: 28,
      duration: 1.1,
      stagger: 0.10,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#why .why-grid',
        start: 'top 82%',
        once: true,
      },
    });
  }

  const whyImage = document.querySelector('#why .why-image');
  if (whyImage) {
    gsap.from(whyImage, {
      opacity: 0,
      yPercent: 60,
      duration: 1.4,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#why .why-grid',
        start: 'top 80%',
        once: true,
      },
    });
  }

  /* === RECENTLY ACQUIRED — horizontal gallery stagger reveal === */
  const galleryCards = document.querySelectorAll('#recent .model-card');
  if (galleryCards.length) {
    gsap.from(galleryCards, {
      opacity: 0,
      x: 40,
      duration: 1.0,
      stagger: 0.08,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '#recent .model-grid',
        start: 'top 85%',
        once: true,
      },
    });
  }

  /* === RECENTLY ACQUIRED — arrows + dots carousel control === */
  document.querySelectorAll('[data-gallery]').forEach((gallery) => {
    const track = gallery.querySelector('[data-gallery-track]');
    const dotsHost = gallery.querySelector('[data-gallery-dots]');
    const prev = gallery.querySelector('.model-nav-prev');
    const next = gallery.querySelector('.model-nav-next');
    const cards = track ? Array.from(track.children) : [];
    if (!track || !cards.length) return;

    /* Build dots */
    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'model-dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => scrollToCard(i));
      dotsHost.appendChild(dot);
    });
    const dots = Array.from(dotsHost.children);

    const cardStep = () => {
      if (cards.length < 2) return cards[0].getBoundingClientRect().width;
      return cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
    };

    const scrollToCard = (i) => {
      const step = cardStep();
      track.scrollTo({ left: step * i, behavior: 'smooth' });
    };

    const activeIndex = () => {
      const step = cardStep();
      return Math.round(track.scrollLeft / step);
    };

    const sync = () => {
      const i = activeIndex();
      dots.forEach((d, idx) => d.classList.toggle('is-active', idx === i));
      if (prev) prev.disabled = track.scrollLeft <= 1;
      if (next) next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1;
    };

    if (prev) prev.addEventListener('click', () => scrollToCard(Math.max(0, activeIndex() - 1)));
    if (next) next.addEventListener('click', () => scrollToCard(Math.min(cards.length - 1, activeIndex() + 1)));

    let rafId = null;
    track.addEventListener('scroll', () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        sync();
        rafId = null;
      });
    }, { passive: true });

    window.addEventListener('resize', sync);
    sync();
  });

  /* === HEADERS — line-by-line subtle reveal (needs fonts loaded) === */
  const revealHeader = (eyebrowSel, headingSel, opts = {}) => {
    const eyebrow = typeof eyebrowSel === 'string' ? document.querySelector(eyebrowSel) : eyebrowSel;
    const heading = typeof headingSel === 'string' ? document.querySelector(headingSel) : headingSel;
    if (!heading) return;

    const split = new SplitType(heading, { types: 'lines', tagName: 'span' });
    const targets = [eyebrow, ...split.lines].filter(Boolean);

    gsap.from(targets, {
      opacity: 0,
      y: 24,
      duration: 1.0,
      stagger: 0.07,
      ease: 'power3.out',
      delay: opts.delay || 0,
      ...(opts.scrollTrigger !== false && {
        scrollTrigger: { trigger: heading, start: 'top 85%', once: true },
      }),
    });
  };

  const runHeaderReveals = () => {
    /* Hero — immediate, no scroll trigger */
    revealHeader('.hero-text .label-uppercase', '.hero-text .display-xl', {
      scrollTrigger: false,
      delay: 0.2,
    });

    /* Every other section header — scroll triggered */
    const sectionHeaders = [
      ['#how .label-uppercase',              '#how .display-lg'],
      ['#why .label-uppercase',              '#why .display-lg'],
      ['.hero-band-quote .label-uppercase',  '.hero-band-quote .hero-quote'],
      ['#reviews .label-uppercase',          '#reviews .display-lg'],
      ['#recent .eyebrow-logo',              '#recent .display-lg'],
      ['#difference .label-uppercase',       '#difference .display-lg'],
      ['#faq .label-uppercase',              '#faq .display-lg'],
      ['.cta-band-photo .label-uppercase',   '.cta-band-photo .display-md'],
    ];

    sectionHeaders.forEach(([eyebrow, heading]) => revealHeader(eyebrow, heading));

    /* Refresh ScrollTrigger after all splits / late layout shifts */
    ScrollTrigger.refresh();
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(runHeaderReveals);
  } else {
    window.addEventListener('load', runHeaderReveals);
  }
})();
