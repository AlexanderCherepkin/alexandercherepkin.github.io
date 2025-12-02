/*!
 * Services Tabs (no-scroll on click)
 */
(function () {
  let mountedRoot = null;

  const findRoot = () => document.querySelector('.js-services-tabs');

  function ready(fn) {
    document.readyState !== 'loading'
      ? fn()
      : document.addEventListener('DOMContentLoaded', fn);
  }

  const mo = new MutationObserver(() => tryMount());
  ready(() => {
    mo.observe(document.body, { childList: true, subtree: true });
    tryMount();
  });

  function tryMount() {
    const root = findRoot();
    if (root && root !== mountedRoot) {
      mountedRoot = root;
      mount(root);
    }
  }

  function mount(root) {
    const list   = root.querySelector('.tabs__list');
    const tabs   = Array.from(root.querySelectorAll('.tabs__tab'));
    const panels = Array.from(root.querySelectorAll('.tabs__panel'));
    if (!list || !tabs.length || !panels.length) return;

    const panelOf = (btn) => {
      const sel = btn.dataset.panel || '#' + btn.getAttribute('aria-controls');
      return root.querySelector(sel);
    };

    function showOnly(targetPanel) {
      panels.forEach(p => {
        const on = p === targetPanel;
        p.toggleAttribute('hidden', !on);
        p.classList.toggle('is-active', on);
      });
    }
    function setActiveTab(btn) {
      tabs.forEach(t => {
        const on = t === btn;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
    }

    // оставляю функцию на будущее, но вызывать её не будем
    function scrollToPanel(panel, behavior = 'smooth') {
      const anchor = panel.querySelector('.services__h3') || panel;
      anchor.scrollIntoView({ behavior, block: 'start', inline: 'nearest' });
      const key = (panel.id || '').replace(/^panel-/, '');
      if (key) history.replaceState(null, '', '#' + key);
    }

    let scrollLock = false;
    const lock = (ms = 600) => { scrollLock = true; setTimeout(() => (scrollLock = false), ms); };

    // ВАЖНО: по умолчанию scroll = false — ничего не двигаем
    function activate(btn, { scroll = false, behavior = 'smooth' } = {}) {
      if (!btn) return;
      const panel = panelOf(btn);
      if (!panel) return;
      setActiveTab(btn);
      showOnly(panel);
      if (scroll) { scrollToPanel(panel, behavior); lock(); }
    }

    // КЛИКИ — без прокрутки
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.tabs__tab');
      if (!btn) return;
      e.preventDefault();
      activate(btn, { scroll: false });
    });

    // КЛАВИАТУРА — тоже без прокрутки
    list.addEventListener('keydown', (e) => {
      const a = document.activeElement;
      if (!a || !a.classList.contains('tabs__tab')) return;
      const i = tabs.indexOf(a);
      const focusTab = (idx) => tabs[(idx + tabs.length) % tabs.length].focus();

      if (e.key === 'ArrowRight') { e.preventDefault(); focusTab(i + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); focusTab(i - 1); }
      if (e.key === 'Home')       { e.preventDefault(); focusTab(0); }
      if (e.key === 'End')        { e.preventDefault(); focusTab(tabs.length - 1); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(a, { scroll: false }); }
    });

    // ScrollSpy только подсвечивает активный таб, не скроллит
    const spy = new IntersectionObserver((entries) => {
      if (scrollLock) return;
      const vis = entries.filter(en => en.isIntersecting)
                         .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!vis) return;
      const panel = vis.target;
      const key   = (panel.id || '').replace(/^panel-/, '');
      const btn   = tabs.find(b =>
        (b.dataset.panel || '#' + b.getAttribute('aria-controls')) === '#' + panel.id ||
        b.id.replace(/^tab-/, '') === key
      );
      if (btn) setActiveTab(btn);
    }, { threshold: [0.55], rootMargin: '-28% 0% -60% 0%' });

    panels.forEach(p => spy.observe(p));

    // Инициализация — тоже без прокрутки
    const hash = (location.hash || '').replace('#', '');
    const byKey   = tabs.find(b => b.id.replace(/^tab-/, '') === hash);
    const byPanel = tabs.find(b =>
      (b.dataset.panel || '#' + b.getAttribute('aria-controls')) === '#panel-' + hash
    );
    const preset  = tabs.find(b => b.classList.contains('is-active'));
    const initial = byKey || byPanel || preset || tabs[0];

    activate(initial, { scroll: false, behavior: 'auto' });
  }
})();

function activate(btn, { scroll = false } = {}) {
  if (!btn) return;
  const panel = panelOf(btn);
  if (!panel) return;

  // запомним позицию
  const sx = window.pageXOffset;
  const sy = window.pageYOffset;

  setActiveTab(btn);
  showOnly(panel);

  // вернём позицию (если что-то вёрстка подтолкнула)
  window.scrollTo(sx, sy);
}

