// ============ RIPPLE EFFECT ============
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  
  const rip = document.createElement('span');
  rip.classList.add('rip');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  rip.style.width = rip.style.height = `${size}px`;
  rip.style.left = `${e.clientX - rect.left}px`;
  rip.style.top = `${e.clientY - rect.top}px`;
  btn.appendChild(rip);
  
  setTimeout(() => rip.remove(), 600);
});

// ============ INTERSECTION OBSERVER (REVEAL) ============
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
);

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ============ LIGHTBOX ============
const lightbox = document.getElementById('glightbox');
const lbImg = lightbox?.querySelector('.glightbox__img');
const lbCap = lightbox?.querySelector('.glightbox__cap');
const lbClose = lightbox?.querySelector('.glightbox__close');
const lbPrev = lightbox?.querySelector('.glightbox__prev');
const lbNext = lightbox?.querySelector('.glightbox__next');

let currentIndex = 0;
let galleryCards = [];

function openLightbox(index) {
  if (!lightbox || !galleryCards.length) return;
  currentIndex = index;
  updateLightbox();
  lightbox.hidden = false;
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.hidden = true;
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function updateLightbox() {
  const card = galleryCards[currentIndex];
  if (!card) return;
  
  // Prefer AVIF, fallback to WebP, then JPG
  const avif = card.dataset.fullAvif;
  const webp = card.dataset.fullWebp;
  const jpg = card.dataset.fullJpg;
  
  // Simple feature detection: try AVIF first
  const img = new Image();
  img.onload = () => {
    lbImg.src = avif;
  };
  img.onerror = () => {
    const img2 = new Image();
    img2.onload = () => {
      lbImg.src = webp;
    };
    img2.onerror = () => {
      lbImg.src = jpg;
    };
    img2.src = webp;
  };
  img.src = avif;
  
  const title = card.querySelector('.gcap__title')?.textContent || '';
  lbCap.textContent = title;
  lbImg.alt = title;
}

function nextImage() {
  currentIndex = (currentIndex + 1) % galleryCards.length;
  updateLightbox();
}

function prevImage() {
  currentIndex = (currentIndex - 1 + galleryCards.length) % galleryCards.length;
  updateLightbox();
}

// Init gallery
document.addEventListener('DOMContentLoaded', () => {
  galleryCards = Array.from(document.querySelectorAll('.gcard'));
  
  galleryCards.forEach((card, idx) => {
    const openBtn = card.querySelector('[data-open]');
    if (openBtn) {
      openBtn.addEventListener('click', e => {
        e.stopPropagation();
        openLightbox(idx);
      });
    }
    // Also allow clicking the card itself
    card.addEventListener('click', () => openLightbox(idx));
  });
  
  lbClose?.addEventListener('click', closeLightbox);
  lbNext?.addEventListener('click', nextImage);
  lbPrev?.addEventListener('click', prevImage);
  
  // ESC to close
  document.addEventListener('keydown', e => {
    if (!lightbox.hidden) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    }
  });
  
  // Click backdrop to close
  lightbox?.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });
});

// ============ FORM VALIDATION & SUBMIT ============
const form = document.querySelector('.form');
form?.addEventListener('submit', e => {
  e.preventDefault();
  
  const name = form.querySelector('[name="name"]').value.trim();
  const phone = form.querySelector('[name="phone"]').value.trim();
  
  if (!name || !phone) {
    alert('Пожалуйста, заполните все поля.');
    return;
  }
  
  // Simulate send
  alert(`Спасибо, ${name}! Мы свяжемся с вами по номеру ${phone}.`);
  form.reset();
});

// ============ PHONE MASK (SIMPLE) ============
const phoneInput = document.querySelector('[name="phone"]');
phoneInput?.addEventListener('input', e => {
  let val = e.target.value.replace(/\D/g, '');
  if (val.length > 11) val = val.slice(0, 11);
  
  let formatted = '+7';
  if (val.length > 1) formatted += ` (${val.slice(1, 4)}`;
  if (val.length >= 5) formatted += `) ${val.slice(4, 7)}`;
  if (val.length >= 8) formatted += `-${val.slice(7, 9)}`;
  if (val.length >= 10) formatted += `-${val.slice(9, 11)}`;
  
  e.target.value = formatted;
});

// ============ SMOOTH SCROLL ============
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
