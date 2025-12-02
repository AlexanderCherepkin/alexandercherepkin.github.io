/**
 * Тоггл блока «Ещё преимущества».
 * Поведение:
 * - Ищет контейнер преимуществ и кнопку.
 * - Переключает [hidden] у элементов с [data-extra] или класс .is-collapsed на контейнере.
 * - Обновляет aria-expanded у кнопки.
 * - При наличии data-more-label / data-less-label меняет текст кнопки.
 */
(function () {
  'use strict';

  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  // Поддержка двух схем: по data-атрибутам или по aria-controls
  const container =
    $('[data-benefits]') ||
    (function () {
      const btn = document.querySelector('button[aria-controls]');
      if (!btn) return null;
      const id = btn.getAttribute('aria-controls');
      return id ? document.getElementById(id) : null;
    })();

  const button =
    $('[data-action="benefits-more"]') ||
    (function () {
      if (!container) return null;
      return document.querySelector(`button[aria-controls="${container.id}"]`);
    })();

  if (!container || !button) return;

  const extras = $all('[data-extra]', container);
  const update = (expanded) => {
    button.setAttribute('aria-expanded', String(expanded));
    const more = button.getAttribute('data-more-label');
    const less = button.getAttribute('data-less-label');
    if (more && less) {
      button.textContent = expanded ? less : more;
    }
    extras.forEach((el) => {
      el.hidden = !expanded;
    });
    container.classList.toggle('is-expanded', expanded);
    container.classList.toggle('is-collapsed', !expanded);
    // Кастомное событие для аналитики/стилей
    const ev = new CustomEvent('benefits:toggle', { detail: { expanded } });
    container.dispatchEvent(ev);
  };

  // Инициализация: скрываем extras, если не скрыты
  if (extras.length) {
    extras.forEach((el) => { if (el.hidden !== true) el.hidden = true; });
    container.classList.add('is-collapsed');
  }

  // Начальное состояние aria-expanded
  if (!button.hasAttribute('aria-expanded')) {
    button.setAttribute('aria-expanded', 'false');
  }

  button.addEventListener('click', (e) => {
    e.preventDefault();
    const expanded = button.getAttribute('aria-expanded') === 'true';
    update(!expanded);
  }, { passive: false });
})();
