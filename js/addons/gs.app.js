// HERO: раскрыть/скрыть дополнительные преимущества
(function(){
  const btn  = document.getElementById('benefits-more-btn');
  const list = document.getElementById('benefits-more');
  if (!btn || !list) return;

  // поставить реальное количество в скобках
  const total = list.querySelectorAll('.hero__benefit').length;
  btn.textContent = `Ещё преимущества (${total})`;

  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    list.hidden = open;
    btn.textContent = open ? `Ещё преимущества (${total})` : 'Скрыть дополнительные преимущества';
  }, { passive: true });
})();


// A11y для карусели отзывов
(function () {
  const SLIDE_SEL = '.reviews__slide';
  const ACTIVE_CLASS = 'is-active'; // используй вашу "активную" метку; если её нет — останется первый

  const getSlides = () => Array.from(document.querySelectorAll(SLIDE_SEL));

  // Фокусируемые элементы
  const FOCUSABLE = 'a, button, input, select, textarea, [tabindex]';

  function disableSubtree(el) {
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('inert', '');
    el.querySelectorAll(FOCUSABLE).forEach(node => {
      // <a>: временно убираем href, чтобы перестал быть фокусируемым даже с tabindex
      if (node.tagName === 'A') {
        if (node.hasAttribute('href') && !node.dataset.hrefSaved) {
          node.dataset.hrefSaved = node.getAttribute('href');
          node.removeAttribute('href');
        }
        node.setAttribute('aria-disabled', 'true');
      }
      // Любой tabindex → сохраняем и ставим -1
      if (node.hasAttribute('tabindex') && node.tabIndex !== -1 && !node.dataset.prevTabindex) {
        node.dataset.prevTabindex = node.getAttribute('tabindex');
        node.setAttribute('tabindex', '-1');
      } else if (!node.hasAttribute('tabindex')) {
        node.setAttribute('tabindex', '-1');
      }
      // Формы/кнопки — блокируем
      if (/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(node.tagName)) {
        if (!node.dataset.prevDisabled) node.dataset.prevDisabled = node.disabled ? '1' : '0';
        node.disabled = true;
      }
    });
  }

  function enableSubtree(el) {
    el.removeAttribute('aria-hidden');
    el.removeAttribute('inert');
    el.querySelectorAll(FOCUSABLE).forEach(node => {
      if (node.tagName === 'A' && node.dataset.hrefSaved) {
        node.setAttribute('href', node.dataset.hrefSaved);
        node.removeAttribute('data-href-saved');
        node.removeAttribute('aria-disabled');
      }
      if (node.dataset.prevTabindex) {
        node.setAttribute('tabindex', node.dataset.prevTabindex);
        node.removeAttribute('data-prev-tabindex');
      } else {
        // если мы сами ставили -1, убираем
        if (node.getAttribute('tabindex') === '-1') node.removeAttribute('tabindex');
      }
      if (/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(node.tagName) && node.dataset.prevDisabled) {
        node.disabled = node.dataset.prevDisabled === '1';
        node.removeAttribute('data-prev-disabled');
      }
    });
  }

  function applyA11y() {
    const slides = getSlides();
    if (!slides.length) return;
    let active = slides.find(s => s.classList.contains(ACTIVE_CLASS)) || slides[0];
    slides.forEach(slide => {
      if (slide === active) {
        enableSubtree(slide);
      } else {
        disableSubtree(slide);
      }
      // Дополнительно (полезно для скринридеров)
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `Отзыв ${slides.indexOf(slide) + 1} из ${slides.length}`);
    });
  }

  // Первичная инициализация
  document.addEventListener('DOMContentLoaded', applyA11y);
  // Если ваш слайдер шлёт события — вызывайте applyA11y() после смены слайда:
  window.reviewsA11yRefresh = applyA11y;
})();


// Кнопка «Наверх» без aria-hidden
(function () {
  var btn = document.querySelector('.to-top');
  if (!btn) return;

  var threshold = parseInt(btn.getAttribute('data-threshold') || '200', 10);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function show(){
    if (!btn.hidden) return;
    btn.hidden = false;            // вернуть в доступность
    requestAnimationFrame(function(){ btn.classList.remove('is-anim-hide'); });
  }

  function hide(){
    if (reduce){ btn.hidden = true; return; }   // без анимации
    btn.classList.add('is-anim-hide');
    // после окончания анимации полностью убрать из дерева и таб-очереди
    var onEnd = function(e){
      if (e && e.target !== btn) return;
      btn.hidden = true;
      btn.removeEventListener('transitionend', onEnd);
    };
    btn.addEventListener('transitionend', onEnd);
    // страховка, если transitionend не сработает
    setTimeout(onEnd, 250);
  }

  // стартовое состояние
  hide();

  window.addEventListener('scroll', function(){
    (window.scrollY >= threshold) ? show() : hide();
  }, { passive: true });

  btn.addEventListener('click', function(){
    if (reduce) { window.scrollTo(0, 0); }
    else { window.scrollTo({ top: 0, behavior: 'smooth' }); }
    btn.blur();
  });
})();

