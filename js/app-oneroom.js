// /js/app-oneroom.js
// Скрипт для страницы ремонта однокомнатной квартиры

const domReady = (fn) =>
  document.readyState !== "loading"
    ? fn()
    : document.addEventListener("DOMContentLoaded", fn, { once: true });

/* ===== Базовые штрихи ===== */
domReady(() => {
  document.documentElement.classList.remove("no-js");
  document.querySelectorAll(".js-year").forEach((n) => (n.textContent = String(new Date().getFullYear())));
});

/* ===== Utils ===== */
function keepLastById(id) {
  const list = document.querySelectorAll("#" + CSS.escape(id));
  if (list.length > 1) {
    list.forEach((el, i) => {
      if (i < list.length - 1) el.remove();
    });
  }
}

/* ===== Резервирование места для CLS ===== */
domReady(() => {
  // Резервируем место под header и footer до загрузки partials
  const reserveSpace = () => {
    const header = document.querySelector('header[data-include]');
    const footer = document.querySelector('[data-include*="footer"]');
    
    if (header && header.dataset.loaded !== "true") {
      header.style.minHeight = window.innerWidth >= 768 ? '72px' : '64px';
    }
    if (footer && footer.dataset.loaded !== "true") {
      footer.style.minHeight = '200px';
    }
  };
  
  reserveSpace();
  window.addEventListener('resize', reserveSpace, { passive: true });
});

/* ===== Include loader для partials (header, footer, модалки) ===== */
async function includePartials() {
  const blocks = [...document.querySelectorAll("[data-include]")];

  if (!blocks.length) {
    console.log("📦 Partials: элементов не найдено");
    return;
  }

  console.log(
    "📦 Найдено partials:",
    blocks.map((b) => b.getAttribute("data-include"))
  );

  for (const hostEl of blocks) {
    const url = hostEl.getAttribute("data-include");
    if (!url) continue;

    // Уже удалён из DOM
    if (!hostEl.isConnected) {
      console.log("⏭️ Пропуск (уже обработан):", url);
      continue;
    }

    // Уже загружен ранее
    if (hostEl.dataset.loaded === "true") {
      console.log("⏭️ Пропуск (уже загружен):", url);
      continue;
    }

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        console.warn("❌ Fetch failed:", url, res.status);
        continue;
      }

      const html = await res.text();

      // Могли удалить за время загрузки
      if (!hostEl.isConnected) {
        console.log("⏭️ Пропуск (удалён во время загрузки):", url);
        continue;
      }

      const tpl = document.createElement("template");
      tpl.innerHTML = html;

      // Скрипты достаём отдельно
      const scripts = [...tpl.content.querySelectorAll("script")];
      scripts.forEach((sc) => sc.remove());

      // ВАЖНО: не трогаем позицию hostEl, а просто наполняем его
      hostEl.innerHTML = "";
      hostEl.appendChild(tpl.content);
      hostEl.dataset.loaded = "true";
      
      // Сбрасываем min-height после загрузки
      hostEl.style.minHeight = "";

      console.log("✅ Загружен:", url);

      // Выполняем скрипты по очереди
      for (const sc of scripts) {
        const s = document.createElement("script");

        if (sc.src) {
          try {
            const srcUrl = new URL(sc.src, location.href);
            if (srcUrl.origin !== location.origin) continue;

            await new Promise((resolve) => {
              s.onload = s.onerror = resolve;
              s.src = sc.src;
              document.head.appendChild(s);
            });
          } catch {
            continue;
          }
        } else if (sc.textContent) {
          s.textContent = sc.textContent;
          document.head.appendChild(s);
        }
      }
    } catch (e) {
      console.warn("❌ Include failed:", url, e);
    }
  }

  document.dispatchEvent(new Event("partials:ready"));
}

/* ===== Header (burger menu) ===== */
function initHeader() {
  const burger = document.querySelector(".site-header__burger");
  const mobile = document.getElementById("mobileMenu");
  if (!burger || !mobile) return;

  burger.addEventListener("click", () => {
    const expanded = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", String(!expanded));
    mobile.hidden = expanded;
    document.body.classList.toggle("scroll-lock", !expanded);
  });

  mobile.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      burger.setAttribute("aria-expanded", "false");
      mobile.hidden = true;
      document.body.classList.remove("scroll-lock");
    }
  });
}

/* ===== Модальные окна ===== */
(() => {
  if (window.__modalsHandlerSet) return;
  window.__modalsHandlerSet = true;

  const lock = () => {
    document.body.classList.add("scroll-lock");
    document.body.style.overflow = "hidden";
  };

  const unlock = () => {
    document.body.classList.remove("scroll-lock");
    document.body.style.overflow = "";
  };

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove("is-open");
    modal.style.display = "";
    modal.style.position = "";
    modal.style.inset = "";
    modal.style.zIndex = "";
    unlock();
  }

  function initModals() {
    if (window.__modalsInitialized) return;
    window.__modalsInitialized = true;

    keepLastById("modal-quiz");
    keepLastById("modal-callback");

    // Закрытие
    document.addEventListener(
      "click",
      (e) => {
        if (e.target.closest("[data-modal-close]")) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const modal = e.target.closest(".modal");
          if (modal) closeModal(modal);
        }
      },
      { capture: true, passive: false }
    );

    // Открытие
    let openInProgress = false;
    document.addEventListener(
      "click",
      (e) => {
        if (openInProgress) return;

        const opener = e.target.closest("[data-modal-open], [data-modal]");
        if (!opener || opener.hasAttribute("data-modal-close")) return;
        if (opener.classList.contains("modal") || opener.closest(".modal.is-open")) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        openInProgress = true;
        setTimeout(() => (openInProgress = false), 300);

        let key = (opener.getAttribute("data-modal-open") || opener.getAttribute("data-modal") || "")
          .trim()
          .replace(/^#/, "");
        if (!key) return;

        const aliases = { quiz: "modal-quiz", callback: "modal-callback" };
        const modalId = aliases[key] || key;
        const modals = document.querySelectorAll(`#${CSS.escape(modalId)}`);
        const modal = modals[modals.length - 1];

        if (!modal || modal.classList.contains("is-open")) return;

        modal.hidden = false;
        modal.classList.add("is-open");
        modal.style.display = "flex";
        modal.style.position = "fixed";
        modal.style.inset = "0";
        modal.style.zIndex = "9999";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";

        const dlg = modal.querySelector(".modal__dialog");
        if (dlg) {
          dlg.style.position = "relative";
          dlg.style.zIndex = "10000";
          dlg.setAttribute("tabindex", "-1");
          requestAnimationFrame(() => dlg.focus({ preventScroll: true }));
        }

        lock();

        if (modalId === "modal-quiz" && typeof window.initQuiz === "function") {
          setTimeout(() => window.initQuiz(), 50);
        }
      },
      { passive: false, capture: true }
    );

    // Закрытие по backdrop
    document.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal.is-open");
      if (!modal) return;
      const dlg = modal.querySelector(".modal__dialog");
      if (dlg && !dlg.contains(e.target)) closeModal(modal);
    });

    // Закрытие по ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal.is-open").forEach((modal) => closeModal(modal));
      }
    });
  }

  window.AppInitModals = initModals;
  window.openModal = (modalId) => {
    const modal = document.getElementById(modalId) || document.getElementById("modal-" + modalId);
    if (!modal) return;
    modal.hidden = false;
    modal.classList.add("is-open");
    modal.style.display = "flex";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.zIndex = "9999";
    lock();
    if (modalId.includes("quiz") && typeof window.initQuiz === "function") {
      setTimeout(() => window.initQuiz(), 50);
    }
  };
  window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId) || document.getElementById("modal-" + modalId);
    if (modal) closeModal(modal);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initModals, { once: true });
  } else {
    initModals();
  }
})();

/* ===== Quiz (пошаговая навигация) ===== */
(() => {
  function getQuizCtx() {
    const modals = document.querySelectorAll("#modal-quiz");
    const modal = modals[modals.length - 1];
    if (!modal) return null;
    const form = modal.querySelector("#quizForm");
    const bar = modal.querySelector(".js-quiz-bar");
    const progress = modal.querySelector('.quiz__progress[role="progressbar"]');
    const steps = [...modal.querySelectorAll(".quiz__step")]
      .map((el) => ({ n: Number(el.dataset.step || 0), el }))
      .filter((x) => Number.isFinite(x.n) && x.n > 0)
      .sort((a, b) => a.n - b.n);
    return { modal, form, bar, progress, steps };
  }

  function showStep(ctx, idx) {
    const { steps, bar, progress, modal } = ctx;
    if (!steps.length) return;
    idx = Math.max(0, Math.min(idx, steps.length - 1));

    steps.forEach((s, i) => {
      const active = i === idx;
      s.el.hidden = !active;
      s.el.classList.toggle("is-active", active);
    });

    const footer = modal.querySelector(".quiz__footer");
    const btnPrev = footer?.querySelector("[data-quiz-prev]");
    const btnNext = footer?.querySelector("[data-quiz-next]");
    const btnSubmit = footer?.querySelector("[data-quiz-submit]");

    if (btnPrev) btnPrev.disabled = idx === 0;
    if (btnNext) btnNext.hidden = idx === steps.length - 1;
    if (btnSubmit) btnSubmit.hidden = idx !== steps.length - 1;

    if (progress) {
      progress.setAttribute("aria-valuemin", "1");
      progress.setAttribute("aria-valuemax", String(steps.length));
      progress.setAttribute("aria-valuenow", String(idx + 1));
    }
    if (bar) {
      const percent = steps.length > 1 ? Math.round((idx / (steps.length - 1)) * 100) : 100;
      bar.style.width = percent + "%";
    }

    modal.__quizIndex = idx;
  }

  function validateCurrent(ctx) {
    const idx = ctx.modal.__quizIndex || 0;
    const stepEl = ctx.steps[idx]?.el;
    if (!stepEl) return true;
    const fields = stepEl.querySelectorAll("input, select, textarea");
    for (const field of fields) {
      if (field.disabled || field.closest("[hidden]")) continue;
      if (!field.checkValidity()) {
        field.reportValidity?.();
        field.focus();
        return false;
      }
    }
    return true;
  }

  document.addEventListener("click", (e) => {
    const nextBtn = e.target.closest("[data-quiz-next]");
    const prevBtn = e.target.closest("[data-quiz-prev]");
    if (!nextBtn && !prevBtn) return;
    const ctx = getQuizCtx();
    if (!ctx) return;
    const idx = ctx.modal.__quizIndex || 0;
    if (nextBtn) {
      if (!validateCurrent(ctx)) return;
      showStep(ctx, idx + 1);
    } else if (prevBtn) {
      showStep(ctx, idx - 1);
    }
  });

  function initQuiz() {
    const ctx = getQuizCtx();
    if (!ctx) return;
    ctx.form?.reset();
    const resultBox = ctx.modal.querySelector(".quiz__result");
    if (resultBox) resultBox.hidden = true;
    if (ctx.form) ctx.form.hidden = false;
    showStep(ctx, 0);
  }

  window.initQuiz = initQuiz;
  window.__quiz = { getQuizCtx, showStep, validateCurrent, initQuiz };
})();

/* ===== Отправка формы квиза ===== */
(() => {
  document.addEventListener("submit", (e) => {
    const form = e.target.closest("#quizForm");
    const modal = form?.closest("#modal-quiz");
    if (!form || !modal) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    // Валидация текущего шага
    const activeStep = modal.querySelector(".quiz__step.is-active") || modal.querySelector(".quiz__step:not([hidden])");
    const fields = activeStep ? activeStep.querySelectorAll("input, select, textarea") : [];
    for (const f of fields) {
      if (f.disabled || f.closest("[hidden]")) continue;
      if (!f.checkValidity()) {
        f.reportValidity?.();
        f.focus();
        return;
      }
    }

    const fd = new FormData(form);
    form.hidden = true;

    const resultBox = modal.querySelector(".quiz__result");
    if (resultBox) resultBox.hidden = false;

    // Формируем текст для мессенджеров
    const parts = [];
    for (const [key, value] of fd.entries()) {
      if (value) parts.push(`${key}: ${value}`);
    }
    const text = encodeURIComponent("Заявка на ремонт. " + parts.join(" • "));

    const wa = modal.querySelector('.quiz__cta a[href*="wa.me"], .quiz__cta a[href*="whatsapp"]');
    const tg = modal.querySelector('.quiz__cta a[href*="t.me"], .quiz__cta a[href*="telegram"]');

    if (wa) {
      wa.href = wa.href.replace(/(\?|&)text=.*/, "") + `?text=${text}`;
      wa.setAttribute("target", "_blank");
      wa.setAttribute("rel", "noopener noreferrer");
    }
    if (tg) {
      tg.href = tg.href.includes("?") ? tg.href + "&text=" + text : tg.href + "?text=" + text;
      tg.setAttribute("target", "_blank");
      tg.setAttribute("rel", "noopener noreferrer");
    }
  });
})();

/* ===== Кнопка «Наверх» ===== */
function initToTop() {
  const btn = document.querySelector(".to-top");
  if (!btn || btn.__toTopInitialized) return; // защита от двойной инициализации
  btn.__toTopInitialized = true;

  const threshold = parseInt(btn.dataset.threshold || "200", 10);
  const smoothOK = "scrollBehavior" in document.documentElement.style;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (smoothOK) scrollTo({ top: 0, behavior: "smooth" });
    else scrollTo(0, 0);
  });

  const toggle = () => {
    const y = window.scrollY || 0;
    const isVisible = y > threshold;

    // ✅ ИСПРАВЛЕНО: было "is-on", стало "is-visible"
    btn.classList.toggle("is-visible", isVisible);

    // Синхронизируем aria-hidden и tabindex
    if (isVisible) {
      btn.removeAttribute("aria-hidden");
      btn.removeAttribute("tabindex");
    } else {
      btn.setAttribute("aria-hidden", "true");
      btn.setAttribute("tabindex", "-1");
    }
  };

  window.addEventListener("scroll", toggle, { passive: true });
  toggle();
}

/* ===== Защита от дублей модалки quiz ===== */
function enforceBestQuizModal() {
  const list = [...document.querySelectorAll("#modal-quiz")];
  if (list.length <= 1) return;
  const best = list.reduce((a, b) => {
    return b.querySelectorAll(".quiz__step").length > a.querySelectorAll(".quiz__step").length ? b : a;
  });
  list.forEach((el) => {
    if (el !== best) el.remove();
  });
}

/* ===== Пайплайн запуска ===== */
domReady(async () => {
  initToTop();
  await includePartials();
  initHeader();
  enforceBestQuizModal();

  // Инициализация квиза после загрузки partials
  if (typeof window.initQuiz === "function") {
    setTimeout(() => window.initQuiz(), 100);
  }
});

window.addEventListener('load', () => {
  // Повторная попытка для незагруженных partials
  const remaining = document.querySelectorAll('[data-include]:not([data-loaded="true"])');
  if (remaining.length > 0) {
    console.log('🔄 Повторная загрузка partials...');
    includePartials();
  }
});