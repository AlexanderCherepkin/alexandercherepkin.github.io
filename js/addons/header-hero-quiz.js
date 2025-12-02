
/* ===== Utils ===== */
(() => {
  const $  = (s, ctx=document) => ctx.querySelector(s);
  const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));
  window.$ = $; window.$$ = $$; // опционально, если где-то переиспользуется

  // Оставляем «нижний» экземпляр узла с данным id (страховка от дублей include)
  function keepLastById(id){
    const list = document.querySelectorAll('#'+CSS.escape(id));
    if (list.length > 1) list.forEach((el,i)=>{ if (i < list.length-1) el.remove(); });
  }
  window.keepLastById = keepLastById;

  // Лок скролла body добавляется/снимается внутри initModals
})();

/* ===== Header (burger) ===== */
(() => {
  function initHeader(){
    const burger = document.querySelector('.site-header__burger');
    const mobile = document.getElementById('mobileMenu');
    if (!burger || !mobile) return;

    burger.addEventListener('click', ()=>{
      const expanded = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!expanded));
      mobile.hidden = expanded;
      document.body.classList.toggle('scroll-lock', !expanded);
    });

    mobile.addEventListener('click', (e)=>{
      if (e.target.closest('a')) {
        burger.setAttribute('aria-expanded', 'false');
        mobile.hidden = true;
        document.body.classList.remove('scroll-lock');
      }
    });
  }
  window.AppInitHeader = initHeader;
})();

/* ===== Modals (delegated) ===== */
(() => {
  const lock   = ()=> document.body.classList.add('scroll-lock');
  const unlock = ()=> document.body.classList.remove('scroll-lock');

  function initModals(){
    keepLastById('modal-quiz');
    keepLastById('modal-callback');

    // Открытие модалов - ИСПРАВЛЕННАЯ ВЕРСИЯ
    document.addEventListener('click', (e) => {
      // Ищем триггер
      const opener = e.target.closest('[data-modal-open], [data-modal], [data-bs-toggle="modal"]');
      if (!opener) return;

      e.preventDefault();
      e.stopPropagation();

      // Получаем идентификатор
      let key = opener.getAttribute('data-modal-open') 
             || opener.getAttribute('data-modal')
             || opener.getAttribute('data-bs-target');
      
      if (!key) return;
      
      // Убираем # если есть
      key = key.trim().replace(/^#/, '');

      // Алиасы для удобства
      const aliases = {
        'quiz': 'modal-quiz',
        'quizModal': 'modal-quiz',
        'callback': 'modal-callback',
        'callbackModal': 'modal-callback'
      };
      
      const modalId = aliases[key] || key;
      
      console.log('🔍 Открываем модал:', key, '→', modalId); // для отладки

      // Ищем модал (последний, если дубли)
      const modals = document.querySelectorAll(`#${CSS.escape(modalId)}`);
      const modal = modals[modals.length - 1];
      
      if (!modal) {
        console.warn('❌ Модал не найден:', modalId);
        return;
      }

      console.log('✅ Модал найден, открываем:', modal.id);

      // Открываем
      modal.hidden = false;
      modal.removeAttribute('hidden'); // на всякий случай
      lock();
      
      const dlg = modal.querySelector('.modal__dialog') || modal;
      dlg.setAttribute('tabindex', '-1');
      
      // Небольшая задержка для плавности
      requestAnimationFrame(() => {
        dlg.focus({ preventScroll: true });
      });
      
      // Аналитика
      if (typeof AppTrack === 'function') {
        AppTrack('modal_open', { modal: modalId });
      }
    }, { passive: false }); // ⚠️ ВАЖНО: passive: false для preventDefault

    // Закрытие
    document.addEventListener('click', (e) => {
      if (e.target.matches('.modal__backdrop') || 
          e.target.closest('[data-modal-close], [data-close]')) {
        const modal = e.target.closest('.modal');
        if (modal && !modal.hidden) {
          modal.hidden = true;
          unlock();
          
          if (typeof AppTrack === 'function') {
            AppTrack('modal_close', { modal: modal.id });
          }
        }
      }
    });

    // Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal:not([hidden])');
        if (openModals.length > 0) {
          openModals.forEach(m => {
            m.hidden = true;
          });
          unlock();
        }
      }
    });
  }
  
  window.AppInitModals = initModals;
  if (document.readyState !== 'loading') {
    initModals();
  } else {
    document.addEventListener('DOMContentLoaded', initModals, { once: true });
  }
})();
/* ===== Quiz core (delegated, duplicate-safe) ===== */
(() => {
  function getQuizCtx() {
    const list  = document.querySelectorAll('#modal-quiz');
    const modal = list[list.length-1];
    if (!modal) return null;

    const form      = modal.querySelector('#quizForm');
    const bar       = modal.querySelector('.js-quiz-bar');
    const progress  = modal.querySelector('.quiz__progress[role="progressbar"]');

    const steps = [...modal.querySelectorAll('.quiz__step')]
      .map(el => ({ n: Number(el.dataset.step || 0), el }))
      .filter(x => Number.isFinite(x.n) && x.n > 0)
      .sort((a,b)=> a.n - b.n);

    return { modal, form, bar, progress, steps };
  }

  function showStep(ctx, idx){
    const { steps, bar, progress } = ctx;
    if (!steps.length) return;
    if (idx < 0) idx = 0;
    if (idx > steps.length - 1) idx = steps.length - 1;

    steps.forEach((s, i) => {
      const active = i === idx;
      s.el.hidden = !active;
      s.el.classList.toggle('is-active', active);
    });

    const footer    = ctx.modal.querySelector('.quiz__footer');
    const btnPrev   = footer?.querySelector('[data-quiz-prev]');
    const btnNext   = footer?.querySelector('[data-quiz-next]');
    const btnSubmit = footer?.querySelector('[data-quiz-submit]');

    if (btnPrev)   btnPrev.disabled = idx === 0;
    if (btnNext)   btnNext.hidden   = idx === steps.length - 1;
    if (btnSubmit) btnSubmit.hidden = idx !== steps.length - 1;

    if (progress) {
      progress.setAttribute('aria-valuemin','1');
      progress.setAttribute('aria-valuemax', String(steps.length));
      progress.setAttribute('aria-valuenow', String(idx + 1));
    }
    if (bar) {
      const percent = steps.length > 1 ? Math.round((idx / (steps.length - 1)) * 100) : 100;
      bar.style.width = percent + '%';
    }

    const focusTarget = steps[idx].el.querySelector('input,select,textarea,button');
    focusTarget?.focus?.({ preventScroll:true });

    ctx.modal.__quizIndex = idx;
  }

  function validateCurrent(ctx){
    const idx    = ctx.modal.__quizIndex || 0;
    const stepEl = ctx.steps[idx]?.el;
    if (!stepEl) return true;
    const fields = stepEl.querySelectorAll('input,select,textarea');
    for (const field of fields){
      if (field.disabled || field.closest('[hidden]')) continue;
      if (!field.checkValidity()){
        field.reportValidity?.();
        field.focus();
        return false;
      }
    }
    return true;
  }

  // Делегированная навигация по шагам
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
    } else {
      showStep(ctx, idx - 1);
    }
  });

  // ВНИМАНИЕ: submit теперь обрабатывается ТОЛЬКО блоком "enhanceQuizSummary".
  // Здесь submit не трогаем, чтобы не дублировать скрытие формы/рендер итога.

  function boot(){
    keepLastById('modal-quiz');
    keepLastById('modal-callback');
    AppInitHeader?.();
    AppInitModals?.();

    const ctx = getQuizCtx();
    if (ctx) showStep(ctx, 0);
  }

  // Наблюдаем за инклудами/динамическими заменами
  const mo = new MutationObserver(() => {
    clearTimeout(mo._t);
    mo._t = setTimeout(boot, 0);
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);

  // Экспорт для тестов/отладки (не обязательно)
  window.__quiz = { getQuizCtx, showStep, validateCurrent };
})();

/* ===== Analytics helper (опционально) ===== */
(() => {
  function track(eventName, payload) {
    if (window.ym)  { try { ym(YOUR_YM_ID, 'reachGoal', eventName, payload); } catch (_e) {} }
    if (window.gtag){ try { gtag('event', eventName, payload || {}); } catch (_e) {} }
    document.dispatchEvent(new CustomEvent('analytics:event', { detail: { eventName, payload }}));
  }
  window.AppTrack = track;
})();

/* === Красивый итог квиза: структурированный вывод + корректные ссылки CTA === */
(() => {
  const $  = (s, ctx=document) => ctx.querySelector(s);

  // Безопасные форматтеры
  const escape = (s='') => String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  const fmtArea = v => {
    const n = Number(String(v).replace(',','.'));
    if (!Number.isFinite(n) || n <= 0) return '';
    return n.toLocaleString('ru-RU') + ' м<sup>2</sup>';
  };

  const fmtPhoneRU = v => {
    const d = String(v).replace(/\D+/g,'');
    if (!d) return '';
    let num = d;
    if (d.length === 11 && (d[0] === '7' || d[0] === '8')) num = '7' + d.slice(1);
    if (d.length === 10) num = '7' + d;
    if (num.length !== 11) return '+' + d;
    return `+7 (${num.slice(1,4)}) ${num.slice(4,7)}-${num.slice(7,9)}-${num.slice(9,11)}`;
  };

  const fmtList = arr => arr.filter(Boolean).join(', ');

  const FIELDS = [
    { key:'type',        label:'Тип объекта' },
    { key:'area',        label:'Площадь',     format:fmtArea },
    { key:'repair_type', label:'Тип ремонта' },
    { key:'rooms',       label:'Комнат' },
    { key:'materials',   label:'Материалы' },
    { key:'extras[]',    label:'Дополнительно', collect:'all', format:fmtList },
    { key:'budget',      label:'Бюджет' },
    { key:'start_when',  label:'Старт' },
    { key:'city',        label:'Город' },
    { key:'access',      label:'Доступ' },
    { key:'name',        label:'Имя' },
    { key:'phone',       label:'Телефон',    format:fmtPhoneRU },
    { key:'comment',     label:'Комментарий' },
  ];

  function buildSummaryHTML(fd){
    const rows = [];

    for (const f of FIELDS){
      let val = '';
      if (f.collect === 'all'){
        val = (fd.getAll(f.key) || []).map(v => String(v).trim()).filter(Boolean);
        if (!val.length) continue;
        val = f.format ? f.format(val) : fmtList(val);
      } else {
        const raw = fd.get(f.key);
        if (raw == null) continue;
        const trimmed = String(raw).trim();
        if (!trimmed) continue;
        val = f.format ? f.format(trimmed) : escape(trimmed);
      }
      rows.push(`<dt>${escape(f.label)}</dt><dd>${val}</dd>`);
    }

    if (!rows.length) return '<p class="quiz__lead">Данные не заполнены.</p>';

    return `
      <h3 class="quiz__question">Предварительный расчёт</h3>
      <div class="quiz__summary" role="group" aria-label="Итоговые данные">
        <dl class="kv">${rows.join('')}</dl>
      </div>
      <p class="quiz__note">Это ориентировочно. Точный расчёт сделаем после уточняющих вопросов.</p>
    `;
  }

  function buildPlainText(fd){
    const label = k => (FIELDS.find(f => f.key === k)?.label) || k;
    const getAll = k => fd.getAll(k).map(v=>String(v).trim()).filter(Boolean);

    const parts = [];
    const push = (k,v) => { if (v) parts.push(`${label(k)}: ${v}`); };

    push('type',        fd.get('type'));
    push('area',        String(fd.get('area')||'').trim() ? String(fd.get('area')).trim() + ' м2' : '');
    push('repair_type', fd.get('repair_type'));
    push('rooms',       fd.get('rooms'));
    push('materials',   fd.get('materials'));
    push('extras[]',    getAll('extras[]').join(', '));
    push('budget',      fd.get('budget'));
    push('start_when',  fd.get('start_when'));
    push('city',        fd.get('city'));
    push('access',      fd.get('access'));
    push('name',        fd.get('name'));
    push('phone',       fd.get('phone'));
    push('comment',     fd.get('comment'));

    return 'Заявка на ремонт. ' + parts.filter(Boolean).join(' • ');
  }

  // ЕДИНСТВЕННАЯ точка обработки submit формы квиза
  document.addEventListener('submit', (e) => {
    const form  = e.target.closest('#quizForm');
    const modal = form?.closest('#modal-quiz');
    if (!form || !modal) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    // простая валидизация активного шага
    const activeStep = modal.querySelector('.quiz__step.is-active') || modal.querySelector('.quiz__step:not([hidden])');
    const fields = activeStep ? activeStep.querySelectorAll('input,select,textarea') : [];
    for (const f of fields) {
      if (f.disabled || f.closest('[hidden]')) continue;
      if (!f.checkValidity()){ f.reportValidity?.(); f.focus(); return; }
    }

    const fd = new FormData(form);

    // Показ результата
    form.hidden = true;
    const resultBox = modal.querySelector('.quiz__result');
    if (resultBox) {
      resultBox.hidden = false;
      resultBox.innerHTML = buildSummaryHTML(fd) + resultBox.innerHTML; // оставляем существующие CTA
    }

    // Проставим текст для мессенджеров
    const text = encodeURIComponent(buildPlainText(fd));
    const wa  = modal.querySelector('.quiz__cta a[href*="wa.me"], .quiz__cta a[href*="whatsapp"]');
    const tg  = modal.querySelector('.quiz__cta a[href*="t.me"], .quiz__cta a[href*="telegram"]');

    if (wa) {
      wa.href = wa.href.replace(/(\?|$).*/, '') + `?text=${text}`;
      wa.setAttribute('target', '_blank');
      wa.setAttribute('rel', 'noopener noreferrer');
    }
    if (tg) {
      tg.href = tg.href.includes('?') ? tg.href + '&start=' + text : tg.href + '?start=' + text;
      tg.setAttribute('target', '_blank');
      tg.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // Делегированный обработчик кликов по WA/TG — ОДИН раз на документ
  document.addEventListener('click', (e) => {
    const link = e.target.closest(
      '.quiz__cta a[href*="wa.me"], .quiz__cta a[href*="whatsapp"], .quiz__cta a[href*="t.me"], .quiz__cta a[href*="telegram"]'
    );
    if (!link) return;

    // если ссылка внутри скрытой модалки — пропускаем
    if (link.closest('.modal[hidden]')) return;

    e.preventDefault();
    const url = link.href;

    // открываем в новом окне и отрезаем доступ к opener
    const win = window.open(url, '_blank');
    if (win) {
      try { win.opener = null; } catch (_) {}
    } else {
      // fallback на случай блокировщика
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      window.location.assign(url);
    }
  });
})();

/* HERO: раскрыть/скрыть дополнительные преимущества */
(() => {
  const init = () => {
    const btn  = document.getElementById('benefits-more-btn');
    const list = document.getElementById('benefits-more');
    if (!btn || !list) return;

    const count = () => list.querySelectorAll('.hero__benefit').length;

    const sync = (expanded) => {
      btn.setAttribute('aria-expanded', String(expanded));
      list.hidden = !expanded;
      btn.textContent = expanded
        ? 'Скрыть дополнительные преимущества'
        : `Ещё преимущества (${count()})`;
    };

    // Стартовое состояние: берём из aria-expanded
    sync(btn.getAttribute('aria-expanded') === 'true');

    // Обновлять число в скобках, если список когда-нибудь меняется
    new MutationObserver(() => {
      if (btn.getAttribute('aria-expanded') !== 'true') {
        btn.textContent = `Ещё преимущества (${count()})`;
      }
    }).observe(list, { childList: true, subtree: true });

    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      sync(!expanded);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
