(() => {
  'use strict';

  const APP_VERSION = '1.2.1';
  const STORAGE_KEY = 'app_seen_version';

  // ==================== UPDATE DATA ====================
  /*
  =============================================================================
  📸 "AVVAL VA KEYIN" RASMLARINI YUKLASH BO'YICHA YO'RIQNOMA (INSTRUCTION)
  =============================================================================
  1. Rasmlaringizni loyihadagi `assets/` yoki `public/` papkasiga joylang.
     Masalan: `assets/before-1.jpg` va `assets/after-1.jpg`
  2. Pastdagi massivga (updates) obyekt qo'shayotganda rasmlar yo'lini kiriting:
     - `beforeImage`: "assets/before-1.jpg"  (Avvalgi holat rasmi)
     - `afterImage`: "assets/after-1.jpg"    (Yangi holat rasmi)
  3. Agar rasm bo'lmasa, `beforeImage` yoki `afterImage` kalitlarini bo'sh qoldiring (`""` yoki umuman yozmang).
  =============================================================================
  */
  const UPDATES = [
    {
      id: 1,
      title: 'Tranzaksiya kartochkalari ro\'yxat ko\'rinishiga o\'tkazildi',
      date: '15/09/2026',
      description: 'Mobil ekranda matnlar ustma-ust tushmasligi uchun kartochkalar 2 qatorli va ro\'yxat shakliga keltirildi.',
      beforeImage: 'assets/before-card.png',
      afterImage: 'assets/after-card.png'
    },
    {
      id: 2,
      title: 'Tavsif va Kategoriya iyerarxiyasi yaxshilandi',
      date: '15/09/2026',
      description: 'Tranzaksiya kartalarida endi tavsif birinchi o\'rinlda, kategoriya badge sifatida pastda ko\'rsatiladi.'
    },
    {
      id: 3,
      title: 'Boshlang\'ich pul so\'rash xatosi bartaraf etildi',
      date: '15/09/2026',
      description: 'Har safar kirganda boshlang\'ich pul so\'rash muntazam ishlashini ta\'minlovchi xatlar bartaraf etildi.'
    },
    {
      id: 4,
      title: 'Interfeys va dizayn yaxshilandi',
      date: '16/09/2026',
      description: 'interfeys va dizayn yaxshilandi. Yangi UI/UX tarmogi bilan ishlash osonlashdi. Foydalanuvchi tajribasi sezilarli darajada yaxshilandi.',
    }
  ];

  // ==================== RENDERER ====================
  function renderUpdates(updatesList) {
    const container = document.getElementById('updates-list');
    if (!container) return;

    if (!updatesList || updatesList.length === 0) {
      container.innerHTML = `<p class="text-center text-slate-400 py-4">Yangilanishlar mavjud emas</p>`;
      return;
    }

    container.innerHTML = updatesList.map(item => {
      const hasImages = item.beforeImage || item.afterImage;

      return `
        <div class="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 mb-4 shadow-md flex flex-col gap-3">
          <!-- Header: Title & Date -->
          <div class="flex items-center justify-between border-b border-slate-700/60 pb-2">
            <h3 class="text-base font-bold text-slate-100">${item.title}</h3>
            <span class="text-xs text-slate-400 font-mono">📅 ${item.date}</span>
          </div>

          <!-- Description -->
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
            ${item.description}
          </p>

          <!-- BEFORE & AFTER IMAGES SECTION -->
          ${hasImages ? `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              ${item.beforeImage ? `
                <div class="flex flex-col gap-1">
                  <span class="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    ❌ Avval (Before)
                  </span>
                  <div class="overflow-hidden rounded-lg border border-slate-700/70 bg-slate-900/60 p-1">
                    <img src="${item.beforeImage}" alt="Avvalgi holat" class="w-full h-auto object-cover rounded" loading="lazy">
                  </div>
                </div>
              ` : ''}

              ${item.afterImage ? `
                <div class="flex flex-col gap-1">
                  <span class="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    ✅ Keyin (After)
                  </span>
                  <div class="overflow-hidden rounded-lg border border-slate-700/70 bg-slate-900/60 p-1">
                    <img src="${item.afterImage}" alt="Yangi holat" class="w-full h-auto object-cover rounded" loading="lazy">
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // ==================== MODAL BOOTSTRAP ====================
  if (localStorage.getItem(STORAGE_KEY) === APP_VERSION) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background-color:rgba(15,23,42,0.8);backdrop-filter:blur(12px);';

  const card = document.createElement('div');
  card.style.cssText = 'background-color:#1e293b;border:1px solid #334155;border-radius:16px;padding:2rem;max-width:520px;width:100%;margin:0 1rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);text-align:center;max-height:90vh;overflow-y:auto;';

  let html = '<h2 style="font-size:1.25rem;font-weight:700;color:#f1f5f9;margin-bottom:1rem;">&#128640; Yangilanishlar (v' + APP_VERSION + ')</h2>';
  html += '<div id="updates-list" class="text-left"></div>';
  html += '<button type="button" id="updates-close-btn" style="width:100%;background-color:#10b981;color:#0f172a;font-weight:600;padding:0.75rem;border-radius:0.5rem;font-size:1rem;border:none;cursor:pointer;transition:all 200ms;position:sticky;bottom:0;margin-top:1rem;">Yaxshi &#128073;</button>';

  card.innerHTML = html;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Render the structured update cards into the list container
  renderUpdates(UPDATES);

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