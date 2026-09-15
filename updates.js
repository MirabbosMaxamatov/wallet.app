(() => {
  'use strict';

  const APP_VERSION = '1.2.0';
  const STORAGE_KEY = 'app_seen_version';

  const UPDATES = [
    "Tranzaksiya kartochkalari dizayni va sana sig'ishi to'g'rilandi",
    "Tavsif va Kategoriya iyerarxiyasi yaxshilandi",
    "Har safar kirganda Boshlang'ich pul so'rash xatosi bartaraf etildi",
    "Yangi updates.js bildirishnoma tizimi yo'lga qo'yildi"
  ];

  if (localStorage.getItem(STORAGE_KEY) === APP_VERSION) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background-color:rgba(15,23,42,0.8);backdrop-filter:blur(12px);';

  const card = document.createElement('div');
  card.style.cssText = 'background-color:#1e293b;border:1px solid #334155;border-radius:16px;padding:2rem;max-width:420px;width:100%;margin:0 1rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);text-align:center;';

  let html = '<h2 style="font-size:1.25rem;font-weight:700;color:#f1f5f9;margin-bottom:1rem;">&#128640; Yangilanishlar (v' + APP_VERSION + ')</h2>';
  html += '<ul style="text-align:left;list-style:disc;padding-left:1.5rem;margin-bottom:1.5rem;color:#94a3b8;font-size:0.875rem;line-height:1.75;">';
  for (const item of UPDATES) {
    html += '<li style="margin-bottom:0.5rem;">' + item + '</li>';
  }
  html += '</ul>';
  html += '<button type="button" id="updates-close-btn" style="width:100%;background-color:#10b981;color:#0f172a;font-weight:600;padding:0.75rem;border-radius:0.5rem;font-size:1rem;border:none;cursor:pointer;transition:all 200ms;">Yaxshi &#128073;</button>';

  card.innerHTML = html;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  document.getElementById('updates-close-btn').addEventListener('click', function () {
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      localStorage.setItem(STORAGE_KEY, APP_VERSION);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
  });
})();
