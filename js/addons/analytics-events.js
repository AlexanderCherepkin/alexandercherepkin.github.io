/**
 * Мини-аналитика: события на CTA, карте и формах.
 * Работает с уже подключёнными скриптами GA4 (gtag) и Я.Метрики (ym).
 * Мягко деградирует, если счётчики отсутствуют.
 */
(function () {
  'use strict';

  // --------- УТИЛЫ ---------
  function gaEvent(name, params = {}) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, params);
      } else if (Array.isArray(window.dataLayer)) {
        // Fallback: пушим событие в dataLayer
        window.dataLayer.push({ event: name, ...params });
      }
    } catch (e) { /* no-op */ }
  }

  function getMetrikaId() {
    // Пытаемся найти yaCounter<ID> в window (надежнее, чем гадать)
    try {
      for (const k in window) {
        if (Object.prototype.hasOwnProperty.call(window, k)) {
          const m = /^yaCounter(\d+)$/.exec(k);
          if (m && window[k]) return parseInt(m[1], 10);
        }
      }
    } catch (e) { /* no-op */ }
    return null;
  }

  function ymGoal(goal, params = {}) {
    try {
      if (typeof window.ym === 'function') {
        const id = getMetrikaId();
        if (id) window.ym(id, 'reachGoal', goal, params);
      }
    } catch (e) { /* no-op */ }
  }

  function track(name, params) {
    gaEvent(name, params);
    ymGoal(name, params);
  }

  // --------- ОБРАБОТЧИКИ ---------
  // CTA-кнопки
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (!el) return;

    const type = el.getAttribute('data-track');
    const label = el.getAttribute('data-label') || el.textContent.trim();
    switch (type) {
      case 'cta':
        track('cta_click', { label });
        break;
      case 'phone':
        track('phone_click', { label });
        break;
      case 'email':
        track('email_click', { label });
        break;
      case 'whatsapp':
        track('whatsapp_click', { label });
        break;
      case 'map_interaction':
        track('map_interaction', { label });
        break;
      case 'contact_form_submit':
        // submit поймаем ниже, но на всякий
        track('contact_form_submit_click', { label });
        break;
      default:
        break;
    }
  }, { passive: true });

  // Карта: клик по обёртке/iframe
  const mapWrap = document.querySelector('.map-embed');
  if (mapWrap) {
    mapWrap.addEventListener('pointerdown', () => track('map_interaction', { label: 'contacts_map' }), { passive: true });
  }

  // Форма контактов: submit
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', () => {
      track('contact_form_submit', { form_id: 'contact-form' });
    }, { passive: true });
  }

  // Тоггл преимуществ (слушаем кастомное событие из benefits-more.js)
  const benefits = document.querySelector('[data-benefits]');
  if (benefits) {
    benefits.addEventListener('benefits:toggle', (ev) => {
      track('benefits_toggle', { expanded: ev.detail?.expanded ? '1' : '0' });
    });
  }

  // --- Патч: реакция на успешную отправку формы (GA4 generate_lead + кастомное событие) ---
  document.addEventListener('form:sent', (ev) => {
    const formId = ev.detail?.form_id || 'form';
    // GA4 рекомендуемое событие
    gaEvent('generate_lead', { form_id: formId });
    // дублируем как кастомное
    track('contact_form_sent', { form_id: formId });
  }, { passive: true });
})();


// Chat scoped events (GA4 + YM via window.YM_ID)
window.chatTrack = function(eventName, params){
  try { if (typeof window.gtag === 'function') window.gtag('event', eventName, params || {}); } catch(e){}
  try { if (typeof window.ym === 'function' && window.YM_ID) window.ym(window.YM_ID, 'reachGoal', eventName, params || {}); } catch(e){}
};

// Семантические алиасы
['chat_open','chat_send','chat_receive','chat_quick_action_click','gallery_open','call_click','messenger_click']
  .forEach(function(ev){ window[ev] = function(p){ window.chatTrack(ev, p || {}); }; });

