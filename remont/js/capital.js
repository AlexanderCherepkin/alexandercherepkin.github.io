/* ===== /remont/js/capital.js ===== */
(() => {
  // ===== HERO background carousel =====
  const hero = document.querySelector('.hero');
  if (hero) {
    const slides = [...hero.querySelectorAll('.hero__bg')];
    let idx = slides.findIndex(el => el.classList.contains('is-active'));
    if (idx < 0) idx = 0, slides[0]?.classList.add('is-active');

    let interval = parseInt(hero.dataset.interval, 10);
    if (!Number.isFinite(interval) || interval < 2000) interval = 6000;

    let timer = null;
    const go = () => {
      slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      idx = (idx + 1) % slides.length;
    };
    const start = () => { stop(); timer = setInterval(go, interval); };
    const stop  = () => { if (timer) clearInterval(timer), (timer = null); };

    // старт/пауза при видимости
    const vis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', vis, { passive: true });
    start();

    // останавливаем при уходе секции с экрана (бережём батарею)
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      e.isIntersecting ? start() : stop();
    }, { threshold: 0.15 });
    io.observe(hero);
  }

  // ===== Smooth scroll for [data-scroll] =====
  document.querySelectorAll('[data-scroll]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, { passive: false });
  });

  // ===== Before/After slider =====
  const ba = document.querySelector('.beforeafter__wrap');
  if (ba) {
    const slider = ba.querySelector('.beforeafter__slider');
    const set = (v) => { ba.style.setProperty('--pos', String(v)); };
    if (slider) {
      set(slider.value);
      slider.addEventListener('input', () => set(slider.value), { passive: true });

      // перетаскивание мышью по всей области
      const move = (clientX) => {
        const rect = ba.getBoundingClientRect();
        const pos = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
        slider.value = String(pos); set(pos);
      };
      ba.addEventListener('pointerdown', (e) => {
        slider.setPointerCapture?.(e.pointerId);
        move(e.clientX);
        const onMove = (ev) => move(ev.clientX);
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerup', onUp, { passive: true });
      }, { passive: true });
    }
  }

  // ===== Lightbox (dialog) =====
  const dialog = document.querySelector('.lightbox');
  const gridButtons = [...document.querySelectorAll('.gallery__item')];
  if (dialog && gridButtons.length) {
    const img = dialog.querySelector('.lightbox__img');
    const btnClose = dialog.querySelector('.lightbox__close');
    const prev = dialog.querySelector('.lightbox__prev');
    const next = dialog.querySelector('.lightbox__next');
    let current = 0;

    const openAt = (i) => {
      current = (i + gridButtons.length) % gridButtons.length;
      const src = gridButtons[current].getAttribute('data-full');
      img.src = src; img.alt = gridButtons[current].querySelector('img')?.alt || '';
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', 'open'); // фолбэк
      document.documentElement.classList.add('modal-open');
    };
    const close = () => {
      if (dialog.open) dialog.close?.();
      dialog.removeAttribute('open');
      document.documentElement.classList.remove('modal-open');
    };
    const nav = (dir) => openAt(current + dir);

    gridButtons.forEach((b, i) => b.addEventListener('click', () => openAt(i), { passive: true }));
    btnClose?.addEventListener('click', close, { passive: true });
    dialog.addEventListener('click', (e) => {
      const within = img.contains(e.target) || prev.contains(e.target) || next.contains(e.target) || btnClose.contains(e.target);
      if (!within) close();
    });
    prev?.addEventListener('click', (e) => { e.stopPropagation(); nav(-1); });
    next?.addEventListener('click', (e) => { e.stopPropagation(); nav(1); });
    window.addEventListener('keydown', (e) => {
      if (!dialog.open) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') nav(-1);
      if (e.key === 'ArrowRight') nav(1);
    });
  }

  // ===== A11y: anchor targets have scroll-margin for fixed headers (если есть) =====
  const header = document.querySelector('header');
  if (header) {
    const offset = Math.max(0, header.getBoundingClientRect().height - 2);
    document.querySelectorAll('section[id]').forEach(sec => {
      sec.style.scrollMarginTop = `${offset}px`;
    });
  }
})();

// === Header transparency over HERO (body classes for reliable styling) ===
(() => {
  const header =
    document.querySelector('header') ||
    document.querySelector('.site-header') ||
    document.querySelector('.header');

  const hero = document.querySelector('.hero');
  if (!header || !hero) return;

  const setHeaderH = () => {
    const h = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--header-h', `${h}px`);
  };
  setHeaderH();
  window.addEventListener('resize', setHeaderH, { passive: true });

  const apply = (isOverHero) => {
    header.classList.toggle('is-transparent', isOverHero);
    header.classList.toggle('is-solid', !isOverHero);
    document.body.classList.toggle('over-hero', isOverHero);
    document.body.classList.toggle('after-hero', !isOverHero);
  };

  apply(true);

  const io = new IntersectionObserver(
    (entries) => {
      const e = entries[0];
      if (e) apply(e.intersectionRatio >= 0.2);
    },
    { threshold: [0, 0.2, 0.5, 1] }
  );
  io.observe(hero);

  let lastY = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      if (y < 10) apply(true);
      else if (y > lastY) apply(false);
      lastY = y;
    },
    { passive: true }
  );
})();


// Глобальный делегат на закрытие модалки/квиза крестиком
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.modal__close, .popup__close, .btn-close, .close, .mfp-close, .fancybox__close, [data-close], .quiz-close');
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  const modal = btn.closest('dialog, .modal, .popup, [role="dialog"]');
  if (modal?.close) {
    modal.close();                           // для <dialog>
  } else if (modal) {
    modal.classList.remove('open','is-open','active','show');
    modal.style.display = 'none';
    // если есть оверлей-сосед
    const ov = modal.parentElement?.querySelector('.modal__overlay, .popup__overlay, .mfp-bg, .fancybox__backdrop');
    if (ov) ov.style.display = 'none';
  }
}, { passive: false });

// ===== Quiz/modal: safe close + reopen =====
(() => {
  const clearInline = (modal) => {
    if (!modal) return;
    ['width','maxWidth','left','transform','overflowX','display'].forEach(p => modal.style[p] = '');
    const inner = modal.querySelector('.container, .wrap, .content, .inner, .modal__body, .popup__content');
    if (inner) ['width','maxWidth','padding'].forEach(p => inner.style[p] = '');
    const ov = modal.parentElement?.querySelector('.modal__overlay, .popup__overlay, .mfp-bg, .fancybox__backdrop');
    if (ov) ov.style.display = '';
  };

  // 1) Клик по «открыть квиз»: на всякий случай чистим прошлые инлайны
  document.addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-quiz-open], .js-quiz-open, .open-quiz, a[href*="#quiz"]');
    if (!openBtn) return;
    setTimeout(() => {
      const modal =
        document.querySelector('dialog[open]') ||
        document.querySelector('.quiz-modal.is-open, .modal-quiz.is-open, .modal.show, .popup.open, [role="dialog"].open, .quiz.open, .quiz.is-open, .quiz.active, .quiz.show');
      if (modal) clearInline(modal);
    }, 30);
  }, { passive: true });

  // 2) Клик по «крестику»: сначала дать отработать нативному коду, потом подстраховаться
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.modal__close, .popup__close, .btn-close, .close, .mfp-close, .fancybox__close, [data-close], .quiz-close');
    if (!btn) return;

    // если крестик — <a href="#">, чтобы не прыгал якорь
    if (btn.tagName === 'A' && btn.getAttribute('href') === '#') e.preventDefault();

    const modal = btn.closest('dialog, .quiz-modal, .modal-quiz, .modal, .popup, [role="dialog"], .quiz');

    // ждём нативное закрытие, затем чистим инлайны; если не закрылось — закрываем сами
    setTimeout(() => {
      const cs = modal ? getComputedStyle(modal) : null;
      const stillVisible = modal && !(cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0);

      if (stillVisible && modal) {
        if (modal.close) modal.close();                    // <dialog>
        modal.classList.remove('open','is-open','active','show');
        modal.style.display = '';                          // важно для повторного открытия
      }
      if (modal) clearInline(modal);
    }, 40);
  }, { passive: false });

  // 3) Если модалка скрылась переходом/анимацией — тоже очистим инлайны
  document.addEventListener('transitionend', (ev) => {
    const m = ev.target.closest('.quiz-modal, .modal-quiz, .modal, .popup, [role="dialog"], .quiz');
    if (!m) return;
    const cs = getComputedStyle(m);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) clearInline(m);
  });
})();


