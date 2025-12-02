// contacts.js
// Простая и надёжная отправка формы контактов с CSRF и i18n-статусами.
(function () {
  'use strict';
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = form.querySelector('.form-status');
  const submitBtn = form.querySelector('button[type="submit"]');
  const csrfInput = form.querySelector('input[name="csrf_seed"]');

  function t(key, fallback) {
    // очень простой i18n-геттер: ищет элемент с data-i18n-dict="key" и берёт текст, иначе fallback
    const dictNode = document.querySelector(`[data-i18n-dict="${key}"]`);
    return dictNode ? dictNode.textContent.trim() : (fallback || key);
  }

  function setCookie(name, value, hours) {
    const d = new Date();
    d.setTime(d.getTime() + (hours * 60 * 60 * 1000));
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; samesite=Lax; expires=${d.toUTCString()}`;
  }
  function getCookie(name) {
    return document.cookie.split(';').map(v => v.trim()).find(v => v.startsWith(name + '='))?.split('=')[1];
  }

  // CSRF: если куки нет — создаём
  (function ensureCsrf() {
    let seed = getCookie('csrf_seed');
    if (!seed) {
      seed = (Math.random().toString(36).slice(2) + Date.now().toString(36));
      setCookie('csrf_seed', seed, 2); // 2 часа
    }
    if (csrfInput) csrfInput.value = decodeURIComponent(seed);
  })();

  function setStatus(kind, text) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'form-status ' + kind;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
    }
    setStatus('sending', t('form.status.sending', 'Отправляем…'));

    try {
      const fd = new FormData(form);
      const res = await fetch('/mailer/send.php', {
        method: 'POST',
        body: fd,
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        const code = data.error || 'send_failed';
        let msg = t('form.status.error', 'Ошибка отправки. Попробуйте позже.');
        if (code === 'invalid_csrf') msg = t('form.status.csrf', 'Сессия истекла. Обновите страницу.');
        if (code === 'rate_limited_window' || code === 'rate_limited_day') msg = t('form.status.rate', 'Слишком часто. Попробуйте позже.');
        if (code === 'invalid_fields') msg = t('form.status.invalid', 'Проверьте поля формы.');
        setStatus('error', msg);
      } else {
        setStatus('success', t('form.status.success', 'Заявка отправлена! Мы свяжемся с вами.'));
        form.reset();
        // аналитика
        document.dispatchEvent(new CustomEvent('form:sent', { detail: { form_id: 'contact-form' } }));
      }
    } catch (err) {
      setStatus('error', t('form.status.error', 'Ошибка отправки. Попробуйте позже.'));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
      }
    }
  }, { passive: false });
})();
