// plumbing.js — минимальный интерактив: ripple-клик, lightbox, reveal-on-scroll

// Ripple на кнопках
document.addEventListener('click', (e) => {
  const t = e.target.closest('.btn');
  if (!t) return;
  const r = document.createElement('span');
  r.className = 'rip';
  const rect = t.getBoundingClientRect();
  r.style.left = `${e.clientX - rect.left}px`;
  r.style.top  = `${e.clientY - rect.top}px`;
  t.appendChild(r);
  setTimeout(() => r.remove(), 600);
});

// Reveal (IntersectionObserver)
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((ent) => {
      if (ent.isIntersecting) {
        ent.target.classList.add('is-visible');
        io.unobserve(ent.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('is-visible'));
}

// Лайтбокс для галереи
(function initLightbox(){
  const box = document.getElementById('glightbox');
  if (!box) return;
  const img = box.querySelector('.glightbox__img');
  const cap = box.querySelector('.glightbox__cap');
  const prev = box.querySelector('.glightbox__prev');
  const next = box.querySelector('.glightbox__next');
  const closeBtn = box.querySelector('.glightbox__close');

  const cards = Array.from(document.querySelectorAll('.gcard'));
  let i = -1;

  function openAt(idx){
    i = (idx + cards.length) % cards.length;
    const c = cards[i];
    const avif = c.dataset.fullAvif;
    const webp = c.dataset.fullWebp;
    const jpg  = c.dataset.fullJpg;
    const title = c.querySelector('.gcap__title')?.textContent?.trim() || '';
    // Progressive load: начинаем с jpg
    img.src = jpg || '';
    img.alt = title;
    cap.textContent = title;

    // По возможности подменяем на webp/avif после onload для качества
    if (webp) {
      const picWebp = new Image();
      picWebp.onload = () => { img.src = webp; };
      picWebp.src = webp;
    }
    if (avif) {
      const picAvif = new Image();
      picAvif.onload = () => { img.src = avif; };
      picAvif.src = avif;
    }

    box.hidden = false;
    box.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow = 'hidden';
  }
  function close(){
    box.hidden = true;
    box.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]');
    if (btn) {
      const card = e.target.closest('.gcard');
      const idx = cards.indexOf(card);
      openAt(idx);
    }
  });

  prev.addEventListener('click', () => openAt(i - 1));
  next.addEventListener('click', () => openAt(i + 1));
  closeBtn.addEventListener('click', close);
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') openAt(i - 1);
    if (e.key === 'ArrowRight') openAt(i + 1);
  });
})();

