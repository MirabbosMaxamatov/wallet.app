(() => { 'use strict'; const STORAGE_KEY = 'app_language'; const DEFAULT_LANG = 'uz';
  const translations = {
    uz: { appTitle: 'Aqlli Hamyoncha', balance: 'Balans', income: 'Kirim', expense: 'Chiqim', startingBalance: "Boshlang'ich pul", transactions: 'Tranzaksiyalar', addTransaction: 'Tranzaksiya qoshish', category: 'Kategoriya', amount: 'Summa', note: 'Tavsif', date: 'Sana', save: 'Saqlash', cancel: 'Bekor qilish', edit: 'Tahrirlash', delete: "O'chirish", archive: 'Arxivlash', reset: "Ma'lumotlarni tozalash", language: 'Til', theme: 'Mavzu', dark: "Qorong'u", light: 'Yoriq', currency: 'Valyuta', profile: 'Profil', more: 'Yana', actions: 'Amallar', close: 'Yopish', noTransactions: "Hozircha tranzaksiyalar yo'q", kirim: 'Kirim', chiqim: 'Chiqim', type: 'Tur', selectType: 'Turing tanlang', selectCategory: 'Kategoriyani tanlang', today: 'Bugun', all: 'Barcha', settings: 'Sozlamalar', security: 'Xavfsizlik', reports: 'Hisobotlar', backupAndReset: 'Zaxira va tozalash', languageSelector: 'Til tanlang', themeSelector: 'Mavzu tanlang', currencySelector: 'Valyuta tanlang', backupExport: 'JSON eksport', backupImport: 'JSON import', resetData: "Ma'lumotlarni tozalash", resetWarning: 'Diqqat! Barcha ma\'lumotlar o\'chib ketadi.', resetCancel: 'Bekor qilish', resetConfirmBtn: 'Tozalash', exportSuccess: 'Eksport muvaffaqiyatli bajarildi', exportEmpty: "Eksport uchun ma'lumotlar yo'q", pdfTitle: 'Aqlli Hamyoncha - Hisobot', csvHeader: 'Sana,Turi,Kategoriya,Summa,Tavsif', unknown: "Noma'lum", other: 'Boshqa', food: 'Oziq-ovqat', transport: 'Transport', salary: 'Maosh', shopping: 'Xarid', utilities: 'Kommunal', remainingBalance: 'Qoldiq', modeSmartWallet: 'Shaxsiy Byudjet', modeFundraising: "Pul Yig'ish", targetAmount: "Yig'ilishi kerak bo'lgan summa", currentBalanceLabel: 'Hozirgi Balans', collectedAmount: "Yig'ilgan summa", spentAmount: 'Ishlatilgan summa', dailyNet: 'Kunlik neto', dateHeader: 'Sana', switchMode: 'Rejimni o\'zgartirish', fundraisingTitle: 'Maqsad (Ehson tadbiri)', fundraisingTargetLabel: "Yig'ilishi kerak bo'lgan summa", fundraisingCurrentBalance: 'Hozirgi Balans', fundraisingTargetTitle: "Yangi Pul Yig'ish Maqsadi", perPerson: 'Har bir kishidan', enterPeopleCount: 'Odamlar sonini kiriting', fundraisingTargetCard: 'MAQSAD:', fundraisingProgress: "Yig'ilish jarayoni", targetGroupType: 'Yig\'ish turi', personal: 'Shaxsiy', family: 'Oila', group: 'Guruh', father: 'Ota', mother: 'Ona', olderBrother: 'Aka', youngerBrother: 'Uka', olderSister: 'Opa', youngerSister: 'Singil', male: 'Erkak', female: 'Ayol', entertainment: "Ko'ngilochar"},
    ru: { appTitle: 'Aqlli Hamyoncha', balance: 'Баланс', income: 'Доход', expense: 'Расход', startingBalance: 'Начальный баланс', transactions: 'Транзакции', addTransaction: 'Добавить транзакцию', category: 'Категория', amount: 'Сумма', note: 'Описание', date: 'Дата', save: 'Сохранить', cancel: 'Отмена', edit: 'Редактировать', delete: 'Удалить', archive: 'Архив', reset: 'Сброс данных', language: 'Язык', theme: 'Тема', dark: 'Темная', light: 'Светлая', currency: 'Валюта', profile: 'Профиль', more: 'Еще', actions: 'Действия', close: 'Закрыть', noTransactions: 'Нет транзакций', kirim: 'Доход', chiqim: 'Расход', type: 'Тип', selectType: 'Выберите тип', selectCategory: 'Выберите категорию', today: 'Сегодня', all: 'Все', settings: 'Настройки', security: 'Безопасность', reports: 'Отчеты', backupAndReset: 'Резервная копия и сброс', languageSelector: 'Выберите язык', themeSelector: 'Выберите тему', currencySelector: 'Выберите валюту', backupExport: 'Экспорт JSON', backupImport: 'Импорт JSON', resetData: 'Сброс данных', resetWarning: 'Внимание! Все данные будут удалены.', resetCancel: 'Отмена', resetConfirmBtn: 'Сброс', exportSuccess: 'Экспорт успешно completion', exportEmpty: 'Нет данных для экспорта', pdfTitle: 'Smart Budget - Отчет', csvHeader: 'Дата,Тип,Категория,Сумма,Описание', unknown: 'Неизвестно', other: 'Другое', food: 'Еда', transport: 'Транспорт', salary: 'Зарплата', shopping: 'Покупки', utilities: 'Коммуналка', remainingBalance: 'Остаток', modeSmartWallet: 'Личный бюджет', modeFundraising: 'Сбор средств', targetAmount: 'Целевая сумма', currentBalanceLabel: 'Текущий баланс', collectedAmount: 'Собранная сумма', spentAmount: 'Потраченная сумма', dailyNet: 'Ежедневный нетто', dateHeader: 'Дата', switchMode: 'Сменить режим', fundraisingTitle: 'Цель (Благотворительное мероприятие)', fundraisingTargetLabel: 'Целевая сумма', fundraisingCurrentBalance: 'Текущий баланс', fundraisingTargetTitle: 'Новая цель сбора средств', perPerson: 'На человека', enterPeopleCount: 'Введите количество людей', fundraisingTargetCard: 'ЦЕЛЬ:', fundraisingProgress: 'Прогресс сбора', targetGroupType: 'Тип сбора', personal: 'Личный', family: 'Семья', group: 'Группа', father: 'Отец', mother: 'Мать', olderBrother: 'Старший брат', youngerBrother: 'Младший брат', olderSister: 'Старшая сестра', youngerSister: 'Младшая сестра', male: 'Мужчина', female: 'Женщина', entertainment: 'Развлечения'},
    en: { appTitle: 'Aqlli Hamyoncha', balance: 'Balance', income: 'Income', expense: 'Expense', startingBalance: 'Starting Balance', transactions: 'Transactions', addTransaction: 'Add Transaction', category: 'Category', amount: 'Amount', note: 'Note', date: 'Date', save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', archive: 'Archive', reset: 'Reset Data', language: 'Language', theme: 'Theme', dark: 'Dark', light: 'Light', currency: 'Currency', profile: 'Profile', more: 'More', actions: 'Actions', close: 'Close', noTransactions: 'No transactions yet', kirim: 'Income', chiqim: 'Expense', type: 'Type', selectType: 'Select type', selectCategory: 'Select category', today: 'Today', all: 'All', settings: 'Settings', security: 'Security', reports: 'Reports', backupAndReset: 'Backup & Reset', languageSelector: 'Select language', themeSelector: 'Select theme', currencySelector: 'Select currency', backupExport: 'Export JSON', backupImport: 'Import JSON', resetData: 'Reset Data', resetWarning: 'Warning! All data will be deleted.', resetCancel: 'Cancel', resetConfirmBtn: 'Reset', exportSuccess: 'Export completed', exportEmpty: 'No data to export', pdfTitle: 'Aqlli Hamyoncha - Report', csvHeader: 'Date,Type,Category,Amount,Note', unknown: 'Unknown', other: 'Other', food: 'Food', transport: 'Transport', salary: 'Salary', shopping: 'Shopping', utilities: 'Utilities', remainingBalance: 'Remaining Balance', modeSmartWallet: 'Personal Budget', modeFundraising: 'Fundraising', targetAmount: 'Target Amount', currentBalanceLabel: 'Current Balance', collectedAmount: 'Collected Amount', spentAmount: 'Spent Amount', dailyNet: 'Daily Net', dateHeader: 'Date', switchMode: 'Switch Mode', fundraisingTitle: 'Goal (Charity Event)', fundraisingTargetLabel: 'Target Amount', fundraisingCurrentBalance: 'Current Balance', fundraisingTargetTitle: 'New Fundraising Goal', perPerson: 'Per person', enterPeopleCount: 'Enter people count', fundraisingTargetCard: 'TARGET:', fundraisingProgress: 'Collection Progress', targetGroupType: 'Collection Type', personal: 'Personal', family: 'Family', group: 'Group', father: 'Father', mother: 'Mother', olderBrother: 'Older Brother', youngerBrother: 'Younger Brother', olderSister: 'Older Sister', youngerSister: 'Younger Sister', male: 'Male', female: 'Female', entertainment: 'Entertainment'}
  };
  Object.assign(translations.uz, {
    totalBalance: 'UMUMIY BALANS',
    scanReceipt: 'Chekni skanerlash',
    analytics: 'Tahlil',
    backup: 'Zaxira nusxa',
    settingsProfile: 'Sozlamalar va profil',
    addToHomeScreen: 'Bosh ekranga qoʻshish',
    newStartingBalance: 'Yangi boshlangʻich pul',
    switchToUSD: 'USD ga oʻtish',
    switchToUZS: 'UZS ga oʻtish',
    installPwaFallback: "O'rnatish uchun brauzer menyusidan 'Bosh ekranga qo'shish'ni tanlang."
  });
  Object.assign(translations.ru, {
    totalBalance: 'ОБЩИЙ БАЛАНС',
    scanReceipt: 'Сканировать чек',
    analytics: 'Аналитика',
    backup: 'Резервная копия',
    settingsProfile: 'Настройки и профиль',
    addToHomeScreen: 'Добавить на главный экран',
    newStartingBalance: 'Новый начальный баланс',
    switchToUSD: 'Переключить на USD',
    switchToUZS: 'Переключить на UZS',
    installPwaFallback: 'Чтобы установить приложение, выберите в меню браузера «Добавить на главный экран».'
  });
  Object.assign(translations.en, {
    totalBalance: 'TOTAL BALANCE',
    scanReceipt: 'Scan Receipt',
    analytics: 'Analytics',
    backup: 'Backup',
    settingsProfile: 'Settings & Profile',
    addToHomeScreen: 'Add to Home Screen',
    newStartingBalance: 'New starting balance',
    switchToUSD: 'Switch to USD',
    switchToUZS: 'Switch to UZS',
    installPwaFallback: 'To install, choose “Add to Home Screen” from your browser menu.'
  });
  Object.assign(translations.uz, {
    onboardingBalance: 'Boshlangʻich balans', onboardingGoal: 'Ixtiyoriy maqsad', onboardingDone: 'Tayyor',
    goalNeedsTitleAndAmount: 'Maqsad nomi va summasini birga kiriting.', recentTransactions: 'Soʻnggi tranzaksiyalar',
    viewAll: 'Barchasi', emptyRecent: 'Hozircha tranzaksiyalar yoʻq. Birinchisini qoʻshing.',
    navHome: 'Bosh sahifa', navHistory: 'Tarix', navAnalytics: 'Tahlil', navDebts: 'Qarzlar', navSettings: 'Sozlamalar',
    iosInstallHelp: 'Safari menyusidan “Ulashish”ni tanlang, soʻng bosh ekranga qoʻshing.'
  });
  Object.assign(translations.ru, {
    onboardingBalance: 'Начальный баланс', onboardingGoal: 'Необязательная цель', onboardingDone: 'Готово',
    goalNeedsTitleAndAmount: 'Укажите название и сумму цели.', recentTransactions: 'Последние операции',
    viewAll: 'Все', emptyRecent: 'Операций пока нет. Добавьте первую.',
    navHome: 'Главная', navHistory: 'История', navAnalytics: 'Аналитика', navDebts: 'Долги', navSettings: 'Настройки',
    iosInstallHelp: 'В меню Safari выберите «Поделиться», затем «На экран Домой».'
  });
  Object.assign(translations.en, {
    onboardingBalance: 'Starting balance', onboardingGoal: 'Optional goal', onboardingDone: 'Done',
    goalNeedsTitleAndAmount: 'Enter both a goal name and amount.', recentTransactions: 'Recent transactions',
    viewAll: 'View all', emptyRecent: 'No transactions yet. Add your first one.',
    navHome: 'Home', navHistory: 'History', navAnalytics: 'Analytics', navDebts: 'Debts', navSettings: 'Settings',
    iosInstallHelp: 'In Safari, choose “Share”, then “Add to Home Screen”.'
  });
  Object.assign(translations.uz, {
    analyticsEyebrow: 'PUL OQIMI', analyticsTitle: 'Xarajatlar tahlili', periodFilter: 'Davr',
    periodWeek: '7 kun', periodMonth: 'Bu oy', periodCustom: 'Maxsus', fromDate: 'Boshlanish', toDate: 'Tugash',
    expenseCategories: 'Xarajat toifalari', incomeExpenseTrend: 'Kirim va chiqim',
    incomeExpenseHint: 'Tanlangan davr bo‘yicha', analyticsEmptyCategories: 'Tanlangan davrda xarajat yoʻq.',
    analyticsEmptyPeriod: 'Tanlangan davrda tranzaksiya yoʻq.', topCategories: 'Eng katta xarajat toifalari',
    topCategoriesHint: 'Xarajatlar summasi bo‘yicha', categoryChartAria: 'Xarajatlar toifalar bo‘yicha',
    incomeExpenseChartAria: 'Kirim va chiqim ustunli diagrammasi', analyticsInvalidRange: 'Sanalar oraligʻini tekshiring.'
  });
  Object.assign(translations.ru, {
    analyticsEyebrow: 'ДЕНЕЖНЫЙ ПОТОК', analyticsTitle: 'Анализ расходов', periodFilter: 'Период',
    periodWeek: '7 дней', periodMonth: 'Этот месяц', periodCustom: 'Выбрать даты', fromDate: 'С', toDate: 'По',
    expenseCategories: 'Категории расходов', incomeExpenseTrend: 'Доходы и расходы',
    incomeExpenseHint: 'За выбранный период', analyticsEmptyCategories: 'За выбранный период расходов нет.',
    analyticsEmptyPeriod: 'За выбранный период операций нет.', topCategories: 'Крупнейшие категории расходов',
    topCategoriesHint: 'По сумме расходов', categoryChartAria: 'Расходы по категориям',
    incomeExpenseChartAria: 'Столбчатая диаграмма доходов и расходов', analyticsInvalidRange: 'Проверьте выбранный диапазон дат.'
  });
  Object.assign(translations.en, {
    analyticsEyebrow: 'CASH FLOW', analyticsTitle: 'Spending analysis', periodFilter: 'Period',
    periodWeek: '7 days', periodMonth: 'This month', periodCustom: 'Custom', fromDate: 'From', toDate: 'To',
    expenseCategories: 'Expense categories', incomeExpenseTrend: 'Income vs expense',
    incomeExpenseHint: 'For the selected period', analyticsEmptyCategories: 'No expenses in this period.',
    analyticsEmptyPeriod: 'No transactions in this period.', topCategories: 'Top spending categories',
    topCategoriesHint: 'Ranked by expense total', categoryChartAria: 'Expenses by category',
    incomeExpenseChartAria: 'Income and expense bar chart', analyticsInvalidRange: 'Check the selected date range.'
  });
  let currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  function t(key) { return (translations[currentLang] && translations[currentLang][key]) || (translations[DEFAULT_LANG] && translations[DEFAULT_LANG][key]) || key; }
  function applyTranslations() { document.querySelectorAll('[data-i18n]').forEach(function(el) { var key = el.getAttribute('data-i18n'); if (key) el.textContent = t(key); }); document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) { var key = el.getAttribute('data-i18n-placeholder'); if (key) el.placeholder = t(key); }); document.querySelectorAll('[data-i18n-aria-label]').forEach(function(el) { var key = el.getAttribute('data-i18n-aria-label'); if (key) el.setAttribute('aria-label', t(key)); }); }
  function setLanguage(lang) { if (!translations[lang]) return; currentLang = lang; localStorage.setItem(STORAGE_KEY, lang); applyTranslations(); if (window.updateCurrencyToggleUI) window.updateCurrencyToggleUI(); if (window.updateDashboard) window.updateDashboard(); if (window.renderTransactions) window.renderTransactions(); if (window.renderArchivedPeriods) window.renderArchivedPeriods(); }
  window.translations = translations;
  window.t = t;
  window.setLanguage = setLanguage;
  window.getCurrentLang = function() { return currentLang; };
  document.addEventListener('DOMContentLoaded', function() { applyTranslations(); });
})();