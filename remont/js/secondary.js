/* ===== /remont/js/secondary.js =====
   Сильный, отказоустойчивый фронт: include-инъекции, AOS, плавный скролл,
   надёжный ToTop, доступный Before/After (мышь/тач/клавиатура),
   прогрессивные улучшения без глобальных коллизий.
*/

// 0) Глобальная защита от дублирующихся инициализаций
if (!window.__secondaryInit) {
  window.__secondaryInit = true;

  // 1) Инъекция header/footer/модалок
  document.addEventListener('DOMContentLoaded', () => {
    try {
      if (window.injectLayout?.mountIncludes) {
        window.injectLayout.mountIncludes();
      }
    } catch (e) { console.error('[secondary] include error:', e); }
  });

  // 2) AOS init (мягкие анимации при скролле, учитываем reduce-motion)
  document.addEventListener('DOMContentLoaded', () => {
    try {
      if (window.AOS) {
        const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        AOS.init({ once: true, duration: prefersReduce ? 0 : 600, offset: 80 });
      }
    } catch (e) { console.warn('[secondary] AOS init skipped'); }
  });

  // 3) Плавный скролл по якорям
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-scroll][href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href');
    const el = id && document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // 4) ToTop — появление после порога + smooth scroll to 0
  (function initToTop(){
    const btn = document.getElementById('toTop') || document.querySelector('.to-top');
    if (!btn) return;
    const thr = Number(btn.dataset.threshold || 200);
    const toggle = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      btn.classList.toggle('is-visible', y > thr);
    };
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  })();

  // 5) BEFORE/AFTER — высоконадёжная реализация
  (function initBeforeAfter(){
    const wrap = document.querySelector('[data-ba]');
    if (!wrap) return;

    const after = wrap.querySelector('.ba__img--after');
    const range = wrap.querySelector('.ba__range');
    const handle = wrap.querySelector('.ba__handle');
    const divider = wrap.querySelector('.ba__divider');
    const clamp = (v,min,max)=> Math.min(max, Math.max(min, v));

    function setPosition(percent){
      percent = clamp(percent, 0, 100);
      const rightInset = (100 - percent);
      after.style.clipPath = `inset(0 ${rightInset}% 0 0)`;
      const x = percent;
      divider.style.left = `calc(${x}% - .06rem)`;
      handle.style.left = `${x}%`;
      handle.setAttribute('aria-valuenow', String(Math.round(percent)));
      if (range) {
        range.value = String(Math.round(percent));
        range.setAttribute('aria-valuenow', range.value);
      }
    }

    // Инициал
    setPosition(Number(range?.value || 50));

    // Range input (доступная альтернатива)
    range?.addEventListener('input', (e) => setPosition(Number(e.target.value)));

    // Drag (мышь/тач) по ручке
    let dragging = false;
    function posFromClientX(clientX){
      const rect = wrap.getBoundingClientRect();
      const percent = ((clientX - rect.left) / rect.width) * 100;
      return percent;
    }
    function onMove(clientX){
      setPosition(posFromClientX(clientX));
    }
    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      onMove(e.clientX);
    });
    handle.addEventListener('pointermove', (e) => { if (dragging) onMove(e.clientX); });
    handle.addEventListener('pointerup',   () => { dragging = false; });

    // Клик по области — прыжок ручки
    wrap.addEventListener('pointerdown', (e) => {
      if (e.target === handle) return; // уже обрабатывается
      onMove(e.clientX);
    });

    // Клавиатура на ручке
    handle.setAttribute('role','slider');
    handle.setAttribute('aria-valuemin','0');
    handle.setAttribute('aria-valuemax','100');
    handle.setAttribute('aria-valuenow', range?.value || '50');
    handle.addEventListener('keydown', (e) => {
      const step = (e.shiftKey ? 10 : 2);
      const current = Number(handle.getAttribute('aria-valuenow') || 50);
      if (e.key === 'ArrowRight') { setPosition(current + step); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { setPosition(current - step); e.preventDefault(); }
      if (e.key === 'Home')       { setPosition(0); e.preventDefault(); }
      if (e.key === 'End')        { setPosition(100); e.preventDefault(); }
    });
  })();

  // 6) Галерея — доступность превью + мягкая интеграция с вашим лайтбоксом
  (function enhanceGallery(){
    const imgs = document.querySelectorAll('.case-gallery img[data-full]');
    imgs.forEach(img => {
      img.tabIndex = 0;
      img.setAttribute('role','button');
      img.setAttribute('aria-label','Открыть изображение поверх страницы');
    });

    // Если глобальный лайтбокс уже на странице — доверяем делегированию
    // Иначе дадим простой fallback: открыть full в новой вкладке
    const hasGlobalLB = !!document.getElementById('lightbox') || !!window.__globalLightbox;
    if (!hasGlobalLB) {
      document.addEventListener('click', (e) => {
        const el = e.target.closest('.case-gallery img[data-full]');
        if (!el) return;
        const url = el.getAttribute('data-full');
        if (url) window.open(url, '_blank', 'noopener');
      });
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const el = document.activeElement;
        if (!el || !el.matches('.case-gallery img[data-full]')) return;
        e.preventDefault();
        const url = el.getAttribute('data-full');
        if (url) window.open(url, '_blank', 'noopener');
      });
    }
  })();

  // 7) Respect reduce-motion глобально
  (function respectReduceMotion(){
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!m.matches) return;
    document.documentElement.classList.add('reduce-motion');
  })();

  // 8) Микро-улучшение CLS/LCP: убрать высоту контейнера, когда главная картинка прогрузилась
  (function heroLCPFix(){
    const heroImg = document.querySelector('.secondary-hero__media img');
    if (!heroImg) return;
    if (heroImg.complete) return; // уже закэширована
    const holder = heroImg.closest('.secondary-hero__media');
    if (!holder) return;
    holder.style.contentVisibility = 'auto';
    // когда загрузится — браузер сам пересчитает layout
  })();
}
