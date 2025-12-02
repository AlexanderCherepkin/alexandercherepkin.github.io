// /js/addons/lazy-media.js
// Мягкая ленивка: ничего не ломает, не требует data-src, работает "как есть".

(() => {
  const doc = document;

  // 1) Картинки: добавить lazy/decoding, где ещё не проставлено (кроме hero)
  const imgs = doc.querySelectorAll('img:not([loading]):not(.no-lazy)');
  imgs.forEach(img => {
    // не трогаем "eager" в hero
    if (img.closest('.hero')) return;
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    // если забыли размеры, браузер всё равно не будет прыгать — но лучше держать width/height в HTML
  });

  // 2) Iframe/video — ленивка + пауза вне экрана
  const iframes = doc.querySelectorAll('iframe:not([loading])');
  iframes.forEach(f => f.setAttribute('loading', 'lazy'));

  const videos = doc.querySelectorAll('video[autoplay]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const v = e.target;
        if (e.isIntersecting) v.play().catch(()=>{});
        else v.pause();
      });
    }, { rootMargin: '200px' });
    videos.forEach(v => io.observe(v));
  }

  // 3) Бекграунды по data-bg (если решите помечать тяжёлые блоки)
  // <div class="banner" data-bg="/img/hero@2x.webp"></div>
  const bgEls = doc.querySelectorAll('[data-bg]');
  if ('IntersectionObserver' in window) {
    const ioBG = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target;
          const url = el.getAttribute('data-bg');
          if (url) {
            el.style.backgroundImage = `url("${url}")`;
            el.removeAttribute('data-bg');
          }
          ioBG.unobserve(el);
        }
      });
    }, { rootMargin: '400px' });
    bgEls.forEach(el => ioBG.observe(el));
  } else {
    // старые WebView: применяем сразу
    bgEls.forEach(el => {
      const url = el.getAttribute('data-bg');
      if (url) el.style.backgroundImage = `url("${url}")`;
      el.removeAttribute('data-bg');
    });
  }
})();

