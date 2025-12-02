// modal.js — финальная версия
(() => {
  'use strict';

  const normalizeTarget = (t) => {
    if (!t) return null;
    if (typeof t !== 'string') return t;
    const s = t.trim();
    if (!s) return null;
    if (s.startsWith('#') || s.startsWith('.')) return s;
    if (s.startsWith('modal-')) return '#' + s;
    return '#modal-' + s;
  };

  const FOCUSABLE =
    'a[href]:not([tabindex="-1"]), area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let lastActive = null;

  const getScrollbarCompensation = () => {
    const root = document.documentElement;
    const gutter = (getComputedStyle(root).scrollbarGutter || '');
    const hasStable = gutter.includes('stable');
    const hadVScroll = root.scrollHeight > window.innerHeight;
    if (hasStable || !hadVScroll) return 0;
    return window.innerWidth - root.clientWidth;
  };

  const setTriggersExpanded = (modal, expanded) => {
    if (!modal || !modal.id) return;
    document.querySelectorAll(`[aria-controls="${modal.id}"]`).forEach(tr => {
      tr.setAttribute('aria-expanded', String(expanded));
    });
  };

  const trapTab = (e) => {
    if (e.key !== 'Tab') return;
    const modal = e.currentTarget;
    const nodes = modal.querySelectorAll(FOCUSABLE);
    if (!nodes.length) return;
    const first = nodes[0];
    const last  = nodes[nodes.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const escClose = (e) => {
    if (e.key === 'Escape') {
      const opened = document.querySelector('.modal.is-open');
      if (opened) closeModal(opened);
    }
  };

  const handleModalClick = (e) => {
    const modal = e.currentTarget;
    const isClose = !!e.target.closest('[data-close],[data-modal-close]');
    const isBackdrop = e.target.classList?.contains('modal__backdrop') || !!e.target.closest('.modal__backdrop');
    if (isClose || isBackdrop) {
      const a = e.target.closest('a[href]');
      if (a) e.preventDefault();
      closeModal(modal);
    }
  };

  const openModal = (selOrEl) => {
    let modal = null;
    if (typeof selOrEl === 'string') {
      const sel = normalizeTarget(selOrEl);
      modal = sel ? document.querySelector(sel) : null;
    } else if (selOrEl?.nodeType === 1) {
      modal = selOrEl;
    }
    if (!modal) return;

    if (!modal.hasAttribute('hidden') && modal.classList.contains('is-open')) return;

    let root = document.getElementById('modal-root');
    if (!root) { 
      root = document.createElement('div'); 
      root.id = 'modal-root'; 
      document.body.appendChild(root); 
    }
    if (modal.parentElement !== root) root.appendChild(modal);

    lastActive = document.activeElement;

    modal.hidden = false;
    modal.classList.add('is-open');

    const sbw = getScrollbarCompensation();
    document.body.classList.add('scroll-lock');
    if (sbw > 0) {
      document.body.style.paddingRight = `${sbw}px`;
      document.querySelectorAll('.fixed-compensate').forEach(el => {
        el.style.paddingRight = `calc(${getComputedStyle(el).paddingRight} + ${sbw}px)`;
      });
    }

    setTriggersExpanded(modal, true);

    const focusables = modal.querySelectorAll(FOCUSABLE);
    (focusables[0] || modal).focus();

    modal.addEventListener('keydown', trapTab);
    document.addEventListener('keydown', escClose);
    modal.addEventListener('click', handleModalClick);
  };

  const closeModal = (modal) => {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.hidden = true;

    if (lastActive && typeof lastActive.focus === 'function') lastActive.focus();

    document.body.classList.remove('scroll-lock');
    document.body.style.paddingRight = '';
    document.querySelectorAll('.fixed-compensate').forEach(el => (el.style.paddingRight = ''));

    setTriggersExpanded(modal, false);

    modal.removeEventListener('keydown', trapTab);
    document.removeEventListener('keydown', escClose);
    modal.removeEventListener('click', handleModalClick);
  };

  // Экспорт в глобал
  window.openModal = (t) => openModal(t);
  window.closeModal = (selOrEl) => {
    const modal = typeof selOrEl === 'string' ? document.querySelector(normalizeTarget(selOrEl)) : selOrEl;
    closeModal(modal);
  };
})();

// HERO: раскрыть/скрыть дополнительные преимущества
(function(){
  const btn  = document.getElementById('benefits-more-btn');
  const list = document.getElementById('benefits-more');
  if (!btn || !list) return;

  const total = list.querySelectorAll('.hero__benefit').length;
  btn.textContent = `Ещё преимущества (${total})`;

  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    list.hidden = open;
    btn.textContent = open ? `Ещё преимущества (${total})` : 'Скрыть дополнительные преимущества';
  }, {passive:true});
})();

// Нормализация алиасов (ОСТАВИТЬ ТОЛЬКО ОДИН РАЗ)
(function(){
  if (typeof window.openModal !== 'function') return;

  const _openModal = window.openModal;
  window.openModal = function(idOrAlias){
    if (idOrAlias === 'callback') idOrAlias = 'callback-modal';
    if (idOrAlias === 'quiz') idOrAlias = 'modal-quiz';
    return _openModal.call(this, idOrAlias);
  };
})();

