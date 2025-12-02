(function () {
  const FOCUSABLE = 'a,button,input,select,textarea,[tabindex]';

  function setDisabled(root, disabled) {
    root.querySelectorAll(FOCUSABLE).forEach((el) => {
      if (disabled) {
        if (!el.hasAttribute('data-tabprev') && el.hasAttribute('tabindex')) {
          el.dataset.tabprev = el.getAttribute('tabindex');
        }
        el.tabIndex = -1;
      } else {
        if (el.dataset.tabprev) {
          el.setAttribute('tabindex', el.dataset.tabprev);
          el.removeAttribute('data-tabprev');
        } else {
          el.removeAttribute('tabindex');
        }
      }
    });
  }

  function patch(root) {
    const hidden = root.getAttribute('aria-hidden') === 'true';
    if (hidden) {
      root.setAttribute('inert', '');
      root.setAttribute('hidden', '');
      setDisabled(root, true);
    } else {
      root.removeAttribute('inert');
      root.removeAttribute('hidden');
      setDisabled(root, false);
    }
  }

  // Инициализация
  document.querySelectorAll('[aria-hidden]').forEach(patch);

  // Реакция на любые будущие переключения aria-hidden
  const observer = new MutationObserver((muts) => {
    muts.forEach((m) => {
      if (m.type === 'attributes' && m.attributeName === 'aria-hidden') {
        patch(m.target);
      }
    });
  });
  document.querySelectorAll('[aria-hidden]').forEach((el) =>
    observer.observe(el, { attributes: true })
  );
})();

