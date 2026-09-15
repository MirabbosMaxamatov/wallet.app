(() => {
  'use strict';

  // ==================== DATA LAYER ====================
  let startingBalance = parseFloat(localStorage.getItem('starting_balance')) || 0;

  function getTransactions() {
    try { return JSON.parse(localStorage.getItem('transactions')) || []; }
    catch { return []; }
  }
  function setTransactions(txns) {
    localStorage.setItem('transactions', JSON.stringify(txns));
  }
  function getArchivedPeriods() {
    try { return JSON.parse(localStorage.getItem('archived_periods')) || []; }
    catch { return []; }
  }
  function setArchivedPeriods(periods) {
    localStorage.setItem('archived_periods', JSON.stringify(periods));
  }

  // ==================== CALCULATIONS ====================
  function calculateTotals() {
    const txns = getTransactions();
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const t of txns) {
      if (t.type === 'income') totalIncome += t.amount;
      else if (t.type === 'expense') totalExpenses += t.amount;
    }
    const currentBalance = startingBalance + totalIncome - totalExpenses;
    return { startingBalance, totalIncome, totalExpenses, currentBalance };
  }

  // ==================== FORMATTING ====================
  function formatCurrency(value) {
    const num = Number.isFinite(value) ? Math.abs(value) : 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " so'm";
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
  const pwaModal = $('pwa-install-modal');
  const pwaInstallBtn = $('pwa-install-btn');
  const pwaDismissBtn = $('pwa-install-dismiss');
  const iosModal = $('ios-install-modal');
  const iosDismissBtn = $('ios-install-dismiss');
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

  dateInput.valueAsDate = new Date();

  // ==================== UPDATE & RENDER ====================
  function updateDashboard() {
    const { startingBalance, totalIncome, totalExpenses, currentBalance } = calculateTotals();
    startingBalanceAmount.textContent = formatCurrency(startingBalance);
    incomeDisplay.textContent = formatCurrency(totalIncome);
    expenseDisplay.textContent = formatCurrency(totalExpenses);
    balanceDisplay.textContent = formatCurrency(currentBalance);
    if (currentBalance < 0) {
      balanceDisplay.classList.remove('text-slate-100');
      balanceDisplay.classList.add('text-rose-500', 'animate-pulse-rose');
    } else {
      balanceDisplay.classList.remove('text-rose-500', 'animate-pulse-rose');
      balanceDisplay.classList.add('text-slate-100');
    }
    renderTransactions();
    renderArchivedPeriods();
  }

  function renderTransactions() {
    const txns = getTransactions();
    transactionList.innerHTML = '';
    if (txns.length === 0) { emptyState.classList.remove('hidden'); return; }
    emptyState.classList.add('hidden');
    const sorted = [...txns].sort((a, b) => { const dd = new Date(b.date) - new Date(a.date); return dd !== 0 ? dd : b.id - a.id; });
    for (const t of sorted) {
      const isIncome = t.type === 'income';
      const amountStr = formatSignedAmount(t.amount);
      const amtColor = isIncome ? 'text-emerald-400' : 'text-rose-400';
      const catLabel = getCategoryLabel(t.category);
      const primaryText = t.description || t.category;
      const dateStr = formatDate(t.date);
      const li = document.createElement('li');
      li.className = 'bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between gap-3 hover:border-slate-600 transition-all duration-200';
      li.style.minHeight = '72px';
      li.dataset.id = t.id;
      li.innerHTML = '<div class="flex items-center gap-3 min-w-0 flex-1"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ' + (isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400') + '">' + escapeHtml(catLabel) + '</span><div class="min-w-0"><p class="text-slate-100 text-sm font-semibold truncate">' + escapeHtml(primaryText) + '</p><p class="text-slate-400 text-xs mt-0.5">' + dateStr + '</p></div></div><div class="flex items-center gap-2 shrink-0"><span class="text-sm font-bold ' + amtColor + '">' + amountStr + '</span><button type="button" class="edit-btn text-slate-500 hover:text-emerald-400 p-2 rounded-lg hover:bg-emerald-500/10 transition-all duration-200 active:scale-90 min-h-[40px] min-w-[40px]" title="Tahrirlash"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /><path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3" /></svg></button><button type="button" class="delete-btn text-slate-500 hover:text-rose-400 p-2 rounded-lg hover:bg-rose-500/10 transition-all duration-200 active:scale-90 min-h-[40px] min-w-[40px]" title="O\'chirish"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>';
      li.querySelector('.delete-btn').addEventListener('click', () => deleteTransaction(t.id));
      li.querySelector('.edit-btn').addEventListener('click', () => openEditModal(t.id));
      transactionList.appendChild(li);
    }
  }

  function renderArchivedPeriods() {
    const periods = getArchivedPeriods();
    archivedList.innerHTML = '';
    if (periods.length === 0) { archivedEmptyState.classList.remove('hidden'); return; }
    archivedEmptyState.classList.add('hidden');
    for (const period of periods) {
      const dateStr = period.date || new Date(period.createdAt || Date.now()).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' });
      const balanceColor = (Number(period.finalBalance) || 0) < 0 ? 'text-rose-400' : 'text-emerald-400';
      const div = document.createElement('div');
      div.className = 'bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden';
      div.dataset.archiveId = period.id;
      div.innerHTML = `<div class="archive-header flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/30 transition-all duration-200 active:scale-[0.99]"><div class="flex items-center gap-3 min-w-0 flex-1"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 archive-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg><div class="min-w-0"><p class="text-slate-100 text-sm font-semibold truncate">${escapeHtml(period.name || period.periodName || '')}</p><p class="text-slate-500 text-xs">${dateStr}</p></div></div><div class="flex items-center gap-2 sm:gap-3 shrink-0"><span class="text-sm font-bold ${balanceColor}">${formatCurrency(period.finalBalance || 0)}</span><button type="button" class="archive-delete-btn text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all duration-200 active:scale-90 min-h-[36px] min-w-[36px]" title="Arxivni o'chirish"><svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></div><div class="archive-body hidden px-4 pb-4"><div class="border-t border-slate-700/50 pt-3"><p class="text-xs text-slate-500 mb-2">Tranzaksiyalar (${(period.transactions || []).length} ta):</p><div class="space-y-2 max-h-64 overflow-y-auto pr-1">${(period.transactions || []).map(t => { const isInc = t.type === 'income'; const amtColor = isInc ? 'text-emerald-400' : 'text-rose-400'; const catLabel = getCategoryLabel(t.category); return `<div class="flex items-center justify-between bg-slate-800/60 rounded-lg p-2.5"><div class="flex items-center gap-2 min-w-0"><span class="text-xs px-2 py-0.5 rounded-full shrink-0 ${isInc ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">${catLabel}</span><span class="text-slate-300 text-xs truncate">${escapeHtml(t.note || '')}</span></div><span class="text-xs font-bold ${amtColor} shrink-0">${formatSignedAmount(t.amount || 0)}</span></div>`; }).join('')}</div></div></div>`;
      const header = div.querySelector('.archive-header');
      const body = div.querySelector('.archive-body');
      const chevron = div.querySelector('.archive-chevron');
      header.addEventListener('click', (e) => {
        if (e.target.closest('.archive-delete-btn')) return;
        body.classList.toggle('hidden');
        chevron.style.transform = body.classList.contains('hidden') ? '' : 'rotate(180deg)';
      });
      div.querySelector('.archive-delete-btn').addEventListener('click', (e) => { e.stopPropagation(); deleteArchive(period.id); });
      archivedList.appendChild(div);
    }
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
    localStorage.setItem('transactions', JSON.stringify(transactions));
    transactionForm.reset();
    dateInput.valueAsDate = new Date();
    renderTransactions();
    updateDashboard();
  }
  addTransactionBtn.addEventListener('click', function (e) { e.preventDefault(); addTransaction(); });

  // ==================== DELETE TRANSACTION ====================
  function deleteTransaction(id) {
    const transactions = getTransactions().filter((t) => t.id !== id);
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
    editNoteInput.value = t.note || '';
    editModal.classList.remove('hidden');
    editModal.classList.add('flex');
  }
  function closeEditModal() {
    editModal.classList.add('hidden');
    editModal.classList.remove('flex');
  }
  editCancelBtn.addEventListener('click', closeEditModal);
  editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
  editSaveBtn.addEventListener('click', function (e) {
    e.preventDefault();
    const id = Number(editIdInput.value);
    const amount = parseFloat(editAmountInput.value);
    if (isNaN(amount) || amount <= 0) return alert("Iltimos, to'g'ri summa kiriting!");
    const transactions = getTransactions().map((t) => t.id === id ? { ...t, amount, type: editTypeSelect.value, category: editCategorySelect.value, date: editDateInput.value, note: editNoteInput.value.trim() } : t);
    setTransactions(transactions);
    closeEditModal();
    updateDashboard();
  });

  // ==================== ONBOARDING ====================
  const savedBalance = localStorage.getItem('starting_balance');
  if (savedBalance === null || savedBalance === undefined || savedBalance === '') {
    onboardingModal.classList.remove('hidden');
    onboardingModal.classList.add('flex');
    onboardingInput.focus();
  } else {
    updateDashboard();
  }
  onboardingStartBtn.addEventListener('click', function (e) {
    e.preventDefault();
    const val = parseFloat(onboardingInput.value);
    if (!isNaN(val) && val >= 0) {
      startingBalance = val;
      localStorage.setItem('starting_balance', val.toString());
      onboardingModal.classList.add('hidden');
      onboardingModal.classList.remove('flex');
      updateDashboard();
    }
  });
  onboardingModal.addEventListener('click', (e) => { if (e.target === onboardingModal && localStorage.getItem('starting_balance')) { onboardingModal.classList.add('hidden'); onboardingModal.classList.remove('flex'); } });

  // ==================== EDIT STARTING BALANCE ====================
  editBalanceBtn.addEventListener('click', () => {
    editBalanceInput.value = startingBalance;
    editBalanceModal.classList.remove('hidden');
    editBalanceModal.classList.add('flex');
    editBalanceInput.focus();
  });
  cancelEditBalance.addEventListener('click', () => { editBalanceModal.classList.add('hidden'); editBalanceModal.classList.remove('flex'); });
  editBalanceModal.addEventListener('click', (e) => { if (e.target === editBalanceModal) { editBalanceModal.classList.add('hidden'); editBalanceModal.classList.remove('flex'); } });
  editBalanceSubmitBtn.addEventListener('click', function (e) {
    e.preventDefault();
    const val = parseFloat(editBalanceInput.value);
    if (!isNaN(val) && val >= 0) {
      startingBalance = val;
      localStorage.setItem('starting_balance', val.toString());
      editBalanceModal.classList.add('hidden');
      editBalanceModal.classList.remove('flex');
      updateDashboard();
    }
  });

  // ==================== ARCHIVE & RESET ====================
  resetArchiveBtn.addEventListener('click', () => {
    const { currentBalance } = calculateTotals();
    archiveStartingBalanceInput.value = currentBalance.toFixed(2);
    archiveModal.classList.remove('hidden');
    archiveModal.classList.add('flex');
    archiveNameInput.focus();
  });
  cancelArchiveBtn.addEventListener('click', () => { archiveModal.classList.add('hidden'); archiveModal.classList.remove('flex'); });
  archiveModal.addEventListener('click', (e) => { if (e.target === archiveModal) { archiveModal.classList.add('hidden'); archiveModal.classList.remove('flex'); } });
  archiveSubmitBtn.addEventListener('click', function (e) {
    e.preventDefault();
    const periodName = archiveNameInput.value.trim();
    if (!periodName) return alert("Iltimos, davr nomini kiriting!");
    const newStartingBalance = parseFloat(archiveStartingBalanceInput.value);
    if (isNaN(newStartingBalance) || newStartingBalance < 0) return alert("Iltimos, to'g'ri summa kiriting!");
    const txns = getTransactions();
    if (txns.length === 0) return alert('Arxivlash uchun tranzaksiyalar mavjud emas.');
    let totalIncome = 0, totalExpenses = 0;
    for (const t of txns) { if (t.type === 'income') totalIncome += t.amount; else if (t.type === 'expense') totalExpenses += t.amount; }
    const currentBalance = startingBalance + totalIncome - totalExpenses;
    const archive = { id: Date.now(), name: periodName, startingBalance: newStartingBalance, totalIncome, totalExpenses, finalBalance: currentBalance, date: new Date().toLocaleDateString('uz-UZ'), transactions: [...txns] };
    const periods = getArchivedPeriods();
    periods.push(archive);
    setArchivedPeriods(periods);
    startingBalance = newStartingBalance;
    setTransactions([]);
    localStorage.setItem('starting_balance', startingBalance.toString());
    archiveModal.classList.add('hidden');
    archiveModal.classList.remove('flex');
    archiveNameInput.value = '';
    archiveStartingBalanceInput.value = '';
    updateDashboard();
  });

  // ==================== DELETE ARCHIVE ====================
  function deleteArchive(id) {
    const periods = getArchivedPeriods().filter((p) => p.id !== id);
    setArchivedPeriods(periods);
    renderArchivedPeriods();
  }

  // ==================== PWA INSTALL ====================
  (function initPWA() {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) return;
    if (localStorage.getItem('pwa_dismissed') && (Date.now() - parseInt(localStorage.getItem('pwa_dismissed'))) < 86400000) return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
      if (iosModal) { iosModal.classList.remove('hidden'); iosModal.classList.add('flex'); }
      if (iosDismissBtn) {
        iosDismissBtn.addEventListener('click', () => { iosModal.classList.add('hidden'); iosModal.classList.remove('flex'); });
        iosModal.addEventListener('click', (e) => { if (e.target === iosModal) { iosModal.classList.add('hidden'); iosModal.classList.remove('flex'); } });
      }
      return;
    }

    let deferredPrompt = null;
    let installTimer = null;

    function hidePWA() { if (pwaModal) { pwaModal.classList.add('hidden'); pwaModal.classList.remove('flex'); } }

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      if (installTimer) clearTimeout(installTimer);
      installTimer = setTimeout(() => { if (pwaModal) { pwaModal.classList.remove('hidden'); pwaModal.classList.add('flex'); } }, 2000);
    });

    window.addEventListener('appinstalled', () => { hidePWA(); if (installTimer) clearTimeout(installTimer); installTimer = null; });

    if (pwaInstallBtn) {
      pwaInstallBtn.addEventListener('click', function () {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(() => { deferredPrompt = null; hidePWA(); });
        } else { hidePWA(); }
      });
    }
    if (pwaDismissBtn) {
      pwaDismissBtn.addEventListener('click', function () {
        localStorage.setItem('pwa_dismissed', Date.now().toString());
        hidePWA();
        if (installTimer) clearTimeout(installTimer);
        installTimer = null;
      });
    }
  })();

  // ==================== SERVICE WORKER ====================
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

})();
