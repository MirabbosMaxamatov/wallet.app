(() => {
  'use strict';

  window.APP_UPDATES = [
    {
      version: "v6.5.0",
      date: "17.09.2026",
      title: "Category State Leakage Fix & Dynamic Dropdowns",
      changes: [
        "Kategoriya state leakage to'g'rilandi: Fundraising va Personal rejimlar o'rtasida kategoriya o'tishi oldini olindi",
        "updateCategoryDropdown() funksiyasi qo'shildi: rejim o'zgarganda va target turi o'zgarganda avtomatik chaqiriladi",
        "Fundraising 'Shaxsiy' turida kategoriya avtomatik 'Umumiy' ga o'rnatiladi va disabled qilinadi",
        "Personal Byudjet kategoriyalari yangilandi: Oziq-ovqat, Transport, Kommunal, Ko'ngilochar, Boshqa",
        "Til resurslariga entertainment kaliti qo'shildi (UZ: Ko'ngilochar, RU: Развлечения, EN: Entertainment)",
        "Script versiyalari v=6.5.0 ga oshirildi"
      ]
    },
    {
      version: "v6.4.0",
      date: "17.09.2026",
      title: "Top Bar Format Fix & Dynamic Category Types",
      changes: [
        "Yuqori baner formati to'g'rilandi: `MAQSAD: REMONT (235,000.00 so'm)` ko'rinishida",
        "Pul Yig'ish rejimida 'Yig'ish turi' tanlovi qo'shildi: Shaxsiy / Oila / Guruh",
        "Dinamik kategoriya tizimi: Shaxsiy -> standart kategoriyalar; Oila -> Ota, Ona, Aka, Uka, Opa, Singil, Boshqa; Guruh -> Erkak, Ayol",
        "Onboarding modalida va tranzaksiya formida kategoriya avtomatik yangilanadi",
        "Til resurslariga yangi kalitlar qo'shildi: targetGroupType, personal, family, group, father, mother, olderBrother, youngerBrother, olderSister, youngerSister, male, female"
      ]
    },
    {
      version: "v6.2.0",
      date: "17.09.2026",
      title: "Mode-Isolated Archives, Dynamic Header & Split Calculator",
      changes: [
        "Arxiv ma'lumotlari rejimga (Shaxsiy Byudjet / Pul Yig'ish) qarab to'liq izolyatsiya qilindi",
        "Yuqori baner dinamik: Shaxsiy rejimda 'BOSHLANG'ICH PUL', Pul Yig'ish rejimida 'MAQSAD (NOTE): [Title] | [Target]'",
        "Pul Yig'ish rejimiga 'Teng Bo'lish Kalkulyatori' vidgeti qo'shildi: odamlar soni kiritilganda har bir kishidan qancha to'lash kerakligi hisoblanadi",
        "Kalkulyator natijasini bosganda 'Summa' maydoniga avtomatik kiritiladi",
        "Til resurslariga yangi kalitlar qo'shildi: perPerson, enterPeopleCount"
      ]
    },
    {
      version: "v6.0.0",
      date: "17.09.2026",
      title: "Dual-Mode (Pul Yig'ish) va Sanalar bo'yicha Guruhlash Yangilanishi",
      changes: [
        "Yangi 'Pul Yig'ish' (Fundraising) rejimi qo'shildi: Shaxsiy byudjetdan to'liq ajratilgan alohida xotira (State)",
        "Pul yig'ish rejimida maqsad (Note) va kerakli summa kiritish uchun maxsus boshlang'ich modal biriktirildi",
        "Pul berganlar ro'yxati avtomatik raqamlanadi (1. Jasur, 2. Axmedov) va eng oxirgi bergan kishi doimo eng tepada turadi",
        "Pul yig'ish rejimida maxsus kategoriyalar (Erkak / Ayol) va vizual Maqsad ko'rsatgichi qo'shildi",
        "Tranzaksiyalar tarixi endi kunlar bo'yicha guruhlanib, eng yangi sanalar tepada ko'rsatiladi",
        "Arxivlash va Reset qilinganda avtomatik yangi balans yoki maqsad kiritish darchasi ochiladi",
        "Android va iOS Safari uchun PWA 'Bosh ekranga qo'shish' tugmalari va yo'riqnomasi to'liq sozlandi"
      ]
    },
    {
      version: "v5.8.0",
      date: "17.09.2026",
      title: "Tizimning Katta Yangilanishi",
      changes: [
        "Tranzaksiyalar tarixi endi kunlar bo'yicha guruhlanib ko'rsatiladi",
        "Eng oxirgi kiritilgan tranzaksiyalar va arxivlar doimo eng tepada turadi",
        "Talabalar va guruhlar uchun 'Pul Yig'ish' (Fundraising) rejimi qo'shildi",
        "Arxivlangan davrlarga hisoblangan yakuniy Qoldiq ko'rsatkichi qo'shildi",
        "Android va iOS Safari uchun PWA 'Bosh ekranga qo'shish' funksiyasi to'liq sozlandi",
        "Arxivlash va Reset qilinganda avtomatik yangi balans kiritish oynasi ochilishi yo'lga qo'yildi"
      ]
    },
    {
      version: "v5.7.0",
      date: "16.09.2026",
      title: "O'rnatish (Install) tugmasi to'liq ishga tushirildi",
      changes: [
        "Android uchun beforeinstallprompt orqali avtomatik o'rnatish yuritib boradi",
        "iOS Safari uchun qo'llanma bottom-sheet modali qo'shildi",
        "Qulflash summa chiplari (+10k, +50k, +100k, +500k) qo'shildi"
      ]
    },
    {
      version: "v5.6.0",
      date: "15.09.2026",
      title: "Arxivlash va Reset hayot sikli",
      changes: [
        "Arxivlashda barcha tranzaksiyalar va boshlang'ich pul saqlab olinadi",
        "Arxivlashdan so'ng avtomatik yangi balans kiritish oynasi ochiladi",
        "Tozalash (Reset) qilinganda boshlang'ich balans kiritish oynasi ochiladi"
      ]
    },
    {
      version: "v5.5.0",
      date: "14.09.2026",
      title: "O'rnatish (Install PWA) funksiyasi",
      changes: [
        "beforeinstallprompt global ushlab olinadi",
        "window.installPWA() orqali Android uchun native o'rnatish chaqiriladi",
        "iOS Safari uchun ogohlantiruv alerti ko'rsatildi"
      ]
    },
    {
      version: "v5.3.0",
      date: "13.09.2026",
      title: "I18n (Ko'p tillik) tizimi",
      changes: [
        "Uzbek, Rus va Ingliz tillarini qo'llab-quvvatlash",
        "Til tanlash oynasi (Language Selector) qo'shildi"
      ]
    },
    {
      version: "v1.2.1",
      date: "10.09.2026",
      title: "Boshlang'ich versiya",
      changes: [
        "Tranzaksiya qo'shish, tahrirish, o'chirish",
        "Boshlang'ich pul va qoldiq hisobi",
        "Arxivlash (Archive) va ma'lumotlarni tozalash (Reset)",
        "PIN-kod himoyasi"
      ]
    }
  ];

  // Expose a simple helper to render the changelog in the UI
  window.renderUpdates = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = '';
    for (const update of window.APP_UPDATES) {
      html += '<div class="mb-4 pb-4 border-b border-slate-700/50 last:border-0 last:pb-0 last:mb-0">';
      html += '<div class="flex items-center justify-between mb-1">';
      html += '<span class="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">' + update.version + '</span>';
      html += '<span class="text-[10px] text-slate-500">' + update.date + '</span>';
      html += '</div>';
      html += '<h4 class="text-sm font-semibold text-slate-200 mb-1.5">' + update.title + '</h4>';
      html += '<ul class="list-disc list-inside space-y-1 text-xs text-slate-400">';
      for (const change of update.changes) {
        html += '<li class="leading-relaxed">' + change + '</li>';
      }
      html += '</ul>';
      html += '</div>';
    }
    container.innerHTML = html;
  };
})();