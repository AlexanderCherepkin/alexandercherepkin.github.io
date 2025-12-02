/* ===== /remont/js/new-build.js v3 — Production ===== */
/* Калькулятор • Лайтбокс • ToTop */

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ========================================
     1. КАЛЬКУЛЯТОР
     ======================================== */
  const Calculator = {
    BASE_PRICE: 720000,
    BASE_AREA: 60,
    gradeK: { standard: 1.0, comfort: 1.15, premium: 1.35 },
    designK: { basic: 1.0, visual: 1.08, full: 1.15 },

    els: {},

    init() {
      this.els = {
        area: $('#nb-area'),
        grade: $('#nb-grade'),
        design: $('#nb-design'),
        term: $('#nb-term'),
        termOut: $('#nb-term-out'),
        budget: $('#nb-budget'),
        termEst: $('#nb-term-est'),
        fill: $('.nb-timeline__fill'),
      };

      if (!this.els.area) return; // калькулятора нет на странице

      ['input', 'change'].forEach((evt) => {
        this.els.area?.addEventListener(evt, () => this.recalc());
        this.els.grade?.addEventListener(evt, () => this.recalc());
        this.els.design?.addEventListener(evt, () => this.recalc());
        this.els.term?.addEventListener(evt, () => this.recalc());
      });

      this.recalc();
    },

    clamp(n, min, max) {
      return Math.min(Math.max(n, min), max);
    },

    formatRub(n) {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0,
      }).format(n);
    },

    recalc() {
      const { area, grade, design, term, termOut, budget, termEst, fill } = this.els;

      const areaVal = this.clamp(parseFloat(area?.value) || 0, 20, 300);
      const k1 = this.gradeK[grade?.value] ?? 1;
      const k2 = this.designK[design?.value] ?? 1;
      const baseByArea = (this.BASE_PRICE / this.BASE_AREA) * areaVal;
      const price = Math.round(baseByArea * k1 * k2);

      const termVal = this.clamp(parseInt(term?.value, 10) || 45, 36, 54);

      if (budget) budget.textContent = this.formatRub(price);
      if (termOut) termOut.textContent = String(termVal);
      if (termEst) termEst.textContent = `${termVal} дней`;

      if (fill) {
        const pct = ((termVal - 36) / (54 - 36)) * 100;
        fill.style.width = `${this.clamp(pct, 0, 100)}%`;
      }
    },
  };

  /* ========================================
     2. ЛАЙТБОКС ГАЛЕРЕИ
     ======================================== */
  const Lightbox = {
    els: {},

    init() {
      const gallery = $('.nb-gallery');
      if (!gallery) return;

      // Создаём DOM лайтбокса
      const lb = document.createElement('div');
      lb.className = 'nb-lightbox';
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-modal', 'true');
      lb.innerHTML = `
        <div class="nb-lightbox__stage">
          <button class="nb-lightbox__close" type="button" aria-label="Закрыть">✕</button>
          <img class="nb-lightbox__img" alt="" />
        </div>
      `;
      document.body.appendChild(lb);

      this.els = {
        lb,
        img: lb.querySelector('.nb-lightbox__img'),
        closeBtn: lb.querySelector('.nb-lightbox__close'),
        gallery,
      };

      this.bindEvents();
    },

    open(src, alt) {
      const { lb, img, closeBtn } = this.els;
      img.src = src;
      img.alt = alt || '';
      lb.classList.add('is-open');
      document.body.classList.add('is-locked');
      closeBtn.focus({ preventScroll: true });
    },

    close() {
      const { lb, img } = this.els;
      lb.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      img.removeAttribute('src');
    },

    bindEvents() {
      const { lb, img, closeBtn, gallery } = this.els;

      // Клик по миниатюре
      gallery.addEventListener('click', (e) => {
        const target = e.target.closest('img');
        if (!target) return;

        const picture = target.closest('picture');
        const src =
          target.currentSrc ||
          target.src ||
          picture?.querySelector('source')?.srcset?.split(',')[0]?.trim();

        if (src) this.open(src, target.alt);
      });

      // Закрытие
      lb.addEventListener('click', (e) => {
        if (e.target === lb || e.target === closeBtn || e.target === img) {
          this.close();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lb.classList.contains('is-open')) {
          this.close();
        }
      });

      // Блокировка скролла под лайтбоксом (iOS)
      lb.addEventListener('wheel', (e) => {
        if (lb.classList.contains('is-open')) e.preventDefault();
      }, { passive: false });
    },
  };

  /* ========================================
     3. КНОПКА «НАВЕРХ»
     ======================================== */
  const ToTop = {
    THRESHOLD: 200,
    btn: null,
    ticking: false,

    init() {
      this.createButton();
      this.bindEvents();
      this.onScroll(); // начальная проверка
    },

    createButton() {
      let btn = $('#toTop');

      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'toTop';
        btn.className = 'to-top';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Наверх');
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 14l6-6 6 6" stroke="currentColor" stroke-width="2" 
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        document.body.appendChild(btn);
      }

      // Гарантируем видимость
      btn.removeAttribute('hidden');
      btn.style.display = '';

      this.btn = btn;
    },

    onScroll() {
      if (this.ticking) return;
      this.ticking = true;

      requestAnimationFrame(() => {
        const show = window.scrollY > this.THRESHOLD;
        this.btn.classList.toggle('is-visible', show);
        this.ticking = false;
      });
    },

    scrollToTop() {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: 0,
        behavior: prefersReduced ? 'auto' : 'smooth',
      });
    },

    bindEvents() {
      window.addEventListener('scroll', () => this.onScroll(), { passive: true });
      this.btn.addEventListener('click', () => this.scrollToTop());
    },
  };

  /* ========================================
     4. АНИМАЦИИ (опционально)
     ======================================== */
  const Animations = {
    init() {
      // AOS
      if (window.AOS?.init) {
        window.AOS.init({ once: true, duration: 600, easing: 'ease-out' });
      }

      // GSAP
      if (window.gsap) {
        const tl = window.gsap.timeline({
          defaults: { duration: 0.6, ease: 'power2.out' },
        });

        tl.from('.nb-hero__text', { y: 24, opacity: 0 })
          .from('.nb-hero__media', { y: 24, opacity: 0 }, '<0.1')
          .from('.nb-card', { y: 24, opacity: 0, stagger: 0.08 }, '-=0.2');
      }
    },
  };

  /* ========================================
     5. УТИЛИТЫ
     ======================================== */
  const Utils = {
    preventHorizontalScroll() {
      window.addEventListener('resize', () => {
        document.documentElement.style.overflowX = 'hidden';
        document.body.style.overflowX = 'hidden';
      });
    },
  };

  /* ========================================
     ИНИЦИАЛИЗАЦИЯ
     ======================================== */
  function init() {
    Calculator.init();
    Lightbox.init();
    ToTop.init();
    Animations.init();
    Utils.preventHorizontalScroll();
  }

  // Запуск после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();