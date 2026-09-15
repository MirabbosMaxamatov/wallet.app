(() => {
  'use strict';

  // ==================== DATA LAYER ====================
  let startingBalance = parseFloat(localStorage.getItem('starting_balance'));
  if (!Number.isFinite(startingBalance)) startingBalance = 0;

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
  ['onboarding-input', 'amount', 'edit-amount'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { updateAmountPreview(id); });
  });

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
    const container = document.getElementById('transaction-list');
    if (!container) return;

    const transactions = getTransactions();
    if (!transactions || transactions.length === 0) {
      container.innerHTML = `<p class="text-center text-slate-400 py-6 text-sm">Hozircha tranzaksiyalar yo'q</p>`;
      return;
    }

    container.innerHTML = transactions.map(tx => {
      const isIncome = tx.type === 'income';
      const amountSign = isIncome ? '+' : '-';
      const amountColor = isIncome ? 'text-emerald-400' : 'text-rose-400';
      const amountFormatted = parseFloat(tx.amount || 0).toLocaleString('uz-UZ');

      const descriptionText = (tx.description && tx.description.trim() !== '') ? tx.description : 'Izoh kiritilmagan';
      const dateFormatted = formatDateToUZ(tx.date) || formatDateToUZ(new Date().toISOString().split('T')[0]);

      return `
        <li class="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 sm:p-4 flex flex-col gap-3 shadow-md mb-3">
          <!-- TOP ROW: Price & Actions -->
          <div class="flex items-center justify-between border-b border-slate-700/50 pb-2.5">
            <span class="text-base sm:text-lg font-bold ${amountColor}">
              ${amountSign}${amountFormatted} so'm
            </span>
            <div class="flex items-center gap-1.5">
              <button onclick="editTransaction(${tx.id})" class="text-slate-400 hover:text-emerald-400 text-sm p-1 transition-colors" title="Tahrirlash">✏️</button>
              <button onclick="deleteTransaction(${tx.id})" class="text-slate-400 hover:text-rose-400 text-sm p-1 transition-colors" title="O'chirish">🗑️</button>
            </div>
          </div>

          <!-- LIST DETAILS BODY -->
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
        </li>
      `;
    }).join('');
  }

  function renderArchivedPeriods() {
    const periods = getArchivedPeriods();
    archivedList.innerHTML = '';
    if (periods.length === 0) { archivedEmptyState.classList.remove('hidden'); return; }
    archivedEmptyState.classList.add('hidden');
    for (const period of periods) {
      const dateStr = formatDateToUZ(period.date) || formatDateToUZ(new Date(period.createdAt || Date.now()).toISOString().split('T')[0]);
      const balanceColor = (Number(period.finalBalance) || 0) < 0 ? 'text-rose-400' : 'text-emerald-400';
      const div = document.createElement('div');
      div.className = 'bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden';
      div.dataset.archiveId = period.id;
      div.innerHTML = `<div class="archive-header flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/30 transition-all duration-200 active:scale-[0.99]"><div class="flex items-center gap-3 min-w-0 flex-1"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 archive-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg><div class="min-w-0"><p class="text-slate-100 text-sm font-semibold truncate">${escapeHtml(period.name || period.periodName || '')}</p><p class="text-slate-500 text-xs">${dateStr}</p></div></div><div class="flex items-center gap-2 sm:gap-3 shrink-0"><span class="text-sm font-bold ${balanceColor}">${formatCurrency(period.finalBalance || 0)}</span><button type="button" class="archive-delete-btn text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all duration-200 active:scale-90 min-h-[36px] min-w-[36px]" title="Arxivni o'chirish"><svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></div><div class="archive-body hidden px-4 pb-4"><div class="border-t border-slate-700/50 pt-3"><p class="text-xs text-slate-500 mb-2">Tranzaksiyalar (${(period.transactions || []).length} ta):</p><div class="space-y-2 max-h-64 overflow-y-auto pr-1">${(period.transactions || []).map(t => { const isInc = t.type === 'income'; const amtColor = isInc ? 'text-emerald-400' : 'text-rose-400'; const catLabel = getCategoryLabel(t.category); return `<div class="flex items-center justify-between bg-slate-800/60 rounded-lg p-2.5"><div class="flex items-center gap-2 min-w-0"><span class="text-xs px-2 py-0.5 rounded-full shrink-0 ${isInc ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">${catLabel}</span><span class="text-slate-300 text-xs truncate">${escapeHtml(t.description || t.note || '')}</span></div><span class="text-xs font-bold ${amtColor} shrink-0">${formatSignedAmount(t.amount || 0)}</span></div>`; }).join('')}</div></div></div>`;
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
  transactionForm.addEventListener('submit', function (e) { e.preventDefault(); addTransaction(); });
  addTransactionBtn.addEventListener('click', function (e) { e.preventDefault(); addTransaction(); });

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
  editCancelBtn.addEventListener('click', closeEditModal);
  editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
  editSaveBtn.addEventListener('click', function (e) {
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
  if (shouldShowOnboarding) {
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
  onboardingInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onboardingStartBtn.click();
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
    const { totalIncome, totalExpenses, currentBalance } = calculateTotals();
    const safeIncome = Number.isFinite(totalIncome) ? totalIncome : 0;
    const safeExpenses = Number.isFinite(totalExpenses) ? totalExpenses : 0;
    const safeBalance = Number.isFinite(currentBalance) ? currentBalance : newStartingBalance;
    const archive = { id: Date.now(), name: periodName, startingBalance: newStartingBalance, totalIncome: safeIncome, totalExpenses: safeExpenses, finalBalance: safeBalance, date: formatDateToUZ(new Date().toISOString().split('T')[0]), transactions: [...txns] };
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
    // If the user reset the starting balance to 0, re-open onboarding
    if (newStartingBalance === 0) {
      onboardingModal.classList.remove('hidden');
      onboardingModal.classList.add('flex');
      onboardingInput.focus();
    }
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
      const row = `"${t.date || ''}","${t.type === 'income' ? 'Kirim' : 'Chiqim'}","${(t.category || '').replace(/"/g, '""')}","${t.amount || 0}","${(t.description || '').replace(/"/g, '""')}"`;
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
  function toggleMoreSection() {
    const body = $('more-body');
    const chevron = $('more-chevron');
    if (!body) return;
    body.classList.toggle('hidden');
    if (chevron) chevron.style.transform = body.classList.contains('hidden') ? '' : 'rotate(180deg)';
  }
  function toggleTheme() {
    const btn = $('theme-toggle');
    if (!btn) return;
    const isLight = document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark', !isLight);
    localStorage.setItem('app_theme', isLight ? 'light' : 'dark');
    btn.textContent = isLight ? '☀️ Light' : '🌙 Dark';
  }

  // ==================== PWA INSTALL ====================
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
    let deferredPrompt = null;
    let installTimer = null;

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
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

})();
