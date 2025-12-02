// chat.js — UI-логика чата: хранение, отправка, скролл, back → главная с учётом языка.

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // --- язык/ссылки -----------------------------------------------------------
  function getLang() {
    try {
      const raw = (localStorage.getItem('lang') || document.documentElement.lang || (navigator.language || 'ru')).toLowerCase();
      return raw.startsWith('ru') ? 'ru' : 'en';
    } catch { return 'ru'; }
  }
  function setBackHref() {
    const a = $('#back-home');
    if (!a) return;
    const lang = getLang();
    const u = new URL('/', location.origin);
    if (lang !== 'ru') u.searchParams.set('lang', lang);
    a.href = u.pathname + (u.search ? '?' + u.searchParams.toString() : '');
  }

  // --- модель/хранилище ------------------------------------------------------
  const STORAGE_KEY = 'chat-thread-v1';
  function loadThread() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  }
  function saveThread(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-200))); } catch {}
  }

  // --- рендер ---------------------------------------------------------------
  const threadEl = $('.chat-thread');
  const typingEl = $('.typing');
  const form = $('#chat-form');
  const input = $('#chat-message');
  const scrollDownBtn = $('.scroll-down');

  function timeNow() {
    const d = new Date();
    return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  }

  function msgHTML(m) {
    const li = document.createElement('li');
    li.className = 'msg ' + (m.role === 'user' ? 'msg--user' : 'msg--bot');
    li.innerHTML = `
      <div class="msg__text">${escapeHTML(m.text)}</div>
      <small class="msg__meta">${m.time || timeNow()}</small>
    `;
    return li;
  }

  function render(list, {scroll=true} = {}) {
    threadEl.innerHTML = '';
    list.forEach(m => threadEl.appendChild(msgHTML(m)));
    if (scroll) scrollToBottom();
  }

  function escapeHTML(s){
    return (s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function scrollToBottom(){
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  function showTyping(show){
    if (!typingEl) return;
    typingEl.hidden = !show;
  }

  // Показывать кнопку «вниз», если не внизу
  function toggleScrollDown(){
    const nearBottom = (threadEl.scrollHeight - threadEl.clientHeight - threadEl.scrollTop) < 64;
    scrollDownBtn.hidden = nearBottom;
  }

  // --- инициализация ---------------------------------------------------------
  function ensureGreeting(list){
    if (list.length) return list;
    const lang = getLang();
    const textRU = 'Привет! Я здесь, чтобы помочь по вашему ремонту. Напишите вопрос.';
    const textEN = 'Hi! I’m here to help with your renovation. Type your question.';
    return [{ role:'bot', text: lang === 'ru' ? textRU : textEN, time: timeNow() }];
  }

  let thread = ensureGreeting(loadThread());
  render(thread);
  setBackHref();
  toggleScrollDown();

  // --- события ---------------------------------------------------------------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (input.value || '').trim();
    if (!text) return;
    // добавляем сообщение пользователя
    const user = { role:'user', text, time: timeNow() };
    thread.push(user);
    saveThread(thread);
    threadEl.appendChild(msgHTML(user));
    input.value = '';
    scrollToBottom();
    toggleScrollDown();

    // имитация ответа + индикатор набора
    showTyping(true);
    setTimeout(() => {
      const replyTextRU = 'Спасибо! Мы ответим на ваш вопрос в ближайшее время.';
      const replyTextEN = 'Thanks! We will reply shortly.';
      const bot = { role:'bot', text: getLang()==='ru' ? replyTextRU : replyTextEN, time: timeNow() };
      thread.push(bot);
      saveThread(thread);
      threadEl.appendChild(msgHTML(bot));
      showTyping(false);
      scrollToBottom();
      toggleScrollDown();
    }, 700);
  });

  // Enter = отправка, Shift+Enter = перенос
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  threadEl.addEventListener('scroll', toggleScrollDown);
  scrollDownBtn.addEventListener('click', () => { scrollToBottom(); toggleScrollDown(); });

  // Хук после подмешивания <head> (если нужно локализовать placeholder через твою language.js)
  document.addEventListener('head:ready', () => { setBackHref(); });

})();
