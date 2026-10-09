(() => {
  'use strict';

  // Financial records live in IndexedDB; localStorage remains for small UI preferences.
  const FINANCIAL_DB_NAME = 'smart-byudjet-financial-data';
  const FINANCIAL_DB_VERSION = 1;
  const FINANCIAL_COLLECTIONS = ['transactions', 'fundraising_transactions'];
  let financialDatabase = null;
  let financialStorageReady = false;
  let financialWriteQueue = Promise.resolve();
  const transactionCache = {
    transactions: [],
    fundraising_transactions: []
  };

  function setStorageNotice(message, isError) {
    const notice = document.getElementById('storage-status');
    if (!notice) return;
    notice.textContent = message;
    notice.classList.toggle('hidden', !message);
    notice.classList.toggle('storage-error', Boolean(isError));
  }

  function openFinancialDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB is not available in this browser.'));
        return;
      }
      const request = indexedDB.open(FINANCIAL_DB_NAME, FINANCIAL_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('barcodeDictionary')) {
          db.createObjectStore('barcodeDictionary', { keyPath: 'code' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open IndexedDB.'));
      request.onblocked = () => reject(new Error('Close other app tabs to finish the storage upgrade.'));
    });
  }

  function readFinancialRecord(storeName, key) {
    return new Promise((resolve, reject) => {
      const request = financialDatabase.transaction(storeName, 'readonly').objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not read financial data.'));
    });
  }

  function writeFinancialCollection(key, data) {
    return new Promise((resolve, reject) => {
      const transaction = financialDatabase.transaction('collections', 'readwrite');
      transaction.objectStore('collections').put({ key, data });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Could not save transactions.'));
      transaction.onabort = () => reject(transaction.error || new Error('Transaction storage was aborted.'));
    });
  }

  function persistFinancialCollection(key, data) {
    const write = financialWriteQueue.then(() => writeFinancialCollection(key, data));
    financialWriteQueue = write.catch((error) => {
      console.error('[storage] Failed to persist collection:', key, error);
      setStorageNotice('Could not save your latest changes. Export a backup and check device storage.', true);
    });
    return write.then(() => true, () => false);
  }

  async function initializeFinancialStorage() {
    financialDatabase = await openFinancialDatabase();
    financialDatabase.onversionchange = () => financialDatabase.close();

    for (const key of FINANCIAL_COLLECTIONS) {
      const record = await readFinancialRecord('collections', key);
      let data = record && Array.isArray(record.data) ? record.data : null;
      if (!data) {
        try {
          const legacyValue = localStorage.getItem(key);
          const legacyData = legacyValue ? JSON.parse(legacyValue) : null;
          if (Array.isArray(legacyData)) {
            data = legacyData;
            await writeFinancialCollection(key, data);
          }
        } catch (error) {
          console.error('[storage] Could not migrate legacy transaction data:', key, error);
          throw new Error('Existing transactions could not be safely migrated. Your old data was left untouched.');
        }
      }
      transactionCache[key] = data || [];
      if (localStorage.getItem(key) !== null) localStorage.removeItem(key);
    }

    financialStorageReady = true;
    setStorageNotice('', false);
  }

  async function getBarcodeDictionaryItem(code) {
    if (!financialStorageReady) throw new Error('Financial storage is not ready.');
    return (await readFinancialRecord('barcodeDictionary', String(code))) || null;
  }

  function saveBarcodeDictionaryItem(item) {
    if (!financialStorageReady) return Promise.reject(new Error('Financial storage is not ready.'));
    return new Promise((resolve, reject) => {
      const transaction = financialDatabase.transaction('barcodeDictionary', 'readwrite');
      transaction.objectStore('barcodeDictionary').put(item);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Could not save the barcode item.'));
      transaction.onabort = () => reject(transaction.error || new Error('Barcode item storage was aborted.'));
    });
  }

  // ==================== CONSTANTS & GLOBAL SETTINGS ====================
  const UZS_PER_USD = 12800;
  let currentCurrency = localStorage.getItem('app_currency_input') || 'UZS';
  let balanceHidden = false;

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
    targetTitle: 'fundraising_target_title',
    targetAmount: 'fundraising_target_amount',
    targetType: 'fundraising_target_type',
    targetScope: 'fundraising_target_scope',
    archivedPeriods: 'fundraising_archived_periods',
    recycleBin: 'fundraising_recycle_bin'
  };

  // ==================== DATA MIGRATION / FALLBACK ====================
  let _migrationDone = false;
  function migrateLegacyData() {
    if (_migrationDone) {
      console.log('[Migration] Already done, skipping');
      return;
    }
    _migrationDone = true;
    console.log('[Migration] Starting localStorage data migration...');
    
    // --- MIGRATE TRANSACTIONS ---
    let fundraisingTxns = [];
    let personalTxns = [];
    
    // Check new mode-scoped keys first
    try {
      const newFundraisingTxns = JSON.parse(localStorage.getItem(FUNDRAISING_KEYS.transactions) || '[]');
      if (Array.isArray(newFundraisingTxns) && newFundraisingTxns.length > 0) {
        fundraisingTxns = newFundraisingTxns;
        console.log('[Migration] Found', fundraisingTxns.length, 'transactions in new fundraising key');
      }
    } catch (e) {
      console.warn('[Migration] Failed to parse new fundraising transactions:', e);
    }
    
    try {
      const newPersonalTxns = JSON.parse(localStorage.getItem('transactions') || '[]');
      if (Array.isArray(newPersonalTxns) && newPersonalTxns.length > 0) {
        personalTxns = newPersonalTxns;
        console.log('[Migration] Found', personalTxns.length, 'transactions in new personal key');
      }
    } catch (e) {
      console.warn('[Migration] Failed to parse new personal transactions:', e);
    }
    
    // Fallback to legacy keys if new keys are empty
    if (fundraisingTxns.length === 0) {
      try {
        const legacyFundraisingTxns = JSON.parse(localStorage.getItem('fundraising_transactions') || '[]');
        if (Array.isArray(legacyFundraisingTxns) && legacyFundraisingTxns.length > 0) {
          fundraisingTxns = legacyFundraisingTxns;
          console.log('[Migration] Restored', fundraisingTxns.length, 'transactions from legacy fundraising_transactions');
          // Save to new key for future use
          localStorage.setItem(FUNDRAISING_KEYS.transactions, JSON.stringify(fundraisingTxns));
        }
      } catch (e) {
        console.warn('[Migration] Failed to parse legacy fundraising transactions:', e);
      }
    }
    
    // Ensure the active mode has the correct transactions in memory
    if (currentMode === 'fundraising' && fundraisingTxns.length > 0) {
      console.log('[Migration] Active mode is fundraising, using', fundraisingTxns.length, 'fundraising transactions');
    } else if (currentMode === 'smart' && personalTxns.length > 0) {
      console.log('[Migration] Active mode is smart, using', personalTxns.length, 'personal transactions');
    }
    
    // --- MIGRATE TARGET DATA ---
    let targetAmount = 0;
    let targetTitle = '';
    let targetType = 'guruh';
    let targetScope = 'hammasi';
    
    // Try new keys first
    try {
      const newTargetAmount = parseFloat(localStorage.getItem(FUNDRAISING_KEYS.targetAmount));
      if (Number.isFinite(newTargetAmount) && newTargetAmount > 0) {
        targetAmount = newTargetAmount;
        console.log('[Migration] Found target amount in new key:', targetAmount);
      }
    } catch (e) {
      console.warn('[Migration] Failed to parse new target amount:', e);
    }
    
    try {
      const newTargetTitle = localStorage.getItem(FUNDRAISING_KEYS.targetTitle);
      if (newTargetTitle) {
        targetTitle = newTargetTitle;
        console.log('[Migration] Found target title in new key:', targetTitle);
      }
    } catch (e) {
      console.warn('[Migration] Failed to parse new target title:', e);
    }
    
    try {
      const newTargetType = localStorage.getItem(FUNDRAISING_KEYS.targetType);
      if (newTargetType) {
        targetType = newTargetType;
      }
    } catch (e) {}
    
    try {
      const newTargetScope = localStorage.getItem(FUNDRAISING_KEYS.targetScope);
      if (newTargetScope) {
        targetScope = newTargetScope;
      }
    } catch (e) {}
    
    // Fallback to legacy keys
    if (targetAmount === 0) {
      try {
        const legacyTarget = parseFloat(localStorage.getItem('fundraising_target'));
        if (Number.isFinite(legacyTarget) && legacyTarget > 0) {
          targetAmount = legacyTarget;
          console.log('[Migration] Restored target amount from legacy fundraising_target:', targetAmount);
          localStorage.setItem(FUNDRAISING_KEYS.targetAmount, targetAmount.toString());
        }
      } catch (e) {
        console.warn('[Migration] Failed to parse legacy target:', e);
      }
    }
    
    if (!targetTitle) {
      try {
        const legacyTitle = localStorage.getItem('fundraising_title');
        if (legacyTitle) {
          targetTitle = legacyTitle;
          console.log('[Migration] Restored target title from legacy fundraising_title:', targetTitle);
          localStorage.setItem(FUNDRAISING_KEYS.targetTitle, targetTitle);
        }
      } catch (e) {
        console.warn('[Migration] Failed to parse legacy title:', e);
      }
    }
    
    // Also check the combined 'target' key
    if (targetAmount === 0) {
      try {
        const combinedTarget = parseFloat(localStorage.getItem(FUNDRAISING_KEYS.target));
        if (Number.isFinite(combinedTarget) && combinedTarget > 0) {
          targetAmount = combinedTarget;
          console.log('[Migration] Restored target amount from combined key:', targetAmount);
          localStorage.setItem(FUNDRAISING_KEYS.targetAmount, targetAmount.toString());
        }
      } catch (e) {}
    }
    
    console.log('[Migration] Final restored state:', {
      mode: currentMode,
      fundraisingTxns: fundraisingTxns.length,
      personalTxns: personalTxns.length,
      targetAmount: targetAmount,
      targetTitle: targetTitle,
      targetType: targetType,
      targetScope: targetScope
    });
    
    return {
      fundraisingTxns,
      personalTxns,
      targetAmount,
      targetTitle,
      targetType,
      targetScope
    };
  }

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
    return transactionCache[FUNDRAISING_KEYS.transactions];
  }
  function setFundraisingTransactions(txns) {
    const previous = transactionCache[FUNDRAISING_KEYS.transactions].slice();
    transactionCache[FUNDRAISING_KEYS.transactions] = txns;
    return persistFinancialCollection(FUNDRAISING_KEYS.transactions, txns).then((saved) => {
      if (!saved && transactionCache[FUNDRAISING_KEYS.transactions] === txns) {
        transactionCache[FUNDRAISING_KEYS.transactions] = previous;
        updateDashboard();
      }
      return saved;
    });
  }
  function getFundraisingTitle() {
    try { 
      const title = localStorage.getItem(FUNDRAISING_KEYS.title) || '';
      console.log('[getFundraisingTitle] Loaded title:', title);
      return title;
    }
    catch { return ''; }
  }
  function setFundraisingTitle(val) {
    localStorage.setItem(FUNDRAISING_KEYS.title, val);
  }
  function getFundraisingTargetTitle() {
    try { 
      const title = localStorage.getItem(FUNDRAISING_KEYS.targetTitle) || '';
      console.log('[getFundraisingTargetTitle] Loaded target title:', title);
      return title;
    }
    catch { return ''; }
  }
  function setFundraisingTargetTitle(val) {
    localStorage.setItem(FUNDRAISING_KEYS.targetTitle, val);
  }
  function getFundraisingTargetAmount() {
    try { 
      const amount = parseFloat(localStorage.getItem(FUNDRAISING_KEYS.targetAmount)) || 0;
      console.log('[getFundraisingTargetAmount] Loaded target amount:', amount);
      return amount;
    }
    catch { return 0; }
  }
  function setFundraisingTargetAmount(val) {
    localStorage.setItem(FUNDRAISING_KEYS.targetAmount, val.toString());
  }
  function getFundraisingTargetType() {
    try { 
      const type = localStorage.getItem(FUNDRAISING_KEYS.targetType) || 'guruh';
      console.log('[getFundraisingTargetType] Loaded target type:', type);
      return type;
    }
    catch { return 'guruh'; }
  }
  function setFundraisingTargetType(val) {
    localStorage.setItem(FUNDRAISING_KEYS.targetType, val);
  }
  function getFundraisingTargetScope() {
    try { 
      const scope = localStorage.getItem(FUNDRAISING_KEYS.targetScope) || 'hammasi';
      console.log('[getFundraisingTargetScope] Loaded target scope:', scope);
      return scope;
    }
    catch { return 'hammasi'; }
  }
  function setFundraisingTargetScope(val) {
    localStorage.setItem(FUNDRAISING_KEYS.targetScope, val);
  }

  function getTransactions() {
    const isFundraising = currentMode === 'fundraising';
    if (isFundraising) return getFundraisingTransactions();
    return transactionCache.transactions;
  }
  function setTransactions(txns) {
    const isFundraising = currentMode === 'fundraising';
    if (isFundraising) return setFundraisingTransactions(txns);
    const previous = transactionCache.transactions.slice();
    transactionCache.transactions = txns;
    return persistFinancialCollection('transactions', txns).then((saved) => {
      if (!saved && transactionCache.transactions === txns) {
        transactionCache.transactions = previous;
        updateDashboard();
      }
      return saved;
    });
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

  // ==================== RECYCLE BIN ====================
  function getRecycleBin() {
    const key = getStorageKey('recycleBin');
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }
  function setRecycleBin(items) {
    const key = getStorageKey('recycleBin');
    localStorage.setItem(key, JSON.stringify(items));
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

  // ==================== MATH EXPRESSION EVALUATOR ====================
  function safeEvaluateExpression(expr) {
    if (!expr || typeof expr !== 'string') return null;
    const cleaned = expr.trim().replace(/[^0-9+\-*/().\s]/g, '');
    if (!cleaned) return null;
    try {
      const fn = new Function('return ' + cleaned);
      const result = fn();
      return Number.isFinite(result) ? result : null;
    } catch {
      return null;
    }
  }

  function evaluateAndUpdateInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const value = input.value.trim();
    const result = safeEvaluateExpression(value);
    const previewId = inputId + '-preview';
    const preview = document.getElementById(previewId);
    if (preview) {
      if (result !== null && value.includes('+') || value.includes('-') || value.includes('*') || value.includes('/')) {
        preview.textContent = '= ' + result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' so\'m';
        preview.style.color = '#34d399';
      } else {
        preview.textContent = formatAmountPreview(value);
      }
    }
    return result;
  }

  function finalizeInputValue(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const value = input.value.trim();
    const result = safeEvaluateExpression(value);
    if (result !== null) {
      input.value = result.toString();
    }
    updateAmountPreview(inputId);
  }

  // ==================== CURRENCY CONVERSION ====================
  function convertCurrency(amount, fromCurrency) {
    if (fromCurrency === 'USD') {
      return amount * UZS_PER_USD;
    }
    return amount;
  }

  function formatCurrencyWithToggle(value, showBoth = false) {
    const uzsValue = currentCurrency === 'USD' ? value * UZS_PER_USD : value;
    const formatted = formatCurrency(uzsValue);
    if (showBoth && currentCurrency === 'USD') {
      return `${formatted} ≈ $${value.toFixed(2)}`;
    }
    if (showBoth && currentCurrency === 'UZS') {
      return `${formatted} ≈ ${(value / UZS_PER_USD).toFixed(2)} $`;
    }
    return formatted;
  }

  function updateCurrencyToggleUI() {
    const toggleBtns = document.querySelectorAll('.currency-input-toggle');
    toggleBtns.forEach(btn => {
      btn.textContent = currentCurrency === 'UZS' ? 'UZS' : 'USD';
      btn.title = currentCurrency === 'UZS' ? 'Switch to USD' : 'Switch to UZS';
    });
    localStorage.setItem('app_currency_input', currentCurrency);
  }

  function toggleInputCurrency() {
    currentCurrency = currentCurrency === 'UZS' ? 'USD' : 'UZS';
    updateCurrencyToggleUI();
    const amountInput = document.getElementById('amount');
    if (amountInput) {
      const preview = document.getElementById('amount-preview');
      if (preview) {
        const val = parseFloat(amountInput.value) || 0;
        if (val > 0) {
          const converted = convertCurrency(val, currentCurrency === 'USD' ? 'UZS' : 'USD');
          preview.textContent = currentCurrency === 'USD' ? `≈ ${converted.toLocaleString('en-US')} so'm` : `≈ $${(val / UZS_PER_USD).toFixed(2)}`;
        }
      }
    }
  }

  // ==================== VELOCITY & PREDICTOR (Fundraising) ====================
  function calculateFundraisingVelocity() {
    const txns = getFundraisingTransactions();
    if (txns.length === 0) return null;

    let totalIncome = 0;
    let dates = new Set();
    for (const t of txns) {
      const amt = Number.isFinite(t.amount) ? t.amount : 0;
      if (t.type === 'income') totalIncome += amt;
      if (t.date) dates.add(t.date);
    }

    if (totalIncome === 0) return null;

    const uniqueDays = dates.size;
    const daysElapsed = Math.max(1, uniqueDays);
    const dailyAverage = totalIncome / daysElapsed;

    const target = getFundraisingTargetAmount() || getFundraisingTarget();
    const { currentBalance } = calculateTotals();
    const remaining = target - currentBalance;

    if (remaining <= 0) return { dailyAverage, remaining: 0, daysLeft: 0, target, currentBalance, totalIncome };

    const daysLeft = Math.ceil(remaining / dailyAverage);
    return { dailyAverage, remaining, daysLeft, target, currentBalance, totalIncome };
  }

  function renderVelocityPredictor() {
    const container = document.getElementById('velocity-predictor');
    if (!container) return;

    const velocity = calculateFundraisingVelocity();
    if (!velocity) {
      container.innerHTML = `
        <div class="text-center py-3 text-slate-400 text-sm">
          Boshlash uchun birinchi kirim tranzaksiyasini kiriting
        </div>
      `;
      return;
    }

    const { dailyAverage, remaining, daysLeft, target, currentBalance } = velocity;
    const isComplete = remaining <= 0;

    container.innerHTML = `
      <div class="bg-slate-700/50 border border-emerald-500/30 rounded-xl p-3">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-emerald-400 text-lg">⚡</span>
          <span class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Sur'at va Taxmin</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-center mb-2">
          <div>
            <p class="text-[10px] text-slate-500 uppercase">Kuniga o'rtacha</p>
            <p class="text-sm font-bold text-emerald-400">${formatCurrency(dailyAverage)}/kun</p>
          </div>
          <div>
            <p class="text-[10px] text-slate-500 uppercase">${isComplete ? 'Maqsadga erishildi' : 'Qolgan kunlar'}</p>
            <p class="text-sm font-bold ${isComplete ? 'text-emerald-400' : 'text-amber-400'}">${isComplete ? '✅' : `~${daysLeft} kun`}</p>
          </div>
        </div>
        <div class="text-xs text-slate-400 text-center border-t border-slate-700/50 pt-2">
          Jami yig'ilgan: ${formatCurrency(currentBalance)} / ${formatCurrency(target)}
          ${remaining > 0 ? ` | Qolgan: ${formatCurrency(remaining)}` : ''}
        </div>
      </div>
    `;
  }

  // ==================== DYNAMIC CATEGORY LOGIC (Fundraising) ====================
  // Level 1: Main categories (for hammasi scope)
  const MAIN_CATEGORIES = [
    { value: 'personal', label: t('personal') || 'Shaxsiy' },
    { value: 'oila', label: t('family') || 'Oila' },
    { value: 'guruh', label: t('group') || 'Guruh' }
  ];

  // Level 2: Sub-categories for each main category
  const PERSONAL_SUB_CATEGORIES = [
    { value: 'Shaxsiy', label: t('personal') || 'Shaxsiy' }
  ];

  const OILA_SUB_CATEGORIES = [
    { value: 'Ota', label: t('father') || 'Ota' },
    { value: 'Ona', label: t('mother') || 'Ona' },
    { value: 'Aka', label: t('olderBrother') || 'Aka' },
    { value: 'Uka', label: t('youngerBrother') || 'Uka' },
    { value: 'Opa', label: t('olderSister') || 'Opa' },
    { value: 'Singil', label: t('youngerSister') || 'Singil' },
    { value: 'Boshqa', label: t('other') || 'Boshqa' }
  ];

  const GURUH_SUB_CATEGORIES = [
    { value: 'Erkak', label: t('male') || 'Erkak' },
    { value: 'Ayol', label: t('female') || 'Ayol' }
  ];

  // Legacy single-scope categories (for backward compatibility)
  const FUNDRAISING_PERSONAL_CATEGORIES = [
    { value: 'Umumiy', label: 'Umumiy' }
  ];

  const FAMILY_CATEGORIES = OILA_SUB_CATEGORIES;
  const GROUP_CATEGORIES = GURUH_SUB_CATEGORIES;

  function getSubCategoriesForMainCategory(mainCategory) {
    switch (mainCategory) {
      case 'oila': return OILA_SUB_CATEGORIES;
      case 'guruh': return GURUH_SUB_CATEGORIES;
      case 'personal':
      default: return PERSONAL_SUB_CATEGORIES;
    }
  }

  function getCategoriesForTargetScope(scope) {
    switch (scope) {
      case 'personal': return FUNDRAISING_PERSONAL_CATEGORIES;
      case 'oila': return OILA_SUB_CATEGORIES;
      case 'guruh': return GROUP_CATEGORIES;
      case 'hammasi': return MAIN_CATEGORIES; // Level 1 categories
      default: return MAIN_CATEGORIES;
    }
  }

  function populateCategorySelect(selectElement, scope, isFundraising = false) {
    if (!selectElement) return;
    const categories = getCategoriesForTargetScope(scope);
    const currentValue = selectElement.value;
    selectElement.innerHTML = '';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.value;
      option.textContent = cat.label;
      selectElement.appendChild(option);
    });
    // Restore value if it exists in new options, otherwise reset
    if (categories.some(c => c.value === currentValue)) {
      selectElement.value = currentValue;
    } else if (categories.length > 0) {
      selectElement.value = categories[0].value;
    }
    // Disable for personal scope
    selectElement.disabled = isFundraising && scope === 'personal';
  }

  function populateSubCategorySelect(selectElement, mainCategory, isFundraising = false) {
    if (!selectElement) return;
    const categories = getSubCategoriesForMainCategory(mainCategory);
    const currentValue = selectElement.value;
    selectElement.innerHTML = '';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.value;
      option.textContent = cat.label;
      selectElement.appendChild(option);
    });
    if (categories.some(c => c.value === currentValue)) {
      selectElement.value = currentValue;
    } else if (categories.length > 0) {
      selectElement.value = categories[0].value;
    }
    selectElement.disabled = isFundraising && mainCategory === 'personal';
  }

  function updateCategorySelectsForMode() {
    const isFundraising = currentMode === 'fundraising';
    const scope = isFundraising ? getFundraisingTargetScope() : 'personal';
    
    // Update main transaction form category select
    const categorySelect = document.getElementById('category');
    populateCategorySelect(categorySelect, scope, isFundraising);
    
    // Update edit modal category select
    const editCategorySelect = document.getElementById('edit-category');
    populateCategorySelect(editCategorySelect, scope, isFundraising);
    
    // Handle cascade selects for hammasi scope
    const isHammasi = isFundraising && scope === 'hammasi';
    const mainCategorySelect = document.getElementById('category-main');
    const subCategorySelect = document.getElementById('category-sub');
    const editMainCategorySelect = document.getElementById('edit-category-main');
    const editSubCategorySelect = document.getElementById('edit-category-sub');
    
    // Wrapper divs for show/hide
    const categorySingleWrapper = document.getElementById('category-single-wrapper');
    const categoryCascadeWrapper = document.getElementById('category-cascade-wrapper');
    const editCascadeWrapper = document.getElementById('edit-category-cascade-wrapper');
    
    if (isHammasi) {
      if (mainCategorySelect) {
        mainCategorySelect.style.display = '';
        populateCategorySelect(mainCategorySelect, 'hammasi', true);
        // Set up change listener
        mainCategorySelect.onchange = function() {
          populateSubCategorySelect(subCategorySelect, this.value, true);
        };
        // Initialize sub-category
        populateSubCategorySelect(subCategorySelect, mainCategorySelect.value, true);
      }
      if (subCategorySelect) subCategorySelect.style.display = '';
      if (categorySelect) categorySelect.style.display = 'none';
      
      // Show cascade wrapper, hide single wrapper
      if (categoryCascadeWrapper) categoryCascadeWrapper.style.display = '';
      if (categorySingleWrapper) categorySingleWrapper.style.display = 'none';
      
      // Edit modal cascade
      if (editCascadeWrapper) editCascadeWrapper.style.display = '';
      if (editCategorySelect) editCategorySelect.style.display = 'none';
      
      if (editMainCategorySelect) {
        populateCategorySelect(editMainCategorySelect, 'hammasi', true);
        editMainCategorySelect.onchange = function() {
          populateSubCategorySelect(editSubCategorySelect, this.value, true);
        };
        populateSubCategorySelect(editSubCategorySelect, editMainCategorySelect.value, true);
      }
      if (editSubCategorySelect) editSubCategorySelect.style.display = '';
    } else {
      if (mainCategorySelect) mainCategorySelect.style.display = 'none';
      if (subCategorySelect) subCategorySelect.style.display = 'none';
      if (categorySelect) categorySelect.style.display = '';
      
      // Show single wrapper, hide cascade wrapper
      if (categoryCascadeWrapper) categoryCascadeWrapper.style.display = 'none';
      if (categorySingleWrapper) categorySingleWrapper.style.display = '';
      
      // Edit modal single select
      if (editCascadeWrapper) editCascadeWrapper.style.display = 'none';
      if (editCategorySelect) editCategorySelect.style.display = '';
      if (editMainCategorySelect) editMainCategorySelect.style.display = 'none';
      if (editSubCategorySelect) editSubCategorySelect.style.display = 'none';
    }
  }

  window.updateCategorySelectsForMode = updateCategorySelectsForMode;

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
  const balanceVisibilityBtn = $('balance-visibility-btn');
  const balanceEyeIcon = $('balance-eye-icon');
  const initialBalanceTrigger = $('initial-balance-trigger');
  const backupModal = $('backup-modal');

  function openOverlayModal(modal) {
    if (!modal) return;
    modal.style.display = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeOverlayModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
  }

  [onboardingModal, $('fundraising-onboarding-modal'), archiveModal, editBalanceModal, backupModal].forEach(function (modal) {
    if (!modal) return;
    modal.addEventListener('click', function (event) {
      if (event.target === modal || event.target.closest('[data-close-modal]')) {
        closeOverlayModal(modal);
      }
    });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    [onboardingModal, $('fundraising-onboarding-modal'), archiveModal, editBalanceModal, backupModal].forEach(function (modal) {
      if (modal && !modal.classList.contains('hidden')) closeOverlayModal(modal);
    });
  });

  dateInput.valueAsDate = new Date();

  function renderBalanceVisibility() {
    if (!balanceDisplay || !balanceVisibilityBtn) return;
    const realValue = balanceDisplay.dataset.realValue || balanceDisplay.textContent;
    balanceDisplay.dataset.realValue = realValue;
    balanceDisplay.textContent = balanceHidden ? '••••••••' : realValue;
    balanceVisibilityBtn.setAttribute('aria-pressed', balanceHidden ? 'true' : 'false');
    balanceVisibilityBtn.setAttribute('aria-label', balanceHidden ? 'Show balance' : 'Hide balance');
    balanceVisibilityBtn.title = balanceHidden ? 'Show balance' : 'Hide balance';
    if (balanceEyeIcon) balanceEyeIcon.textContent = balanceHidden ? '◎' : '◉';
  }
  if (balanceVisibilityBtn) {
    balanceVisibilityBtn.addEventListener('click', function () {
      balanceHidden = !balanceHidden;
      renderBalanceVisibility();
    });
  }
  if (initialBalanceTrigger) {
    initialBalanceTrigger.addEventListener('click', function () {
      if (currentMode === 'fundraising') {
        showFundraisingOnboarding();
        return;
      }
      const title = $('onboarding-modal-title');
      if (title) title.textContent = "Boshlang'ich summani kiriting";
      if (onboardingInput) {
        onboardingInput.value = '';
        onboardingInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      openOverlayModal(onboardingModal);
      if (onboardingInput) onboardingInput.focus();
    });
  }

  const quickScanReceiptBtn = $('quick-scan-receipt');
  if (quickScanReceiptBtn) {
    quickScanReceiptBtn.addEventListener('click', function () {
      const openSheetBtn = $('open-add-transaction-btn');
      if (openSheetBtn) openSheetBtn.click();
      window.setTimeout(function () {
        const qrTab = $('tab-qr');
        if (qrTab) qrTab.click();
      }, 50);
    });
  }
  const quickAnalyticsBtn = $('quick-analytics');
  if (quickAnalyticsBtn) {
    quickAnalyticsBtn.addEventListener('click', function () {
      const analytics = $('dashboard-cards');
      if (analytics) analytics.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  const quickBackupBtn = $('quick-backup');
  if (quickBackupBtn) quickBackupBtn.addEventListener('click', function () { openOverlayModal(backupModal); });
  const backupCopyTextBtn = $('backup-copy-text');
  if (backupCopyTextBtn) backupCopyTextBtn.addEventListener('click', copyBackupText);
  const backupDownloadBtn = $('backup-download-json');
  if (backupDownloadBtn) backupDownloadBtn.addEventListener('click', exportBackup);
  const backupRestoreTextBtn = $('backup-restore-text-btn');
  if (backupRestoreTextBtn) backupRestoreTextBtn.addEventListener('click', restoreBackupText);
  const backupRestoreFile = $('backup-restore-file');
  if (backupRestoreFile) backupRestoreFile.addEventListener('change', handleBackupFileSelection);

  // Live amount preview wiring for all amount inputs
  ['onboarding-input', 'amount', 'edit-amount', 'fundraising-target-input', 'edit-balance-input'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', function () { updateAmountPreview(id); evaluateAndUpdateInput(id); });
      el.addEventListener('blur', function () { finalizeInputValue(id); });
    }
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
      const cardModeLabel = document.getElementById('mode-switch-label-card');
      const balanceLabel = document.querySelector('.hero-card p');
      const sbLabel = document.getElementById('starting-balance-label');
      const sbLabelMobile = document.getElementById('starting-balance-label-mobile');
      const incomeLabel = document.querySelector('.card-income p');
      const expenseLabel = document.querySelector('.card-expense p');

      if (modeBtn) modeBtn.classList.toggle('bg-emerald-600/30', isFundraising);
      if (modeIcon) modeIcon.textContent = isFundraising ? '🎯' : '⚖️';
      if (modeLabel) modeLabel.textContent = isFundraising ? t('modeFundraising') : t('modeSmartWallet');
      if (cardModeLabel) cardModeLabel.textContent = isFundraising ? t('modeFundraising') : t('modeSmartWallet');

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
      
      // Update category dropdowns for the new mode
      updateCategorySelectsForMode();
      
      updateDashboard();
    }
    window.toggleAppMode = toggleAppMode;

    // ==================== FUNDRAISING ONBOARDING ====================
    function showFundraisingOnboarding() {
      const modal = document.getElementById('fundraising-onboarding-modal');
      if (!modal) return;
      
      openOverlayModal(modal);
      
      // Focus on title input first
      const titleInput = document.getElementById('fundraising-title-input');
      if (titleInput) titleInput.focus();
    }
    function saveFundraisingSetup(e) {
      if (e) e.preventDefault();
      
      const titleInput = document.getElementById('fundraising-title-input');
      const targetInput = document.getElementById('fundraising-target-input');
      const groupTypeSelect = document.getElementById('fundraising-group-type-input');
      
      const title = titleInput ? titleInput.value.trim() : '';
      const target = targetInput ? parseFloat(targetInput.value) || 0 : 0;
      const groupType = groupTypeSelect ? groupTypeSelect.value : 'guruh';
      
      if (!title || target <= 0) {
        alert("Iltimos, maqsad nomi va yig'ilishi kerak bo'lgan summani to'g'ri kiriting!");
        return;
      }

      // Save to mode-isolated localStorage
      setFundraisingTitle(title);
      setFundraisingTarget(target);
      setFundraisingTargetTitle(title);
      setFundraisingTargetAmount(target);
      setFundraisingTargetType(groupType);
      
      // Hide modal
      const modal = document.getElementById('fundraising-onboarding-modal');
      closeOverlayModal(modal);
      
      // Clear form
      if (titleInput) titleInput.value = '';
      if (targetInput) targetInput.value = '';
      if (groupTypeSelect) groupTypeSelect.value = 'guruh';
      
      // Update category dropdowns for the new target group type
      updateCategorySelectsForMode();
      
      // Re-render UI
      updateDashboard();
    }
    function closeFundraisingOnboarding() {
      const modal = document.getElementById('fundraising-onboarding-modal');
      closeOverlayModal(modal);
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
        balanceDisplay.dataset.realValue = balanceDisplay.textContent;
        renderBalanceVisibility();
      }

      // Update starting balance banner label dynamically based on mode
      updateStartingBalanceBanner();

      // Update fundraising progress and target cards
      updateFundraisingCards();

      // Update split calculator
      updateSplitCalculator();

      // Update category selects for fundraising mode
      updateCategorySelectsForMode();

      renderTransactions();
      renderArchivedPeriods();
    } catch (e) { console.error('[dashboard] updateDashboard:', e); }
  }

  function updateStartingBalanceBanner() {
    const labelEl = document.getElementById('starting-balance-label');
    const labelMobileEl = document.getElementById('starting-balance-label-mobile');
    const amountEl = document.getElementById('starting-balance-amount');
    const balanceWidget = document.getElementById('starting-balance-banner');
    const balanceEditBtn = document.getElementById('edit-balance-btn');
    const balanceTrigger = document.getElementById('initial-balance-trigger');
    if (!labelEl || !amountEl) return;
    
    const isFundraising = currentMode === 'fundraising';
    let displayedBalance = startingBalance;
    if (isFundraising) {
      const target = getFundraisingTargetAmount() || getFundraisingTarget();
      displayedBalance = target;
      // Set label: "YIG'ILISHI KERAK BO'LGAN SUMMA"
      const labelText = 'YIG\'ILISHI KERAK BO\'LGAN SUMMA';
      if (labelEl) labelEl.textContent = labelText;
      if (labelMobileEl) labelMobileEl.textContent = labelText;
      // Set value only: "[New Target Amount] so'm"
      amountEl.textContent = formatCurrency(target);
    } else {
      if (labelEl) labelEl.textContent = t('startingBalance') || 'Boshlang\'ich Pul';
      if (labelMobileEl) labelMobileEl.textContent = 'B.Pul';
      amountEl.textContent = formatCurrency(startingBalance);
    }
    const hasStartingBalance = Number.isFinite(displayedBalance) && displayedBalance > 0;
    if (balanceWidget) balanceWidget.classList.toggle('is-empty', !hasStartingBalance);
    if (balanceTrigger) balanceTrigger.classList.toggle('hidden', hasStartingBalance);
    if (balanceEditBtn) balanceEditBtn.classList.toggle('hidden', !hasStartingBalance);
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

    // Render velocity predictor
    renderVelocityPredictor();
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

    const isFundraising = currentMode === 'fundraising';
    const scope = isFundraising ? getFundraisingTargetScope() : 'personal';

    let html = '';

    if (isFundraising) {
      // Fundraising mode: hierarchical grouping based on scope
      if (scope === 'hammasi') {
        // 3-tier hierarchy: Main Type -> Sub-Category -> Date
        const mainGroups = {};
        const mainOrder = [];
        
        for (const tx of sorted) {
          const mainCategory = tx.category?.main || 'personal';
          if (!mainGroups[mainCategory]) {
            mainGroups[mainCategory] = {};
            mainOrder.push(mainCategory);
          }
          
          const subCategory = tx.category?.sub || tx.category || 'Boshqa';
          if (!mainGroups[mainCategory][subCategory]) {
            mainGroups[mainCategory][subCategory] = {};
          }
          
          const dateKey = tx.date;
          if (!mainGroups[mainCategory][subCategory][dateKey]) {
            mainGroups[mainCategory][subCategory][dateKey] = [];
          }
          mainGroups[mainCategory][subCategory][dateKey].push(tx);
        }

        const mainLabels = { 'oila': 'OILA', 'guruh': 'GURUH', 'personal': 'SHAXSIY' };
        
        for (const mainCategory of mainOrder) {
          const subGroups = mainGroups[mainCategory];
          const mainLabel = mainLabels[mainCategory] || mainCategory.toUpperCase();
          
          html += `<div class="mb-4">
            <div class="bg-slate-800/80 border border-emerald-500/30 rounded-xl px-4 py-3 mb-3">
              <span class="text-base font-bold text-emerald-400 uppercase tracking-wider">${mainLabel}</span>
            </div>`;
          
          const subLabels = {
            'Dada': '👨 Dada', 'Ona': '👩 Ona', 'Aka': '👨 Aka', 'Uka': '👦 Uka',
            'Opa': '👩 Opa', 'Singil': '👧 Singil', 'Boshqa': '❓ Boshqa',
            'Erkak': '👨 Erkak', 'Ayol': '👩 Ayol',
            'Shaxsiy': '👤 Shaxsiy'
          };
          
          for (const subCategory of Object.keys(subGroups)) {
            const dateGroups = subGroups[subCategory];
            const subLabel = subLabels[subCategory] || subCategory;
            
            html += `<div class="ml-4 mb-3 border-l-2 border-slate-700/50 pl-3">
              <div class="text-sm font-semibold text-slate-300 mb-2">${subLabel}</div>`;
            
            for (const dateKey of Object.keys(dateGroups).sort().reverse()) {
              const txs = dateGroups[dateKey];
              let dayIncome = 0, dayExpense = 0;
              for (const t of txs) {
                const amt = Number.isFinite(t.amount) ? t.amount : 0;
                if (t.type === 'income') dayIncome += amt;
                else if (t.type === 'expense') dayExpense += amt;
              }
              const dayNet = dayIncome - dayExpense;
              const dateStr = formatDateToUZ(dateKey) || formatDateToUZ(new Date().toISOString().split('T')[0]);
              const netColor = dayNet >= 0 ? 'text-emerald-400' : 'text-rose-400';
              const netSign = dayNet >= 0 ? '+' : '';
              
              html += `<div class="ml-2 mb-2">
                <div class="flex items-center justify-between bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 mb-2">
                  <span class="text-sm font-semibold text-slate-200">📅 ${dateStr}</span>
                  <span class="text-xs font-medium ${netColor}">Kunlik: ${netSign}${Math.abs(dayNet).toLocaleString('uz-UZ')} so'm</span>
                </div>
                <ul class="space-y-2 ml-2">`;
              
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
                        <span class="text-slate-400 font-medium">Turi:</span>
                        <span class="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md font-semibold text-xs border border-slate-700/60">
                          ${tx.type === 'income' ? 'Kirim' : 'Chiqim'}
                        </span>
                      </div>
                      <div class="flex items-start justify-between gap-2">
                        <span class="text-slate-400 font-medium shrink-0">Tavsif:</span>
                        <span class="text-slate-200 text-right font-normal break-words">
                          ${descriptionText}
                        </span>
                      </div>
                    </div>
                  </li>`;
              }
              
              html += `</ul></div>`;
            }
            
            html += `</div>`;
          }
          
          html += `</div>`;
        }
      } else if (scope === 'personal') {
        // Single scope: Group by Date only (since category is always 'Umumiy')
        const groups = {};
        const order = [];
        for (const tx of sorted) {
          const key = tx.date;
          if (!groups[key]) { groups[key] = []; order.push(key); }
          groups[key].push(tx);
        }
        
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
          
          html += `<div class="mb-4">
            <div class="flex items-center justify-between bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 mb-2">
              <span class="text-sm font-semibold text-slate-200">📅 ${dateStr}</span>
              <span class="text-xs font-medium ${netColor}">Kunlik: ${netSign}${Math.abs(dayNet).toLocaleString('uz-UZ')} so'm</span>
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
                    <span class="text-slate-400 font-medium">Turi:</span>
                    <span class="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md font-semibold text-xs border border-slate-700/60">
                      ${tx.type === 'income' ? 'Kirim' : 'Chiqim'}
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
      } else {
        // oila or guruh scope: Group 1: Category/Member, Group 2: Date
        const categoryGroups = {};
        const categoryOrder = [];
        
        for (const tx of sorted) {
          const cat = tx.category?.sub || tx.category || 'Boshqa';
          if (!categoryGroups[cat]) {
            categoryGroups[cat] = {};
            categoryOrder.push(cat);
          }
          
          const dateKey = tx.date;
          if (!categoryGroups[cat][dateKey]) {
            categoryGroups[cat][dateKey] = [];
          }
          categoryGroups[cat][dateKey].push(tx);
        }
        
        const subLabels = {
          'Dada': '👨 Dada', 'Ona': '👩 Ona', 'Aka': '👨 Aka', 'Uka': '👦 Uka',
          'Opa': '👩 Opa', 'Singil': '👧 Singil', 'Boshqa': '❓ Boshqa',
          'Erkak': '👨 Erkak', 'Ayol': '👩 Ayol'
        };
        
        for (const cat of categoryOrder) {
          const dateGroups = categoryGroups[cat];
          const catLabel = subLabels[cat] || cat;
          
          html += `<div class="mb-4">
            <div class="bg-slate-800/80 border border-amber-500/30 rounded-xl px-4 py-3 mb-3">
              <span class="text-base font-bold text-amber-400">${catLabel}</span>
            </div>`;
          
          for (const dateKey of Object.keys(dateGroups).sort().reverse()) {
            const txs = dateGroups[dateKey];
            let dayIncome = 0, dayExpense = 0;
            for (const t of txs) {
              const amt = Number.isFinite(t.amount) ? t.amount : 0;
              if (t.type === 'income') dayIncome += amt;
              else if (t.type === 'expense') dayExpense += amt;
            }
            const dayNet = dayIncome - dayExpense;
            const dateStr = formatDateToUZ(dateKey) || formatDateToUZ(new Date().toISOString().split('T')[0]);
            const netColor = dayNet >= 0 ? 'text-emerald-400' : 'text-rose-400';
            const netSign = dayNet >= 0 ? '+' : '';
            
            html += `<div class="ml-4 mb-3 border-l-2 border-slate-700/50 pl-3">
              <div class="flex items-center justify-between bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 mb-2">
                <span class="text-sm font-semibold text-slate-200">📅 ${dateStr}</span>
                <span class="text-xs font-medium ${netColor}">Kunlik: ${netSign}${Math.abs(dayNet).toLocaleString('uz-UZ')} so'm</span>
              </div>
              <ul class="space-y-2 ml-2">`;
            
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
                      <span class="text-slate-400 font-medium">Turi:</span>
                      <span class="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md font-semibold text-xs border border-slate-700/60">
                        ${tx.type === 'income' ? 'Kirim' : 'Chiqim'}
                      </span>
                    </div>
                    <div class="flex items-start justify-between gap-2">
                      <span class="text-slate-400 font-medium shrink-0">Tavsif:</span>
                      <span class="text-slate-200 text-right font-normal break-words">
                        ${descriptionText}
                      </span>
                    </div>
                  </div>
                </li>`;
            }
            
            html += `</ul></div>`;
          }
          
          html += `</div>`;
        }
      }
    } else {
      // Personal/Smart wallet mode: Original grouping by date
      const groups = {};
      const order = [];
      for (const tx of sorted) {
        const key = tx.date;
        if (!groups[key]) { groups[key] = []; order.push(key); }
        groups[key].push(tx);
      }
      
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
          '<div class="archive-actions shrink-0">' +
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
  async function addTransaction() {
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    let category = document.getElementById('category').value;
    const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];
    const description = document.getElementById('note').value.trim();
    if (isNaN(amount) || amount <= 0) {
      alert("Iltimos, to'g'ri summa kiriting!");
      return false;
    }
    
    const isFundraising = currentMode === 'fundraising';
    if (isFundraising) {
      const scope = getFundraisingTargetScope();
      if (scope === 'personal') {
        category = 'Umumiy';
      } else if (scope === 'hammasi') {
        // For hammasi scope, get category from cascade selects
        const mainCategorySelect = document.getElementById('category-main');
        const subCategorySelect = document.getElementById('category-sub');
        const mainCategory = mainCategorySelect ? mainCategorySelect.value : 'personal';
        
        if (mainCategory === 'personal') {
          category = { main: 'personal', sub: 'Shaxsiy' };
        } else {
          category = { main: mainCategory, sub: subCategorySelect ? subCategorySelect.value : 'Boshqa' };
        }
      } else if (scope === 'oila') {
        // Category is already selected from OILA_SUB_CATEGORIES
        category = { main: 'oila', sub: category };
      } else if (scope === 'guruh') {
        // Category is already selected from GROUP_CATEGORIES
        category = { main: 'guruh', sub: category };
      }
    }
    
    const newTx = { id: Date.now(), amount, type, category, date, description };
    const transactions = getTransactions().slice();
    transactions.push(newTx);
    if (!await setTransactions(transactions)) return false;
    transactionForm.reset();
    dateInput.valueAsDate = new Date();
    renderTransactions();
    updateDashboard();
    document.dispatchEvent(new CustomEvent('transaction:saved'));
    return true;
  }
  if (transactionForm) transactionForm.addEventListener('submit', function (e) { e.preventDefault(); addTransaction(); });
  if (addTransactionBtn) addTransactionBtn.addEventListener('click', function (e) { e.preventDefault(); addTransaction(); });

  // ==================== DELETE TRANSACTION ====================
  // Store last deleted transaction for undo
  let lastDeletedTransaction = null;
  let undoTimeout = null;

  async function deleteTransaction(id) {
    const transactions = getTransactions();
    const transactionToDelete = transactions.find((t) => t.id === id);
    
    if (!transactionToDelete) return;

    // Show confirmation dialog
    const confirmed = confirm("Haqiqatdan ham ushbu tranzaksiyani o'chirmoqchimisiz?");
    if (!confirmed) return;

    // Store for undo
    lastDeletedTransaction = transactionToDelete;
    
    // Remove from transactions
    const updatedTransactions = transactions.filter((t) => t.id !== id);
    if (!await setTransactions(updatedTransactions)) return;
    
    // Show undo toast
    showUndoToast();
    
    updateDashboard();
  }

  function showUndoToast() {
    clearTimeout(undoTimeout);
    
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
      info: 'bg-slate-700 text-slate-100',
      warning: 'bg-amber-600 text-white'
    };
    
    toast.className = toast.className.split(' ').filter(function (c) { 
      return c.indexOf('bg-') !== 0 && c.indexOf('text-') !== 0; 
    }).join(' ') + ' ' + palette.warning;
    
    // Create toast with undo button
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <span>Tranzaksiya o'chirildi</span>
        <button id="undo-delete-btn" class="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors">Bejar qilish</button>
      </div>
    `;
    
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100');
    
    // Add undo button handler
    const undoBtn = document.getElementById('undo-delete-btn');
    if (undoBtn) {
      undoBtn.onclick = function() {
        undoDeleteTransaction();
        clearTimeout(undoTimeout);
        toast.classList.add('opacity-0', 'translate-y-2');
      };
    }
    
    // Auto-hide after 5 seconds
    undoTimeout = setTimeout(function () {
      toast.classList.add('opacity-0', 'translate-y-2');
      lastDeletedTransaction = null;
    }, 5000);
  }

  async function undoDeleteTransaction() {
    if (!lastDeletedTransaction) return;
    
    const transactions = getTransactions().slice();
    transactions.push(lastDeletedTransaction);
    if (!await setTransactions(transactions)) return;
    lastDeletedTransaction = null;
    updateDashboard();
    
    // Show success toast
    showToast("Tranzaksiya tiklandi", "success");
  }

  // ==================== EDIT TRANSACTION ====================
  function openEditModal(id) {
    const txns = getTransactions();
    const t = txns.find((tx) => tx.id === id);
    if (!t) return;
    editIdInput.value = t.id;
    editAmountInput.value = t.amount;
    editTypeSelect.value = t.type;
    
    const isFundraising = currentMode === 'fundraising';
    if (isFundraising) {
      const scope = getFundraisingTargetScope();
      if (scope === 'hammasi') {
        // Handle cascade categories
        const mainCategory = t.category?.main || 'personal';
        const subCategory = t.category?.sub || t.category || 'Shaxsiy';
        const mainSelect = document.getElementById('edit-category-main');
        const subSelect = document.getElementById('edit-category-sub');
        if (mainSelect) mainSelect.value = mainCategory;
        if (subSelect) populateSubCategorySelect(subSelect, mainCategory, true), subSelect.value = subCategory;
        if (document.getElementById('edit-category-cascade-wrapper')) document.getElementById('edit-category-cascade-wrapper').style.display = '';
        if (document.getElementById('edit-category')) document.getElementById('edit-category').style.display = 'none';
      } else {
        // Single category select - show sub-category as category
        const subCategory = t.category?.sub || t.category || '';
        editCategorySelect.value = subCategory;
        if (document.getElementById('edit-category-cascade-wrapper')) document.getElementById('edit-category-cascade-wrapper').style.display = 'none';
        if (document.getElementById('edit-category')) document.getElementById('edit-category').style.display = '';
      }
    } else {
      editCategorySelect.value = t.category || '';
    }
    
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
  if (editSaveBtn) editSaveBtn.addEventListener('click', async function (e) {
    e.preventDefault();
    const id = Number(editIdInput.value);
    const amount = parseFloat(editAmountInput.value);
    if (isNaN(amount) || amount <= 0) return alert("Iltimos, to'g'ri summa kiriting!");
    
    let category = editCategorySelect.value;
    const isFundraising = currentMode === 'fundraising';
    if (isFundraising) {
      const scope = getFundraisingTargetScope();
      if (scope === 'hammasi') {
        const mainCategorySelect = document.getElementById('edit-category-main');
        const subCategorySelect = document.getElementById('edit-category-sub');
        const mainCategory = mainCategorySelect ? mainCategorySelect.value : 'personal';
        
        if (mainCategory === 'personal') {
          category = { main: 'personal', sub: 'Shaxsiy' };
        } else {
          category = { main: mainCategory, sub: subCategorySelect ? subCategorySelect.value : 'Boshqa' };
        }
      } else if (scope === 'oila' || scope === 'guruh') {
        // For oila and guruh scopes, the category is the sub-category
        category = { main: scope, sub: editCategorySelect.value };
      } else if (scope === 'personal') {
        category = { main: 'personal', sub: 'Umumiy' };
      }
    }
    
    const transactions = getTransactions().map((t) => {
      if (t.id !== id) return t;
      return { ...t, amount, type: editTypeSelect.value, category, date: editDateInput.value, description: editNoteInput.value.trim() };
    });
    if (!await setTransactions(transactions)) return;
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
  window.toggleInputCurrency = toggleInputCurrency;
  window.finalizeInputValue = finalizeInputValue;
  
  // Quick amount helpers for target edit modal
  window.appendTargetZeros = (z) => { const el = document.getElementById('edit-balance-input'); if (el) { el.value = (el.value || '') + z; el.dispatchEvent(new Event('input', { bubbles: true })); } };
  window.addAmountToTargetInput = (v) => { const el = document.getElementById('edit-balance-input'); if (el) { el.value = (parseFloat(el.value) || 0) + v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
  window.clearTargetInput = () => { const el = document.getElementById('edit-balance-input'); if (el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); } };

  // Run migration early to ensure data is available for onboarding checks
  migrateLegacyData();

  // ==================== ONBOARDING ====================
  // Setup is available from the balance widget; do not trap first-time users in a modal.
  updateDashboard();

  // Default modal title (restored after editing)
  const onboardingTitle = $('onboarding-modal-title');

  if (onboardingStartBtn) onboardingStartBtn.addEventListener('click', function (e) {
    e.preventDefault();
    if (!onboardingInput) return;
    const val = parseFloat(onboardingInput.value);
    if (!isNaN(val) && val >= 0) {
      startingBalance = val;
      localStorage.setItem('starting_balance', val.toString());
      closeOverlayModal(onboardingModal);
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

// ==================== EDIT STARTING BALANCE / TARGET (Desktop & Mobile) ====================
  function openEditBalanceModal() {
    const isFundraising = currentMode === 'fundraising';
    
    if (isFundraising) {
      // Use edit-balance-modal for fundraising with scope selector
      const modal = document.getElementById('edit-balance-modal');
      const amountInput = document.getElementById('edit-balance-input');
      const scopeSelect = document.getElementById('edit-balance-scope');
      const modalTitle = document.getElementById('edit-balance-modal-title');
      
      if (!modal || !amountInput) return;
      
      const currentTarget = getFundraisingTargetAmount() || getFundraisingTarget();
      const currentScope = getFundraisingTargetScope();
      
      // Pre-fill input with the current saved target
      amountInput.value = currentTarget.toString();
      amountInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Set scope
      if (scopeSelect) scopeSelect.value = currentScope;
      
      // Update modal title
      if (modalTitle) {
        modalTitle.textContent = "Maqsadni tahrirlash";
      }
      
      // Update the label for the amount input
      const amountLabel = modal.querySelector('label[for="edit-balance-input"]');
      if (amountLabel) {
        amountLabel.textContent = "Yig'ilishi kerak bo'lgan summa ($)";
      }
      
      // Show the modal
      openOverlayModal(modal);
      amountInput.focus();
    } else {
      // Use onboarding-modal for personal budget
      const modal = document.getElementById('onboarding-modal');
      const amountInput = document.getElementById('onboarding-input');
      const modalTitle = document.getElementById('onboarding-modal-title');

      if (!modal || !amountInput) return;

      const currentBalance = localStorage.getItem('starting_balance') || '0';
      const hasBalance = Number.parseFloat(currentBalance) > 0;

      // Pre-fill input with the current saved balance
      amountInput.value = hasBalance ? currentBalance : '';

      // Trigger the live preview so it displays immediately (e.g. 👉 5 000 000 so'm)
      amountInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Update the modal title to reflect editing mode
      if (modalTitle) {
        modalTitle.textContent = hasBalance
          ? "Boshlang'ich pulni tahrirlash"
          : "Boshlang'ich summani kiriting";
      }

      // Show the modal
      openOverlayModal(modal);
      amountInput.focus();
    }
  }
  window.openEditBalanceModal = openEditBalanceModal;

  // Attach listeners to both desktop and mobile edit buttons
  if (editBalanceBtn) editBalanceBtn.addEventListener('click', openEditBalanceModal);
  ['desktop-edit-balance-btn', 'mobile-edit-balance-btn'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', openEditBalanceModal);
  });

  // Edit balance / target submit handler
  
  if (editBalanceSubmitBtn) {
    editBalanceSubmitBtn.addEventListener('click', function (e) {
      e.preventDefault();
      const amountInput = document.getElementById('edit-balance-input');
      const scopeSelect = document.getElementById('edit-balance-scope');
      
      if (!amountInput) return;
      
      const target = parseFloat(amountInput.value) || 0;
      const scope = scopeSelect ? scopeSelect.value : 'hammasi';
      
      if (target <= 0) {
        alert("Iltimos, to'g'ri summa kiriting!");
        return;
      }
      
      const isFundraising = currentMode === 'fundraising';
      
      if (isFundraising) {
        // Save to mode-isolated localStorage
        setFundraisingTarget(target);
        setFundraisingTargetAmount(target);
        setFundraisingTargetScope(scope);
        
        // Immediately update header and card target elements
        updateFundraisingCards();
        updateStartingBalanceBanner();
      } else {
        // Personal mode - update starting balance
        startingBalance = target;
        localStorage.setItem('starting_balance', target.toString());
        if (startingBalanceAmount) startingBalanceAmount.textContent = formatCurrency(target);
        if (balanceDisplay) {
          const { currentBalance } = calculateTotals();
          balanceDisplay.textContent = formatCurrency(currentBalance);
        }
      }
      
      // Hide modal
      if (editBalanceModal) {
        closeOverlayModal(editBalanceModal);
      }
      
      // Clear form
      if (amountInput) amountInput.value = '';
      if (scopeSelect) scopeSelect.value = 'hammasi';
      
      // Update category dropdowns for the new scope
      updateCategorySelectsForMode();
      
      // Re-render UI
      updateDashboard();
    });
  }
  
  if (cancelEditBalance) {
    cancelEditBalance.addEventListener('click', () => {
      closeOverlayModal(editBalanceModal);
    });
  }

  // ==================== ARCHIVE & RESET ====================
  if (resetArchiveBtn) resetArchiveBtn.addEventListener('click', () => {
    try {
      const { startingBalance: sb, currentBalance } = calculateTotals();
      // Pre-fill the archived period's starting balance (read-only display of what is being archived)
      if (archiveStartingBalanceInput) archiveStartingBalanceInput.value = (Number.isFinite(sb) ? sb : 0).toFixed(2);
      if (archiveModal) {
        openOverlayModal(archiveModal);
      }
      if (archiveNameInput) archiveNameInput.focus();
    } catch (e) { console.error('[archive] resetArchiveBtn:', e); }
  });
  if (cancelArchiveBtn) cancelArchiveBtn.addEventListener('click', () => closeOverlayModal(archiveModal));
  if (archiveSubmitBtn) archiveSubmitBtn.addEventListener('click', async function (e) {
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
      if (!await setTransactions([])) return;
      startingBalance = 0;
      localStorage.setItem('starting_balance', '0');

      // If in fundraising mode, also reset target amount and scope to trigger new setup
      const isFundraising = currentMode === 'fundraising';
      if (isFundraising) {
        setFundraisingTarget(0);
        setFundraisingTargetAmount(0);
        setFundraisingTargetTitle('');
        setFundraisingTargetType('guruh');
        setFundraisingTargetScope('hammasi');
        console.log('[archive] Fundraising mode: reset target amount and scope');
      }

      closeOverlayModal(archiveModal);
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
    return getTransactions();
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
  async function createBackupData() {
    if (!financialStorageReady || !financialDatabase) {
      throw new Error('Financial storage is not ready.');
    }
    await financialWriteQueue;
    const dictionary = await new Promise((resolve, reject) => {
      const request = financialDatabase.transaction('barcodeDictionary', 'readonly')
        .objectStore('barcodeDictionary').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not read barcode data.'));
    });
    return {
      version: '11.0.0',
      exportedAt: new Date().toISOString(),
      startingBalance: localStorage.getItem('starting_balance'),
      mode: currentMode,
      transactions: getTransactions(),
      transactionsByMode: {
        smart: transactionCache.transactions,
        fundraising: transactionCache.fundraising_transactions
      },
      archivedPeriods: getArchivedPeriods(),
      barcodeDictionary: dictionary
    };
  }

  function downloadBackupText(jsonText) {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smart_byudjet_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportBackup() {
    try {
      const data = await createBackupData();
      downloadBackupText(JSON.stringify(data, null, 2));
      setStorageNotice('Backup exported successfully.', false);
    } catch (error) {
      console.error('[backup] Export failed:', error);
      setStorageNotice('Backup export failed. Check the browser storage permissions and try again.', true);
      showToast('Backup yuklab olinmadi. Qayta urinib ko‘ring.', 'error');
    }
  }

  async function copyBackupText() {
    try {
      const jsonText = JSON.stringify(await createBackupData(), null, 2);
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(jsonText);
      } else {
        const copyArea = document.createElement('textarea');
        copyArea.value = jsonText;
        copyArea.setAttribute('readonly', '');
        copyArea.style.position = 'fixed';
        copyArea.style.opacity = '0';
        document.body.appendChild(copyArea);
        copyArea.select();
        const copied = document.execCommand('copy');
        copyArea.remove();
        if (!copied) throw new Error('Clipboard access was denied.');
      }
      showToast("Ma'lumotlar nusxalandi! Telegram 'Izbrannoye'ngizga saqlab qo'ying.", 'success');
    } catch (error) {
      console.error('[backup] Copy failed:', error);
      setStorageNotice('Nusxalash amalga oshmadi. Fayl qilib yuklab olishni sinab ko‘ring.', true);
      showToast('Nusxalash amalga oshmadi. Fayl qilib yuklab olishni sinab ko‘ring.', 'error');
    }
  }

  async function replaceFinancialData(collections, dictionary) {
    await financialWriteQueue;
    return new Promise((resolve, reject) => {
      const transaction = financialDatabase.transaction(['collections', 'barcodeDictionary'], 'readwrite');
      const collectionStore = transaction.objectStore('collections');
      Object.keys(collections).forEach((key) => {
        collectionStore.put({ key, data: collections[key] });
      });
      if (dictionary) {
        const dictionaryStore = transaction.objectStore('barcodeDictionary');
        dictionaryStore.clear();
        dictionary.forEach((item) => dictionaryStore.put(item));
      }
      transaction.oncomplete = () => {
        Object.keys(collections).forEach((key) => { transactionCache[key] = collections[key]; });
        resolve();
      };
      transaction.onerror = () => reject(transaction.error || new Error('Could not restore backup data.'));
      transaction.onabort = () => reject(transaction.error || new Error('Backup restore was aborted.'));
    });
  }

  async function restoreBackupData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Backup must contain a JSON object.');
    }
    const collections = {};
    if (data.transactionsByMode && typeof data.transactionsByMode === 'object') {
      if (Array.isArray(data.transactionsByMode.smart)) collections.transactions = data.transactionsByMode.smart;
      if (Array.isArray(data.transactionsByMode.fundraising)) {
        collections.fundraising_transactions = data.transactionsByMode.fundraising;
      }
    }
    if (Array.isArray(data.transactions) && Object.keys(collections).length === 0) {
      collections[currentMode === 'fundraising' ? 'fundraising_transactions' : 'transactions'] = data.transactions;
    }
    if (Object.keys(collections).length === 0) {
      throw new Error('Backup does not contain a supported transaction list.');
    }
    Object.keys(collections).forEach((key) => {
      if (!collections[key].every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
        throw new Error('Backup contains an invalid transaction list.');
      }
    });
    if (data.archivedPeriods !== undefined && !Array.isArray(data.archivedPeriods)) {
      throw new Error('Archived periods must be a JSON array.');
    }
    if (data.startingBalance !== undefined && data.startingBalance !== null
        && !Number.isFinite(Number(data.startingBalance))) {
      throw new Error('Starting balance must be a number.');
    }
    if (data.barcodeDictionary !== undefined && !Array.isArray(data.barcodeDictionary)) {
      throw new Error('Barcode dictionary must be a JSON array.');
    }
    const dictionary = data.barcodeDictionary === undefined
      ? null
      : data.barcodeDictionary.map((item) => {
        if (!item || typeof item.code !== 'string' || !item.code.trim()
            || !Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0) {
          throw new Error('Backup contains an invalid barcode entry.');
        }
        return { ...item, code: item.code.trim() };
      });
    await replaceFinancialData(collections, dictionary);
    if (data.archivedPeriods) setArchivedPeriods(data.archivedPeriods);
    if (data.startingBalance !== undefined && data.startingBalance !== null) {
      localStorage.setItem('starting_balance', data.startingBalance);
      startingBalance = parseFloat(data.startingBalance) || 0;
    }
    updateDashboard();
    setStorageNotice('Backup imported successfully.', false);
  }

  async function restoreBackupText() {
    const restoreText = $('backup-restore-text');
    const rawText = restoreText ? restoreText.value.trim() : '';
    if (!rawText) {
      showToast('Tiklash uchun backup matnini kiriting.', 'error');
      if (restoreText) restoreText.focus();
      return;
    }
    try {
      await restoreBackupData(JSON.parse(rawText));
      restoreText.value = '';
      closeOverlayModal(backupModal);
      showToast('Ma’lumotlar muvaffaqiyatli tiklandi.', 'success');
    } catch (error) {
      console.error('[backup] Text restore failed:', error);
      setStorageNotice('Backup tiklanmadi. Ma’lumotlar o‘zgartirilmadi.', true);
      showToast('Backup matni noto‘g‘ri yoki tiklab bo‘lmadi.', 'error');
    }
  }

  async function handleBackupFile(file) {
    if (!file) return;
    try {
      const rawText = await file.text();
      await restoreBackupData(JSON.parse(rawText));
      closeOverlayModal(backupModal);
      showToast('Ma’lumotlar muvaffaqiyatli tiklandi.', 'success');
    } catch (error) {
      console.error('[backup] File restore failed:', error);
      setStorageNotice('Backup tiklanmadi. Ma’lumotlar o‘zgartirilmadi.', true);
      showToast('Fayl noto‘g‘ri yoki ma’lumotlarni tiklab bo‘lmadi.', 'error');
    }
  }

  function handleBackupFileSelection(event) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    if (file) handleBackupFile(file);
    input.value = '';
  }

  function importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', (event) => {
      const file = event.currentTarget.files && event.currentTarget.files[0];
      if (file) handleBackupFile(file);
    });
    input.click();
  }

  // ==================== DATA RESET (TOZALASH) ====================
  async function resetAllData() {
    const confirmed = confirm(
      "⚠️ DIQQAT! Barcha tranzaksiyalar va boshlang'ich pul miqdori (balans) butunlay o'chib ketadi.\n\n" +
      "Tozalashdan oldin ma'lumotlarni fayl sifatida yuklab olishni (Backup/CSV) tavsiya etamiz.\n\n" +
      "Davom etishni xohlaysizmi?"
    );
    if (!confirmed) return;

    if (!await setTransactions([])) return;

    // Reset local preferences and balance after the financial store is updated.
    localStorage.removeItem('starting_balance');
    localStorage.removeItem('transactions');
    localStorage.removeItem('app_pin_code');

    // Reset in-memory state
    startingBalance = 0;
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

    navigator.serviceWorker.register('sw.js?v=10.0.0').then((registration) => {
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
  document.addEventListener('DOMContentLoaded', async function () {
    try {
      await initializeFinancialStorage();
      migrateLegacyData();
      var saved = localStorage.getItem('starting_balance');
      var parsed = parseFloat(saved);
      startingBalance = Number.isFinite(parsed) ? parsed : 0;
      updateDashboard();
      applyModeLabels();
      checkPinLock();
      initAddTransactionSheet();
    } catch (err) {
      console.error('App init failed:', err);
      setStorageNotice('Financial data could not be opened safely. Existing backup data has not been replaced. ' + err.message, true);
    }
  });

  // ==================== BOTTOM SHEET + SCANNER ====================
  function initAddTransactionSheet() {
    var sheet    = document.getElementById('add-transaction-sheet');
    var backdrop = document.getElementById('sheet-backdrop');
    var closeBtn = document.getElementById('close-sheet-btn');
    var openBtn  = document.getElementById('open-add-transaction-btn');
    var tabs     = document.querySelectorAll('.sheet-tab');
    if (!sheet || !openBtn) return;

    var activeScanner = null;
    var activeScannerTab = null;
    var scannerStartPromise = null;
    var tabChangeSequence = 0;
    var scanHandled = false;

    function openSheet() {
      sheet.classList.add('open');
      sheet.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      var resultStatus = document.getElementById('scan-result-status');
      if (resultStatus) resultStatus.classList.add('hidden');
      switchTab('manual');
      document.getElementById('amount').focus();
    }

    function closeSheet() {
      tabChangeSequence++;
      stopActiveScanner().then(function () {
        sheet.classList.remove('open');
        sheet.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        openBtn.focus();
      });
    }

    openBtn.addEventListener('click', openSheet);
    if (closeBtn) closeBtn.addEventListener('click', closeSheet);
    if (backdrop) backdrop.addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('open')) closeSheet();
    });

    document.addEventListener('transaction:saved', function () {
      if (sheet.classList.contains('open')) closeSheet();
    });

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { switchTab(tab.dataset.tab); });
    });

    function switchTab(tabName) {
      if (['manual', 'qr', 'barcode'].indexOf(tabName) === -1) return;
      var sequence = ++tabChangeSequence;

      tabs.forEach(function (tab) {
        var isActive = tab.dataset.tab === tabName;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      ['manual', 'qr', 'barcode'].forEach(function (name) {
        var pane = document.getElementById('pane-' + name);
        if (!pane) return;
        var isActive = name === tabName;
        pane.classList.toggle('active', isActive);
        pane.hidden = !isActive;
        pane.style.display = isActive ? 'block' : 'none';
      });

      stopActiveScanner().then(function () {
        if (sequence !== tabChangeSequence || !sheet.classList.contains('open')) return;
        if (tabName === 'qr') {
          startScanner('qr-reader', 'qr-scanner-container', 'qr-status', 'qr');
        } else if (tabName === 'barcode') {
          startScanner('bar-reader', 'bar-scanner-container', 'bar-status', 'barcode');
        }
      });
    }

    async function stopActiveScanner(waitForStart) {
      var scanner = activeScanner;
      if (!scanner) {
        if (waitForStart !== false && scannerStartPromise) await scannerStartPromise;
        scanner = activeScanner;
        if (!scanner) return;
      }

      var scannerTab = activeScannerTab;
      if (waitForStart !== false && scannerStartPromise) await scannerStartPromise;
      if (activeScanner !== scanner) return;

      activeScanner = null;
      activeScannerTab = null;
      try {
        await scanner.stop();
      } catch (error) {
        console.warn('[scanner] Camera stream was already stopped or could not stop:', error);
      } finally {
        try {
          scanner.clear();
        } catch (error) {
          console.warn('[scanner] Scanner UI could not be cleared:', error);
        }
      }
      if (scannerTab) {
        var reader = document.getElementById(scannerTab === 'qr' ? 'qr-reader' : 'bar-reader');
        if (reader) reader.replaceChildren();
      }
    }

    async function startScanner(readerId, containerId, statusId, tabKey) {
      var readerEl = document.getElementById(readerId);
      var containerEl = document.getElementById(containerId);
      if (!readerEl || !containerEl) {
        console.error('[scanner] Scanner element not found:', readerId);
        return;
      }

      containerEl.style.display = 'block';
      readerEl.style.display = 'block';
      readerEl.replaceChildren();
      scanHandled = false;
      showScannerStatus(statusId, '📷', 'Kamera ishga tushirilmoqda…');

      if (typeof Html5Qrcode !== 'function' || typeof Html5QrcodeSupportedFormats === 'undefined') {
        showScannerStatus(statusId, '⚠️', 'Skaner kutubxonasi yuklanmadi. Internet aloqasini tekshiring.');
        return;
      }

      var isBarcode = tabKey === 'barcode';
      var formats = isBarcode ? [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.DATA_MATRIX
      ] : [Html5QrcodeSupportedFormats.QR_CODE];

      var scanner;
      try {
        scanner = new Html5Qrcode(readerId, { formatsToSupport: formats, verbose: false });
      } catch (error) {
        console.error('[scanner] Failed to create scanner:', error);
        showScannerStatus(statusId, '⚠️', 'Skanerni yaratib bo‘lmadi.', error);
        return;
      }

      activeScanner = scanner;
      activeScannerTab = tabKey;
      var scanBoxSize = Math.max(160, Math.min(240, (containerEl.clientWidth || window.innerWidth) - 32));
      scannerStartPromise = scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: scanBoxSize, height: scanBoxSize } },
        async function onSuccess(decodedText) {
          if (scanHandled) return;
          scanHandled = true;
          var amountInput = document.getElementById('amount');
          var resultStatus = document.getElementById('scan-result-status');
          try {
            if (tabKey === 'qr') {
              if (/^https?:\/\/ofd\.soliq\.uz\/check(?:[?#]|$)/i.test(String(decodedText).trim())) {
                showScannerStatus(statusId, '⏳', 'Чек маълумотлари юкланмоқда...');
                showToast('Чек маълумотлари юкланмоқда...', 'info');
              }
              await handleDecodedQrCode(decodedText, amountInput, resultStatus);
              return;
            }

            await stopActiveScanner(false);
            if (tabKey === 'barcode') {
              await handleBarcodeScan(decodedText, amountInput, resultStatus);
            }
            switchTab('manual');
          } catch (error) {
            console.error('[scanner] Could not process scanned data:', error);
            if (resultStatus) {
              resultStatus.textContent = 'The scanned data could not be saved. You can enter it manually.';
              resultStatus.classList.remove('hidden');
            }
            switchTab('manual');
          }
        }
      ).then(function () {
        var statusEl = document.getElementById(statusId);
        if (statusEl && !scanHandled) statusEl.style.display = 'none';
      }).catch(async function (error) {
        if (activeScanner === scanner) {
          activeScanner = null;
          activeScannerTab = null;
        }
        try {
          await scanner.stop();
        } catch (stopError) {
          console.warn('[scanner] No running camera stream to stop after startup failure:', stopError);
        }
        try {
          scanner.clear();
        } catch (clearError) {
          console.warn('[scanner] Failed to clear scanner after startup error:', clearError);
        }
        console.error('[scanner] Camera could not be started:', error);
        var reason = String(error && (error.name || error.message || error));
        if (/NotFoundError|NotFound|no camera|camera device/i.test(reason)) {
          showScannerStatus(statusId, '📷', 'Kamera topilmadi. Qurilmangizda kamera mavjudligini tekshiring.', error);
        } else if (/NotAllowedError|Permission|denied|NotReadableError|SecurityError/i.test(reason)) {
          showScannerStatus(statusId, '🚫', 'Kameraga ruxsat berilmadi. Brauzer sozlamalarida kameraga ruxsat bering.', error);
        } else {
          showScannerStatus(statusId, '⚠️', 'Kamerani ishga tushirib bo‘lmadi.', error);
        }
      }).finally(function () {
        scannerStartPromise = null;
      });
      await scannerStartPromise;
    }

    async function handleDecodedQrCode(decodedText, amountInput, resultStatus) {
      console.log('Scanned QR Code Text:', decodedText);

      await stopActiveScanner(false);

      var scannedUrl = null;
      try {
        scannedUrl = new URL(String(decodedText).trim());
      } catch (error) {
        console.info('[scanner] QR payload is not a URL; parsing it as a regular receipt value.');
      }

      var isSoliqReceipt = scannedUrl &&
        scannedUrl.hostname.toLowerCase() === 'ofd.soliq.uz' &&
        scannedUrl.pathname === '/check';

      if (isSoliqReceipt) {
        await processSoliqQrData(scannedUrl.href, amountInput, resultStatus);
        return;
      }

      var amount = parseScannedValue(String(decodedText || '').trim());
      if (amount !== null) {
        applyScannedAmount(amount, 'Receipt total scanned. Verify it before saving.', amountInput, resultStatus);
      } else if (resultStatus) {
        resultStatus.textContent = 'QR scanned, but no valid amount was found. Enter it manually.';
        resultStatus.classList.remove('hidden');
      }
      switchTab('manual');
    }

    async function processSoliqQrData(qrUrl, amountInput, resultStatus) {
      showToast('Mahsulotlar va summa yuklanmoqda...', 'info');
      if (resultStatus) {
        resultStatus.textContent = 'Mahsulotlar va summa yuklanmoqda...';
        resultStatus.classList.remove('hidden');
      }

      try {
        var receipt = await fetchSoliqReceiptData(qrUrl);
        var totalSum = parseNumericAmount(receipt.totalSum);
        if (totalSum === null) throw new Error('Soliq response did not contain a valid totalSum.');
        if (totalSum > 100000) totalSum /= 100;
        if (!Number.isFinite(totalSum) || totalSum <= 0 || !amountInput) {
          throw new Error('Soliq response contained an invalid total or the amount input is unavailable.');
        }

        var itemsList = formatSoliqReceiptItems(receipt.items);
        amountInput.value = String(totalSum);
        amountInput.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof updateAmountPreview === 'function') updateAmountPreview('amount');
        var descriptionInput = document.getElementById('note');
        if (descriptionInput) descriptionInput.value = itemsList || 'Soliq Chek xaridlari';

        if (Number(amountInput.value) !== totalSum) throw new Error('Soliq total could not be applied to the form.');
        if (resultStatus) {
          resultStatus.textContent = 'Chek summasi va mahsulotlari yuklandi. Tekshirib saqlang.';
          resultStatus.classList.remove('hidden');
        }
        switchTab('manual');
        amountInput.focus();
        showToast('Summa va mahsulotlar joylandi!', 'success');
      } catch (error) {
        console.error('[scanner] Soliq receipt fetch failed:', error);
        switchTab('manual');
        if (resultStatus) {
          resultStatus.textContent = "Chek topildi. Summani qo'lda kiriting.";
          resultStatus.classList.remove('hidden');
        }
        if (amountInput) amountInput.focus();
        showToast("Chek topildi! Summani qo'lda kiriting.", 'info');
      }
    }

    function showScannerStatus(statusId, icon, message, detail) {
      var statusEl = document.getElementById(statusId);
      if (!statusEl) return;
      statusEl.replaceChildren();
      statusEl.style.display = 'block';
      var iconEl = document.createElement('div');
      iconEl.className = 'scanner-icon';
      iconEl.textContent = icon;
      var messageEl = document.createElement('div');
      messageEl.textContent = message;
      statusEl.append(iconEl, messageEl);
      if (detail) {
        var detailEl = document.createElement('div');
        detailEl.style.cssText = 'font-size:0.7rem;color:#64748b;margin-top:0.3rem;';
        detailEl.textContent = String(detail && (detail.message || detail.name) || detail);
        statusEl.appendChild(detailEl);
      }
    }

    function parseScannedValue(raw) {
      if (!raw) return null;
      try {
        var obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          var amountKeys = ['amount', 'total', 'sum', 'price', 'summa', 'narx'];
          var objectKeys = Object.keys(obj);
          for (var i = 0; i < amountKeys.length; i++) {
            var matchingKey = objectKeys.find(function (key) {
              return key.toLowerCase() === amountKeys[i];
            });
            if (matchingKey !== undefined) {
              var parsedValue = parseNumericAmount(obj[matchingKey]);
              if (parsedValue !== null) return parsedValue;
            }
          }
        }
      } catch (error) {
        // Plain-text scanner payloads are expected and handled below.
      }
      var keyedAmount = raw.match(/(?:amount|total|sum|price|summa|narx)\s*[=:]\s*([\d.,\s]+)/i);
      if (keyedAmount) return parseNumericAmount(keyedAmount[1]);
      return parseNumericAmount(raw);
    }

    async function fetchSoliqReceiptData(qrUrl) {
      if (navigator.onLine === false) throw new Error('The device is offline.');
      var receiptUrl = new URL(qrUrl);
      var params = new URLSearchParams();
      ['t', 'r', 'c', 's'].forEach(function (key) {
        var value = receiptUrl.searchParams.get(key);
        if (value !== null) params.set(key, value);
      });
      var apiUrl = 'https://ofd.soliq.uz/api/check?' + params.toString();
      var proxyUrls = [
        'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(apiUrl),
        'https://api.allorigins.win/get?url=' + encodeURIComponent(apiUrl)
      ];
      var lastError = null;

      for (var i = 0; i < proxyUrls.length; i++) {
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 7000);
        try {
          var response = await fetch(proxyUrls[i], { signal: controller.signal });
          if (!response.ok) throw new Error('Soliq proxy request failed with HTTP ' + response.status + '.');
          var body = await response.text();
          var contents = body;

          try {
            var proxyEnvelope = JSON.parse(body);
            if (proxyEnvelope && typeof proxyEnvelope.contents === 'string') {
              contents = proxyEnvelope.contents;
            }
          } catch (error) {
            // Some proxies return the Soliq response directly instead of a JSON envelope.
          }

          var receipt = parseSoliqReceiptContents(contents);
          if (receipt.totalSum !== null || receipt.items.length) return receipt;
          throw new Error('Soliq response did not contain a total or product items.');
        } catch (error) {
          lastError = error;
          console.warn('[scanner] Soliq proxy attempt failed:', proxyUrls[i], error);
        } finally {
          clearTimeout(timeout);
        }
      }
      throw lastError || new Error('Could not retrieve Soliq receipt data.');
    }

    function parseSoliqReceiptContents(contents) {
      var candidates = [String(contents || '')];
      var receipt = { totalSum: null, items: [] };

      function inspectValue(value) {
        if (!value) return;
        if (typeof value === 'string') {
          try {
            inspectValue(JSON.parse(value));
          } catch (error) {
            candidates.push(value);
          }
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(inspectValue);
          return;
        }
        if (typeof value !== 'object') return;

        var nestedReceipt = value.receipt && typeof value.receipt === 'object' ? value.receipt : value;
        if (receipt.totalSum === null && nestedReceipt.totalSum !== undefined) {
          receipt.totalSum = nestedReceipt.totalSum;
        }
        if (!receipt.items.length && Array.isArray(nestedReceipt.items)) {
          receipt.items = nestedReceipt.items;
        }
        ['data', 'result', 'payload', 'props', 'pageProps', '__INITIAL_STATE__'].forEach(function (key) {
          if (value[key] !== undefined) inspectValue(value[key]);
        });
      }

      try {
        inspectValue(JSON.parse(candidates[0]));
      } catch (error) {
        // Soliq may return a rendered HTML page instead of JSON.
      }

      var parsedHtml = null;
      if (typeof DOMParser === 'function' && /<\/?[a-z][\s\S]*>/i.test(candidates[0])) {
        parsedHtml = new DOMParser().parseFromString(candidates[0], 'text/html');
        parsedHtml.querySelectorAll('script').forEach(function (script) {
          if (script.textContent) candidates.push(script.textContent);
        });
        candidates.push(parsedHtml.body ? parsedHtml.body.textContent : '');
      }

      candidates.forEach(function (candidate) {
        if (receipt.totalSum === null) {
          var sumMatch = candidate.match(/\\?"totalSum\\?"\s*:\s*\\?"?([\d.,]+)\\?"?/i) ||
            candidate.match(/To(?:'|’|ʻ|`)?lov\s+uchun\s+jami\s*:?\s*([\d\s.,]+)/i);
          if (sumMatch) receipt.totalSum = sumMatch[1].replace(/\s/g, '');
        }

        if (!receipt.items.length) {
          var itemsArray = extractJsonArrayAfterKey(candidate, 'items');
          if (itemsArray) {
            try {
              receipt.items = JSON.parse(itemsArray);
            } catch (error) {
              try {
                receipt.items = JSON.parse(itemsArray.replace(/\\"/g, '"'));
              } catch (unescapeError) {
                console.warn('[scanner] Could not parse embedded Soliq items array:', unescapeError);
              }
            }
          }
        }
      });

      if (!receipt.items.length && parsedHtml) {
        receipt.items = extractSoliqItemsFromHtml(parsedHtml);
      }

      return {
        totalSum: receipt.totalSum,
        items: Array.isArray(receipt.items) ? receipt.items : []
      };
    }

    function extractSoliqItemsFromHtml(parsedHtml) {
      var tables = Array.from(parsedHtml.querySelectorAll('table'));
      for (var tableIndex = 0; tableIndex < tables.length; tableIndex++) {
        var rows = Array.from(tables[tableIndex].querySelectorAll('tr'));
        if (rows.length < 2) continue;

        var headings = Array.from(rows[0].querySelectorAll('th, td')).map(function (cell) {
          return (cell.textContent || '').trim().toLowerCase();
        });
        var nameIndex = headings.findIndex(function (heading) {
          return /товар|наимен|product|item|mahsulot|nomi/.test(heading);
        });
        var quantityIndex = headings.findIndex(function (heading) {
          return /колич|quantity|qty|miqdor|soni/.test(heading);
        });
        var priceIndex = headings.findIndex(function (heading) {
          return /цена|стоим|price|summa|narx|jami|сумм/.test(heading);
        });
        if (nameIndex < 0) continue;

        var parsedItems = rows.slice(1).map(function (row) {
          var cells = Array.from(row.querySelectorAll('td')).map(function (cell) {
            return (cell.textContent || '').trim();
          });
          if (!cells[nameIndex]) return null;
          return {
            name: cells[nameIndex],
            quantity: quantityIndex >= 0 ? cells[quantityIndex] : 1,
            price: priceIndex >= 0 ? cells[priceIndex] : ''
          };
        }).filter(Boolean);
        if (parsedItems.length) return parsedItems;
      }
      return [];
    }

    function extractJsonArrayAfterKey(source, key) {
      var keyPattern = new RegExp('\\\\?"' + key + '\\\\?"\\s*:\\s*\\[', 'i');
      var match = keyPattern.exec(source);
      if (!match) return null;

      var start = source.indexOf('[', match.index + match[0].lastIndexOf('['));
      var depth = 0;
      var inString = false;
      var escaped = false;
      for (var i = start; i < source.length; i++) {
        var character = source[i];
        if (inString) {
          if (escaped) escaped = false;
          else if (character === '\\') escaped = true;
          else if (character === '"') inString = false;
          continue;
        }
        if (character === '"') inString = true;
        else if (character === '[') depth++;
        else if (character === ']' && --depth === 0) return source.slice(start, i + 1);
      }
      return null;
    }

    function formatSoliqReceiptItems(items) {
      return items.map(function (item) {
        if (!item || typeof item !== 'object') return '';
        var name = item.name || item.productName || item.title || item.product || item.itemName;
        var quantity = item.quantity !== undefined ? item.quantity
          : item.qty !== undefined ? item.qty
            : item.count !== undefined ? item.count
              : item.amount !== undefined ? item.amount : 1;
        var price = item.price !== undefined ? item.price
          : item.unitPrice !== undefined ? item.unitPrice
            : item.totalPrice !== undefined ? item.totalPrice
              : item.amount;
        var parsedPrice = parseNumericAmount(price);
        if (!name) return '';
        if (parsedPrice !== null && parsedPrice > 0) parsedPrice /= 100;
        return String(name).trim() + ' (' + String(quantity || 1) + 'x ' + (parsedPrice !== null ? String(parsedPrice) : '') + ')';
      }).filter(Boolean).join(' | ');
    }
    async function handleBarcodeScan(rawCode, amountInput, resultStatus) {
      const code = String(rawCode || '').trim();
      if (!code) throw new Error('The scanner returned an empty barcode.');

      let item = await getBarcodeDictionaryItem(code);
      if (!item) {
        const priceInput = window.prompt('Barcode ' + code + ' is not saved yet. Enter its price in UZS:');
        if (priceInput === null) {
          if (resultStatus) {
            resultStatus.textContent = 'Barcode scanned. Add its price in the form before saving.';
            resultStatus.classList.remove('hidden');
          }
          return;
        }
        const price = parseNumericAmount(priceInput);
        if (price === null) {
          if (resultStatus) {
            resultStatus.textContent = 'Invalid price. The barcode was not added to your catalog.';
            resultStatus.classList.remove('hidden');
          }
          return;
        }
        const label = window.prompt('Product name (optional):', 'Product ' + code);
        if (label === null) return;
        item = {
          code,
          name: label.trim() || 'Product ' + code,
          amount: price,
          updatedAt: new Date().toISOString()
        };
        await saveBarcodeDictionaryItem(item);
      }

      const amount = parseNumericAmount(item.amount);
      if (amount === null) {
        if (resultStatus) {
          resultStatus.textContent = 'This barcode has no valid saved price. Update it in your catalog.';
          resultStatus.classList.remove('hidden');
        }
        return;
      }
      const descriptionInput = document.getElementById('note');
      if (descriptionInput) descriptionInput.value = item.name || 'Product ' + code;
      applyScannedAmount(amount, 'Barcode item loaded from your offline catalog. Verify and save.', amountInput, resultStatus);
    }

    function applyScannedAmount(amount, message, amountInput, resultStatus) {
      if (amountInput) {
        amountInput.value = String(amount);
        amountInput.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof updateAmountPreview === 'function') updateAmountPreview('amount');
        amountInput.focus();
      }
      if (resultStatus) {
        resultStatus.textContent = message;
        resultStatus.classList.remove('hidden');
      }
    }

    function parseNumericAmount(value) {
      if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
      var matches = String(value).match(/\d[\d\s.,]*/g);
      if (!matches || matches.length !== 1) return null;
      var normalized = matches[0].replace(/\s/g, '');
      var comma = normalized.lastIndexOf(',');
      var period = normalized.lastIndexOf('.');
      if (comma !== -1 && period !== -1) {
        var decimalSeparator = comma > period ? ',' : '.';
        var groupingSeparator = decimalSeparator === ',' ? '.' : ',';
        normalized = normalized.split(groupingSeparator).join('');
        if (decimalSeparator === ',') normalized = normalized.replace(',', '.');
      } else if (comma !== -1 || period !== -1) {
        var separator = comma !== -1 ? ',' : '.';
        var separatorParts = normalized.split(separator);
        if (separatorParts.length > 2 || separatorParts[separatorParts.length - 1].length === 3) {
          normalized = separatorParts.join('');
        } else if (separator === ',') {
          normalized = normalized.replace(',', '.');
        }
      }
      var amount = Number(normalized);
      return Number.isFinite(amount) && amount > 0 ? amount : null;
    }
  }

})();
