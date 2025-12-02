/* /remont/js/design.js — v3 optimized (без AOS, без GSAP) */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ================================
     KPI Reveal Animation (замена AOS)
     ================================ */
  const initReveal = () => {
    const kpis = $$('.kpi');
    if (!kpis.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    kpis.forEach((el) => observer.observe(el));
  };

  // Инициализируем reveal при готовности DOM или layout
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveal);
  } else {
    initReveal();
  }
  // Также слушаем layout:ready на случай динамической загрузки
  document.addEventListener('layout:ready', initReveal);

  /* ================================
     Scroll Lock Utilities
     ================================ */
  const scroll = { locked: false, pad: '' };
  const hasStableGutter = (() => {
    try {
      return getComputedStyle(document.documentElement).scrollbarGutter?.includes('stable');
    } catch {
      return false;
    }
  })();

  function lockScroll() {
    if (scroll.locked) return;
    scroll.locked = true;

    if (!hasStableGutter) {
      scroll.pad = document.body.style.paddingRight || '';
      const w = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      if (w > 0) {
        const pr = getComputedStyle(document.body).paddingRight || '0px';
        document.body.style.paddingRight = `calc(${pr} + ${w}px)`;
      }
    }

    document.body.classList.add('scroll-lock');
  }

  function unlockScroll() {
    if (!scroll.locked) return;
    scroll.locked = false;

    document.body.classList.remove('scroll-lock');
    if (!hasStableGutter) document.body.style.paddingRight = scroll.pad;
  }

  window.addEventListener('pagehide', unlockScroll);

  /* ================================
     Lightbox (универсальный)
     ================================ */
  function ensureLBStyles() {
    if ($('#lb-autostyles')) return;
    const style = document.createElement('style');
    style.id = 'lb-autostyles';
    style.textContent = `
      .lightbox{position:fixed;inset:0;z-index:1500;display:grid;place-items:center}
      .lightbox[hidden]{display:none!important}
      .lightbox__backdrop{position:absolute;inset:0;background:rgba(2,6,23,.75);backdrop-filter:blur(.2rem)}
      .lightbox__frame{position:relative;max-width:92vw;max-height:92dvh;display:grid;place-items:center;outline:.16rem solid rgba(22,101,52,.5);border-radius:1rem;box-shadow:0 .8rem 2rem rgba(0,0,0,.4);overflow:hidden;background:#0b1220}
      .lightbox__img{max-width:100%;max-height:92dvh;display:block}
      .lightbox__close,.lightbox__nav{position:absolute;z-index:2;display:grid;place-items:center;width:3.4rem;height:3.4rem;border-radius:.8rem;background:rgba(255,255,255,.12);color:#fff;border:.1rem solid rgba(255,255,255,.2);cursor:pointer;transition:background .15s ease,box-shadow .15s ease}
      .lightbox__close:hover,.lightbox__nav:hover{background:rgba(255,255,255,.18);box-shadow:0 .25rem .75rem rgba(0,0,0,.25)}
      .lightbox__close{top:.6rem;right:.6rem}
      .lightbox__nav{top:50%;transform:translateY(-50%)}
      .lightbox__prev{left:1rem}
      .lightbox__next{right:1rem}
      .lightbox__svg{width:2rem;height:2rem;pointer-events:none}
    `;
    document.head.appendChild(style);
  }

  let lastTrigger = null;

  function mountLB() {
    ensureLBStyles();
    let lb = $('#lightbox');
    if (lb) return lb;

    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    lb.hidden = true;

    lb.innerHTML = `
      <div class="lightbox__backdrop" data-lb-close></div>
      <figure class="lightbox__frame" role="dialog" aria-modal="true" aria-label="Просмотр изображения">
        <button class="lightbox__close" type="button" data-lb-close aria-label="Закрыть">
          <svg class="lightbox__svg" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.7 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3 1.42 1.42Z"/>
          </svg>
        </button>
        <button class="lightbox__nav lightbox__prev" type="button" data-lb-prev aria-label="Предыдущее">
          <svg class="lightbox__svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <img class="lightbox__img" alt="">
        <button class="lightbox__nav lightbox__next" type="button" data-lb-next aria-label="Следующее">
          <svg class="lightbox__svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m8.59 16.59 1.41 1.41 6-6-6-6-1.41 1.41L13.17 12z"/></svg>
        </button>
      </figure>
    `;

    document.body.appendChild(lb);
    return lb;
  }

  function collect(startImg) {
    const wrap = startImg.closest('.case-gallery');
    if (!wrap) return { items: [], index: -1 };
    const items = $$('img[data-full]', wrap);
    let index = items.indexOf(startImg);
    if (index < 0) index = 0;
    return { items, index };
  }

  function openLB(startImg) {
    if (!startImg || !startImg.closest('.case-gallery')) return;

    const lb = mountLB();
    const imgEl = $('.lightbox__img', lb);
    const frame = $('.lightbox__frame', lb);
    const btnPrev = $('[data-lb-prev]', lb);
    const btnNext = $('[data-lb-next]', lb);
    const { items, index } = collect(startImg);

    if (!items.length) return;

    function updateArrows(i) {
      const n = items.length;
      btnPrev.hidden = n < 2 || i <= 0;
      btnNext.hidden = n < 2 || i >= n - 1;
    }

    function setBy(i) {
      const it = items[i];
      if (!it) return false;

      lb.dataset.index = String(i);
      imgEl.alt = it.alt || 'Изображение';
      imgEl.src = it.dataset.full || it.currentSrc || it.src;

      frame.tabIndex = -1;
      frame.focus({ preventScroll: true });

      updateArrows(i);
      return true;
    }

    function nav(dir) {
      const cur = Number(lb.dataset.index || 0);
      const n = items.length;
      const j = Math.min(n - 1, Math.max(0, cur + dir));
      if (j !== cur) setBy(j);
    }

    function closeLB() {
      lb.hidden = true;
      document.removeEventListener('keydown', onKey);

      btnPrev.onclick = btnNext.onclick = null;
      $$('[data-lb-close]', lb).forEach((b) => (b.onclick = null));

      unlockScroll();
      if (lastTrigger?.focus) lastTrigger.focus({ preventScroll: true });
    }

    function onKey(e) {
      if (e.key === 'Escape') return closeLB();
      if (e.key === 'ArrowLeft') return nav(-1);
      if (e.key === 'ArrowRight') return nav(1);
    }

    if (setBy(index)) {
      lb.hidden = false;
      lockScroll();

      btnPrev.onclick = () => nav(-1);
      btnNext.onclick = () => nav(1);
      $$('[data-lb-close]', lb).forEach((b) => (b.onclick = closeLB));
      document.addEventListener('keydown', onKey);
    }
  }

  document.addEventListener('click', (e) => {
    const img = e.target.closest('img[data-full]');
    if (!img || !img.closest('.case-gallery')) return;
    e.preventDefault();
    lastTrigger = img;
    openLB(img);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = document.activeElement;
    if (!el?.matches('img[data-full]') || !el.closest('.case-gallery')) return;
    e.preventDefault();
    lastTrigger = el;
    openLB(el);
  });

  function enhanceGalleryImages(root = document) {
    $$('img[data-full]', root).forEach((img) => {
      if (img.dataset.enhanced === '1') return;
      img.dataset.enhanced = '1';
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Открыть изображение поверх страницы');
    });
  }

  // Однократная инициализация галереи (без MutationObserver)
  if (document.readyState !== 'loading') {
    enhanceGalleryImages();
  } else {
    document.addEventListener('DOMContentLoaded', () => enhanceGalleryImages());
  }
  // На случай динамической загрузки партиалов
  document.addEventListener('layout:ready', () => enhanceGalleryImages());

  /* ================================
     Слайдер с HUD и прогресс-баром (без GSAP)
     ================================ */
  const initSlider = () => {
    const root = $('.slides');
    if (!root) return;

    const viewport = $('.slides__viewport', root);
    const slides = $$('.slide', viewport);
    const dots = $$('.dot', root);
    const prev = $('.slides__nav--prev', root);
    const next = $('.slides__nav--next', root);

    if (!slides.length) return;

    let i = slides.findIndex((s) => s.classList.contains('is-active'));
    if (i < 0) i = 0;

    const autoplay = root.dataset.autoplay === 'true';
    const interval = Math.max(3000, Number(root.dataset.interval || 6000));
    let t = null;

    // Устанавливаем CSS переменную для Ken Burns анимации
    root.style.setProperty('--slide-interval', `${interval}ms`);

    // Создаём HUD
    const hud = document.createElement('div');
    hud.className = 'slides__hud';
    hud.innerHTML =
      '<span class="hud__rec-dot" aria-hidden="true"></span><span class="hud__label" aria-hidden="true">REC</span>';
    root.appendChild(hud);

    // Создаём прогресс-бар
    const bar = document.createElement('div');
    bar.className = 'slides__bar';
    bar.innerHTML = '<div class="slides__bar-inner"></div>';
    root.appendChild(bar);

    const barInner = $('.slides__bar-inner', bar);

    function progress() {
      barInner.style.transition = 'none';
      barInner.style.width = '0%';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          barInner.style.transition = `width ${interval}ms linear`;
          barInner.style.width = '100%';
        });
      });
    }

    function setActive(idx) {
      // Сбрасываем анимацию на предыдущем слайде
      slides.forEach((s, k) => {
        const img = s.querySelector('img');
        if (img && k !== idx) {
          img.style.animation = 'none';
        }
      });

      // Активируем новый слайд
      slides.forEach((s, k) => s.classList.toggle('is-active', k === idx));
      dots.forEach((d, k) => {
        d.classList.toggle('is-active', k === idx);
        d.setAttribute('aria-selected', String(k === idx));
      });

      slides.forEach((s, k) => s.setAttribute('aria-label', `${k + 1} из ${slides.length}`));

      i = idx;
      progress();

      // Перезапускаем CSS анимацию Ken Burns на активном слайде
      const activeImg = slides[idx]?.querySelector('img');
      if (activeImg) {
        activeImg.style.animation = 'none';
        // Форсируем reflow для перезапуска анимации
        void activeImg.offsetWidth;
        activeImg.style.animation = '';
      }
    }

    const nextSlide = () => setActive((i + 1) % slides.length);
    const prevSlide = () => setActive((i - 1 + slides.length) % slides.length);

    function start() {
      if (autoplay && !t) t = setInterval(nextSlide, interval);
    }

    function stop() {
      if (t) {
        clearInterval(t);
        t = null;
      }
    }

    function restart() {
      stop();
      start();
    }

    next?.addEventListener('click', () => {
      nextSlide();
      restart();
    });

    prev?.addEventListener('click', () => {
      prevSlide();
      restart();
    });

    dots.forEach((d, k) =>
      d.addEventListener('click', () => {
        setActive(k);
        restart();
      })
    );

    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        nextSlide();
        restart();
      }
      if (e.key === 'ArrowLeft') {
        prevSlide();
        restart();
      }
    });

    root.tabIndex = 0;

    root.addEventListener('mouseenter', () => {
      root.dataset.paused = 'true';
      stop();
    });

    root.addEventListener('mouseleave', () => {
      root.dataset.paused = 'false';
      start();
    });

    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    // Инициализация
    setActive(i);
    start();

    // Reduced motion
    const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    
    function handleReducedMotion(mq) {
      if (mq.matches) {
        root.dataset.autoplay = 'false';
        root.dataset.paused = 'true';
        stop();
      }
    }

    handleReducedMotion(prefersReducedMotion);
    prefersReducedMotion.addEventListener('change', handleReducedMotion);
  };

  // Инициализируем слайдер
  if (document.readyState !== 'loading') {
    initSlider();
  } else {
    document.addEventListener('DOMContentLoaded', initSlider);
  }

  /* ================================
     Кнопка «вверх» (с throttle)
     ================================ */
  const initToTop = () => {
    const toTop = $('.to-top');
    if (!toTop) return;

    const thr = Number(toTop.dataset.threshold || 200);
    let ticking = false;

    const sync = () => {
      const show = window.scrollY > thr;
      toTop.hidden = !show;
      toTop.classList.toggle('is-visible', show);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(sync);
        ticking = true;
      }
    };

    // Начальная синхронизация
    sync();
    window.addEventListener('scroll', onScroll, { passive: true });

    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  // Инициализируем кнопку
  if (document.readyState !== 'loading') {
    initToTop();
  } else {
    document.addEventListener('DOMContentLoaded', initToTop);
  }

})();