---
title: Set default language
component: ./SetDefaultLanguageExample.tsx
category: configuration
priority: 1
keywords: [language, locale, internationalization, i18n, default, preferences]
---

Set the default language for the tldraw editor interface.

---

By default, tldraw automatically detects the user's language preference from their browser settings. However, you can override this by providing initial user preferences with a specific locale when creating a tldraw instance.

This example shows how to set the default language to Spanish (`es`) by providing a custom user with specific language preferences. The language setting affects the interface text, menus, and other UI elements.

The available languages can be found in the `LANGUAGES` constant exported from `@tldraw/editor`. You can use any locale code from the supported languages list.