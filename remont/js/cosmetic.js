
/* ==== Simple Lightbox for img[data-full] ==== */
(() => {
  // локальный lock/unlock c компенсацией скроллбара
  const state = { locked:false, padBody:'' };
  const getSBW = () => Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  function lockScroll(){
    if (state.locked) return;
    state.locked = true;
    state.padBody = document.body.style.paddingRight || '';
    const sbw = getSBW();
    if (sbw>0){
      document.body.style.paddingRight = `calc(${getComputedStyle(document.body).paddingRight} + ${sbw}px)`;
    }
    document.body.classList.add('scroll-lock');
  }
  function unlockScroll(){
    if (!state.locked) return;
    state.locked = false;
    document.body.classList.remove('scroll-lock');
    document.body.style.paddingRight = state.padBody;
  }

  // создаём DOM лайтбокса один раз
 function mountLB(){
  if (document.getElementById('lightbox')) return document.getElementById('lightbox');

  const lb = document.createElement('div');
  lb.className = 'lightbox'; lb.id = 'lightbox'; lb.hidden = true;
  lb.innerHTML = `
    <div class="lightbox__backdrop" data-lb-close></div>
    <figure class="lightbox__frame" role="dialog" aria-modal="true" aria-label="Просмотр изображения">
      <button class="lightbox__close" type="button" data-lb-close aria-label="Закрыть">
        <svg class="lightbox__svg" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.7 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3 1.42 1.42Z"/>
        </svg>
      </button>

      <!-- ЛЕВАЯ: стрелка ВЛЕВО (без transform) -->
      <button class="lightbox__nav lightbox__prev" type="button" data-lb-prev aria-label="Предыдущее">
        <svg class="lightbox__svg" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>

      <img class="lightbox__img" alt="">

      <!-- ПРАВАЯ: стрелка ВПРАВО (тот же стиль, другой путь) -->
      <button class="lightbox__nav lightbox__next" type="button" data-lb-next aria-label="Следующее">
        <svg class="lightbox__svg" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="m8.59 16.59 1.41 1.41 6-6-6-6-1.41 1.41L13.17 12z"/>
        </svg>
      </button>
    </figure>
  `;
  document.body.appendChild(lb);
  return lb;
}


  // собираем список изображений в текущей галерее
  function collectGallery(startImg){
    const wrap = startImg.closest('.case-gallery') || document;
    const items = Array.from(wrap.querySelectorAll('img[data-full]'));
    const index = items.indexOf(startImg);
    return { items, index };
  }

  // открыть
  function openLB(startImg){
    const lb = mountLB();
    const imgEl = lb.querySelector('.lightbox__img');
    const frame = lb.querySelector('.lightbox__frame');
    const {items, index} = collectGallery(startImg);
    lb.dataset.gallerySize = items.length;
    lb.dataset.index = index;

    function setBy(i){
      const item = items[i];
      if(!item) return;
      lb.dataset.index = i;
      imgEl.src = item.dataset.full || item.currentSrc || item.src;
      imgEl.alt = item.alt || 'Изображение';
      // доступность: фокус на фрейм
      frame.setAttribute('tabindex','-1');
      frame.focus({preventScroll:true});
      updateArrows();
    }
    function updateArrows(){
      const i = Number(lb.dataset.index||0);
      const n = items.length;
      lb.querySelector('[data-lb-prev]').hidden = n<2 || i<=0;
      lb.querySelector('[data-lb-next]').hidden = n<2 || i>=n-1;
    }

    lb.hidden = false;
    lockScroll();
    setBy(index);

    // обработчики
    const onKey = (e)=>{
      if (e.key === 'Escape'){ closeLB(); }
      else if (e.key === 'ArrowLeft'){ nav(-1); }
      else if (e.key === 'ArrowRight'){ nav(1); }
    };
    function nav(dir){
      const i = Number(lb.dataset.index||0);
      const n = items.length;
      const j = Math.min(n-1, Math.max(0, i + dir));
      if (j!==i) setBy(j);
    }
    function closeLB(){
      lb.hidden = true;
      unlockScroll();
      document.removeEventListener('keydown', onKey);
      lb.querySelector('[data-lb-prev]').onclick = null;
      lb.querySelector('[data-lb-next]').onclick = null;
      lb.querySelectorAll('[data-lb-close]').forEach(b=> b.onclick=null);
    }

    lb.querySelector('[data-lb-prev]').onclick = ()=> nav(-1);
    lb.querySelector('[data-lb-next]').onclick = ()=> nav(1);
    lb.querySelectorAll('[data-lb-close]').forEach(b=> b.onclick = closeLB);
    document.addEventListener('keydown', onKey);
  }

  // Делегированный клик по превью
  document.addEventListener('click', (e)=>{
    const img = e.target.closest('img[data-full]');
    if (!img) return;
    e.preventDefault();
    openLB(img);
  });

  // Доступность по Enter/Space
  document.addEventListener('keydown', (e)=>{
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = document.activeElement;
    if (!el || !el.matches('img[data-full]')) return;
    e.preventDefault();
    openLB(el);
  });

  // Сделаем превью фокусируемыми
  function enhance(root=document){
    root.querySelectorAll('img[data-full]').forEach(img=>{
      img.tabIndex = 0;
      img.setAttribute('role','button');
      img.setAttribute('aria-label','Открыть изображение поверх страницы');
    });
  }
  if (document.readyState !== 'loading') enhance();
  else document.addEventListener('DOMContentLoaded', enhance);

  // На случай динамических include
  const mo = new MutationObserver(()=> enhance());
  mo.observe(document.documentElement, { childList:true, subtree:true });
})();

(function(){
  const root=document.querySelector('.slides');
  if(!root||root.dataset.init==="1") return;
  root.dataset.init="1";
  const viewport=root.querySelector('.slides__viewport');
  const slides=[...viewport.querySelectorAll('.slide')];
  const dots=[...root.querySelectorAll('.dot')];
  const prev=root.querySelector('.slides__nav--prev');
  const next=root.querySelector('.slides__nav--next');
  let i=slides.findIndex(s=>s.classList.contains('is-active')); if(i<0)i=0;
  let t=null, autoplay=root.dataset.autoplay==="true", interval=+root.dataset.interval||4000;

  function setActive(idx){
    slides.forEach((s,k)=>s.classList.toggle('is-active',k===idx));
    dots.forEach((d,k)=>d.classList.toggle('is-active',k===idx));
    slides.forEach((s,k)=>s.setAttribute('aria-label',`${k+1} из ${slides.length}`));
    i=idx;
  }
  const nextSlide=()=>setActive((i+1)%slides.length);
  const prevSlide=()=>setActive((i-1+slides.length)%slides.length);

  next&&next.addEventListener('click',()=>{nextSlide();restart()});
  prev&&prev.addEventListener('click',()=>{prevSlide();restart()});
  dots.forEach((d,k)=>d.addEventListener('click',()=>{setActive(k);restart()}));
  root.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){nextSlide();restart()} if(e.key==='ArrowLeft'){prevSlide();restart()}});
  root.tabIndex=0;

  function start(){ if(autoplay) t=setInterval(nextSlide,interval) }
  function stop(){ if(t){clearInterval(t); t=null} }
  function restart(){ stop(); start() }
  root.addEventListener('mouseenter',stop);
  root.addEventListener('mouseleave',start);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());

  setActive(i); start();
})();



(function(){
  const root = document.querySelector('.slides');
  if(!root || root.dataset.enhanced==="1") return;
  root.dataset.enhanced = "1";

  // ——— Супергладкие дефолты ———
  root.dataset.smooth = "on";      // анти-moire
  // Включи overlay-режим, если хочешь максимально гладко: root.dataset.overlay = "on";

  // HUD + progress
  const hud = document.createElement('div');
  hud.className = 'slides__hud';
  hud.innerHTML = '<span class="hud__rec-dot" aria-hidden="true"></span><span class="hud__label" aria-hidden="true">REC</span>';
  root.appendChild(hud);

  const bar = document.createElement('div');
  bar.className = 'slides__bar';
  bar.innerHTML = '<div class="slides__bar-inner"></div>';
  root.appendChild(bar);
  const barInner = bar.firstElementChild;

  // Overlay-only слои (включаются атрибутом data-overlay="on")
  const film = document.createElement('div');
  film.className = 'slides__film';
  const sheen = document.createElement('div');
  sheen.className = 'slides__sheen';
  root.appendChild(film);
  root.appendChild(sheen);

  const viewport = root.querySelector('.slides__viewport');
  const slides = Array.from(viewport?.querySelectorAll('.slide')||[]);
  const interval = Math.max(3000, Number(root.dataset.interval || 4000)); // не короче 3с — стабильнее
  const autoplay = root.dataset.autoplay === 'true';

  let currentIndex = slides.findIndex(s => s.classList.contains('is-active'));
  if(currentIndex < 0) currentIndex = 0;

  const hasGSAP = typeof window.gsap !== 'undefined';
  if(hasGSAP){
    gsap.config({ force3D:true, autoSleep:60 });
    gsap.ticker.fps(60); // фиксируем FPS
  }

  let kbTween = null;   // KenBurns (микро)
  let progressTimer = null;

  function stopTweens(){
    if(kbTween){ kbTween.kill(); kbTween=null; }
    if(progressTimer){ clearTimeout(progressTimer); progressTimer=null; }
  }

  function animateProgress(){
    barInner.style.transition = 'none';
    barInner.style.width = '0%';
    requestAnimationFrame(()=>{
      barInner.style.transition = `width ${interval}ms linear`;
      barInner.style.width = '100%';
    });
  }

  function microKenBurns(img){
    // Микро-эффект: только SCALE 1.008 -> 1.02 без панорамирования
    if(!img) return;
    if(hasGSAP){
      kbTween = gsap.fromTo(img, { scale: 1.008 }, {
        scale: 1.02,
        duration: (interval/1000),
        ease: 'none',
        overwrite: 'auto'
      });
    }else{
      img.style.transition = `transform ${interval}ms linear`;
      img.style.transform = 'translateZ(0) scale(1.02)';
      // вернём в исходное в конце
      progressTimer = setTimeout(()=>{
        img.style.transition = 'none';
        img.style.transform = 'translateZ(0) scale(1)';
      }, interval);
    }
  }

  function animateFor(idx){
    stopTweens();
    animateProgress();

    const active = slides[idx];
    const img = active?.querySelector('img');
    const cap = active?.querySelector('.slide__caption');

    // Если overlay-режим включён — вообще не трогаем img (идеально гладко)
    if(root.dataset.overlay === 'on'){
      // подпись всё равно мягко появится по CSS
      return;
    }
    // Иначе — мягкий Micro-KenBurns
    microKenBurns(img);

    // Подпись (дублируем появление для GSAP)
    if(hasGSAP && cap){
      gsap.fromTo(cap, {y:8, autoAlpha:0}, {y:0, autoAlpha:1, duration:.35, ease:'power2.out', delay:.05});
    }
  }

  // Отслеживаем смену активного слайда
  const mo = new MutationObserver(() => {
    const idx = slides.findIndex(s => s.classList.contains('is-active'));
    if(idx !== currentIndex && idx > -1){
      currentIndex = idx;
      animateFor(currentIndex);
    }
  });
  slides.forEach(s => mo.observe(s, {attributes:true, attributeFilter:['class']}));

  // Пауза
  let paused = false;
  function setPaused(v){
    if(v === paused) return;
    paused = v;
    root.dataset.paused = v ? 'true' : 'false';
    if(hasGSAP){ kbTween && kbTween.paused(v); }
    // progressBar в CSS — сам «замрёт» визуально достаточно
  }
  root.addEventListener('mouseenter', ()=> setPaused(true));
  root.addEventListener('mouseleave', ()=> setPaused(false));
  document.addEventListener('visibilitychange', ()=> setPaused(document.hidden));

  // init
  if(autoplay){ animateFor(currentIndex); }
})();

(function(){
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!m.matches) return;
    // Отключаем автоплей слайдов
    const root = document.querySelector('.slides');
    if (root) {
      root.dataset.autoplay = 'false';
      root.dataset.paused = 'true';
    }
    // Отключаем любые CSS-анимации в слайдере
    const style = document.createElement('style');
    style.textContent = `
      .slides * { animation: none !important; transition: none !important; }
    `;
    document.head.appendChild(style);
  })();
  
  // Внутри вашего IIFE "Simple Lightbox", рядом с openLB()
let lastTrigger = null;

document.addEventListener('click', (e)=>{
  const img = e.target.closest('img[data-full]');
  if (!img) return;
  e.preventDefault();
  lastTrigger = img;              // <— запоминаем
  openLB(img);
});

// В функции openLB, внутри closeLB() добавьте:
function closeLB(){
  lb.hidden = true;
  unlockScroll();
  document.removeEventListener('keydown', onKey);
  lb.querySelector('[data-lb-prev]').onclick = null;
  lb.querySelector('[data-lb-next]').onclick = null;
  lb.querySelectorAll('[data-lb-close]').forEach(b=> b.onclick=null);
  // Возврат фокуса
  if (lastTrigger && typeof lastTrigger.focus === 'function') {
    lastTrigger.focus({preventScroll:true});
  }
}

function hideToTop() {
  toTopBtn.setAttribute('aria-hidden', 'true');
  toTopBtn.setAttribute('tabindex', '-1');  // ← ДОБАВИТЬ
}

function showToTop() {
  toTopBtn.removeAttribute('aria-hidden');
  toTopBtn.removeAttribute('tabindex');     // ← ДОБАВИТЬ
}
