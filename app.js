(() => {
  'use strict';

  // ==================== MODE STATE (must be first) ====================
  let currentMode = localStorage.getItem('app_mode') || 'smart';

  // ==================== DATA LAYER ====================
  let startingBalance = parseFloat(localStorage.getItem('starting_balance'));
  if (!Number.isFinite(startingBalance)) startingBalance = 0;

  // --- Fundraising isolated storage keys ---
  const FUNDRAISING_KEYS = {
    target: 'fundraising_target',
    transactions: 'fundraising_transactions',
    title: 'fundraising_title',
    archivedPeriods: 'fundraising_archived_periods'
  };

  function getStorageKey(key) {
    if (currentMode === 'fundraising' && FUNDRAISING_KEYS[key]) {
      return FUNDRAISING_KEYS[key];
    }
    return key;
  }

  function getFundraisingTarget() {
    try { return parseFloat(localStorage.getItem(FUNDRAISING_KEYS.target)) || 0; }
    catch { return 0; }
  }
  function setFundraisingTarget(val) {
    localStorage.setItem(FUNDRAISING_KEYS.target, val.toString());
  }
  function getFundraisingTransactions() {
    try { return JSON.parse(localStorage.getItem(FUNDRAISING_KEYS.transactions)) || []; }
    catch { return []; }
  }
  function setFundraisingTransactions(txns) {
    localStorage.setItem(FUNDRAISING_KEYS.transactions, JSON.stringify(txns));
  }
  function getFundraisingTitle() {
    try { return localStorage.getItem(FUNDRAISING_KEYS.title) || ''; }
    catch { return ''; }
  }
  function setFundraisingTitle(val) {
    localStorage.setItem(FUNDRAISING_KEYS.title, val);
  }

  function getTransactions() {
    const isFundraising = currentMode === 'fundraising';
    if (isFundraising) return getFundraisingTransactions();
    try { return JSON.parse(localStorage.getItem('transactions')) || []; }
    catch { return []; }
  }
  function setTransactions(txns) {
    const isFundraising = currentMode === 'fundraising';
    if (isFundraising) return setFundraisingTransactions(txns);
    localStorage.setItem('transactions', JSON.stringify(txns));
  }
  function getArchivedPeriods() {
    const key = getStorageKey('archivedPeriods');
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }
  function setArchivedPeriods(periods) {
    const key = getStorageKey('archivedPeriods');
    localStorage.setItem(key, JSON.stringify(periods));
  }

  // ==================== CALCULATIONS ====================
  function calculateTotals() {
    const isFundraising = currentMode === 'fundraising';
    
    if (isFundraising) {
      const target = getFundraisingTarget();
      const txns = getFundraisingTransactions();
      let totalIncome = 0;
      let totalExpenses = 0;
      for (const t of txns) {
        const amt = Number.isFinite(t.amount) ? t.amount : 0;
        if (t.type === 'income') totalIncome += amt;
        else if (t.type === 'expense') totalExpenses += amt;
      }
      if (!Number.isFinite(totalIncome)) totalIncome = 0;
      if (!Number.isFinite(totalExpenses)) totalExpenses = 0;
      const currentBalance = totalIncome - totalExpenses;
      return { startingBalance: target, totalIncome, totalExpenses, currentBalance };
    }

    const txns = getTransactions();
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const t of txns) {
      const amt = Number.isFinite(t.amount) ? t.amount : 0;
      if (t.type === 'income') totalIncome += amt;
      else if (t.type === 'expense') totalExpenses += amt;
    }
    if (!Number.isFinite(totalIncome)) totalIncome = 0;
    if (!Number.isFinite(totalExpenses)) totalExpenses = 0;
    let currentBalance = startingBalance + totalIncome - totalExpenses;
    if (!Number.isFinite(currentBalance)) currentBalance = startingBalance;
    return { startingBalance, totalIncome, totalExpenses, currentBalance };
  }

  // ==================== FORMATTING ====================
  function formatCurrency(value) {
    const num = Number.isFinite(value) ? Math.abs(value) : 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " so'm";
  }
  function formatAmountPreview(value) {
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num === 0) return '';
    const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return '👉 ' + formatted + " so'm";
  }
  function updateAmountPreview(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const previewId = inputId + '-preview';
    const preview = document.getElementById(previewId);
    if (!preview) return;
    preview.textContent = formatAmountPreview(input.value);
  }
  function appendZeros(inputId, zeros) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const factor = zeros.length === 3 ? 1000 : 1000000;
    const current = parseFloat(input.value);
    const base = Number.isFinite(current) && current > 0 ? current : 1;
    input.value = (base * factor).toString();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    updateAmountPreview(inputId);
  }
  function clearAmountInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    updateAmountPreview(inputId);
  }
  function quickAmount(inputId, value) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const current = parseFloat(input.value);
    const base = Number.isFinite(current) && current > 0 ? current : 0;
    input.value = (base + value).toString();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    updateAmountPreview(inputId);
  }
  function formatSignedAmount(value) {
    const sign = value >= 0 ? '+' : '-';
    return sign + formatCurrency(value);
  }
  function getCategoryLabel(value) {
    const labels = { Food: "Oziq-ovqat", Transport: 'Transport', Salary: 'Maosh', Shopping: 'Xarid', Utilities: 'Kommunal', Other: 'Boshqa' };
    return labels[value] || value;
  }
  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function formatDateToUZ(dateString) {
    if (!dateString) return '';

    // If date is already in DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return dateString;

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString; // Fallback if invalid date

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  }
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==================== DOM REFERENCES ====================
  const $ = (id) => document.getElementById(id);
  const onboardingModal = $('onboarding-modal');
  const onboardingInput = $('onboarding-input');
  const onboardingStartBtn = $('onboarding-start-btn');
  const archiveModal = $('archive-modal');
  const archiveNameInput = $('archive-name');
  const archiveStartingBalanceInput = $('archive-starting-balance');
  const archiveSubmitBtn = $('archive-submit-btn');
  const cancelArchiveBtn = $('cancel-archive');
  const editModal = $('edit-modal');
  const editIdInput = $('edit-id');
  const editAmountInput = $('edit-amount');
  const editTypeSelect = $('edit-type');
  const editCategorySelect = $('edit-category');
  const editDateInput = $('edit-date');
  const editNoteInput = $('edit-note');
  const editSaveBtn = $('edit-save-btn');
  const editCancelBtn = $('edit-cancel-btn');
  const editBalanceModal = $('edit-balance-modal');
  const editBalanceInput = $('edit-balance-input');
  const editBalanceSubmitBtn = $('edit-balance-submit-btn');
  const cancelEditBalance = $('cancel-edit-balance');
  const pwaModal = $('pwa-install-banner');
  const pwaInstallBtn = $('pwa-install-btn');
  const pwaDismissBtn = $('pwa-dismiss-btn');
  const iosInstructions = $('ios-instructions');
  const pwaBannerTitle = $('pwa-banner-title');
  const pwaBannerDesc = $('pwa-banner-desc');
  const editBalanceBtn = $('edit-balance-btn');
  const addTransactionBtn = $('add-transaction-btn');
  const resetArchiveBtn = $('reset-archive-btn');
  const transactionForm = $('transaction-form');
  const dateInput = $('date');

  const balanceDisplay = $('balance-display');
  const incomeDisplay = $('income-display');
  const expenseDisplay = $('expense-display');
  const startingBalanceAmount = $('starting-balance-amount');
  const transactionList = $('transaction-list');
  const emptyState = $('empty-state');
  const archivedList = $('archived-list');
  const archivedEmptyState = $('archived-empty-state');
  const moreToggleBtn = $('more-toggle-btn');
  const moreBody = $('more-body');
  const moreChevron = $('more-chevron');
  const themeToggleBtn = $('theme-toggle');
  const currencySelect = $('currency-select');

  dateInput.valueAsDate = new Date();

  // Live amount preview wiring for all amount inputs
  ['onboarding-input', 'amount', 'edit-amount', 'fundraising-target-input'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { updateAmountPreview(id); });
  });

  // Split calculator people count input
  const peopleCountInput = document.getElementById('people-count-input');
  if (peopleCountInput) {
    peopleCountInput.addEventListener('input', updateSplitCalculator);
  }

  // Yana / Profil section toggle
  if (moreToggleBtn) moreToggleBtn.addEventListener('click', toggleMoreSection);

  // Theme toggle button
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

  // Currency selector
  if (currencySelect) {
    currencySelect.value = localStorage.getItem('app_currency') || 'UZS';
    currencySelect.addEventListener('change', function () {
      localStorage.setItem('app_currency', currencySelect.value);
    });
  }

  // Restore saved theme on load
  (function restoreTheme() {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark');
      if (themeToggleBtn) themeToggleBtn.textContent = '☀️ Light';
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark');
      if (themeToggleBtn) themeToggleBtn.textContent = '🌙 Dark';
    }
  })();

  // ==================== DUAL-MODE SYSTEM ====================
    function applyModeLabels() {
      const isFundraising = currentMode === 'fundraising';
      const modeBtn = document.getElementById('mode-switch-btn');
      const modeIcon = document.getElementById('mode-switch-icon');
      const modeLabel = document.getElementById('mode-switch-label');
      const balanceLabel = document.querySelector('.hero-card p');
      const sbLabel = document.getElementById('starting-balance-label');
      const sbLabelMobile = document.getElementById('starting-balance-label-mobile');
      const incomeLabel = document.querySelector('.card-income p');
      const expenseLabel = document.querySelector('.card-expense p');

      if (modeBtn) modeBtn.classList.toggle('bg-emerald-600/30', isFundraising);
      if (modeIcon) modeIcon.textContent = isFundraising ? '🎯' : '⚖️';
      if (modeLabel) modeLabel.textContent = isFundraising ? t('modeFundraising') : t('modeSmartWallet');

      if (balanceLabel) balanceLabel.textContent = isFundraising ? t('currentBalanceLabel') : t('balance');
      if (sbLabel) sbLabel.textContent = isFundraising ? t('targetAmount') : t('startingBalance');
      if (sbLabelMobile) sbLabelMobile.textContent = isFundraising ? 'Maqsad' : 'B.Pul';
      if (incomeLabel) incomeLabel.textContent = isFundraising ? t('collectedAmount') : t('income');
      if (expenseLabel) expenseLabel.textContent = isFundraising ? t('spentAmount') : t('expense');
    }
    function toggleAppMode() {
      currentMode = currentMode === 'smart' ? 'fundraising' : 'smart';
      localStorage.setItem('app_mode', currentMode);
      applyModeLabels();
      
      // Trigger fundraising onboarding if switching to fundraising mode and no target set
      if (currentMode === 'fundraising') {
        const target = getFundraisingTarget();
        const title = getFundraisingTitle();
        if (!target || !title) {
          showFundraisingOnboarding();
        }
      }
      
      updateDashboard();
    }
    window.toggleAppMode = toggleAppMode;

    // ==================== FUNDRAISING ONBOARDING ====================
    function showFundraisingOnboarding() {
      const modal = document.getElementById('fundraising-onboarding-modal');
      if (!modal) return;
      
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      
      // Focus on title input first
      const titleInput = document.getElementById('fundraising-title-input');
      if (titleInput) titleInput.focus();
    }
    function saveFundraisingSetup(e) {
      if (e) e.preventDefault();
      
      const titleInput = document.getElementById('fundraising-title-input');
      const targetInput = document.getElementById('fundraising-target-input');
      
      const title = titleInput ? titleInput.value.trim() : '';
      const target = targetInput ? parseFloat(targetInput.value) || 0 : 0;
      
      if (!title || target <= 0) {
        alert("Iltimos, maqsad nomi va yig'ilishi kerak bo'lgan summani to'g'ri kiriting!");
        return;
      }

      // Save to mode-isolated localStorage
      setFundraisingTitle(title);
      setFundraisingTarget(target);
      
      // Hide modal
      const modal = document.getElementById('fundraising-onboarding-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
      
      // Clear form
      if (titleInput) titleInput.value = '';
      if (targetInput) targetInput.value = '';
      
      // Re-render UI
      updateDashboard();
    }
    function closeFundraisingOnboarding() {
      const modal = document.getElementById('fundraising-onboarding-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }
    window.saveFundraisingSetup = saveFundraisingSetup;
    window.closeFundraisingOnboarding = closeFundraisingOnboarding;

    // ==================== UPDATE & RENDER ====================
  function updateDashboard() {
    try {
      const { startingBalance, totalIncome, totalExpenses, currentBalance } = calculateTotals();
      if (startingBalanceAmount) startingBalanceAmount.textContent = formatCurrency(startingBalance);
      if (incomeDisplay) incomeDisplay.textContent = formatCurrency(totalIncome);
      if (expenseDisplay) expenseDisplay.textContent = formatCurrency(totalExpenses);
      if (balanceDisplay) {
        balanceDisplay.textContent = formatCurrency(currentBalance);
        if (currentBalance < 0) {
          balanceDisplay.classList.remove('text-slate-100');
          balanceDisplay.classList.add('text-rose-500', 'animate-pulse-rose');
        } else {
          balanceDisplay.classList.remove('text-rose-500', 'animate-pulse-rose');
          balanceDisplay.classList.add('text-slate-100');
        }
      }

      // Update starting balance banner label dynamically based on mode
      updateStartingBalanceBanner();

      // Update fundraising progress and target cards
      updateFundraisingCards();

      // Update split calculator
      updateSplitCalculator();

      renderTransactions();
      renderArchivedPeriods();
    } catch (e) { console.error('[dashboard] updateDashboard:', e); }
  }

  function updateStartingBalanceBanner() {
    const labelEl = document.querySelector('#starting-balance-banner [data-i18n="startingBalance"]');
    if (!labelEl) return;
    
    const isFundraising = currentMode === 'fundraising';
    if (isFundraising) {
      const title = getFundraisingTitle();
      const target = getFundraisingTarget();
      labelEl.textContent = title 
        ? `${t('fundraisingTargetCard') || 'Maqsad'}: ${title} | ${formatCurrency(target)}`
        : `${t('targetAmount') || 'Maqsad'}: ${formatCurrency(target)}`;
    } else {
      labelEl.textContent = `${t('startingBalance') || 'Boshlang\'ich Pul'}: ${formatCurrency(startingBalance)}`;
    }
  }

  function updateFundraisingCards() {
    const progressCard = document.getElementById('fundraising-progress-card');
    const targetCard = document.getElementById('fundraising-target-card');
    const isFundraising = currentMode === 'fundraising';
    
    if (!isFundraising) {
      if (progressCard) progressCard.classList.add('hidden');
      if (targetCard) targetCard.classList.add('hidden');
      return;
    }
    
    if (progressCard) progressCard.classList.remove('hidden');
    if (targetCard) targetCard.classList.remove('hidden');
    
    const target = getFundraisingTarget();
    const title = getFundraisingTitle();
    const { totalIncome, totalExpenses, currentBalance } = calculateTotals();
    const collected = totalIncome - totalExpenses;
    const percent = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;
    
    const progressPercentEl = document.getElementById('fundraising-progress-percent');
    const progressBarEl = document.getElementById('fundraising-progress-bar');
    const targetTitleEl = document.getElementById('fundraising-target-title');
    const targetAmountEl = document.getElementById('fundraising-target-amount');
    const currentBalanceEl = document.getElementById('fundraising-current-balance');
    
    if (progressPercentEl) progressPercentEl.textContent = `${percent}%`;
    if (progressBarEl) progressBarEl.style.width = `${percent}%`;
    if (targetTitleEl) targetTitleEl.textContent = title || '-';
    if (targetAmountEl) targetAmountEl.textContent = formatCurrency(target);
    if (currentBalanceEl) currentBalanceEl.textContent = formatCurrency(currentBalance);
  }

  // ==================== SPLIT CALCULATOR (Fundraising only) ====================
  function updateSplitCalculator() {
    const splitCard = document.getElementById('split-calculator-card');
    const isFundraising = currentMode === 'fundraising';
    
    if (!isFundraising) {
      if (splitCard) splitCard.classList.add('hidden');
      return;
    }
    if (splitCard) splitCard.classList.remove('hidden');
    
    const target = getFundraisingTarget();
    const peopleInput = document.getElementById('people-count-input');
    const resultEl = document.getElementById('split-result');
    
    if (!peopleInput || !resultEl) return;
    
    const peopleCount = parseInt(peopleInput.value) || 0;
    if (peopleCount > 0 && target > 0) {
      const perPerson = target / peopleCount;
      resultEl.textContent = `${t('perPerson') || 'Har bir kishidan'}: ${formatCurrency(perPerson)}`;
      resultEl.style.cursor = 'pointer';
      resultEl.onclick = () => {
        const amountInput = document.getElementById('amount');
        if (amountInput) {
          amountInput.value = perPerson.toFixed(2);
          amountInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
    } else {
      resultEl.textContent = t('enterPeopleCount') || 'Odamlar sonini kiriting';
      resultEl.style.cursor = 'default';
      resultEl.onclick = null;
    }
  }

  function renderTransactions() {
    const container = document.getElementById('transaction-list');
    if (!container) return;

    const transactions = getTransactions();
    if (!transactions || transactions.length === 0) {
      container.innerHTML = `<p class="text-center text-slate-400 py-6 text-sm" data-i18n="noTransactions">Hozircha tranzaksiyalar yo'q</p>`;
      return;
    }

    // Sort reverse chronological: newest first (by date, then by id)
    const sorted = transactions.slice().sort((a, b) => {
      const dateA = new Date(a.date + 'T00:00:00').getTime();
      const dateB = new Date(b.date + 'T00:00:00').getTime();
      if (dateB !== dateA) return dateB - dateA;
      return (b.id || 0) - (a.id || 0);
    });

    // Group by date
    const groups = {};
    const order = [];
    for (const tx of sorted) {
      const key = tx.date;
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(tx);
    }

    let html = '';
    for (const key of order) {
      const txs = groups[key];
      let dayIncome = 0, dayExpense = 0;
      for (const t of txs) {
        const amt = Number.isFinite(t.amount) ? t.amount : 0;
        if (t.type === 'income') dayIncome += amt;
        else if (t.type === 'expense') dayExpense += amt;
      }
      const dayNet = dayIncome - dayExpense;
      const dateStr = formatDateToUZ(key) || formatDateToUZ(new Date().toISOString().split('T')[0]);
      const netColor = dayNet >= 0 ? 'text-emerald-400' : 'text-rose-400';
      const netSign = dayNet >= 0 ? '+' : '';
      const netLabel = t('dailyNet');

      html += `<div class="mb-4">
        <div class="flex items-center justify-between bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 mb-2">
          <span class="text-sm font-semibold text-slate-200">📅 ${dateStr}</span>
          <span class="text-xs font-medium ${netColor}">${netLabel}: ${netSign}${Math.abs(dayNet).toLocaleString('uz-UZ')} so'm</span>
        </div>
        <ul class="space-y-2">`;

      for (const tx of txs) {
        const isIncome = tx.type === 'income';
        const amountSign = isIncome ? '+' : '-';
        const amountColor = isIncome ? 'text-emerald-400' : 'text-rose-400';
        const amountFormatted = parseFloat(tx.amount || 0).toLocaleString('uz-UZ');
        const descriptionText = (tx.description && tx.description.trim() !== '') ? tx.description : 'Izoh kiritilmagan';
        const dateFormatted = formatDateToUZ(tx.date) || formatDateToUZ(new Date().toISOString().split('T')[0]);

        html += `
          <li class="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 sm:p-4 flex flex-col gap-3 shadow-md">
            <div class="flex items-center justify-between border-b border-slate-700/50 pb-2.5">
              <span class="text-base sm:text-lg font-bold ${amountColor}">
                ${amountSign}${amountFormatted} so'm
              </span>
              <div class="flex items-center gap-1.5">
                <button onclick="editTransaction(${tx.id})" class="text-slate-400 hover:text-emerald-400 text-sm p-1 transition-colors" title="Tahrirlash">✏️</button>
                <button onclick="deleteTransaction(${tx.id})" class="text-slate-400 hover:text-rose-400 text-sm p-1 transition-colors" title="O'chirish">🗑️</button>
              </div>
            </div>
            <div class="flex flex-col gap-2 text-xs sm:text-sm">
              <div class="flex items-center justify-between">
                <span class="text-slate-400 font-medium">Kategoriya:</span>
                <span class="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md font-semibold text-xs border border-slate-700/60">
                  ${tx.category}
                </span>
              </div>
              <div class="flex items-start justify-between gap-2">
                <span class="text-slate-400 font-medium shrink-0">Tavsif:</span>
                <span class="text-slate-200 text-right font-normal break-words">
                  ${descriptionText}
                </span>
              </div>
              <div class="flex items-center justify-between pt-0.5">
                <span class="text-slate-400 font-medium">Sana:</span>
                <span class="text-slate-300 font-mono text-xs">
                  📅 ${dateFormatted}
                </span>
              </div>
            </div>
          </li>`;
      }

      html += `</ul></div>`;
    }

    container.innerHTML = html;
  }

function renderArchivedPeriods() {
    if (!archivedList || !archivedEmptyState) return;
    try {
      const periods = getArchivedPeriods();
      archivedList.innerHTML = '';
      if (periods.length === 0) { archivedEmptyState.classList.remove('hidden'); return; }
      archivedEmptyState.classList.add('hidden');

      // Sort archived periods newest-first (by id, then by date)
      const sortedPeriods = periods.slice().sort((a, b) => {
        if (b.id !== a.id) return (b.id || 0) - (a.id || 0);
        const dateA = new Date((a.date || a.createdAt || '1970-01-01') + 'T00:00:00').getTime();
        const dateB = new Date((b.date || b.createdAt || '1970-01-01') + 'T00:00:00').getTime();
        return dateB - dateA;
      });

      for (const period of sortedPeriods) {
        const dateStr = formatDateToUZ(period.date) || formatDateToUZ(new Date(period.createdAt || Date.now()).toISOString().split('T')[0]);
        const balanceNum = Number(period.finalBalance) || 0;
        const balanceColor = balanceNum < 0 ? 'text-rose-400' : 'text-emerald-400';
        const balanceSign = balanceNum < 0 ? '' : '+';
        // Strict formula: Final Balance = Starting Balance + Total Income - Total Expense
        const safeStarting = Number.isFinite(Number(period.startingBalance)) ? Number(period.startingBalance) : 0;
        const safeIncome = Number.isFinite(Number(period.totalIncome)) ? Number(period.totalIncome) : 0;
        const safeExpense = Number.isFinite(Number(period.totalExpenses)) ? Number(period.totalExpenses) : 0;
        const finalBalance = safeStarting + safeIncome - safeExpense;
        const div = document.createElement('div');
        div.className = 'bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 sm:p-4 flex flex-col gap-3 shadow-md mb-3';
        div.dataset.archiveId = period.id;

        // Build inner transaction rows matching the active transaction card style
        const txRows = (period.transactions || []).map(function (t) {
          const isInc = t.type === 'income';
          const amtSign = isInc ? '+' : '-';
          const amtColor = isInc ? 'text-emerald-400' : 'text-rose-400';
          const catLabel = escapeHtml(getCategoryLabel(t.category));
          const amt = (Number(t.amount) || 0).toLocaleString('uz-UZ');
          const desc = escapeHtml(t.description || 'Izoh kiritilmagan');
          const tDate = formatDateToUZ(t.date) || '';
          return '<div class="bg-slate-800/60 border border-slate-700/50 rounded-lg p-2.5 flex flex-col gap-1.5">' +
            '<div class="flex items-center justify-between border-b border-slate-700/40 pb-1.5">' +
            '<span class="text-xs sm:text-sm font-bold ' + amtColor + '">' + amtSign + amt + " so'm</span>" +
            '<span class="text-[10px] px-1.5 py-0.5 rounded font-semibold ' + (isInc ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400') + '">' + (isInc ? 'Kirim' : 'Chiqim') + '</span>' +
            '</div>' +
            '<div class="flex items-center justify-between text-[11px]">' +
            '<span class="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-medium">' + catLabel + '</span>' +
            '<span class="text-slate-400">📅 ' + tDate + '</span>' +
            '</div>' +
            '<div class="text-[11px] text-slate-400 truncate">' + desc + '</div>' +
            '</div>';
        }).join('');

        div.innerHTML =
          '<div class="archive-header flex items-center justify-between border-b border-slate-700/50 pb-2.5">' +
          '<div class="flex flex-col gap-1 flex-1 min-w-0">' +
          '<span class="text-base sm:text-lg font-bold ' + balanceColor + '">' + (finalBalance < 0 ? '' : '+') + (Math.abs(finalBalance)).toLocaleString('uz-UZ') + " so'm</span>" +
          '<div class="flex items-center gap-2 text-xs flex-wrap">' +
          '<span class="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md font-semibold text-xs border border-slate-700/60">Arxiv</span>' +
          '<span class="text-slate-400">📅 ' + dateStr + '</span>' +
          '</div></div>' +
          '<div class="flex items-center gap-1.5 shrink-0">' +
          '<button type="button" class="archive-chevron-btn text-slate-400 hover:text-emerald-400 text-sm p-1 transition-colors" title="Yopish/Ko\'rish">▸</button>' +
          '<button type="button" class="archive-delete-btn text-slate-400 hover:text-rose-400 text-sm p-1 transition-colors" title="Arxivni o\'chirish">🗑️</button>' +
          '</div></div>' +
          '<div class="archive-body hidden flex flex-col gap-2">' +
          '<div class="flex items-center justify-between text-xs pt-1">' +
          '<span class="text-slate-400 font-medium">Davr:</span>' +
          '<span class="text-slate-200 font-medium">' + escapeHtml(period.name || period.periodName || '') + '</span>' +
          '</div>' +
          '<div class="flex items-center justify-between text-xs">' +
          '<span class="text-slate-400 font-medium">Boshlang\'ich:</span>' +
          '<span class="text-slate-200">' + formatCurrency(period.startingBalance || 0) + '</span>' +
          '</div>' +
          '<div class="flex items-center justify-between text-xs">' +
          '<span class="text-slate-400 font-medium">Jami kirim:</span>' +
          '<span class="text-emerald-400 font-semibold">+' + formatCurrency(period.totalIncome || 0) + '</span>' +
          '</div>' +
          '<div class="flex items-center justify-between text-xs">' +
          '<span class="text-slate-400 font-medium">Jami chiqim:</span>' +
          '<span class="text-rose-400 font-semibold">-' + formatCurrency(period.totalExpenses || 0) + '</span>' +
          '</div>' +
          '<div class="flex items-center justify-between text-xs border-t border-slate-700/50 pt-2">' +
          '<span class="text-slate-300 font-bold" data-i18n="remainingBalance">Qoldiq:</span>' +
          '<span class="text-emerald-400 font-bold text-sm">' + (Number.isFinite(finalBalance) && finalBalance >= 0 ? '+' : '') + formatCurrency(finalBalance) + '</span>' +
          '</div>' +
          '<div class="border-t border-slate-700/50 pt-2">' +
          '<p class="text-xs text-slate-500 mb-2">Tranzaksiyalar (' + (period.transactions || []).length + ' ta):</p>' +
          '<div class="space-y-2 max-h-64 overflow-y-auto pr-1">' + txRows + '</div>' +
          '</div></div>';

        const header = div.querySelector('.archive-header');
        const body = div.querySelector('.archive-body');
        const chevron = div.querySelector('.archive-chevron-btn');
        if (header) header.addEventListener('click', (e) => {
          if (e.target.closest('.archive-delete-btn')) return;
          if (e.target.closest('.archive-chevron-btn')) return;
          if (body) body.classList.toggle('hidden');
          if (chevron) {
            chevron.style.transform = body && body.classList.contains('hidden') ? '' : 'rotate(90deg)';
            chevron.textContent = body && body.classList.contains('hidden') ? '▸' : '▾';
          }
        });
        if (chevron) chevron.addEventListener('click', (e) => {
          e.stopPropagation();
          if (body) body.classList.toggle('hidden');
          chevron.style.transform = body && body.classList.contains('hidden') ? '' : 'rotate(90deg)';
          chevron.textContent = body && body.classList.contains('hidden') ? '▸' : '▾';
        });
        const delBtn = div.querySelector('.archive-delete-btn');
        if (delBtn) delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteArchive(period.id); });
        archivedList.appendChild(div);
      }
    } catch (e) { console.error('[archive] renderArchivedPeriods:', e); }
  }

  // ==================== ADD TRANSACTION ====================
  function addTransaction() {
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];
    const description = document.getElementById('note').value.trim();
    if (isNaN(amount) || amount <= 0) return alert("Iltimos, to'g'ri summa kiriting!");
    const newTx = { id: Date.now(), amount, type, category, date, description };
    const transactions = getTransactions();
    transactions.push(newTx);
    setTransactions(transactions);
    transactionForm.reset();
    dateInput.valueAsDate = new Date();
    renderTransactions();
    updateDashboard();
  }
  if (transactionForm) transactionForm.addEventListener('submit', function (e) { e.preventDefault(); addTransaction(); });
  if (addTransactionBtn) addTransactionBtn.addEventListener('click', function (e) { e.preventDefault(); addTransaction(); });

  // ==================== DELETE TRANSACTION ====================
  function deleteTransaction(id) {
    const transactions = getTransactions().filter((t) => t.id !== id);
    if (transactions.length === getTransactions().length) return;
    setTransactions(transactions);
    updateDashboard();
  }

  // ==================== EDIT TRANSACTION ====================
  function openEditModal(id) {
    const txns = getTransactions();
    const t = txns.find((tx) => tx.id === id);
    if (!t) return;
    editIdInput.value = t.id;
    editAmountInput.value = t.amount;
    editTypeSelect.value = t.type;
    editCategorySelect.value = t.category;
    editDateInput.value = t.date;
    editNoteInput.value = t.description || '';
    editModal.classList.remove('hidden');
    editModal.classList.add('flex');
    updateAmountPreview('edit-amount');
  }
  function closeEditModal() {
    editModal.classList.add('hidden');
    editModal.classList.remove('flex');
  }
  if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditModal);
  if (editModal) editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
  if (editSaveBtn) editSaveBtn.addEventListener('click', function (e) {
    e.preventDefault();
    const id = Number(editIdInput.value);
    const amount = parseFloat(editAmountInput.value);
    if (isNaN(amount) || amount <= 0) return alert("Iltimos, to'g'ri summa kiriting!");
    const transactions = getTransactions().map((t) => {
      if (t.id !== id) return t;
      return { ...t, amount, type: editTypeSelect.value, category: editCategorySelect.value, date: editDateInput.value, description: editNoteInput.value.trim() };
    });
    setTransactions(transactions);
    closeEditModal();
    updateDashboard();
  });

  // Inline onclick tugmalari (renderTransactions ichidagi HTML) global ishlashi uchun kerak:
  window.editTransaction = (id) => openEditModal(id);
  window.deleteTransaction = deleteTransaction;
  window.appendZeros = appendZeros;
  window.clearAmountInput = clearAmountInput;
  window.quickAmount = quickAmount;
  window.exportToCSV = exportToCSV;
  window.exportToPDF = exportToPDF;
  window.exportBackup = exportBackup;
  window.importBackup = importBackup;
  window.toggleMoreSection = toggleMoreSection;
  window.toggleTheme = toggleTheme;

  // ==================== ONBOARDING ====================
  const savedBalance = localStorage.getItem('starting_balance');
  const balanceNum = parseFloat(savedBalance);
  const shouldShowOnboarding = (savedBalance === null) || (savedBalance === '') || (savedBalance === '0') || (balanceNum === 0);
  
  // Check fundraising onboarding
  const isFundraisingMode = currentMode === 'fundraising';
  const fundraisingTarget = getFundraisingTarget();
  const fundraisingTitle = getFundraisingTitle();
  const shouldShowFundraisingOnboarding = isFundraisingMode && (!fundraisingTarget || !fundraisingTitle);
  
  if (shouldShowOnboarding && !isFundraisingMode) {
    if (onboardingModal) {
      onboardingModal.classList.remove('hidden');
      onboardingModal.classList.add('flex');
    }
    if (onboardingInput) onboardingInput.focus();
  } else if (shouldShowFundraisingOnboarding) {
    showFundraisingOnboarding();
  } else {
    updateDashboard();
  }

  // Default modal title (restored after editing)
  const onboardingTitle = $('onboarding-modal-title');

  if (onboardingStartBtn) onboardingStartBtn.addEventListener('click', function (e) {
    e.preventDefault();
    if (!onboardingInput) return;
    const val = parseFloat(onboardingInput.value);
    if (!isNaN(val) && val >= 0) {
      startingBalance = val;
      localStorage.setItem('starting_balance', val.toString());
      if (onboardingModal) {
        onboardingModal.classList.add('hidden');
        onboardingModal.classList.remove('flex');
      }
      // Reset title back to the welcome greeting
      if (onboardingTitle) onboardingTitle.textContent = "Xush kelibsiz";
      updateDashboard();
    }
  });

  if (onboardingInput) onboardingInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onboardingStartBtn) onboardingStartBtn.click();
    }
  });

  if (onboardingModal) onboardingModal.addEventListener('click', (e) => { if (e.target === onboardingModal && localStorage.getItem('starting_balance')) { onboardingModal.classList.add('hidden'); onboardingModal.classList.remove('flex'); } });

  // ==================== EDIT STARTING BALANCE (Desktop & Mobile) ====================
  function openEditBalanceModal() {
    const modal = document.getElementById('onboarding-modal');
    const amountInput = document.getElementById('onboarding-input');
    const modalTitle = document.getElementById('onboarding-modal-title');

    if (!modal || !amountInput) return;

    const currentBalance = localStorage.getItem('starting_balance') || '0';

    // Pre-fill input with the current saved balance
    amountInput.value = currentBalance;

    // Trigger the live preview so it displays immediately (e.g. 👉 5 000 000 so'm)
    amountInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Update the modal title to reflect editing mode
    if (modalTitle) {
      modalTitle.textContent = "Boshlang'ich pulni tahrirlash";
    }

    // Show the modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    amountInput.focus();
  }
  window.openEditBalanceModal = openEditBalanceModal;

  // Attach listeners to both desktop and mobile edit buttons
  if (editBalanceBtn) editBalanceBtn.addEventListener('click', openEditBalanceModal);
  ['desktop-edit-balance-btn', 'mobile-edit-balance-btn'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', openEditBalanceModal);
  });

  // ==================== ARCHIVE & RESET ====================
  if (resetArchiveBtn) resetArchiveBtn.addEventListener('click', () => {
    try {
      const { startingBalance: sb, currentBalance } = calculateTotals();
      // Pre-fill the archived period's starting balance (read-only display of what is being archived)
      if (archiveStartingBalanceInput) archiveStartingBalanceInput.value = (Number.isFinite(sb) ? sb : 0).toFixed(2);
      if (archiveModal) {
        archiveModal.classList.remove('hidden');
        archiveModal.classList.add('flex');
      }
      if (archiveNameInput) archiveNameInput.focus();
    } catch (e) { console.error('[archive] resetArchiveBtn:', e); }
  });
  if (cancelArchiveBtn) cancelArchiveBtn.addEventListener('click', () => { if (archiveModal) { archiveModal.classList.add('hidden'); archiveModal.classList.remove('flex'); } });
  if (archiveModal) archiveModal.addEventListener('click', (e) => { if (e.target === archiveModal) { archiveModal.classList.add('hidden'); archiveModal.classList.remove('flex'); } });
  if (archiveSubmitBtn) archiveSubmitBtn.addEventListener('click', function (e) {
    e.preventDefault();
    try {
      const periodName = archiveNameInput ? archiveNameInput.value.trim() : '';
      if (!periodName) return alert("Iltimos, davr nomini kiriting!");
      const newStartingBalance = parseFloat(archiveStartingBalanceInput.value);
      if (isNaN(newStartingBalance) || newStartingBalance < 0) return alert("Iltimos, to'g'ri summa kiriting!");
      const txns = getTransactions();
      if (txns.length === 0) return alert('Arxivlash uchun tranzaksiyalar mavjud emas.');

      // 1. Snapshot current active data into the Archived Periods array
      const { startingBalance: archivedStarting, totalIncome, totalExpenses, currentBalance } = calculateTotals();
      const safeIncome = Number.isFinite(totalIncome) ? totalIncome : 0;
      const safeExpenses = Number.isFinite(totalExpenses) ? totalExpenses : 0;
      const safeBalance = Number.isFinite(currentBalance) ? currentBalance : newStartingBalance;
      const archive = {
        id: Date.now(),
        name: periodName,
        startingBalance: Number.isFinite(archivedStarting) ? archivedStarting : 0,
        totalIncome: safeIncome,
        totalExpenses: safeExpenses,
        finalBalance: safeBalance,
        date: formatDateToUZ(new Date().toISOString().split('T')[0]),
        transactions: [...txns]
      };
      const periods = getArchivedPeriods();
      periods.push(archive);
      setArchivedPeriods(periods);

      // 2. Reset active starting_balance to 0 in localStorage
      // 3. Clear active transactions array in localStorage
      setTransactions([]);
      startingBalance = 0;
      localStorage.setItem('starting_balance', '0');

      if (archiveModal) { archiveModal.classList.add('hidden'); archiveModal.classList.remove('flex'); }
      if (archiveNameInput) archiveNameInput.value = '';
      if (archiveStartingBalanceInput) archiveStartingBalanceInput.value = '';

      updateDashboard();

      // 4. Immediately prompt the user to set the new initial starting balance for the new period
      openEditBalanceModal();
    } catch (err) { console.error('[archive] submit:', err); }
  });

  // ==================== DELETE ARCHIVE ====================
  function deleteArchive(id) {
    const periods = getArchivedPeriods().filter((p) => p.id !== id);
    setArchivedPeriods(periods);
    renderArchivedPeriods();
  }

  // ==================== YANA / PROFIL — EXPORT & TOOLS ====================
  function getTransactionsSafe() {
    try { return JSON.parse(localStorage.getItem('transactions')) || []; }
    catch { return []; }
  }
  function exportToCSV() {
    const transactions = getTransactionsSafe();
    if (transactions.length === 0) {
      alert("Eksport qilish uchun tranzaksiyalar mavjud emas!");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFFSana,Turi,Kategoriya,Summa,Tavsif\n";
    transactions.forEach(t => {
      const row = [
        JSON.stringify(t.date || ''),
        JSON.stringify(t.type === 'income' ? 'Kirim' : 'Chiqim'),
        JSON.stringify(t.category || ''),
        JSON.stringify(t.amount || 0),
        JSON.stringify(t.description || '')
      ].join(',');
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `byudjet_hisobot_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  function exportToPDF() {
    const transactions = getTransactionsSafe();
    if (transactions.length === 0) {
      alert("Eksport qilish uchun tranzaksiyalar mavjud emas!");
      return;
    }

    const { totalIncome, totalExpenses, currentBalance } = calculateTotals();
    const tableRows = transactions.map(t => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${t.date || ''}</td>
        <td style="padding:8px;border:1px solid #ddd;">${t.type === 'income' ? 'Kirim' : 'Chiqim'}</td>
        <td style="padding:8px;border:1px solid #ddd;">${t.category || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${(Number(t.amount) || 0).toLocaleString('uz-UZ')} so'm</td>
        <td style="padding:8px;border:1px solid #ddd;">${(t.description || '').replace(/</g, '&lt;')}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Smart Byudjet Tracker - Hisobot</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #0f172a; }
            h2 { color: #0f172a; text-align: center; margin-bottom: 4px; }
            .summary { text-align: center; margin-bottom: 20px; font-size: 14px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { background-color: #1e293b; color: white; padding: 10px; border: 1px solid #ddd; text-align: left; }
            td { border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h2>Smart Byudjet Tracker — Moliyaviy Hisobot</h2>
          <div class="summary">
            Jami Kirim: ${(totalIncome || 0).toLocaleString('uz-UZ')} so'm &nbsp;|&nbsp;
            Jami Chiqim: ${(totalExpenses || 0).toLocaleString('uz-UZ')} so'm &nbsp;|&nbsp;
            Qoldiq: ${(currentBalance || 0).toLocaleString('uz-UZ')} so'm
          </div>
          <table>
            <thead>
              <tr>
                <th>Sana</th>
                <th>Turi</th>
                <th>Kategoriya</th>
                <th>Summa</th>
                <th>Tavsif</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  }
  function exportBackup() {
    const data = {
      version: '1.2.1',
      exportedAt: new Date().toISOString(),
      startingBalance: localStorage.getItem('starting_balance'),
      transactions: getTransactionsSafe(),
      archivedPeriods: getArchivedPeriods()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `smart_byudjet_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  function importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.transactions) setTransactions(data.transactions);
          if (data.archivedPeriods) setArchivedPeriods(data.archivedPeriods);
          if (data.startingBalance !== undefined && data.startingBalance !== null) {
            localStorage.setItem('starting_balance', data.startingBalance);
            startingBalance = parseFloat(data.startingBalance) || 0;
          }
          alert("Zaxira nusqa muvaffaqiyatli yuklandi!");
          updateDashboard();
        } catch (err) {
          alert("Xatolik: nusqa fayli noto'g'ri formatda.");
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  // ==================== DATA RESET (TOZALASH) ====================
  function resetAllData() {
    const confirmed = confirm(
      "⚠️ DIQQAT! Barcha tranzaksiyalar va boshlang'ich pul miqdori (balans) butunlay o'chib ketadi.\n\n" +
      "Tozalashdan oldin ma'lumotlarni fayl sifatida yuklab olishni (Backup/CSV) tavsiya etamiz.\n\n" +
      "Davom etishni xohlaysizmi?"
    );
    if (!confirmed) return;

    // Explicitly remove ALL stored budget data
    localStorage.removeItem('starting_balance');
    localStorage.removeItem('transactions');
    localStorage.removeItem('app_pin_code');

    // Reset in-memory state
    startingBalance = 0;
    setTransactions([]);
    setArchivedPeriods([]);

    // Clear form inputs
    ['amount', 'note', 'category', 'type'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    if (dateInput) dateInput.valueAsDate = new Date();

    // Hide any open modals
    [archiveModal, editModal, editBalanceModal].forEach(function (m) {
      if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    });

    // Re-open onboarding modal so the user can re-enter their starting balance
    if (onboardingModal) {
      onboardingModal.classList.remove('hidden');
      onboardingModal.classList.add('flex');
      if (onboardingInput) onboardingInput.focus();
    }

    // Re-render UI and immediately prompt the user to set the new starting balance
    updateDashboard();
    openEditBalanceModal();

    // Success toast
    showToast("Barcha ma'lumotlar va boshlang'ich pul muvaffaqiyatli tozalandi.", "success");
  }
  function showToast(message, type) {
    type = type || 'info';
    let toast = document.getElementById('global-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'global-toast';
      toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-2xl z-50 text-sm font-medium transition-all duration-300';
      document.body.appendChild(toast);
    }
    const palette = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      info: 'bg-slate-700 text-slate-100'
    };
    toast.className = toast.className.split(' ').filter(function (c) { return c.indexOf('bg-') !== 0 && c.indexOf('text-') !== 0; }).join(' ') + ' ' + (palette[type] || palette.info);
    toast.textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100');
    setTimeout(function () {
      toast.classList.add('opacity-0', 'translate-y-2');
    }, 2600);
  }

  // ==================== PIN-CODE AUTHENTICATION ====================
  let currentPinInput = '';

  async function hashPin(pin) {
    const msgUint8 = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function updatePinDots() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach(function (dot, idx) {
      if (idx < currentPinInput.length) {
        dot.classList.add('bg-emerald-500', 'border-emerald-500');
      } else {
        dot.classList.remove('bg-emerald-500', 'border-emerald-500');
      }
    });
  }

  function clearPin() {
    currentPinInput = '';
    updatePinDots();
  }

  function backspacePin() {
    currentPinInput = currentPinInput.slice(0, -1);
    updatePinDots();
  }

  async function pressPinNum(num) {
    if (currentPinInput.length < 4) {
      currentPinInput += num;
      updatePinDots();
    }

    if (currentPinInput.length === 4) {
      const enteredHash = await hashPin(currentPinInput);
      const savedHash = localStorage.getItem('app_pin_code');
      const pinModal = document.getElementById('pin-lock-modal');

      if (!savedHash) {
        // First-time PIN setup
        localStorage.setItem('app_pin_code', enteredHash);
        showToast("✅ PIN-kod muvaffaqiyatli o'rnatildi!", "success");
        if (pinModal) pinModal.classList.add('hidden');
      } else if (enteredHash === savedHash) {
        // Correct PIN
        if (pinModal) pinModal.classList.add('hidden');
      } else {
        // Incorrect PIN
        showToast("❌ PIN-kod noto'g'ri! Qayta urinib ko'ring.", "error");
      }
      currentPinInput = '';
      updatePinDots();
    }
  }

  function checkPinLock() {
    const savedPinHash = localStorage.getItem('app_pin_code');
    const pinModal = document.getElementById('pin-lock-modal');
    if (savedPinHash && pinModal) {
      pinModal.classList.remove('hidden');
      currentPinInput = '';
      updatePinDots();
    }
  }

  function removeSavedPin() {
    localStorage.removeItem('app_pin_code');
    showToast("PIN-kod o'chirildi.", "info");
  }

  function openPinModal() {
    const pinModal = document.getElementById('pin-lock-modal');
    if (!pinModal) return;
    // Entering a NEW PIN (no saved hash yet)
    if (!localStorage.getItem('app_pin_code')) {
      const titleEl = document.getElementById('pin-modal-title');
      const subEl = document.getElementById('pin-modal-subtitle');
      if (titleEl) titleEl.textContent = 'PIN-kod o\'rnatish';
      if (subEl) subEl.textContent = '4 xonali PIN-kodingizni o\'rnating (masalan: 1234)';
    } else {
      const titleEl = document.getElementById('pin-modal-title');
      const subEl = document.getElementById('pin-modal-subtitle');
      if (titleEl) titleEl.textContent = 'PIN-kod kiriting';
      if (subEl) subEl.textContent = '4 xonali PIN-kodingizni kiriting';
    }
    currentPinInput = '';
    updatePinDots();
    pinModal.classList.remove('hidden');
    pinModal.classList.add('flex');
    // Physical keyboard support (0-9, Backspace, Enter) for desktop users
    if (!pinModal._pinKeydownBound) {
      pinModal._pinKeydownBound = true;
      pinModal.addEventListener('keydown', function (e) {
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault();
          pressPinNum(Number(e.key));
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          backspacePin();
        } else if (e.key === 'Enter') {
          e.preventDefault();
        }
      });
    }
  }
  window.openPinModal = openPinModal;

  // Expose for inline onclick handlers
  window.resetAllData = resetAllData;
  window.pressPinNum = pressPinNum;
  window.clearPin = clearPin;
  window.backspacePin = backspacePin;
  window.removeSavedPin = removeSavedPin;

  function toggleMoreSection() {
    const body = $('more-body');
    const chevron = $('more-chevron');
    if (!body) return;
    body.classList.toggle('hidden');
    if (chevron) chevron.style.transform = body.classList.contains('hidden') ? '' : 'rotate(180deg)';
  }
  window.toggleMoreSection = toggleMoreSection;

  function toggleTheme() {
    const btn = $('theme-toggle');
    if (!btn) return;
    const isLight = document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark', !isLight);
    localStorage.setItem('app_theme', isLight ? 'light' : 'dark');
    btn.textContent = isLight ? '☀️ Light' : '🌙 Dark';
  }
  window.toggleTheme = toggleTheme;

  // ==================== PWA INSTALL (cross-platform) ====================
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.deferredPrompt = e;
    deferredPrompt = e;
  });

  function installPWA() {
    // If already installed (standalone mode), do nothing
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
      // iOS Safari: show the dedicated bottom-sheet install modal with step-by-step visual cues
      const iosModal = document.getElementById('ios-install-modal');
      if (iosModal) {
        iosModal.classList.remove('hidden');
        iosModal.classList.add('flex');
      }
      return;
    }

    // Android / Chromium: trigger the native beforeinstallprompt
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        if (choice.outcome === 'accepted') {
          const banner = document.getElementById('pwa-install-banner');
          if (banner) banner.style.display = 'none';
        }
        deferredPrompt = null;
        window.deferredPrompt = null;
      }).catch(function () {
        deferredPrompt = null;
        window.deferredPrompt = null;
      });
    } else {
      // Fallback if browser doesn't support programmatic prompt or event already fired
      alert("O'rnatish uchun brauzeringiz menyusidagi (3 ta nuqta) 'Ekran / Bosh ekranga qo'shish' (Add to Home screen) tugmasini bosing.");
    }
  }
  window.installPWA = installPWA;

  // iOS bottom-sheet dismiss button
  const iosDismissBtn = document.getElementById('ios-install-dismiss');
  if (iosDismissBtn) iosDismissBtn.addEventListener('click', function () {
    const iosModal = document.getElementById('ios-install-modal');
    if (iosModal) { iosModal.classList.add('hidden'); iosModal.classList.remove('flex'); }
  });

  (function initPWA() {
    // If already installed (standalone mode), never show any prompt
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) return;

    // If user dismissed the banner recently (24h), don't re-show
    if (localStorage.getItem('pwa_install_dismissed') && (Date.now() - parseInt(localStorage.getItem('pwa_install_dismissed'))) < 86400000) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    function showBanner() { if (pwaModal) pwaModal.classList.remove('hidden'); }
    function hideBanner() { if (pwaModal) pwaModal.classList.add('hidden'); }

    // iOS: show step-by-step guidance banner (no beforeinstallprompt on Safari)
    if (isIOS) {
      if (pwaBannerTitle) pwaBannerTitle.textContent = 'Bosh ekranga qo\'shish';
      if (pwaBannerDesc) pwaBannerDesc.innerHTML = 'Ilovani o\'rnatish uchun Safari menyusidagi \'Ulashish\' (Share) tugmasini bosing va \'Bosh ekranga qo\'shish\' ni tanlang.';
      if (iosInstructions) iosInstructions.classList.remove('hidden');
      if (pwaInstallBtn) pwaInstallBtn.classList.add('hidden');
      showBanner();
      if (pwaDismissBtn) {
        pwaDismissBtn.addEventListener('click', function () {
          localStorage.setItem('pwa_install_dismissed', Date.now().toString());
          hideBanner();
        });
      }
      return;
    }

    // Android / Chrome: wait for beforeinstallprompt
    let deferredPromptLocal = null;
    let installTimer = null;

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      window.deferredPrompt = e;
      if (installTimer) clearTimeout(installTimer);
      installTimer = setTimeout(showBanner, 2000);
    });

    window.addEventListener('appinstalled', () => {
      hideBanner();
      if (installTimer) clearTimeout(installTimer);
      installTimer = null;
      deferredPrompt = null;
    });

    if (pwaInstallBtn) {
      pwaInstallBtn.addEventListener('click', function () {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(() => { deferredPrompt = null; hideBanner(); }).catch(() => { hideBanner(); });
        } else { hideBanner(); }
      });
    }

    if (pwaDismissBtn) {
      pwaDismissBtn.addEventListener('click', function () {
        localStorage.setItem('pwa_install_dismissed', Date.now().toString());
        hideBanner();
        if (installTimer) clearTimeout(installTimer);
        installTimer = null;
      });
    }
  })();

  // ==================== SERVICE WORKER & AUTO-UPDATE ====================
  if ('serviceWorker' in navigator) {
    let refreshing = false;

    // Reload once when a new SW takes control of the page (controllerchange)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.register('sw.js?v=1.2.1').then((registration) => {
      // Force an immediate update check on every page load
      registration.update();

      // Detect a new SW that finished installing while the page is open
      registration.addEventListener('updatefound', () => {
        const newSW = registration.active;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          // When the new SW reaches 'activated', force a silent reload so the
          // user never serves stale code from the old cache
          if (newSW.state === 'activated' && !refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      });
    }).catch((err) => { console.warn('[SW] Registration failed:', err); });
  }

  // PIN lock check + full UI re-initialization on page load
  document.addEventListener('DOMContentLoaded', function () {
    // Re-read starting_balance from localStorage to ensure fresh state
    const saved = localStorage.getItem('starting_balance');
    const parsed = parseFloat(saved);
    startingBalance = Number.isFinite(parsed) ? parsed : 0;

    // Render full UI immediately
    updateDashboard();
    applyModeLabels();

    // Then check PIN lock (may overlay on top if a PIN is set)
    checkPinLock();
  });
})();
