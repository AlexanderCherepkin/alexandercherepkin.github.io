/*!
 * to-top.js — кнопка «Наверх»
 * Автоинициализация + безопасная доступность
 */
(function (w, d) {
  if (w.__toTopInit) return; // защита от двойной инициализации
  w.__toTopInit = true;

  var btn = d.querySelector('.to-top');
  if (!btn) return;

  // убрать возможные наследованные aria-hidden
  d.querySelectorAll('.to-top[aria-hidden="true"]').forEach(function (el) {
    el.removeAttribute('aria-hidden');
  });

  var threshold = parseInt(btn.getAttribute('data-threshold') || '200', 10);
  var reduce = (w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) || false;

  function show() {
    if (!btn.hidden) return;
    btn.hidden = false; // вернули в дерево доступности
    w.requestAnimationFrame(function () {
      btn.classList.remove('is-anim-hide');
    });
  }

  function hide() {
    if (reduce) { btn.hidden = true; return; } // без анимации
    btn.classList.add('is-anim-hide');
    var onEnd = function (e) {
      if (e && e.target !== btn) return;
      btn.hidden = true; // полностью убираем из фокуса/доступности
      btn.removeEventListener('transitionend', onEnd);
    };
    btn.addEventListener('transitionend', onEnd);
    // страховка, если transitionend не придёт
    w.setTimeout(onEnd, 300);
  }

  function onScroll() {
    (w.scrollY >= threshold) ? show() : hide();
  }

  // стартовое состояние
  btn.hidden = true;
  btn.classList.add('is-anim-hide');
  onScroll();

  w.addEventListener('scroll', onScroll, { passive: true });

  btn.addEventListener('click', function () {
    if (reduce) { w.scrollTo(0, 0); }
    else { w.scrollTo({ top: 0, behavior: 'smooth' }); }
    btn.blur();
  });

  // Экспорт простого API (по необходимости)
  w.toTop = {
    show: show,
    hide: hide,
    button: btn,
    threshold: function (v) { if (typeof v === 'number') { threshold = v; } return threshold; }
  };
})(window, document);



