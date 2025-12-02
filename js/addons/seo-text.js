/* SEO text — FINAL: мульти-инициализация + MutationObserver */
(() => {
  const wired = new WeakSet();

  function wire(box){
    if (!box || wired.has(box)) return;
    const btn = box.querySelector('[data-seo-toggle]');
    const content = box.querySelector('#seoContent') || box.querySelector('.seo__content');
    if (!btn || !content) return;

    wired.add(box);

    if (!btn.hasAttribute('type')) btn.type = 'button';
    if (!content.id) content.id = 'seoContent';
    btn.setAttribute('aria-controls', content.id);

    const fixed = box.dataset.fixedHeight;
    if (fixed) box.style.setProperty('--seo-fixed-height', fixed);

    const initialCollapsed =
      box.dataset.collapsed === 'false' ? false :
      box.dataset.collapsed === 'true'  ? true  : true;

    // === Кэш для избежания forced reflow ===
    let cachedOverflow = false;
    let rafPending = false;

    function setState(collapsed){
      box.dataset.collapsed = String(collapsed);
      btn.setAttribute('aria-expanded', String(!collapsed));
      btn.textContent = collapsed ? 'Читать полностью' : 'Скрыть';
      if (!collapsed) box.dataset.atEnd = 'true';
      scheduleUpdate();
    }

    // Проверка overflow через rAF (без forced reflow)
    function checkOverflow(callback){
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        cachedOverflow = content.scrollHeight > content.clientHeight + 1;
        if (callback) callback();
      });
    }

    function updateAtEnd(){
      if (box.dataset.collapsed !== 'true') return;
      // Читаем scroll-позицию через rAF
      requestAnimationFrame(() => {
        const atEnd = content.scrollTop + content.clientHeight >= content.scrollHeight - 1;
        box.dataset.atEnd = String(atEnd);
      });
    }

    function scheduleUpdate(){
      checkOverflow(() => {
        btn.hidden = !cachedOverflow;
        updateAtEnd();
      });
    }

    btn.addEventListener('click', () => {
      const collapsed = box.dataset.collapsed !== 'false';
      setState(!collapsed);
      if (!collapsed) {
        box.dataset.atEnd = 'true';
      } else {
        content.focus({ preventScroll:true });
        updateAtEnd();
      }
    });

    // Debounced scroll
    let scrollT = null;
    content.addEventListener('scroll', () => {
      if (scrollT) return;
      scrollT = setTimeout(() => {
        scrollT = null;
        updateAtEnd();
        if (box.dataset.autohide === 'true') scheduleUpdate();
      }, 100);
    }, { passive:true });

    // ResizeObserver с throttle
    let roT = null;
    const ro = new ResizeObserver(() => {
      if (roT) return;
      roT = setTimeout(() => {
        roT = null;
        scheduleUpdate();
      }, 150);
    });
    ro.observe(content);
    box.addEventListener('seo:destroy', () => ro.disconnect(), { once:true });

    // init
    setState(initialCollapsed);
    (document.fonts?.ready ?? Promise.resolve()).then(scheduleUpdate);
    if (document.readyState !== 'complete') window.addEventListener('load', scheduleUpdate, { once:true });
  }

  function scan(root=document){
    root.querySelectorAll('.js-seo').forEach(wire);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => scan(document), { once:true });
  } else {
    scan(document);
  }

  const mo = new MutationObserver(muts => {
    for (const m of muts){
      m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.matches?.('.js-seo')) wire(n);
        n.querySelectorAll?.('.js-seo').forEach(wire);
      });
    }
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });
  
  // Отключаем MO после загрузки partials
  document.addEventListener('partials:ready', () => setTimeout(() => mo.disconnect(), 1000), { once: true });

  document.addEventListener('seo:scan', () => scan(document));
})();