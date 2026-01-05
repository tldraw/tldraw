---
title: Language picker
component: ./LanguagePickerExample.tsx
category: ui
priority: 3
keywords: [locale, language, i18n, internationalization, translation, preferences]
---

Change the editor's locale with a language picker.

---

This example demonstrates how to build a language picker that changes the editor's locale. This is useful when you need to:

- Sync tldraw's language with your app's language setting
- Let users choose their preferred language from a dropdown
- Override browser language preferences

The example shows how to:

1. Read the current locale reactively using `useValue` and `editor.user.getLocale()`
2. Update the locale using `editor.user.updateUserPreferences({ locale })`
3. Access available languages from the `LANGUAGES` constant

The language preference is automatically persisted to local storage and will be remembered across sessions.
