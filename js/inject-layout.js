/*!
 * inject-layout.js — head injection + body partials
 * Единая версия
 */
(() => {
  if (window.__layoutInjected) return;
  window.__layoutInjected = true;

  const currentScript = document.currentScript;
  const HEAD_PARTIAL = currentScript?.getAttribute('data-head') || '/partials/head.html';

  /* === Утилиты === */
  const toAbs = (u) => {
    try {
      return new URL(u, location.href).href;
    } catch {
      return u;
    }
  };

  const byKey = {
    meta(el) {
      const name = el.getAttribute('name');
      const prop = el.getAttribute('property');
      const itemprop = el.getAttribute('itemprop');
      return name ? `name:${name}` : prop ? `prop:${prop}` : itemprop ? `itemprop:${itemprop}` : null;
    },
    link(el) {
      const rel = (el.getAttribute('rel') || '').trim().toLowerCase();
      const href = toAbs(el.getAttribute('href') || '');
      return rel && href ? `${rel}|${href}` : null;
    },
    scriptJson(el) {
      const txt = (el.textContent || '').trim();
      try {
        const obj = JSON.parse(txt);
        if (obj?.['@id']) return `jsonld:${obj['@id']}`;
      } catch {}
      let hash = 0;
      for (let i = 0; i < txt.length; i++) hash = (hash * 31 + txt.charCodeAt(i)) | 0;
      return `jsonld#${hash}`;
    }
  };

  /* === Кэш для партиалов === */
  const cache = new Map();

  async function fetchPartial(url) {
    if (cache.has(url)) {
      return cache.get(url);
    }

    try {
      const res = await fetch(url, { cache: 'no-store' });

      if (!res.ok) {
        console.warn(`[inject-layout] ${res.status}: ${url}`);
        return '';
      }

      const html = await res.text();
      cache.set(url, html);
      return html;
    } catch (err) {
      console.warn(`[inject-layout] Ошибка: ${url}`, err);
      return '';
    }
  }

  /* === Head Injection === */
  async function injectHead() {
    try {
      const html = await fetchPartial(HEAD_PARTIAL);
      if (!html) return;

      const existing = {
        title: !!document.head.querySelector('title'),
        meta: new Set([...document.head.querySelectorAll('meta')].map(byKey.meta).filter(Boolean)),
        link: new Set([...document.head.querySelectorAll('link')].map(byKey.link).filter(Boolean)),
        jsonld: new Set(
          [...document.head.querySelectorAll('script[type="application/ld+json"]')]
            .map(byKey.scriptJson)
            .filter(Boolean)
        )
      };

      const tpl = document.createElement('template');
      tpl.innerHTML = html;

      [...tpl.content.children].forEach((n) => {
        const tag = n.tagName?.toLowerCase();
        let skip = false;

        if (tag === 'title' && existing.title) skip = true;
        if (tag === 'meta') {
          const k = byKey.meta(n);
          if (k && existing.meta.has(k)) skip = true;
        }
        if (tag === 'link') {
          const k = byKey.link(n);
          if (k && existing.link.has(k)) skip = true;
        }
        if (tag === 'script' && n.type === 'application/ld+json') {
          const k = byKey.scriptJson(n);
          if (k && existing.jsonld.has(k)) skip = true;
        }

        if (!skip) document.head.appendChild(n.cloneNode(true));
      });

      document.dispatchEvent(new Event('head:ready'));
    } catch (e) {
      console.warn('[inject-layout] head failed:', e);
    }
  }

  /* === Body Partials === */
  async function loadBodyPartials() {
    const elements = document.querySelectorAll('[data-include]:not([data-loaded="1"])');

    if (!elements.length) return;

    // Параллельная загрузка
    const tasks = [...elements].map(async (el) => {
      const url = el.dataset.include;
      const html = await fetchPartial(url);
      return { el, html, url };
    });

    const results = await Promise.all(tasks);

    // Batch-вставка
    results.forEach(({ el, html, url }) => {
      if (!html) return;

      el.dataset.loaded = '1';

      const tpl = document.createElement('template');
      tpl.innerHTML = html.trim();

      // Активация скриптов
      tpl.content.querySelectorAll('script').forEach((old) => {
        const s = document.createElement('script');
        [...old.attributes].forEach((a) => s.setAttribute(a.name, a.value));
        s.textContent = old.textContent;
        old.replaceWith(s);
      });

      el.replaceWith(tpl.content);
    });

    document.dispatchEvent(new Event('layout:ready'));
  }

  /* === Публичный API (для совместимости с design.js) === */
  window.injectLayout = {
    cache,
    fetchPartial,
    mountIncludes: loadBodyPartials
  };

  /* === Init === */
  async function init() {
    await injectHead();
    await loadBodyPartials();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();