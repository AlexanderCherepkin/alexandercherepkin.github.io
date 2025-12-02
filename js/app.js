// /js/app.js
// Главная точка инициализации UI

const domReady = (fn) =>
  document.readyState !== "loading"
    ? fn()
    : document.addEventListener("DOMContentLoaded", fn, { once: true });

/* -----------------------------
   1) Быстрые базовые штрихи
----------------------------- */
domReady(() => {
  document.documentElement.classList.remove("no-js");
  document.querySelectorAll(".js-year").forEach(n => n.textContent = String(new Date().getFullYear()));
});

/* -------------------------------------------------------
   2) Лёгкий загрузчик HTML-частичных с выполнением <script>
   CSP-safe: выполняем только same-origin скрипты
------------------------------------------------------- */
async function includePartials() {
  const blocks = document.querySelectorAll("[data-include]");
  if (!blocks.length) return;

  const runScriptsSequentially = async (scripts) => {
    for (const sc of scripts) {
      const s = document.createElement("script");
      for (const { name, value } of [...sc.attributes]) {
        if (name === "src" || name === "type" || name === "nomodule" ||
            name === "defer" || name === "async" || name === "crossorigin") {
          s.setAttribute(name, value);
        }
      }
      if (sc.src) {
        let u;
        try {
          u = new URL(sc.src, location.href);
        } catch {
          continue;
        }
        if (!u.pathname || u.pathname === "/" || u.origin !== location.origin) {
          console.warn("Пропуск внешнего или пустого скрипта из-за CSP:", sc.src);
          continue;
        }
        u.searchParams.set("_v", String(Date.now()));
        await new Promise((res) => {
          s.onload = s.onerror = () => res();
          s.src = u.href;
          document.head.appendChild(s);
        });
      } else {
        s.textContent = sc.textContent || "";
        document.head.appendChild(s);
      }
    }
  };

  await Promise.all([...blocks].map(async (hostEl) => {
    const url = hostEl.getAttribute("data-include");
    if (!url) return;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const html = await res.text();
      const tpl = document.createElement("template");
      tpl.innerHTML = html;
      const scripts = [...tpl.content.querySelectorAll("script")];
      scripts.forEach(sc => sc.remove());
      const parent = hostEl.parentNode;
      const marker = document.createTextNode("");
      parent.insertBefore(marker, hostEl);
      hostEl.remove();
      parent.insertBefore(tpl.content, marker);
      marker.remove();
      if (scripts.length) await runScriptsSequentially(scripts);
    } catch (e) {
      console.warn("Включение не удалось:", url, e);
    }
  }));

  try {
    document.dispatchEvent(new Event("partials:ready"));
    document.dispatchEvent(new Event("DOMContentLoaded"));
    window.dispatchEvent(new Event("load"));
  } catch {}
}

/* ===== Утилиты ===== */
(() => {
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
  window.$ = $;
  window.$$ = $$;

  function keepLastById(id) {
    const list = document.querySelectorAll('#' + CSS.escape(id));
    if (list.length > 1) list.forEach((el, i) => { if (i < list.length - 1) el.remove(); });
  }
  window.keepLastById = keepLastById;
})();

/* ===== Заголовок (бургер) ===== */
(() => {
  function initHeader() {
    const burger = document.querySelector('.site-header__burger');
    const mobile = document.getElementById('mobileMenu');
    if (!burger || !mobile) return;

    burger.addEventListener('click', () => {
      const expanded = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!expanded));
      mobile.hidden = expanded;
      document.body.classList.toggle('scroll-lock', !expanded);
    });

    mobile.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        burger.setAttribute('aria-expanded', 'false');
        mobile.hidden = true;
        document.body.classList.remove('scroll-lock');
      }
    });
  }
  window.AppInitHeader = initHeader;
})();

/* ===== Modals (delegated) - ФИНАЛЬНАЯ ВЕРСИЯ ===== */
(() => {
  // Защита от повторной инициализации
  if (window.__modalsHandlerSet) {
    console.warn('Модальные обработчики уже установлены');
    return;
  }
  window.__modalsHandlerSet = true;

  const lock = () => {
    document.body.classList.add('scroll-lock');
    document.body.style.overflow = 'hidden';
  };

  const unlock = () => {
    document.body.classList.remove('scroll-lock');
    document.body.style.overflow = '';
  };

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove('is-open');
    modal.style.display = '';
    modal.style.position = '';
    modal.style.inset = '';
    modal.style.zIndex = '';
    modal.style.alignItems = '';
    modal.style.justifyContent = '';

    unlock();

    if (typeof window.AppTrack === 'function') {
      window.AppTrack('modal_close', { modal: modal.id });
    }
    console.log('✓ Модал закрыт:', modal.id);
  }

  function initModals() {
    if (window.__modalsInitialized) return;
    window.__modalsInitialized = true;

    console.log('🔧 initModals запущен');

    keepLastById('modal-quiz');
    keepLastById('modal-callback');

    // ЗАКРЫТИЕ (высокий приоритет)
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-modal-close]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const modal = e.target.closest('.modal');
        if (modal) {
          closeModal(modal);
        }
        return;
      }
    }, { capture: true, passive: false });

    // ОТКРЫТИЕ (с защитой от дублей)
    let openInProgress = false;

    document.addEventListener('click', (e) => {
      if (openInProgress) {
        e.stopImmediatePropagation();
        return;
      }

      const opener = e.target.closest('[data-modal-open], [data-modal], [data-bs-toggle="modal"]');
      if (!opener) return;

      // Игнорируем кнопки закрытия
      if (opener.hasAttribute('data-modal-close')) return;

      // Игнорируем сам модал
      if (opener.classList.contains('modal')) {
        console.log('🚫 Игнорируем клик по модалу');
        return;
      }

      // Игнорируем клики внутри открытого модала
      const insideModal = opener.closest('.modal.is-open');
      if (insideModal) {
        console.log('🚫 Игнорируем клик внутри открытого модала');
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();

      openInProgress = true;
      setTimeout(() => { openInProgress = false; }, 300);

      let key = opener.getAttribute('data-modal-open')
        || opener.getAttribute('data-modal')
        || opener.getAttribute('data-bs-target');

      if (!key) return;

      key = key.trim().replace(/^#/, '');

      const aliases = {
        'quiz': 'modal-quiz',
        'quizModal': 'modal-quiz',
        'callback': 'modal-callback',
        'callbackModal': 'modal-callback'
      };

      const modalId = aliases[key] || key;
      console.log('🔍 Ищем модал:', key, '→', modalId);

      const modals = document.querySelectorAll(`#${CSS.escape(modalId)}`);
      const modal = modals[modals.length - 1];

      if (!modal) {
        console.warn('❌ Модал не найден:', modalId);
        return;
      }

      // Не открываем модал, если он уже открыт
      if (modal.classList.contains('is-open')) {
        console.log('ℹ️ Модал уже открыт');
        return;
      }

      console.log('✅ Открываем модал:', modal.id);

      modal.hidden = false;
      modal.classList.add('is-open');
      modal.style.display = 'flex';
      modal.style.position = 'fixed';
      modal.style.inset = '0';
      modal.style.zIndex = '9999';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';

      const dlg = modal.querySelector('.modal__dialog');
      if (dlg) {
        dlg.style.position = 'relative';
        dlg.style.zIndex = '10000';
        dlg.setAttribute('tabindex', '-1');
        requestAnimationFrame(() => {
          dlg.focus({ preventScroll: true });
        });
      }

      lock();

      // Инициализируем квиз
      if (modalId === 'modal-quiz' && typeof window.initQuiz === 'function') {
        setTimeout(() => window.initQuiz(), 50);
      }

      if (typeof window.AppTrack === 'function') {
        window.AppTrack('modal_open', { modal: modalId });
      }

      console.log('✓ Модал открыт успешно');
    }, { passive: false, capture: true });

    // Закрытие по фону
    document.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal.is-open');
      if (!modal) return;

      const dlg = modal.querySelector('.modal__dialog');
      if (!dlg) return;

      if (!dlg.contains(e.target)) {
        closeModal(modal);
      }
    });

    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal.is-open');
        openModals.forEach(modal => closeModal(modal));
      }
    });

    console.log('✅ Обработчики модалов установлены');
  }

  // Публичные API
  window.AppInitModals = initModals;

  window.openModal = (modalId) => {
    const modal = document.getElementById(modalId) || document.getElementById('modal-' + modalId);
    if (!modal) return;

    modal.hidden = false;
    modal.classList.add('is-open');
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '9999';
    lock();

    if (modalId.includes('quiz') && typeof window.initQuiz === 'function') {
      setTimeout(() => window.initQuiz(), 50);
    }
  };

  window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId) || document.getElementById('modal-' + modalId);
    if (modal) {
      closeModal(modal);
    }
  };

  // Автоинициализация
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModals, { once: true });
  } else {
    initModals();
  }
})();

/* ===== Quiz Core (пошаговая навигация) ===== */
(() => {
  function getQuizCtx() {
    const modals = document.querySelectorAll('#modal-quiz');
    const modal = modals[modals.length - 1];
    if (!modal) return null;

    const form = modal.querySelector('#quizForm');
    const bar = modal.querySelector('.js-quiz-bar');
    const progress = modal.querySelector('.quiz__progress[role="progressbar"]');

    const steps = [...modal.querySelectorAll('.quiz__step')]
      .map(el => ({ n: Number(el.dataset.step || 0), el }))
      .filter(x => Number.isFinite(x.n) && x.n > 0)
      .sort((a, b) => a.n - b.n);

    return { modal, form, bar, progress, steps };
  }

  function showStep(ctx, idx) {
    const { steps, bar, progress, modal } = ctx;
    if (!steps.length) return;

    if (idx < 0) idx = 0;
    if (idx > steps.length - 1) idx = steps.length - 1;

    steps.forEach((s, i) => {
      const active = i === idx;
      s.el.hidden = !active;
      s.el.classList.toggle('is-active', active);
    });

    const footer = modal.querySelector('.quiz__footer');
    const btnPrev = footer?.querySelector('[data-quiz-prev]');
    const btnNext = footer?.querySelector('[data-quiz-next]');
    const btnSubmit = footer?.querySelector('[data-quiz-submit]');

    if (btnPrev) btnPrev.disabled = idx === 0;
    if (btnNext) btnNext.hidden = idx === steps.length - 1;
    if (btnSubmit) btnSubmit.hidden = idx !== steps.length - 1;

    if (progress) {
      progress.setAttribute('aria-valuemin', '1');
      progress.setAttribute('aria-valuemax', String(steps.length));
      progress.setAttribute('aria-valuenow', String(idx + 1));
    }

    if (bar) {
      const percent = steps.length > 1
        ? Math.round((idx / (steps.length - 1)) * 100)
        : 100;
      bar.style.width = percent + '%';
    }

    const focusTarget = steps[idx].el.querySelector('input, select, textarea, button');
    if (focusTarget) {
      requestAnimationFrame(() => {
        focusTarget.focus({ preventScroll: true });
      });
    }

    modal.__quizIndex = idx;
    console.log(`📍 Шаг ${idx + 1} из ${steps.length}`);
  }

  function validateCurrent(ctx) {
    const idx = ctx.modal.__quizIndex || 0;
    const stepEl = ctx.steps[idx]?.el;
    if (!stepEl) return true;

    const fields = stepEl.querySelectorAll('input, select, textarea');
    for (const field of fields) {
      if (field.disabled || field.closest('[hidden]')) continue;
      if (!field.checkValidity()) {
        field.reportValidity?.();
        field.focus();
        return false;
      }
    }
    return true;
  }

  document.addEventListener('click', (e) => {
    const nextBtn = e.target.closest('[data-quiz-next]');
    const prevBtn = e.target.closest('[data-quiz-prev]');

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

    const resultBox = ctx.modal.querySelector('.quiz__result');
    if (resultBox) resultBox.hidden = true;
    if (ctx.form) ctx.form.hidden = false;

    showStep(ctx, 0);
    console.log('🎯 Quiz инициализирован');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuiz, { once: true });
  } else {
    initQuiz();
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-modal-open], [data-modal]');
    if (!opener) return;
    const key = (opener.getAttribute('data-modal-open') || opener.getAttribute('data-modal') || '').replace(/^#/, '');
    if (key === 'quiz' || key === 'modal-quiz') {
      setTimeout(initQuiz, 100);
    }
  });

  const mo = new MutationObserver(() => {
    clearTimeout(mo._timer);
    mo._timer = setTimeout(() => {
      const ctx = getQuizCtx();
      if (ctx && !ctx.modal.__quizIndex) {
        initQuiz();
      }
    }, 100);
  });

  mo.observe(document.body, { childList: true, subtree: true });

  window.__quiz = { getQuizCtx, showStep, validateCurrent, initQuiz };
  window.initQuiz = initQuiz;
})();

/* ===== Вспомогательная функция для аналитики ===== */
(() => {
  function track(eventName, payload) {
    if (window.ym && window.YM_ID) {
      try {
        ym(window.YM_ID, 'reachGoal', eventName, payload);
      } catch (_e) {}
    }
    if (window.gtag) {
      try {
        gtag('event', eventName, payload || {});
      } catch (_e) {}
    }
    document.dispatchEvent(new CustomEvent('analytics:event', {
      detail: { eventName, payload }
    }));
  }
  window.AppTrack = track;
})();

/* ===== Красивый итог квиза ===== */
(() => {
  const esc = (s = '') => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const fmtArea = v => {
    const n = Number(String(v).replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return '';
    return n.toLocaleString('ru-RU') + ' м<sup>2</sup>';
  };

  const fmtPhoneRU = v => {
    const d = String(v).replace(/\D+/g, '');
    if (!d) return '';
    let num = d;
    if (num.length === 11 && (d[0] === '7' || d[0] === '8')) num = '7' + d.slice(1);
    if (num.length === 10) num = '7' + d;
    if (num.length !== 11) return '+' + d;
    return `+7 (${num.slice(1, 4)}) ${num.slice(4, 7)}-${num.slice(7, 9)}-${num.slice(9, 11)}`;
  };

  const fmtList = arr => arr.filter(Boolean).join(', ');

  const fields = [
    { key: 'type', label: 'Тип объекта' },
    { key: 'area', label: 'Площадь', format: fmtArea },
    { key: 'repair_type', label: 'Тип ремонта' },
    { key: 'rooms', label: 'Комнат' },
    { key: 'materials', label: 'Материалы' },
    { key: 'extras[]', label: 'Дополнительно', collect: 'all', format: fmtList },
    { key: 'budget', label: 'Бюджет' },
    { key: 'start_when', label: 'Старт' },
    { key: 'city', label: 'Город' },
    { key: 'access', label: 'Доступ' },
    { key: 'name', label: 'Имя' },
    { key: 'phone', label: 'Телефон', format: fmtPhoneRU },
    { key: 'comment', label: 'Комментарий' },
  ];

  function buildSummaryHTML(fd) {
    const rows = [];
    for (const f of fields) {
      let val = '';
      if (f.collect === 'all') {
        val = (fd.getAll(f.key) || []).map(v => String(v).trim()).filter(Boolean);
        if (!val.length) continue;
        val = f.format ? f.format(val) : fmtList(val);
      } else {
        const raw = fd.get(f.key);
        if (raw == null) continue;
        const trimmed = String(raw).trim();
        if (!trimmed) continue;
        val = f.format ? f.format(trimmed) : esc(trimmed);
      }
      rows.push(`<dt>${esc(f.label)}</dt><dd>${val}</dd>`);
    }

    if (!rows.length) return '<p class="quiz__lead">Данные не заполнены.</p>';

    return `
      <h3 class="quiz__question">Ваши ответы</h3>
      <div class="quiz__summary" role="group" aria-label="Итоговые данные">
        <dl class="kv">${rows.join('')}</dl>
      </div>
      <p class="quiz__note">Точный расчёт сделаем после уточнения деталей.</p>
    `;
  }

  function buildPlainText(fd) {
    const label = k => (fields.find(f => f.key === k)?.label) || k;
    const getAll = k => fd.getAll(k).map(v => String(v).trim()).filter(Boolean);
    const parts = [];
    const push = (k, v) => { if (v) parts.push(`${label(k)}: ${v}`); };

    push('type', fd.get('type'));
    push('area', String(fd.get('area') || '').trim() ? String(fd.get('area')).trim() + ' м²' : '');
    push('repair_type', fd.get('repair_type'));
    push('rooms', fd.get('rooms'));
    push('materials', fd.get('materials'));
    push('extras[]', getAll('extras[]').join(', '));
    push('budget', fd.get('budget'));
    push('start_when', fd.get('start_when'));
    push('city', fd.get('city'));
    push('access', fd.get('access'));
    push('name', fd.get('name'));
    push('phone', fd.get('phone'));
    push('comment', fd.get('comment'));

    return '📋 Заявка с сайта:\n' + parts.filter(Boolean).join('\n');
  }

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('#quizForm');
    const modal = form?.closest('#modal-quiz');
    if (!form || !modal) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const activeStep = modal.querySelector('.quiz__step.is-active') || modal.querySelector('.quiz__step:not([hidden])');
    const fields = activeStep ? activeStep.querySelectorAll('input, select, textarea') : [];

    for (const f of fields) {
      if (f.disabled || f.closest('[hidden]')) continue;
      if (!f.checkValidity()) {
        f.reportValidity?.();
        f.focus();
        return;
      }
    }

    const fd = new FormData(form);
    form.hidden = true;

    const resultBox = modal.querySelector('.quiz__result');
    if (resultBox) {
      resultBox.hidden = false;
      resultBox.innerHTML = buildSummaryHTML(fd) + resultBox.innerHTML;
    }

    const text = encodeURIComponent(buildPlainText(fd));
    const wa = modal.querySelector('.quiz__cta a[href*="wa.me"], .quiz__cta a[href*="whatsapp"]');
    const tg = modal.querySelector('.quiz__cta a[href*="t.me"], .quiz__cta a[href*="telegram"]');

    if (wa) {
      wa.href = wa.href.replace(/(\?|&)text=.*/, '') + `?text=${text}`;
      wa.setAttribute('target', '_blank');
      wa.setAttribute('rel', 'noopener noreferrer');
    }

    if (tg) {
      tg.href = tg.href.includes('?') ? tg.href + '&text=' + text : tg.href + '?text=' + text;
      tg.setAttribute('target', '_blank');
      tg.setAttribute('rel', 'noopener noreferrer');
    }

    console.log('✅ Квиз отправлен');

    if (typeof window.AppTrack === 'function') {
      window.AppTrack('quiz_submit', { modal: modal.id });
    }
  }, { capture: true });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('.quiz__cta a[href*="wa.me"], .quiz__cta a[href*="whatsapp"], .quiz__cta a[href*="t.me"], .quiz__cta a[href*="telegram"]');
    if (!link) return;
    if (link.closest('.modal[hidden]')) return;

    e.preventDefault();

    const url = link.href;
    const win = window.open(url, '_blank');
    if (win) {
      try { win.opener = null; } catch (_) {}
    } else {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      window.location.assign(url);
    }
  });
})();

/* -----------------------------------
   Кнопка «Наверх»
----------------------------------- */
function initToTop() {
  let btn = document.querySelector(".to-top");
  if (!btn) {
    btn = document.createElement("button");
    btn.className = "to-top";
    btn.type = "button";
    btn.textContent = "↑";
    btn.setAttribute("aria-label", "Наверх");
    document.body.appendChild(btn);
  }

  if (btn.parentNode !== document.body) document.body.appendChild(btn);

  const threshold = parseInt(btn.dataset.threshold || "600", 10);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smoothOK = "scrollBehavior" in document.documentElement.style;

  const up = () => {
    if (!reduced && smoothOK) scrollTo({ top: 0, behavior: "smooth" });
    else scrollTo(0, 0);
  };

  btn.addEventListener("click", (e) => { e.preventDefault(); up(); });
  btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); up(); }
  });

  const toggle = () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    btn.classList.toggle("on", y > threshold);
    btn.setAttribute("aria-hidden", String(!(y > threshold)));
  };

  addEventListener("scroll", toggle, { passive: true });
  addEventListener("load", toggle, { once: true });
  requestAnimationFrame(toggle);
}

/* -----------------------------------
   Верхняя плашка (topbar)
----------------------------------- */
function initTopbar() {
  const key = "topbar:closed:v1";
  const bar = document.querySelector("[data-topbar]");
  if (!bar) return;

  const delay = parseInt(bar.getAttribute("data-delay") || "800", 10);
  const expireDays = parseInt(bar.getAttribute("data-expire-days") || "14", 10);
  const pushLayout = bar.getAttribute("data-push-layout") === "true";

  const isExpired = () => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return true;
      const { ts, days } = JSON.parse(raw);
      const ms = days * 24 * 60 * 60 * 1000;
      return (Date.now() - ts) > ms;
    } catch (e) {
      return true;
    }
  };

  const rememberClose = () => {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), days: expireDays }));
    } catch (e) {}
  };

  const setPadding = () => {
    const inner = bar.querySelector("[data-topbar-inner]");
    const h = inner ? inner.getBoundingClientRect().height : bar.getBoundingClientRect().height;
    document.documentElement.style.setProperty("--topbar-h", `${h}px`);
    if (pushLayout) document.documentElement.classList.add("has-topbar-padding");
  };

  const open = () => {
    bar.classList.add("is-open");
    setPadding();
    let rafId;
    const onResize = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(setPadding); };
    addEventListener("resize", onResize, { passive: true });
  };

  const close = () => {
    bar.classList.remove("is-open");
    document.documentElement.classList.remove("has-topbar-padding");
    document.documentElement.style.removeProperty("--topbar-h");
    rememberClose();
  };

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-topbar-close]");
    if (btn) { e.preventDefault(); close(); }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && bar.classList.contains("is-open")) close();
  });

  const forceShow = new URLSearchParams(location.search).has("showTopbar");
  if (forceShow || isExpired()) setTimeout(open, Math.max(0, delay));

  addEventListener("scroll", () => {
    if (!bar.classList.contains("is-open") && isExpired() && scrollY > 120) open();
  }, { passive: true });
}

/* -----------------------------------
   CTA-логика кнопки в плашке
----------------------------------- */
function initTopbarCTA() {
  const cta = document.querySelector("[data-topbar-cta]");
  if (!cta) return;

  const isTouch = () => /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent);
  const getSel = (sel) => (sel ? document.querySelector(sel) : null);

  const highlight = (el) => {
    if (!el) return;
    el.classList.add("cta-target-highlight");
    setTimeout(() => el.classList.remove("cta-target-highlight"), 1800);
  };

  const smoothScrollTo = (el) => {
    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      const top = el.getBoundingClientRect().top + pageYOffset;
      scrollTo(0, top);
    }
  };

  const track = (label, route) => {
    const payload = { event: "cta_click", cta: label || "CTA", route: route || "auto" };
    if (window.dataLayer && Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
    if (window.ym && window.YM_ID) try { ym(window.YM_ID, "reachGoal", "cta_calc"); } catch {}
  };

  cta.addEventListener("click", (e) => {
    e.preventDefault();

    const label = cta.getAttribute("data-cta-label") || cta.textContent.trim();
    const targetSel = cta.getAttribute("data-target") || "#calc";
    const tel = (cta.getAttribute("data-tel") || "").replace(/\s|\(|\)|-/g, "");
    const wa = cta.getAttribute("data-wa");
    const fallback = cta.getAttribute("data-fallback") || "/zakaz-zamera.html";
    const modalId = cta.getAttribute("data-modal") || "quiz";

    const target = getSel(targetSel);
    if (target) {
      track(label, "scroll");
      smoothScrollTo(target);
      highlight(target);
      return;
    }

    if (typeof window.openModal === "function") {
      track(label, "modal");
      window.openModal(modalId);
      return;
    }

    if (isTouch() && tel) {
      track(label, "tel");
      location.href = `tel:${tel}`;
      return;
    }

    if (wa) {
      track(label, "whatsapp");
      window.open(wa, "_blank", "noopener");
      return;
    }

    track(label, "fallback");
    location.href = fallback;
  });
}

/* -----------------------------------
   «Показать ещё» в портфолио
----------------------------------- */
function initPortfolioShowMore() {
  const grid = document.querySelector("#portfolioGrid");
  const btn = document.querySelector("#portfolioMore, [data-portfolio-more]");
  if (!grid || !btn) return;

  const pageSize = parseInt(grid.dataset.pageSize || "6", 10) || 6;
  const cards = Array.from(grid.querySelectorAll(".work-card"));

  let live = grid.nextElementSibling && grid.nextElementSibling.classList?.contains("visually-hidden")
    ? grid.nextElementSibling : null;

  if (!live) {
    live = document.createElement("div");
    live.className = "visually-hidden";
    live.setAttribute("aria-live", "polite");
    live.setAttribute("role", "status");
    grid.after(live);
  }

  cards.forEach((c, i) => c.hidden = i >= pageSize);

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("revealed");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  const observeVisible = () => grid.querySelectorAll(".work-card:not([hidden])").forEach(c => io.observe(c));
  observeVisible();

  function updateBtn() {
    const left = grid.querySelectorAll(".work-card[hidden]").length;
    btn.hidden = left === 0;
    btn.setAttribute("aria-expanded", String(left === 0));
    btn.setAttribute("aria-controls", "portfolioGrid");
    if (btn.tagName === "BUTTON" && !btn.hasAttribute("type")) btn.type = "button";
  }
  updateBtn();

  function showNext() {
    const next = Array.from(grid.querySelectorAll(".work-card[hidden]")).slice(0, pageSize);
    next.forEach(c => { c.hidden = false; requestAnimationFrame(() => io.observe(c)); });
    live.textContent = `Показано ещё ${next.length}. Видимых: ${grid.querySelectorAll(".work-card:not([hidden])").length}.`;
    updateBtn();
  }

  ["click", "keydown"].forEach(evt => {
    btn.addEventListener(evt, (e) => {
      if (evt === "keydown" && !(e.key === "Enter" || e.key === " ")) return;
      if (btn.tagName === "A") e.preventDefault();
      showNext();
    }, { capture: true });
  });

  grid.__portfolioReinit = () => {
    io.disconnect();
    cards.forEach((c, i) => c.hidden = i >= pageSize);
    observeVisible();
    updateBtn();
    live.textContent = `Сброшено. Видимых: ${grid.querySelectorAll(".work-card:not([hidden])").length}.`;
  };

  if (!document.getElementById("pf-hard-hide")) {
    const s = document.createElement("style");
    s.id = "pf-hard-hide";
    s.textContent = `
      #portfolioGrid .work-card[hidden]{display:none !important;}
      #portfolioGrid .work-card:not([hidden]){display:block !important;}
    `;
    document.head.appendChild(s);
  }
}

/* -----------------------------------
   Защита от дублей модалки quiz
----------------------------------- */
function enforceBestQuizModal() {
  function pickBest() {
    const list = [...document.querySelectorAll("#modal-quiz")];
    if (list.length <= 1) return;

    const best = list.reduce((a, b) => {
      const ca = a.querySelectorAll(".quiz__step").length;
      const cb = b.querySelectorAll(".quiz__step").length;
      return cb > ca ? b : a;
    });

    list.forEach(el => { if (el !== best) el.remove(); });
  }

  pickBest();

  const mo = new MutationObserver(() => {
    clearTimeout(mo._t);
    mo._t = setTimeout(pickBest, 0);
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}

/* -----------------------------------
   Кнопка «Ещё преимущества»
----------------------------------- */
function initBenefitsMore() {
  const btn = document.querySelector('[data-benefits-more]');
  if (!btn) return; // Элемент не найден — выходим без ошибки

  if (btn.dataset.benefitsInit === 'true') return;

  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.dataset.benefitsInit = 'true';

  newBtn.removeAttribute('href');
  newBtn.style.cursor = 'pointer';
  newBtn.setAttribute('role', 'button');
  newBtn.setAttribute('tabindex', '0');

  newBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    const items = document.querySelectorAll('.benefits__item--extra, .benefit--extra');
    const expanded = newBtn.getAttribute('aria-expanded') === 'true';

    if (!expanded) {
      items.forEach((item, index) => {
        item.hidden = false;
        item.style.display = '';
        setTimeout(() => item.classList.add('is-showed'), index * 80);
      });
      newBtn.textContent = 'Скрыть';
      newBtn.setAttribute('aria-expanded', 'true');
    } else {
      items.forEach(item => item.classList.remove('is-showed'));
      setTimeout(() => {
        items.forEach(item => {
          item.hidden = true;
        });
      }, 350);
      newBtn.textContent = 'Показать ещё';
      newBtn.setAttribute('aria-expanded', 'false');
    }
  }, { passive: false });

  newBtn.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      newBtn.click();
    }
  });

  console.log('✅ BenefitsMore готово');
}

/* -----------------------------------
   Раскрытие дополнительных цен
----------------------------------- */
/* -----------------------------------
   Раскрытие дополнительных цен
----------------------------------- */
function initPricesToggle() {
  // Ищем кнопку по нескольким возможным селекторам
  const btn = document.querySelector(
    '[data-prices-toggle], [data-prices-more], .prices__more, .prices__toggle, ' +
    'a[href="#prices-more"], button.prices-more, .js-prices-toggle'
  );
  
  if (!btn) {
    // Попробуем найти по тексту
    const allLinks = document.querySelectorAll('.prices a, .prices button, section a, .section a');
    for (const el of allLinks) {
      const text = (el.textContent || '').toLowerCase();
      if (text.includes('подробнее') && (text.includes('цен') || text.includes('все цены'))) {
        initPricesToggleWithBtn(el);
        return;
      }
    }
    console.warn('🔍 Кнопка цен не найдена');
    return;
  }
  
  initPricesToggleWithBtn(btn);
}

function initPricesToggleWithBtn(btn) {
  if (!btn || btn.dataset.pricesInit === 'true') return;
  
  // Клонируем для очистки старых обработчиков
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.dataset.pricesInit = 'true';
  
  // Находим карточки по нескольким селекторам
  let cards = document.querySelectorAll(
    '.prices__card--extra, .prices__item--extra, .price-card--extra, ' +
    '.prices__card[hidden], .prices__item[hidden], ' +
    '.prices__card.is-hidden, .prices__item.is-hidden'
  );
  
  // Если не нашли — ищем карточки начиная с 4-й
  if (!cards.length) {
    const allCards = document.querySelectorAll(
      '.prices__card, .prices__item, .price-card, ' +
      '.prices .card, .prices-grid > *, .prices__list > *'
    );
    if (allCards.length > 3) {
      cards = Array.from(allCards).slice(3);
      // Скрываем их изначально
      cards.forEach(card => {
        card.hidden = true;
        card.classList.add('prices__card--extra');
      });
    }
  }
  
  if (!cards.length) {
    console.warn('🔍 Дополнительные карточки цен не найдены');
    return;
  }
  
  console.log(`✅ Найдено ${cards.length} дополнительных карточек цен`);
  
  // Убираем href если это ссылка
  if (newBtn.tagName === 'A') {
    newBtn.removeAttribute('href');
  }
  newBtn.style.cursor = 'pointer';
  newBtn.setAttribute('role', 'button');
  newBtn.setAttribute('tabindex', '0');
  newBtn.setAttribute('aria-expanded', 'false');
  
  // Сохраняем оригинальный текст
  const originalText = newBtn.textContent.trim();
  const hideText = 'Скрыть';
  
  function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const expanded = newBtn.getAttribute('aria-expanded') === 'true';
    
    if (!expanded) {
      // Показываем карточки
      cards.forEach((card, index) => {
        card.hidden = false;
        card.style.display = '';
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
          card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
          card.classList.add('is-showed');
        }, index * 100);
      });
      
      newBtn.textContent = hideText;
      newBtn.setAttribute('aria-expanded', 'true');
      
      // Скроллим к первой новой карточке
      setTimeout(() => {
        const first = cards[0];
        if (first) {
          const top = first.getBoundingClientRect().top + window.pageYOffset - 100;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 350);
      
    } else {
      // Скрываем карточки
      cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
      });
      
      setTimeout(() => {
        cards.forEach(card => {
          card.hidden = true;
          card.classList.remove('is-showed');
          card.style.transition = '';
          card.style.opacity = '';
          card.style.transform = '';
        });
      }, 300);
      
      newBtn.textContent = originalText;
      newBtn.setAttribute('aria-expanded', 'false');
    }
  }
  
  newBtn.addEventListener('click', toggle, { passive: false });
  newBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(e);
    }
  });
  
  console.log('✅ Prices Toggle инициализирован');
}

/* -----------------------------------
   Ленивая загрузка AOS / GSAP
----------------------------------- */
async function lazyVendors() {
  const needAOS = !!document.querySelector("[data-aos], .aos-init, .aos-animate");
  const needGSAP = !!document.querySelector("[data-gsap], [data-scrolltrigger]");

  if (!needAOS && !needGSAP) return;

  const VENDOR = "/vendor";
  const AOS_CSS = `${VENDOR}/aos/aos.css`;
  const AOS_JS = `${VENDOR}/aos/aos.js`;
  const GSAP_JS = `${VENDOR}/gsap/gsap.min.js`;
  const ST_JS = `${VENDOR}/gsap/ScrollTrigger.min.js`;

  const isSameOrigin = (url) => {
    try {
      return new URL(url, location.href).origin === location.origin;
    } catch {
      return false;
    }
  };

  const nonEmpty = (url) => !!url && url !== "/" && !/^\s*$/.test(url);

  const ensureScript = (src) => new Promise((res) => {
    if (!nonEmpty(src) || !isSameOrigin(src)) {
      console.warn("Пропуск внешнего скрипта (CSP):", src);
      return res();
    }
    if ([...document.scripts].some(s => s.src && new URL(s.src, location.href).href === new URL(src, location.href).href)) return res();

    const s = document.createElement("script");
    s.src = src;
    s.defer = true;
    s.onload = s.onerror = () => res();
    document.head.appendChild(s);
  });

  const ensureCss = (href) => {
    if (!nonEmpty(href) || !isSameOrigin(href)) {
      console.warn("Пропуск внешней таблицы стилей (CSP):", href);
      return;
    }
    const already = [...document.querySelectorAll('link[rel="stylesheet"]')].some(l => {
      try { return new URL(l.href, location.href).href === new URL(href, location.href).href; }
      catch { return false; }
    });
    if (already) return;

    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  };

  const jobs = [];

  if (needAOS) {
    ensureCss(AOS_CSS);
    jobs.push(
      ensureScript(AOS_JS).then(() => {
        if (window.AOS && document.documentElement.dataset.page !== "support") {
          window.AOS.init({ once: true, duration: 600, easing: "ease-out" });
        }
      })
    );
  }

  if (needGSAP && !window.gsap) {
    jobs.push(ensureScript(GSAP_JS));
    if (document.querySelector("[data-scrolltrigger]")) {
      jobs.push(
        ensureScript(ST_JS).then(() => {
          if (window.gsap && window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
        })
      );
    }
  }

  if (jobs.length) await Promise.all(jobs);
}

/* -----------------------------------
   Пайплайн запуска (ЕДИНСТВЕННЫЙ)
----------------------------------- */
domReady(async () => {
  // 1. Базовые компоненты (не зависят от partials)
  initToTop();
  initTopbar();
  initTopbarCTA();

  // 2. Загружаем partials (header, footer, modals и т.д.)
  await includePartials();

  // 3. Инициализируем компоненты, которые МОГУТ находиться в партиалах
  enforceBestQuizModal();
  initPortfolioShowMore();
  initBenefitsMore();

  // 4. Отложенная инициализация
  setTimeout(initPricesToggle, 150);

  // 5. Ленивая загрузка вендоров
  await lazyVendors();
});

// Дополнительный вызов после partials:ready (на всякий случай)
document.addEventListener('partials:ready', () => {
  setTimeout(() => {
    initBenefitsMore();
    initPricesToggle();
  }, 100);
}, { once: true });

/* -----------------------------------
   Инициализация AOS/GSAP для страницы поддержки
----------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  if (document.documentElement.dataset.page !== "support") return;

  if (window.AOS) AOS.init({ duration: 600, once: true, offset: 80 });

  if (window.gsap) {
    const cards = document.querySelectorAll("#support-quick .card");
    cards.forEach((card, i) => {
      const opts = { opacity: 0, y: "1rem", duration: 0.6, delay: i * 0.08, ease: "power1.out" };
      if (window.ScrollTrigger) {
        gsap.from(card, { ...opts, scrollTrigger: { trigger: card, start: "top 85%" } });
      } else {
        gsap.from(card, opts);
      }
    });

    document.querySelectorAll("#support-faq details").forEach((dl) => {
      dl.addEventListener("toggle", () => {
        const box = dl.querySelector(".faq__a");
        if (!box) return;
        if (dl.open) {
          gsap.fromTo(box, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.35, ease: "power1.out" });
        } else {
          gsap.to(box, { height: 0, opacity: 0, duration: 0.25, ease: "power1.in" });
        }
      });
    });
  }
});