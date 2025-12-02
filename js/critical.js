// Только критичные функции до первого рендера
const domReady = (fn) =>
  (document.readyState !== "loading")
    ? fn()
    : document.addEventListener("DOMContentLoaded", fn, { once: true });

domReady(() => {
  document.documentElement.classList.remove("no-js");
  document.querySelectorAll(".js-year").forEach(n => n.textContent = String(new Date().getFullYear()));
});

// Утилиты
const $ = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));
window.$ = $; 
window.$$ = $$;