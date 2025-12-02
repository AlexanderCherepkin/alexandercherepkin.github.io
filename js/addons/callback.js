
/**
 * Callback form ++ (проверенная версия)
 * - Маска/нормализация телефона под +7 (XXX) XXX-XX-XX
 * - Отправка на бэкенд (form-data | JSON)
 * - Toast-уведомления (успех/ошибка)
 * - Поддержка массивных полей (checkbox[])
 * - Таймаут/отмена, защита от двойной отправки, honeypot
 */
(() => {
  'use strict';

  const form = document.getElementById('callbackForm');
  if (!form) return;

  /* ====== CONFIG ====== */
  const BACKEND_ENDPOINT = '/api/callback';   // <— ЗАМЕНИ на свой путь
  const SEND_AS = 'formdata';                 // 'formdata' | 'json'
  const REQUEST_TIMEOUT_MS = 15000;

  /* ====== TOAST helpers (ожидают CSS из предыдущей версии) ====== */
  function getStack() {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }
  function toast(msg, type = 'ok', timeout = 4000) {
    const stack = getStack();
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `
      <span>${msg}</span>
      <span style="display:inline-flex;gap:.6rem;align-items:center">
        <i class="toast__icon" aria-hidden="true"></i>
        <button class="toast__close" aria-label="Закрыть">✕</button>
      </span>
    `;
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 180); };
    el.querySelector('.toast__close')?.addEventListener('click', close);
    if (timeout) setTimeout(close, timeout);
    return el;
  }

  /* ====== PHONE MASK (RU +7) ====== */
  const phoneInput = form.querySelector('input[name="phone"]');

  const digitsOnly = (s) => String(s || '').replace(/\D+/g, '');

  function formatRuPhone(input) {
    const raw = String(input || '').trim();
    const d = digitsOnly(raw);

    // Если пользователь явно вводит другой интернациональный формат
    if (raw.startsWith('+') && !(d.startsWith('7') || d.startsWith('8') || d.length === 10)) {
      return '+' + d; // не навязываем российскую маску
    }

    // Нормализация к 11 цифрам, префикс 7
    let num = d;
    if (d.length === 10) num = '7' + d;            // 9xx... без кода страны
    if (d.length === 11 && d[0] === '8') num = '7' + d.slice(1);

    if (!num) return '';
    if (num[0] !== '7') return '+' + d;            // не РФ — отдадим digits с плюсом

    // +7 (XXX) XXX-XX-XX
    const p1 = num.slice(1, 4);
    const p2 = num.slice(4, 7);
    const p3 = num.slice(7, 9);
    const p4 = num.slice(9, 11);
    let out = '+7';
    if (p1) out += ' (' + p1;
    if (p1 && p1.length === 3) out += ')';
    if (p2) out += ' ' + p2;
    if (p3) out += '-' + p3;
    if (p4) out += '-' + p4;
    return out;
  }

  function normalizeToE164(value) {
    const d = digitsOnly(value);
    if (!d) return '';
    let num = d;
    if (d.length === 10) num = '7' + d;
    if (d.length === 11 && d[0] === '8') num = '7' + d.slice(1);
    if (num.length === 11 && num[0] === '7') return '+' + num;
    return '+' + d; // fallback для иных стран
  }

  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      const prev = phoneInput.value;
      phoneInput.value = formatRuPhone(prev);
      // проста эвристика: каретку ставим в конец (достаточно для большинства случаев)
      try { phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length); } catch {}
    });
    phoneInput.addEventListener('blur', () => {
      phoneInput.value = formatRuPhone(phoneInput.value);
    });
    phoneInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      phoneInput.value = formatRuPhone(text);
    });
  }

  /* ====== FORM COLLECTOR ====== */
  function collectFormData(f) {
    const fd = new FormData(f);
    const data = {};
    for (const [key, value] of fd.entries()) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const prev = data[key];
        data[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
      } else {
        data[key] = value;
      }
    }
    // trim базовых строк
    ['name', 'comment'].forEach((k) => { if (data[k] != null) data[k] = String(data[k]).trim(); });

    // телефон: красивый и «технический»
    const pretty = phoneInput ? phoneInput.value : String(data.phone || '');
    const e164 = normalizeToE164(pretty);
    data.phone = pretty;
    data.phone_e164 = e164;

    // для form-data обязательно положим обновлённые значения
    fd.set('phone', pretty);
    fd.set('phone_e164', e164);

    return { fd, data };
  }

  function setSubmitting(state) {
    const btn = form.querySelector('[type="submit"]');
    if (btn) {
      btn.disabled = state;
      btn.setAttribute('aria-disabled', String(state));
    }
    form.setAttribute('aria-busy', String(state));
  }

  // Honeypot (если добавите <input type="text" name="website" hidden>)
  function isSpam(f) {
    const hp = f.querySelector('[name="website"]');
    return hp && String(hp.value || '').trim().length > 0;
  }

  let isSubmitting = false;

  /* ====== SUBMIT ====== */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (isSpam(form)) return; // тихо игнорируем ботов
    if (!form.reportValidity()) return;

    isSubmitting = true;
    setSubmitting(true);
    const submitBtn = form.querySelector('[type="submit"]');

    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const { fd, data } = collectFormData(form);

      // Доп. атрибуты для сервера
      fd.append('_source', 'callbackForm');
      fd.append('_timestamp', new Date().toISOString());

      let ok = true;
      let errorText = '';

      if (BACKEND_ENDPOINT) {
        let res;
        if (SEND_AS === 'json') {
          res = await fetch(BACKEND_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: controller.signal,
          });
        } else {
          res = await fetch(BACKEND_ENDPOINT, {
            method: 'POST',
            body: fd,
            signal: controller.signal,
          });
        }
        ok = res.ok;

        if (!ok) {
          // пробуем вытащить текст/JSON ошибки
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const j = await res.json().catch(() => ({}));
            errorText = j?.message || j?.error || `HTTP ${res.status}`;
          } else {
            errorText = (await res.text().catch(() => '')) || `HTTP ${res.status}`;
          }
          throw new Error(errorText);
        }
      }

      // UI
      toast('Заявка отправлена. Мы свяжемся с вами в ближайшее время.', 'ok');
      const note = form.querySelector('.js-callback-note');
      if (note) {
        const gift = Array.isArray(data['gift']) ? data['gift'].join(', ') : (data['gift'] || '—');
        const discount = Array.isArray(data['discount']) ? data['discount'].join(', ') : (data['discount'] || '—');
        note.hidden = false;
        note.setAttribute('role', 'status');
        note.textContent = `Отправлено: ${data.name || '—'}, ${data.phone || '—'}. Подарок: ${gift}. Скидка: ${discount}.`;
      }

      form.reset();
      if (phoneInput) phoneInput.value = '';

      // событие для аналитики/интеграций
      document.dispatchEvent(new CustomEvent('callback:success', { detail: { data } }));
    } catch (err) {
      const msg = (err && err.message) ? err.message : 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.';
      console.error('Callback submit error:', err);
      toast(msg, 'err', 6000);
      document.dispatchEvent(new CustomEvent('callback:error', { detail: { error: String(msg) } }));
    } finally {
      clearTimeout(tId);
      setSubmitting(false);
      isSubmitting = false;
      // вернуть фокус на кнопку — удобно с клавиатуры
      submitBtn?.focus?.();
    }
  });
})();

