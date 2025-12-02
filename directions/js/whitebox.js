// Ripple на кнопках
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
    el.scrollIntoView({ behavior:'smooth', block:'start' });
  }
});

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
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));
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

  const supports = {
    avif: (() => {
      const c = document.createElement('canvas');
      return c.toDataURL('image/avif').indexOf('image/avif') !== -1;
    })(),
    webp: (() => {
      const c = document.createElement('canvas');
      return c.toDataURL('image/webp').indexOf('image/webp') !== -1;
    })()
  };

  let index = 0;

  const srcBySupport = (card) => {
    if (supports.avif && card.dataset.fullAvif) return card.dataset.fullAvif;
    if (supports.webp && card.dataset.fullWebp) return card.dataset.fullWebp;
    return card.dataset.fullJpg || '';
  };

  const open = (i) => {
    index = Math.max(0, Math.min(cards.length - 1, i));
    const card = cards[index];
    const src = srcBySupport(card);
    const title = card.querySelector('.gcap__title')?.textContent || '';
    img.src = src; img.alt = title; cap.textContent = title;
    box.hidden = false; box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    preload(index + 1); preload(index - 1);
  };

  const close = () => {
    box.hidden = true; box.setAttribute('aria-hidden', 'true');
    img.src = ''; cap.textContent = '';
    document.body.style.overflow = '';
  };

  const prev = () => open((index - 1 + cards.length) % cards.length);
  const next = () => open((index + 1) % cards.length);

  const preload = (i) => {
    if (i < 0 || i >= cards.length) return;
    const card = cards[i];
    const psrc = srcBySupport(card);
    const iPre = new Image(); iPre.src = psrc;
  };

  // Открытие
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]');
    const card = e.target.closest('.gcard');
    if ((btn && card) || (card && e.target === card.querySelector('.gmedia picture img'))) {
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

  // Клик мимо
  box.addEventListener('click', (e) => {
    if (e.target === box) close();
  });
})();

// Мягкая валидация формы
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

