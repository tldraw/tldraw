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
    plural,
    ICU,
  ]
---

Override tldraw's translation strings and read them in your own components with `useTranslation`.

---

Apps often need to customize UI text to match their brand voice or terminology. The `translations` override on the `overrides` prop maps a language code to translation keys and strings; you can replace existing keys (here "Duplicate" becomes "Make a copy" and "Delete" becomes "Remove") or add new ones, in as many languages as you like.

The `useTranslation` hook returns a `msg` function that looks up a key in the current language, so custom components render the same strings as tldraw's built-in menus. Right click a shape to see the overrides in the context menu, or switch the language to Spanish from the language submenu in the main menu.

Strings are ICU messages, so the selection count here is one string that reads correctly for any number rather than a choice made in code. Each language gets its own plural categories, which is the part code can't do on its behalf: Arabic has six of them, Polish four.
