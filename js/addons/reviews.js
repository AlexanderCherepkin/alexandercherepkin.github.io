// Reviews (финал): 2 карточки на десктопе, шаг учитывает gap + автопрокрутка
(() => {
  const INIT_ATTR = 'data-reviews-initialized';
  const SEL = 'section.reviews';
  const AUTO_DELAY = 6000;

  function boot(){
    document.querySelectorAll(`${SEL}:not([${INIT_ATTR}])`).forEach(init);
  }
  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('includes:ready', boot);
  document.addEventListener('partials:ready', boot);
  
  // Отключаем MutationObserver после partials:ready для экономии ресурсов
  const mo = new MutationObserver(() => boot());
  mo.observe(document.documentElement, { childList:true, subtree:true });
  document.addEventListener('partials:ready', () => setTimeout(() => mo.disconnect(), 1000), { once: true });

  function init(section){
    const viewport = section.querySelector('.reviews__viewport');
    const track    = section.querySelector('#reviewsTrack');
    if (!viewport || !track) return;
    section.setAttribute(INIT_ATTR,'');

    const slides  = Array.from(track.children);
    const prevBtn = section.querySelector('[data-reviews-prev]');
    const nextBtn = section.querySelector('[data-reviews-next]');
    const dots    = Array.from(section.querySelectorAll('.reviews__dot'));
    const mql     = window.matchMedia('(min-width: 48rem)');
    const mqlPRM  = window.matchMedia('(prefers-reduced-motion: reduce)');

    let perView = mql.matches ? 2 : 1;
    let index   = 0;
    
    // === КЭШИРУЕМ геометрию, чтобы избежать forced reflow ===
    let cachedGap = 0;
    let cachedStep = 0;
    let rafPending = false;

    const maxIndex = () => Math.max(0, slides.length - perView);

    // Читаем геометрию ОДИН раз через rAF
    function cacheGeometry(callback){
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        const style = getComputedStyle(track);
        cachedGap = parseFloat(style.gap) || 0;
        const vw = viewport.offsetWidth; // offsetWidth вместо clientWidth — меньше reflow
        const colW = perView === 1 ? vw : (vw - cachedGap) / 2;
        cachedStep = colW + cachedGap;
        if (callback) callback();
      });
    }

    function goTo(i){
      index = Math.min(Math.max(0, i), maxIndex());
      applyTransform();
    }

    // Применяем transform БЕЗ чтения геометрии
    function applyTransform(){
      track.style.transform = `translateX(${-index * cachedStep}px)`;
      updateUI();
    }

    // Обновляем UI без чтения геометрии
    function updateUI(){
      slides.forEach((li, idx) => {
        const visible = idx >= index && idx < index + perView;
        li.setAttribute('aria-hidden', visible ? 'false' : 'true');
      });

      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === maxIndex();

      dots.forEach((d,i) => {
        const active = i === index;
        d.classList.toggle('is-active', active);
        d.setAttribute('aria-selected', String(active));
        d.tabIndex = active ? 0 : -1;
      });
    }

    // Полное обновление (с перерасчётом геометрии)
    function fullUpdate(){
      cacheGeometry(applyTransform);
    }

    function setPerView(){
      const pv = mql.matches ? 2 : 1;
      if (pv !== perView){
        perView = pv;
        if (index > maxIndex()) index = maxIndex();
        fullUpdate();
        schedulePlay(true);
      }
    }

    // Навигация
    prevBtn && prevBtn.addEventListener('click', () => { stop(); goTo(index - 1); schedulePlay(); });
    nextBtn && nextBtn.addEventListener('click', () => { stop(); goTo(index + 1); schedulePlay(); });
    dots.forEach((d,i) => {
      d.addEventListener('click', () => { stop(); goTo(i); schedulePlay(); });
      d.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); goTo(i); schedulePlay(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); (dots[i+1]||dots[i]).focus(); }
        else if (e.key === 'ArrowLeft')  { e.preventDefault(); (dots[i-1]||dots[i]).focus(); }
        else if (e.key === 'Home')       { e.preventDefault(); dots[0].focus(); }
        else if (e.key === 'End')        { e.preventDefault(); dots[dots.length-1].focus(); }
      });
    });

    // Debounced resize
    let resizeT = null;
    window.addEventListener('resize', () => {
      if (resizeT) clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        fullUpdate();
        schedulePlay(true);
      }, 150);
    }, { passive: true });
    
    if (mql.addEventListener) mql.addEventListener('change', setPerView);
    else mql.addListener(setPerView);

    // === Автопрокрутка ===
    let autoT = null;
    let resumeT = null;

    function play(){
      if (autoT) return;
      if (mqlPRM.matches) return;
      if (maxIndex() <= 0) return;
      autoT = setInterval(() => {
        const next = index >= maxIndex() ? 0 : index + 1;
        goTo(next);
      }, AUTO_DELAY);
    }
    function stop(){
      if (autoT){ clearInterval(autoT); autoT = null; }
      if (resumeT){ clearTimeout(resumeT); resumeT = null; }
    }
    function schedulePlay(immediate=false){
      if (resumeT){ clearTimeout(resumeT); resumeT = null; }
      if (immediate) play();
      else resumeT = setTimeout(play, AUTO_DELAY);
    }

    ['mouseenter','focusin','pointerdown'].forEach(ev => {
      viewport.addEventListener(ev, stop, { passive:true });
    });
    ['mouseleave','focusout'].forEach(ev => {
      viewport.addEventListener(ev, () => schedulePlay(), { passive:true });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else schedulePlay(true);
    });

    if (mqlPRM.addEventListener) mqlPRM.addEventListener('change', () => { stop(); schedulePlay(true); });
    else mqlPRM.addListener(() => { stop(); schedulePlay(true); });

    // Старт — кэшируем геометрию, затем обновляем
    cacheGeometry(() => {
      applyTransform();
      play();
    });
  }
})();
