// Footer helpers: год + "Наверх" (устойчиво, без дублей)
// (() => {
//   const onReady = (fn) =>
//     (document.readyState !== 'loading')
//       ? fn()
//       : document.addEventListener('DOMContentLoaded', fn);

//   onReady(() => {
//     // Текущий год
//     const year = String(new Date().getFullYear());
//     document.querySelectorAll('.js-year').forEach(n => { n.textContent = year; });

//     // Кнопка "Наверх"
//     const btn = document.querySelector('.to-top') || document.getElementById('to-top');
//     if (!btn) return;
//     if (btn.dataset.init === '1') return; // защита от повтора
//     btn.dataset.init = '1';

//     if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', 'Наверх');

//     const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
//     const supportsSmooth = 'scrollBehavior' in document.documentElement.style;
//     const THRESHOLD = Number(btn.dataset.threshold || 200);

//     const scrollUp = () => {
//       if (!prefersReduced.matches && supportsSmooth) {
//         window.scrollTo({ top: 0, behavior: 'smooth' });
//       } else {
//         window.scrollTo(0, 0);
//       }
//     };

//     btn.addEventListener('click', (e) => { e.preventDefault(); scrollUp(); });
//     btn.addEventListener('keydown', (e) => {
//       if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollUp(); }
//     });

//     const toggle = () => {
//       const y = window.scrollY || document.documentElement.scrollTop || 0;
//       const visible = y > THRESHOLD;
//       btn.classList.toggle('show', visible);
//       btn.classList.toggle('is-visible', visible);
//       btn.setAttribute('aria-hidden', String(!visible));
//     };

//     window.addEventListener('scroll', toggle, { passive: true });
//     window.addEventListener('load', toggle, { once: true });
//     requestAnimationFrame(toggle);
//   });
// })();


// Footer helpers: год + Back-to-top (перенос в body, порог из data-threshold)
(() => {
  const ready = (fn) =>
    (document.readyState !== 'loading')
      ? fn()
      : document.addEventListener('DOMContentLoaded', fn);

  ready(() => {
    // Год
    const year = String(new Date().getFullYear());
    document.querySelectorAll('.js-year').forEach(n => { n.textContent = year; });

    // Кнопка
    const btn = document.querySelector('.to-top, #to-top');
    if (!btn) return;
    if (btn.dataset.init === '1') return; // страховка от дублей
    btn.dataset.init = '1';
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', 'Наверх');

    // ВАЖНО: переносим кнопку в <body>, чтобы её не клиппили стили/overflow футера
    if (btn.parentNode !== document.body) document.body.appendChild(btn);

    const threshold = parseInt(btn.dataset.threshold || '200', 10);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const supportsSmooth = 'scrollBehavior' in document.documentElement.style;

    const scrollUp = () => {
      if (!prefersReduced && supportsSmooth) window.scrollTo({ top: 0, behavior: 'smooth' });
      else window.scrollTo(0, 0);
    };

    btn.addEventListener('click', (e) => { e.preventDefault(); scrollUp(); });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollUp(); }
    });

    const toggle = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const on = y > threshold;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-hidden', String(!on));
    };

    window.addEventListener('scroll', toggle, { passive: true });
    window.addEventListener('load', toggle, { once: true });
    requestAnimationFrame(toggle);
  });
})();
