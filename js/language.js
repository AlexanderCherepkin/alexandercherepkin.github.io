// language.js — ДОБАВИТЬ/ОБНОВИТЬ эти части
function t(key, dict) {
  // безопасный доступ по flat-ключу: section.sub.key
  return key?.split('.').reduce((o,k)=>o?.[k], dict) ?? key;
}

function applyI18nAttributes(root, dict) {
  const ATTR_MAP = {
    "data-i18n-placeholder": "placeholder",
    "data-i18n-title": "title",
    "data-i18n-aria-label": "aria-label",
    "data-i18n-aria-describedby": "aria-describedby",
    "data-i18n-alt": "alt"
  };

  // 1) Специальные data-i18n-* атрибуты
  Object.entries(ATTR_MAP).forEach(([dataAttr, realAttr]) => {
    root.querySelectorAll(`[${dataAttr}]`).forEach(el => {
      const key = el.getAttribute(dataAttr);
      const val = t(key, dict);
      if (val != null) el.setAttribute(realAttr, val);
    });
  });

  // 2) Универсальный мульти-синтаксис: data-i18n-attr="placeholder:form.email.placeholder,aria-label:form.email.aria"
  root.querySelectorAll("[data-i18n-attr]").forEach(el => {
    const pairs = el.getAttribute("data-i18n-attr").split(",").map(s=>s.trim());
    pairs.forEach(pair=>{
      const [attr, key] = pair.split(":").map(s=>s.trim());
      const val = t(key, dict);
      if (attr && val != null) el.setAttribute(attr, val);
    });
  });

  // 3) Текстовые узлы по data-i18n
  root.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const val = t(key, dict);
    if (val != null) el.textContent = val;
  });
}

// Вызываем при смене языка и после загрузки:
function applyTranslations(currentLang, dictionaries) {
  const dict = dictionaries[currentLang] || {};
  applyI18nAttributes(document, dict);
  // если есть динамически подгружаемые участки DOM — вызываем повторно на их корне
}

/* === Autotag i18n for placeholder / alt / aria-label === */
(function(){
  const mapPlaceholder = {
    "Иван":"placeholder.ivan",
    "+7 (___) ___-__-__":"placeholder.7______________",
    "+7":"placeholder.7",
    "Заклязьменский / Уварово / др.":"placeholder.zaklyazmenskii__uvarovo__dr_",
    "+7 (958) 510-68-18":"placeholder.7__958__510_68_18",
    "Удобное время, адрес, метраж…":"placeholder.udobnoe_vremya_adres_metrazh",
    "Например, 64":"placeholder.naprimer_64",
    "Владимир, Суздаль…":"placeholder.vladimir_suzdal",
    "Опишите задачу (опционально)":"placeholder.opishite_zadachu_opcionalno",
    "+7 XXX XXX-XX-XX":"placeholder.7_xxx_xxx_xx_xx",
    "Удобное время для звонка / адрес / задачи":"placeholder.udobnoe_vremya_dlya_zvonka__adres__zadachi",
    "Мария":"placeholder.mariya"
  };

  const mapAlt = {
    "Оценка 5 из 5":"alt.ocenka_5_iz_5",
    "Наверх":"alt.naverh",
    "Предыдущее":"alt.predyduschee",
    "Следующее":"alt.sleduyuschee",
    "Пагинация слайдов":"alt.paginaciya_slajdov",
    "Предыдущий слайд":"alt.predydushij_slajd",
    "Следующий слайд":"alt.sleduyushij_slajd",
    "Рассчитать ваш ремонт":"alt.rasschitat_vash_remont",
    "Оставить заявку":"alt.ostavit_zayavku",
    "Навигация возврата":"alt.navigaciya_vozvrata",
    "Вернуться на главную":"alt.vernutsya_na_glavnuyu",
    "Позвонить":"alt.pozvonit",
    "Как мы работаем":"alt.kak_my_rabotaem",
    "Кадры проекта":"alt.kadry_proekta",
    "Галерея изображений":"alt.galereya_izobrazhenij",
    "Стоимость":"alt.stoimost",
    "Описание и галерея":"alt.opisanie_i_galereya",
    "Ключевые показатели":"alt.klyuchevye_pokazateli",
    "Сшитые кадры проекта: пролистывайте слайды":"alt.sshitye_kadry_proekta_prolistyvajte_slajdy",
    "1 из 6":"alt.1_iz_6",
    "2 из 6":"alt.2_iz_6",
    "3 из 6":"alt.3_iz_6",
    "4 из 6":"alt.4_iz_6",
    "5 из 6":"alt.5_iz_6"
  };

  const mapAria = {
    "Закрыть":"aria.label.zakryt",
    "Оценка 5 из 5":"aria.label.ocenka_5_iz_5",
    "Наверх":"aria.label.naverh",
    "Предыдущее":"aria.label.predyduschee",
    "Следующее":"aria.label.sleduyuschee",
    "Пагинация слайдов":"aria.label.paginaciya_slajdov",
    "Предыдущий слайд":"aria.label.predydushij_slajd",
    "Следующий слайд":"aria.label.sleduyushij_slajd",
    "Рассчитать ваш ремонт":"aria.label.rasschitat_vash_remont",
    "Оставить заявку":"aria.label.ostavit_zayavku",
    "Навигация возврата":"aria.label.navigaciya_vozvrata",
    "Вернуться на главную":"aria.label.vernutsya_na_glavnuyu",
    "Позвонить":"aria.label.pozvonit",
    "Как мы работаем":"aria.label.kak_my_rabotaem",
    "Кадры проекта":"aria.label.kadry_proekta",
    "Галерея изображений":"aria.label.galereya_izobrazhenij",
    "Стоимость":"aria.label.stoimost",
    "Описание и галерея":"aria.label.opisanie_i_galereya",
    "Ключевые показатели":"aria.label.klyuchevye_pokazateli",
    "Сшитые кадры проекта: пролистывайте слайды":"aria.label.sshitye_kadry_proekta_prolistyvajte_slajdy",
    "1 из 6":"aria.label.1_iz_6",
    "2 из 6":"aria.label.2_iz_6",
    "3 из 6":"aria.label.3_iz_6",
    "4 из 6":"aria.label.4_iz_6",
    "5 из 6":"aria.label.5_iz_6"
  };

  window.autotagI18n = function(root = document){
    // placeholder
    root.querySelectorAll('[placeholder]:not([data-i18n-placeholder])').forEach(el=>{
      const v = (el.getAttribute('placeholder')||'').trim();
      if(mapPlaceholder[v]) el.setAttribute('data-i18n-placeholder', mapPlaceholder[v]);
    });
    // alt (пропускаем декоративные)
    root.querySelectorAll('img[alt]:not([data-i18n-alt])').forEach(el=>{
      const isDecor = el.getAttribute('alt') === '' || el.getAttribute('role')==='presentation' || el.getAttribute('aria-hidden')==='true';
      if(isDecor) return;
      const v = el.getAttribute('alt').trim();
      if(mapAlt[v]) el.setAttribute('data-i18n-alt', mapAlt[v]);
    });
    // aria-label
    root.querySelectorAll('[aria-label]:not([data-i18n-aria-label])').forEach(el=>{
      const v = (el.getAttribute('aria-label')||'').trim();
      if(mapAria[v]) el.setAttribute('data-i18n-aria-label', mapAria[v]);
    });
  };
})();

