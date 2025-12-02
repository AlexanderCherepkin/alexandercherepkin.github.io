/* ---------------------------------------
   ПрофРемонт — Service Worker (clean)
   Назначение:
   - Прекаш chat-страницы (локальный офлайн для чата)
   - Навигация: network-first с фоллбеком на index.html
   - Активы (css/js/img/font/manifest) — напрямую из сети
--------------------------------------- */

const VERSION = '2025-11-10-2';
const CHAT_CACHE = `chat-v2-${VERSION}`;
const APP_SHELL_CACHE = `app-shell-v1-${VERSION}`;

const CHAT_ASSETS = [
  '/pages/chat.html',
  '/directions/css/chat.css',
  '/directions/js/chat.js'
];

const APP_SHELL = [
  '/index.html'
];

/* install */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    try {
      const chat = await caches.open(CHAT_CACHE);
      await chat.addAll(CHAT_ASSETS);

      const shell = await caches.open(APP_SHELL_CACHE);
      await shell.addAll(APP_SHELL);
    } catch (e) { /* silent */ }
  })());
});

/* activate */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keep = new Set([CHAT_CACHE, APP_SHELL_CACHE]);
      const keys = await caches.keys();
      await Promise.all(keys.map(k => keep.has(k) ? Promise.resolve(true) : caches.delete(k)));
    } catch (e) { /* silent */ }
    await self.clients.claim();
  })());
});

/* fetch */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Активы всегда напрямую из сети (не кешируем и не подменяем)
  const pass = ['style', 'script', 'image', 'font', 'manifest'];
  if (pass.includes(req.destination)) {
    event.respondWith(fetch(req));
    return;
  }

  // Chat: cache-first с тихим обновлением
  if (
    sameOrigin &&
    (url.pathname === '/pages/chat.html' ||
     url.pathname === '/directions/css/chat.css' ||
     url.pathname === '/directions/js/chat.js')
  ) {
    event.respondWith((async () => {
      const cache = await caches.open(CHAT_CACHE);
      const cached = await cache.match(req);
      if (cached) {
        fetch(req, { cache: 'no-store' }).then(res => {
          if (res && res.ok) cache.put(req, res.clone());
        }).catch(()=>{});
        return cached;
      }
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.ok) await cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // Документы/навигация: network-first → fallback на index.html
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch (e) {
        const shell = await caches.open(APP_SHELL_CACHE);
        const offline = await shell.match('/index.html');
        return offline || new Response('<h1>Offline</h1>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    })());
    return;
  }

  // Остальное — сквозь сеть
});
