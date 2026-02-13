---
title: Custom translations and overrides
component: ./CustomLanguageTranslationExample.tsx
category: ui
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

Customize tldraw's translation strings and use them in custom components.

---

Apps often need to customize UI text to match their brand voice or terminology. This example demonstrates how to:

- Override existing translation strings (e.g., changing "Duplicate" to "Make a copy")
- Support multiple languages with custom terminology
- Use the `useTranslation` hook in your own components to access translations

The example creates a custom toolbar that uses translated strings via the `useTranslation` hook, and shows how to override those translations for multiple languages using the `overrides` prop on the `Tldraw` component.
