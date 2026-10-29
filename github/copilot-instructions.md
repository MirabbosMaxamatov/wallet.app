# Project: Aqlli Hamyoncha (Smart Wallet)
Personal finance PWA for Uzbek users. 100% client-side, data in localStorage, no backend.
Languages: uz (default), ru, en. Currencies: UZS, USD, RUB. Dark and light themes.

## Rules
- Never hardcode UI text. All strings go through the single i18n dictionary (uz/ru/en).
- Never hardcode a currency symbol. Use the active currency setting.
- Keep existing user data compatible. If the schema changes, add a versioned migration.
- Wrap every localStorage access in try/catch.
- Only one modal may be open at a time.
- Mobile first: must work at 360px width, touch targets at least 44px, no horizontal scroll.
- Both themes must have sufficient contrast. Add aria labels and focus management to modals.
- Keep code modular: state, storage, i18n, UI, parsing in separate modules.
- Do not add a backend or new heavy dependencies without asking.
- Before large changes, explain the plan briefly. After changes, list the files changed.
- Ask before any change that could affect existing user data or product direction.s