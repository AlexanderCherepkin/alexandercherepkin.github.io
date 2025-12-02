/* ===== /remont/js/apartment-studio.js — Студия: лайтбокс + слайдер ===== */
(() => {
  "use strict";
  const d = document, de = d.documentElement, body = d.body;

  if (de.dataset.studioInit === "1") return;
  de.dataset.studioInit = "1";

  const $  = (sel, root = d) => root.querySelector(sel);
  const $$ = (sel, root = d) => Array.from(root.querySelectorAll(sel));
  const hasGSAP = typeof window.gsap !== "undefined";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ===== Scroll lock helpers =====
  const scrollState = { locked: false, padRightPrev: "" };
  const getSBW = () => Math.max(0, window.innerWidth - de.clientWidth);

  function lockScroll() {
    if (scrollState.locked) return;
    scrollState.locked = true;
    scrollState.padRightPrev = body.style.paddingRight || "";
    const sbw = getSBW();
    if (sbw > 0) {
      const cur = getComputedStyle(body).paddingRight;
      body.style.paddingRight = `calc(${cur} + ${sbw}px)`;
    }
    body.classList.add("scroll-lock");
  }
  function unlockScroll() {
    if (!scrollState.locked) return;
    scrollState.locked = false;
    body.classList.remove("scroll-lock");
    body.style.paddingRight = scrollState.padRightPrev;
  }

  // ===== Lightbox (single instance) =====
  const Lightbox = (() => {
    let lb = null, imgEl = null, frame = null, lastTrigger = null;
    let items = [], index = 0;

    function mount() {
      if (lb) return lb;
      lb = d.createElement("div");
      lb.className = "lightbox";
      lb.id = "lightbox";
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
            <svg class="lightbox__svg" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </button>
          <img class="lightbox__img" alt="">
          <button class="lightbox__nav lightbox__next" type="button" data-lb-next aria-label="Следующее">
            <svg class="lightbox__svg" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="m8.59 16.59 1.41 1.41 6-6-6-6-1.41 1.41L13.17 12z"/>
            </svg>
          </button>
        </figure>`;
      body.appendChild(lb);
      imgEl = $(".lightbox__img", lb);
      frame = $(".lightbox__frame", lb);
      return lb;
    }

    function collect(startImg) {
      const scope = startImg.closest(".case-gallery") || d;
      const list = $$(".case-gallery img", scope);
      return { items: list, index: list.indexOf(startImg) };
    }

    function updateArrows() {
      const n = items.length;
      $("[data-lb-prev]", lb).hidden = n < 2 || index <= 0;
      $("[data-lb-next]", lb).hidden = n < 2 || index >= n - 1;
    }

    function setBy(i) {
      const it = items[i];
      if (!it) return;
      index = i;
      lb.dataset.index = String(i);
      lb.dataset.gallerySize = String(items.length);
      const src = it.dataset.full || it.currentSrc || it.src;
      imgEl.src = src;
      imgEl.alt = it.alt || "Изображение";
      updateArrows();
      frame.setAttribute("tabindex", "-1");
      frame.focus({ preventScroll: true });
    }

    let onKey = null;
    function open(startImg) {
      mount();
      const pack = collect(startImg);
      items = pack.items;
      index = pack.index < 0 ? 0 : pack.index;

      lb.hidden = false;
      lockScroll();
      setBy(index);

      function nav(dir) {
        const j = Math.min(items.length - 1, Math.max(0, index + dir));
        if (j !== index) setBy(j);
      }
      function close() {
        lb.hidden = true;
        unlockScroll();
        d.removeEventListener("keydown", onKey);
        $$("[data-lb-close]", lb).forEach(b => b.onclick = null);
        $("[data-lb-prev]", lb).onclick = null;
        $("[data-lb-next]", lb).onclick = null;
        if (lastTrigger && typeof lastTrigger.focus === "function") {
          lastTrigger.focus({ preventScroll: true });
        }
      }

      onKey = (e) => {
        if (e.key === "Escape") close();
        else if (e.key === "ArrowLeft") nav(-1);
        else if (e.key === "ArrowRight") nav(1);
      };
      d.addEventListener("keydown", onKey);
      $$("[data-lb-close]", lb).forEach(b => b.onclick = close);
      $("[data-lb-prev]", lb).onclick = () => nav(-1);
      $("[data-lb-next]", lb).onclick = () => nav(1);
    }

    // Делегируем клики/клавиши по превью
    d.addEventListener("click", (e) => {
      const img = e.target.closest(".case-gallery img");
      if (!img) return;
      lastTrigger = img;
      open(img);
    });
    d.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = d.activeElement;
      if (!el || !el.matches(".case-gallery img")) return;
      e.preventDefault();
      lastTrigger = el;
      open(el);
    });

    // Улучшаем превью + автоподстановка data-full
    function enhance(root = d) {
      $$(".case-gallery img", root).forEach(img => {
        if (!img.dataset.full) img.dataset.full = img.currentSrc || img.src || "";
        if (img.tabIndex !== 0) img.tabIndex = 0;
        img.setAttribute("role", "button");
        img.setAttribute("aria-label", "Открыть изображение поверх страницы");
      });
    }
    if (d.readyState !== "loading") enhance();
    else d.addEventListener("DOMContentLoaded", enhance);
    new MutationObserver(() => enhance())
      .observe(de, { childList: true, subtree: true });

    return { open };
  })();

  // ===== Slides (stitched) — ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ =====
    // ===== Slides (stitched) — FINAL FIX =====
    // ===== Slides (stitched) — FINAL SIMPLE VERSION =====
  const Slides = (() => {
    const root = $(".slides");
    if (!root) return null;

    if (root.dataset.init === "1") return null;
    root.dataset.init = "1";

    const slides  = $$(".slide", root);
    const dots    = $$(".dot", root);
    const btnPrev = $(".slides__nav--prev", root);
    const btnNext = $(".slides__nav--next", root);

    console.log("🛠 Init Slides:", slides.length);

    let currentIndex = 0;
    // Находим активный слайд при старте
    const activeStart = slides.findIndex(s => s.classList.contains("is-active"));
    if (activeStart >= 0) currentIndex = activeStart;
    else {
      slides[0].classList.add("is-active");
      if (dots[0]) dots[0].classList.add("is-active");
    }

    // Основная функция переключения
    function goToSlide(index) {
      // Зацикливаем индекс
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;
      
      currentIndex = index;

      // Переключаем классы
      slides.forEach((s, k) => {
        s.classList.toggle("is-active", k === currentIndex);
        // Доп. стили для надежности (если CSS слабый)
        s.style.opacity = k === currentIndex ? "1" : "0";
        s.style.zIndex  = k === currentIndex ? "2" : "1";
        s.style.pointerEvents = k === currentIndex ? "auto" : "none";
      });

      dots.forEach((d, k) => {
        d.classList.toggle("is-active", k === currentIndex);
        d.setAttribute("aria-selected", k === currentIndex);
      });
      
      console.log("📸 Slide changed to:", currentIndex + 1);
    }

    // Обработчики кликов
    if (btnNext) {
        btnNext.onclick = (e) => {
            e.preventDefault();
            console.log("➡️ NEXT");
            goToSlide(currentIndex + 1);
            restartAutoplay();
        };
    }

    if (btnPrev) {
        btnPrev.onclick = (e) => {
            e.preventDefault();
            console.log("⬅️ PREV");
            goToSlide(currentIndex - 1);
            restartAutoplay();
        };
    }

    dots.forEach((dot, k) => {
      dot.onclick = (e) => {
        e.preventDefault();
        goToSlide(k);
        restartAutoplay();
      };
    });

    // Автоплей
    let timer = null;
    function startAutoplay() {
      // Если явно не выключено в HTML
      if (root.dataset.autoplay !== "false") {
         stopAutoplay();
         timer = setInterval(() => goToSlide(currentIndex + 1), 6000);
      }
    }

    function stopAutoplay() {
      if (timer) clearInterval(timer);
    }

    function restartAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    // Старт
    // Принудительно ставим стили первому слайду, чтобы он точно появился
    goToSlide(currentIndex);
    startAutoplay();

    return { next: () => goToSlide(currentIndex + 1) };
  })();

  // ===== Кнопка "Наверх" =====
  const ToTop = (() => {
    const btn = $(".to-top");
    if (!btn) return null;

    const threshold = parseInt(btn.dataset.threshold || "200", 10);
    let isVisible = false;

    function toggle() {
      const scrollY = window.pageYOffset || de.scrollTop || body.scrollTop || 0;
      const shouldShow = scrollY > threshold;

      if (shouldShow !== isVisible) {
        isVisible = shouldShow;
        btn.classList.toggle("is-visible", shouldShow);
        btn.setAttribute("aria-hidden", shouldShow ? "false" : "true");
      }
    }

    function scrollToTop(e) {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      const startY = window.pageYOffset || de.scrollTop || body.scrollTop || 0;
      const duration = 600;
      const startTime = performance.now();

      function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        const nextY = startY * (1 - easeProgress);
        window.scrollTo(0, nextY);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          window.scrollTo(0, 0);
        }
      }

      requestAnimationFrame(step);
    }

    // События
    window.addEventListener("scroll", toggle, { passive: true });
    btn.addEventListener("click", scrollToTop);

    // Поддержка клавиатуры
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        scrollToTop(e);
      }
    });

    // Инициализация
    toggle();

    return { toggle, scrollToTop };
  })();

  // Мини-API
  window.ProfStudio = Object.freeze({
    openLightbox: (el) =>
      el && el.matches && el.matches(".case-gallery img") &&
      (d.getElementById("lightbox")?.hidden ?? true) && el.click(),
    scrollToTop: () => ToTop?.scrollToTop(),
    slider: Slides
  });
})();