// js/addons/portfolio.js
(function () {
  const GRID_ID = 'portfolioGrid';
  const BTN_ID  = 'portfolioMore';

  // Хелперы
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Снимаем возможные "зажимы" высоты/скрытия
  function releaseContainers(grid) {
    // .portfolio__inner, .portfolio, сам grid и ближайшие обёртки
    const wrappers = new Set([
      grid,
      grid.parentElement,
      grid.closest('.portfolio__inner'),
      grid.closest('.portfolio'),
      grid.parentElement?.parentElement
    ].filter(Boolean));

    wrappers.forEach(el => {
      const st = window.getComputedStyle(el);
      // если у кого-то стоят max-height/overflow:hidden — снимаем инлайном
      if (st.maxHeight !== 'none') el.style.maxHeight = 'none';
      if (st.overflowY === 'hidden' || st.overflow === 'hidden') {
        el.style.overflow = 'visible';
        el.style.overflowY = 'visible';
      }
      // часто "зажимают" классами — снимем типовые флаги
      el.classList.remove('collapsed', 'is-collapsed', 'clamped', 'cut');
      el.removeAttribute('data-collapsed');
    });
  }

  function initPortfolio(grid, btn) {
    if (!grid || !btn) return;
    if (grid.__portfolioInit) return; // защита от повторной инициализации
    grid.__portfolioInit = true;

    const pageSize = parseInt(grid.dataset.pageSize || '6', 10) || 6;
    const cards = $$('.work-card', grid);

    // Оставляем явные hidden как есть; остальным применяем пагинацию
    let visibleCount = 0;
    cards.forEach(card => {
      const initiallyHidden = card.hasAttribute('hidden');
      if (!initiallyHidden) {
        if (visibleCount < pageSize) {
          card.hidden = false;
          visibleCount++;
        } else {
          card.hidden = true;
        }
      }
    });

    // Доступность
    btn.setAttribute('aria-controls', GRID_ID);
    btn.setAttribute('type', 'button');

    // IntersectionObserver для плавного появления (опционально)
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('revealed');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });

    function observeVisible() {
      $$('.work-card:not([hidden])', grid).forEach(c => io.observe(c));
    }
    observeVisible();

    function updateButton() {
      const hiddenLeft = $$('.work-card[hidden]', grid).length;
      btn.hidden = hiddenLeft === 0;
      btn.setAttribute('aria-expanded', String(hiddenLeft === 0));
    }

    function showMore() {
      const next = $$('.work-card[hidden]', grid).slice(0, pageSize);
      next.forEach(card => {
        card.hidden = false;
        requestAnimationFrame(() => io.observe(card));
      });
      // на всякий случай — снимаем любые «зажимы»
      releaseContainers(grid);
      updateButton();
    }

    // Обработчики
    if (!btn.__bound) {
      btn.addEventListener('click', showMore, { capture: true });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showMore();
        }
      }, { capture: true });
      btn.__bound = true;
    }

    // Экспорт под твой inline onclick
    window.portfolioShowMore = showMore;

    // Финальные правки состояния
    releaseContainers(grid);
    updateButton();
  }

  // Инициализация при DOMContentLoaded (если портфолио уже в DOM)
  function tryInitNow() {
    const grid = document.getElementById(GRID_ID);
    const btn  = document.getElementById(BTN_ID) || $('[data-portfolio-more]');
    if (grid && btn) initPortfolio(grid, btn);
  }

  // 1) Сразу попробуем
  tryInitNow();

  // 2) Если партиал подставляется асинхронно — ждём появление узлов
  const mo = new MutationObserver(() => tryInitNow());
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // 3) На всякий случай — ещё раз после полной загрузки
  window.addEventListener('load', tryInitNow, { once: true });
})();
