// subscribe.js — ДОБАВИТЬ и подключить
const FORMSPREE_ID = "YOUR_FORMSPREE_ID"; // заменить на ваш ID (формат f/xxxxx)
const form = document.getElementById("subscribe-form");
const email = document.getElementById("subscribe-email");
const hint = document.getElementById("subscribe-hint");

function i18n(key, fallback){ try { return t(key, window.i18nDict?.[window.currentLang]) || fallback; } catch { return fallback; } }

form?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  hint.textContent = "";
  if (!email.checkValidity()) {
    hint.textContent = i18n("subscribe.errorInvalid","Введите корректный email.");
    email.focus(); return;
  }
  // honeypot
  const hp = form.querySelector('input[name="company"]');
  if (hp?.value) return;

  if (!FORMSPREE_ID) {
    // фолбэк без сервера
    window.location.href = `mailto:info@profremont.example?subject=Subscribe&body=${encodeURIComponent(email.value)}`;
    return;
  }

  try{
    const res = await fetch(`https://formspree.io/${FORMSPREE_ID}`,{
      method:"POST",
      headers:{ "Accept":"application/json", "Content-Type":"application/json" },
      body: JSON.stringify({ email: email.value })
    });
    if (res.ok){
      hint.textContent = i18n("subscribe.success","Спасибо! Подтвердите подписку в почте.");
      form.reset();
    } else {
      hint.textContent = i18n("subscribe.errorServer","Сервер отклонил запрос. Попробуйте позже.");
    }
  } catch {
    hint.textContent = i18n("subscribe.errorNetwork","Сеть недоступна. Попробуйте позже.");
  }
});
