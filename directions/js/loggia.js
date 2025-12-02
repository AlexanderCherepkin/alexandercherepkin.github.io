// Ripple эффект на кнопках
document.addEventListener('click', (e) => {
  const t = e.target.closest('.btn');
  if (!t) return;
  const r = document.createElement('span');
  r.className = 'rip';
  const rect = t.getBoundingClientRect();
  r.style.left = (e.clientX - rect.left) + 'px';
  r.style.top  = (e.clientY - rect.top) + 'px';
  t.appendChild(r);
  setTimeout(() => r.remove(), 600);
});

// Smooth scroll для якорей
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const el = document.querySelector(id);
  if (el) {
    e.preventDefault();
    el.scrollIntoView({behavior:'smooth', block:'start'});
  }
});

// Before/After slider
(function initBeforeAfter(){
  const wrap = document.getElementById('ba');
  if (!wrap) return;
  const range = wrap.querySelector('.ba__range');
  const after = wrap.querySelector('.ba__pane--after');
  const handle = wrap.querySelector('.ba__handle');
  const set = (val) => {
    const pct = Math.max(0, Math.min(100, Number(val)));
    after.style.clipPath = `inset(0 0 0 ${pct}%)`;
    handle.style.left = pct + '%';
  };
  set(range.value);
  range.addEventListener('input', (e) => set(e.target.value));
})();

// Появление секций (IntersectionObserver)
(function revealOnScroll(){
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('is-visible');
        io.unobserve(en.target);
      }
    });
  }, {threshold: 0.15});
  els.forEach(el => io.observe(el));
})();

// Базовая валидация формы (мягкая)
(function formInit(){
  const form = document.querySelector('.form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    const name = form.querySelector('input[name="name"]');
    const phone = form.querySelector('input[name="phone"]');
    if (!name.value.trim() || !phone.value.trim()) {
      e.preventDefault();
      alert('Пожалуйста, заполните имя и телефон.');
    }
  });
})();

// Before/After slider — перетаскиваемая ручка + клики + клавиатура
(function initBeforeAfter(){
  const wrap = document.getElementById('ba');
  if (!wrap) return;

  const range  = wrap.querySelector('.ba__range');
  const after  = wrap.querySelector('.ba__pane--after');
  const handle = wrap.querySelector('.ba__handle');

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const setPct = (pct) => {
    const v = clamp(Math.round(pct), 0, 100);
    after.style.clipPath = `inset(0 0 0 ${v}%)`;
    handle.style.left = v + '%';
    range.value = String(v);
    handle.setAttribute('aria-valuenow', String(v));
  };

  // начальное положение
  setPct(Number(range.value) || 50);

  // Поддержка клика по области
  const rectToPct = (clientX) => {
    const rect = wrap.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * 100;
  };
  wrap.addEventListener('pointerdown', (e) => {
    // если кликнули где-то в области — сразу прыгнуть и начать перетаскивание
    wrap.classList.add('dragging');
    handle.setPointerCapture?.(e.pointerId);
    setPct(rectToPct(e.clientX));
  });

  // Перетаскивание (pointer events)
  const onMove = (e) => setPct(rectToPct(e.clientX));
  const onUp   = () => wrap.classList.remove('dragging');

  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    wrap.classList.add('dragging');
    handle.setPointerCapture?.(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!wrap.classList.contains('dragging')) return;
    onMove(e);
  });
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onUp);

  // Движение по клику в любой точке внутри .ba
  wrap.addEventListener('pointermove', (e) => {
    if (!wrap.classList.contains('dragging')) return;
    onMove(e);
  });
  wrap.addEventListener('pointerup', onUp);
  wrap.addEventListener('pointercancel', onUp);

  // Клавиатура на ручке (a11y)
  handle.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 5 : 1;
    let v = Number(range.value) || 50;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setPct(v - step); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setPct(v + step); }
    if (e.key === 'Home')       { e.preventDefault(); setPct(0); }
    if (e.key === 'End')        { e.preventDefault(); setPct(100); }
  });

  // Синхронизация, если кто-то двигает скрытый range (на всякий случай)
  range.addEventListener('input', (e) => setPct(e.target.value));
})();

// Lightbox для галереи (клик по карточке, стрелки ←/→, Esc)
(function galleryLightbox(){
  const cards = Array.from(document.querySelectorAll('.gcard'));
  if (!cards.length) return;

  const box   = document.getElementById('glightbox');
  const img   = box.querySelector('.glightbox__img');
  const cap   = box.querySelector('.glightbox__cap');
  const btnX  = box.querySelector('.glightbox__close');
  const btnP  = box.querySelector('.glightbox__prev');
  const btnN  = box.querySelector('.glightbox__next');

  const supportsWebP = (() => {
    try { return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0; }
    catch(e){ return false; }
  })();

  let index = 0;

  const open = (i) => {
    index = Math.max(0, Math.min(cards.length - 1, i));
    const card = cards[index];
    const src = supportsWebP ? card.dataset.fullWebp : card.dataset.fullJpg;
    const title = card.querySelector('.gcap__title')?.textContent || '';
    img.src = src; img.alt = title; cap.textContent = title;
    box.hidden = false; box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    preload(index + 1); preload(index - 1);
  };

  const close = () => {
    box.hidden = true; box.setAttribute('aria-hidden', 'true');
    img.src = ''; cap.textContent='';
    document.body.style.overflow = '';
  };

  const prev = () => open((index - 1 + cards.length) % cards.length);
  const next = () => open((index + 1) % cards.length);

  const preload = (i) => {
    if (i < 0 || i >= cards.length) return;
    const card = cards[i];
    const psrc = supportsWebP ? card.dataset.fullWebp : card.dataset.fullJpg;
    const iPre = new Image(); iPre.src = psrc;
  };

  // Открытие по клику
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]');
    const card = e.target.closest('.gcard');
    if (btn && card) open(cards.indexOf(card));
    else if (card && e.target === card.querySelector('.gmedia picture img')) {
      open(cards.indexOf(card));
    }
  });

  btnX.addEventListener('click', close);
  btnP.addEventListener('click', prev);
  btnN.addEventListener('click', next);

  // Клавиатура
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });

  // Закрытие по клику мимо картинки
  box.addEventListener('click', (e) => {
    if (e.target === box) close();
  });
})();
