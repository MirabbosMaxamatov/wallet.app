(() => { 'use strict'; const STORAGE_KEY = 'app_language'; const DEFAULT_LANG = 'uz';
  const translations = {
    uz: { appTitle: 'Smart Byudjet Tracker', balance: 'Balans', income: 'Kirim', expense: 'Chiqim', startingBalance: "Boshlang'ich pul", transactions: 'Tranzaksiyalar', addTransaction: 'Tranzaksiya qoshish', category: 'Kategoriya', amount: 'Summa', note: 'Tavsif', date: 'Sana', save: 'Saqlash', cancel: 'Bekor qilish', edit: 'Tahrirlash', delete: "O'chirish", archive: 'Arxivlash', reset: "Ma'lumotlarni tozalash", language: 'Til', theme: 'Mavzu', dark: "Qorong'u", light: 'Yoriq', currency: 'Valyuta', profile: 'Profil', more: 'Yana', actions: 'Amallar', close: 'Yopish', noTransactions: "Hozircha tranzaksiyalar yo'q", kirim: 'Kirim', chiqim: 'Chiqim', type: 'Tur', selectType: 'Turing tanlang', selectCategory: 'Kategoriyani tanlang', today: 'Bugun', all: 'Barcha', settings: 'Sozlamalar', security: 'Xavfsizlik', reports: 'Hisobotlar', backupAndReset: 'Zaxira va tozalash', languageSelector: 'Til tanlang', themeSelector: 'Mavzu tanlang', currencySelector: 'Valyuta tanlang', backupExport: 'JSON eksport', backupImport: 'JSON import', resetData: "Ma'lumotlarni tozalash", resetWarning: 'Diqqat! Barcha ma\'lumotlar o\'chib ketadi.', resetCancel: 'Bekor qilish', resetConfirmBtn: 'Tozalash', exportSuccess: 'Eksport muvaffaqiyatli bajarildi', exportEmpty: "Eksport uchun ma'lumotlar yo'q", pdfTitle: 'Smart Byudjet - Hisobot', csvHeader: 'Sana,Turi,Kategoriya,Summa,Tavsif', unknown: "Noma'lum", other: 'Boshqa', food: 'Oziq-ovqat', transport: 'Transport', salary: 'Maosh', shopping: 'Xarid', utilities: 'Kommunal', remainingBalance: 'Qoldiq', modeSmartWallet: 'Shaxsiy Byudjet', modeFundraising: "Pul Yig'ish", targetAmount: "Yig'ilishi kerak bo'lgan summa", currentBalanceLabel: 'Hozirgi Balans', collectedAmount: "Yig'ilgan summa", spentAmount: 'Ishlatilgan summa', dailyNet: 'Kunlik neto', dateHeader: 'Sana', switchMode: 'Rejimni o\'zgartirish', fundraisingTitle: 'Maqsad (Ehson tadbiri)', fundraisingTargetLabel: "Yig'ilishi kerak bo'lgan summa", fundraisingCurrentBalance: 'Hozirgi Balans', fundraisingTargetTitle: "Yangi Pul Yig'ish Maqsadi", perPerson: 'Har bir kishidan', enterPeopleCount: 'Odamlar sonini kiriting', fundraisingTargetCard: 'MAQSAD:', fundraisingProgress: "Yig'ilish jarayoni", targetGroupType: 'Yig\'ish turi', personal: 'Shaxsiy', family: 'Oila', group: 'Guruh', father: 'Ota', mother: 'Ona', olderBrother: 'Aka', youngerBrother: 'Uka', olderSister: 'Opa', youngerSister: 'Singil', male: 'Erkak', female: 'Ayol', entertainment: "Ko'ngilochar"},
    ru: { appTitle: 'Smart Budget Tracker', balance: 'Баланс', income: 'Доход', expense: 'Расход', startingBalance: 'Начальный баланс', transactions: 'Транзакции', addTransaction: 'Добавить транзакцию', category: 'Категория', amount: 'Сумма', note: 'Описание', date: 'Дата', save: 'Сохранить', cancel: 'Отмена', edit: 'Редактировать', delete: 'Удалить', archive: 'Архив', reset: 'Сброс данных', language: 'Язык', theme: 'Тема', dark: 'Темная', light: 'Светлая', currency: 'Валюта', profile: 'Профиль', more: 'Еще', actions: 'Действия', close: 'Закрыть', noTransactions: 'Нет транзакций', kirim: 'Доход', chiqim: 'Расход', type: 'Тип', selectType: 'Выберите тип', selectCategory: 'Выберите категорию', today: 'Сегодня', all: 'Все', settings: 'Настройки', security: 'Безопасность', reports: 'Отчеты', backupAndReset: 'Резервная копия и сброс', languageSelector: 'Выберите язык', themeSelector: 'Выберите тему', currencySelector: 'Выберите валюту', backupExport: 'Экспорт JSON', backupImport: 'Импорт JSON', resetData: 'Сброс данных', resetWarning: 'Внимание! Все данные будут удалены.', resetCancel: 'Отмена', resetConfirmBtn: 'Сброс', exportSuccess: 'Экспорт успешно completion', exportEmpty: 'Нет данных для экспорта', pdfTitle: 'Smart Budget - Отчет', csvHeader: 'Дата,Тип,Категория,Сумма,Описание', unknown: 'Неизвестно', other: 'Другое', food: 'Еда', transport: 'Транспорт', salary: 'Зарплата', shopping: 'Покупки', utilities: 'Коммуналка', remainingBalance: 'Остаток', modeSmartWallet: 'Личный бюджет', modeFundraising: 'Сбор средств', targetAmount: 'Целевая сумма', currentBalanceLabel: 'Текущий баланс', collectedAmount: 'Собранная сумма', spentAmount: 'Потраченная сумма', dailyNet: 'Ежедневный нетто', dateHeader: 'Дата', switchMode: 'Сменить режим', fundraisingTitle: 'Цель (Благотворительное мероприятие)', fundraisingTargetLabel: 'Целевая сумма', fundraisingCurrentBalance: 'Текущий баланс', fundraisingTargetTitle: 'Новая цель сбора средств', perPerson: 'На человека', enterPeopleCount: 'Введите количество людей', fundraisingTargetCard: 'ЦЕЛЬ:', fundraisingProgress: 'Прогресс сбора', targetGroupType: 'Тип сбора', personal: 'Личный', family: 'Семья', group: 'Группа', father: 'Отец', mother: 'Мать', olderBrother: 'Старший брат', youngerBrother: 'Младший брат', olderSister: 'Старшая сестра', youngerSister: 'Младшая сестра', male: 'Мужчина', female: 'Женщина', entertainment: 'Развлечения'},
    en: { appTitle: 'Smart Budget Tracker', balance: 'Balance', income: 'Income', expense: 'Expense', startingBalance: 'Starting Balance', transactions: 'Transactions', addTransaction: 'Add Transaction', category: 'Category', amount: 'Amount', note: 'Note', date: 'Date', save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', archive: 'Archive', reset: 'Reset Data', language: 'Language', theme: 'Theme', dark: 'Dark', light: 'Light', currency: 'Currency', profile: 'Profile', more: 'More', actions: 'Actions', close: 'Close', noTransactions: 'No transactions yet', kirim: 'Income', chiqim: 'Expense', type: 'Type', selectType: 'Select type', selectCategory: 'Select category', today: 'Today', all: 'All', settings: 'Settings', security: 'Security', reports: 'Reports', backupAndReset: 'Backup & Reset', languageSelector: 'Select language', themeSelector: 'Select theme', currencySelector: 'Select currency', backupExport: 'Export JSON', backupImport: 'Import JSON', resetData: 'Reset Data', resetWarning: 'Warning! All data will be deleted.', resetCancel: 'Cancel', resetConfirmBtn: 'Reset', exportSuccess: 'Export completed', exportEmpty: 'No data to export', pdfTitle: 'Smart Budget - Report', csvHeader: 'Date,Type,Category,Amount,Note', unknown: 'Unknown', other: 'Other', food: 'Food', transport: 'Transport', salary: 'Salary', shopping: 'Shopping', utilities: 'Utilities', remainingBalance: 'Remaining Balance', modeSmartWallet: 'Personal Budget', modeFundraising: 'Fundraising', targetAmount: 'Target Amount', currentBalanceLabel: 'Current Balance', collectedAmount: 'Collected Amount', spentAmount: 'Spent Amount', dailyNet: 'Daily Net', dateHeader: 'Date', switchMode: 'Switch Mode', fundraisingTitle: 'Goal (Charity Event)', fundraisingTargetLabel: 'Target Amount', fundraisingCurrentBalance: 'Current Balance', fundraisingTargetTitle: 'New Fundraising Goal', perPerson: 'Per person', enterPeopleCount: 'Enter people count', fundraisingTargetCard: 'TARGET:', fundraisingProgress: 'Collection Progress', targetGroupType: 'Collection Type', personal: 'Personal', family: 'Family', group: 'Group', father: 'Father', mother: 'Mother', olderBrother: 'Older Brother', youngerBrother: 'Younger Brother', olderSister: 'Older Sister', youngerSister: 'Younger Sister', male: 'Male', female: 'Female', entertainment: 'Entertainment'}
  };
  const interfaceTranslations = {
    uz: {
      appTitle: 'Aqlli Hamyoncha', headerSubtitle: 'Kirim va chiqimlarni real vaqtda kuzatib boring',
      totalBalance: 'UMUMIY BALANS', thisMonth: 'Shu oy', moneyOverview: 'Moliyaviy ko‘rinish',
      monthlyExpense: 'Oylik xarajat', totalIncome: 'Jami daromad', accountsCards: 'Hisoblar va kartalar',
      cash: 'Naqd pul', quickClipboardParse: 'Buferdagi SMSni tez tahlil qilish',
      quickCashEntry: 'Tezkor naqd xarajat', addTransaction: 'Tranzaksiya qo‘shish',
      scanReceipt: 'Chekni skanerlash', analytics: 'Tahlil', exportCSV: 'CSV eksport',
      exportJSON: 'JSON eksport', backup: 'Zaxira nusxa', smsInbox: 'SMS xabarlari va tahlil',
      smsInboxDescription: 'To‘lov xabarini shaxsiy tranzaksiyalar tarixiga qo‘shing.',
      incomingRawSMS: 'KELGAN SMS MATNI', parseSMS: 'SMSni tahlil qilish →',
      parsedTransaction: 'Tahlil qilingan tranzaksiya', testDemo: 'Test / Demo',
      supermarket: 'Supermarket', utility: 'Kommunal', other: 'Boshqa',
      quickCashTitle: 'Tezkor naqd xarajat', quickCashHelp: 'To‘liq shaklni ochmasdan xarajat kiriting.',
      cashAmount: 'Summa (UZS)', cashPurpose: 'Nimaga sarflandi?', cashAccount: 'Hisob',
      cashPurposePlaceholder: 'Masalan, tushlik yoki yo‘l haqi', amountPlaceholder: '45000',
      saveExpense: 'Xarajatni saqlash', monthlyExpenses: 'Oylik xarajatlar',
      totalIncomeLabel: 'Jami daromad', accountsAndCards: 'Hisoblar va kartalar',
      merchant: 'Manba', direction: 'Yo‘nalish', category: 'Kategoriya', account: 'Hisob',
      time: 'Vaqt', card: 'Karta', balance: 'Balans', successStatus: 'Muvaffaqiyatli',
      declinedStatus: 'Rad etildi', incomeDirection: 'Kirim', expenseDirection: 'Chiqim',
      parseError: 'SMSdan summa aniqlanmadi. Matnni tekshirib qayta urinib ko‘ring.',
      transactionSaved: 'Tranzaksiya shaxsiy tarixga saqlandi.',
      transactionSaveFailed: 'Tranzaksiyani saqlab bo‘lmadi. Saqlash xabarini tekshiring.',
      enterValidSMS: 'Tahlil qilish uchun summa ko‘rsatilgan SMS kiriting.',
      declinedNotSaved: 'Rad etilgan to‘lov ko‘rsatildi, lekin jami hisobga qo‘shilmadi.',
      clipboardUnavailable: 'Buferga kirib bo‘lmaydi. HTTPS orqali foydalaning yoki SMSni quyiga joylang.',
      clipboardEmpty: 'Bufer bo‘sh. Bank SMSini nusxalab, qayta urinib ko‘ring.',
      clipboardDenied: 'Buferga kirishga ruxsat berilmadi. SMSni quyidagi maydonga joylang.',
      clipboardParseFailed: 'SMS tahlil qilinmadi. Unda summa va valyuta borligini tekshiring.',
      enterPositiveAmount: 'Noldan katta summani kiriting.',
      cashSaveFailed: 'Kiritmani saqlab bo‘lmadi. Saqlash xabarini tekshiring.'
    },
    en: {
      appTitle: 'Aqlli Hamyoncha', headerSubtitle: 'Track income and expenses in real time',
      totalBalance: 'TOTAL BALANCE', thisMonth: 'This month', moneyOverview: 'Money overview',
      monthlyExpense: 'Monthly expense', totalIncome: 'Total income', accountsCards: 'Accounts & cards',
      cash: 'Cash', quickClipboardParse: 'Quick Clipboard Parse', quickCashEntry: 'Quick Cash Entry',
      addTransaction: 'Add Transaction', scanReceipt: 'Scan Receipt', analytics: 'Analytics',
      exportCSV: 'Export CSV', exportJSON: 'Export JSON', backup: 'Backup', smsInbox: 'SMS Inbox & Parsing',
      smsInboxDescription: 'Add a payment notification to your private transaction history.',
      incomingRawSMS: 'INCOMING RAW SMS', parseSMS: 'Parse SMS →',
      parsedTransaction: 'Parsed Transaction', testDemo: 'Test / Demo',
      supermarket: 'Supermarket', utility: 'Utility', other: 'Other',
      quickCashTitle: 'Quick cash entry', quickCashHelp: 'Log an expense without opening the full form.',
      cashAmount: 'Amount (UZS)', cashPurpose: 'What was it for?', cashAccount: 'Account',
      cashPurposePlaceholder: 'e.g. Lunch or taxi', amountPlaceholder: '45000',
      saveExpense: 'Save expense', monthlyExpenses: 'Monthly expenses',
      totalIncomeLabel: 'Total income', accountsAndCards: 'Accounts & cards',
      merchant: 'Merchant', direction: 'Direction', category: 'Category', account: 'Account',
      time: 'Time', card: 'Card', balance: 'Balance', successStatus: 'Successful',
      declinedStatus: 'Declined', incomeDirection: 'Income', expenseDirection: 'Expense',
      parseError: 'Could not detect an amount in this SMS. Check the message and try again.',
      transactionSaved: 'Transaction saved to your private history.',
      transactionSaveFailed: 'Could not save the transaction. Check the storage notice.',
      enterValidSMS: 'Enter an SMS containing an amount to parse.',
      declinedNotSaved: 'Declined payments are shown but not added to your totals.',
      clipboardUnavailable: 'Clipboard access is unavailable. Use HTTPS or paste the SMS below.',
      clipboardEmpty: 'Clipboard is empty. Copy a bank SMS and try again.',
      clipboardDenied: 'Clipboard access was denied. Paste the SMS into the field below.',
      clipboardParseFailed: 'Could not parse this SMS. Check that it includes an amount and currency.',
      enterPositiveAmount: 'Enter an amount greater than zero.',
      cashSaveFailed: 'Could not save this entry. Check the storage notice.'
    },
    ru: {
      appTitle: 'Aqlli Hamyoncha', headerSubtitle: 'Отслеживайте доходы и расходы в реальном времени',
      totalBalance: 'ОБЩИЙ БАЛАНС', thisMonth: 'В этом месяце', moneyOverview: 'Обзор финансов',
      monthlyExpense: 'Расходы за месяц', totalIncome: 'Общий доход', accountsCards: 'Счета и карты',
      cash: 'Наличные', quickClipboardParse: 'Разобрать SMS из буфера', quickCashEntry: 'Быстрый наличный расход',
      addTransaction: 'Добавить транзакцию', scanReceipt: 'Сканировать чек', analytics: 'Аналитика',
      exportCSV: 'Экспорт CSV', exportJSON: 'Экспорт JSON', backup: 'Резервная копия',
      smsInbox: 'Входящие SMS и разбор', smsInboxDescription: 'Добавьте уведомление об оплате в историю транзакций.',
      incomingRawSMS: 'ТЕКСТ ВХОДЯЩЕГО SMS', parseSMS: 'Разобрать SMS →',
      parsedTransaction: 'Распознанная транзакция', testDemo: 'Тест / Демо',
      supermarket: 'Супермаркет', utility: 'Коммунальные услуги', other: 'Другое',
      quickCashTitle: 'Быстрый наличный расход', quickCashHelp: 'Запишите расход без полной формы.',
      cashAmount: 'Сумма (UZS)', cashPurpose: 'На что потрачено?', cashAccount: 'Счёт',
      cashPurposePlaceholder: 'Например, обед или такси', amountPlaceholder: '45000',
      saveExpense: 'Сохранить расход', monthlyExpenses: 'Расходы за месяц',
      totalIncomeLabel: 'Общий доход', accountsAndCards: 'Счета и карты',
      merchant: 'Источник', direction: 'Направление', category: 'Категория', account: 'Счёт',
      time: 'Время', card: 'Карта', balance: 'Баланс', successStatus: 'Успешно',
      declinedStatus: 'Отклонено', incomeDirection: 'Доход', expenseDirection: 'Расход',
      parseError: 'Не удалось определить сумму в SMS. Проверьте сообщение и повторите.',
      transactionSaved: 'Транзакция сохранена в личную историю.',
      transactionSaveFailed: 'Не удалось сохранить транзакцию. Проверьте уведомление о хранилище.',
      enterValidSMS: 'Введите SMS с суммой для разбора.',
      declinedNotSaved: 'Отклонённый платёж показан, но не включён в итог.',
      clipboardUnavailable: 'Буфер недоступен. Используйте HTTPS или вставьте SMS ниже.',
      clipboardEmpty: 'Буфер пуст. Скопируйте SMS банка и повторите.',
      clipboardDenied: 'Доступ к буферу запрещён. Вставьте SMS в поле ниже.',
      clipboardParseFailed: 'Не удалось разобрать SMS. Проверьте сумму и валюту.',
      enterPositiveAmount: 'Введите сумму больше нуля.',
      cashSaveFailed: 'Не удалось сохранить запись. Проверьте уведомление о хранилище.'
    }
  };
  Object.keys(interfaceTranslations).forEach(function (lang) {
    Object.assign(translations[lang], interfaceTranslations[lang]);
  });
  const storedLanguage = localStorage.getItem(STORAGE_KEY);
  let currentLang = translations[storedLanguage] ? storedLanguage : DEFAULT_LANG;
  function t(key) { return (translations[currentLang] && translations[currentLang][key]) || (translations[DEFAULT_LANG] && translations[DEFAULT_LANG][key]) || key; }
  function applyTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach(function(el) { var key = el.getAttribute('data-i18n'); if (key) el.textContent = t(key); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) { var key = el.getAttribute('data-i18n-placeholder'); if (key) el.placeholder = t(key); });
    var languageSelect = document.getElementById('language-select');
    if (languageSelect) languageSelect.value = currentLang;
    document.title = t('appTitle');
    document.dispatchEvent(new CustomEvent('app:language-changed', { detail: { language: currentLang } }));
  }
  function setLanguage(lang) { if (!translations[lang]) return; currentLang = lang; localStorage.setItem(STORAGE_KEY, lang); applyTranslations(); }
  window.translations = translations;
  window.t = t;
  window.setLanguage = setLanguage;
  window.getCurrentLang = function() { return currentLang; };
  document.addEventListener('DOMContentLoaded', function() { applyTranslations(); });
})();