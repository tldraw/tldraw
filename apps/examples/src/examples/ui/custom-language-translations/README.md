---
title: Custom translations and overrides
component: ./CustomLanguageTranslationExample.tsx
priority: 70
keywords:
  [
    translation,
    i18n,
    localization,
    language,
    useTranslation,
    overrides,
    multilingual,
    custom text,
    brand voice,
  ]
---

Override tldraw's translation strings and read them in your own components with `useTranslation`.

---

Apps often need to customize UI text to match their brand voice or terminology. The `translations` override on the `overrides` prop maps a language code to translation keys and strings; you can replace existing keys (here "Duplicate" becomes "Make a copy" and "Delete" becomes "Remove") or add new ones, in as many languages as you like.

The `useTranslation` hook returns a `msg` function that looks up a key in the current language, so custom components render the same strings as tldraw's built-in menus. Right click a shape to see the overrides in the context menu, or switch the language to Spanish from the language submenu in the main menu.
