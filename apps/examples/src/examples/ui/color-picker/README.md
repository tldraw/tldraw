---
title: Color picker
component: ./ColorPickerExample.tsx
priority: 3
keywords: [color, picker, theme, palette, custom, fonts]
---

Add custom colors and fonts to the theme palette at runtime.

---

A toolbar in the top-left adds new entries to the editor's color palette via a native color picker, and to the font palette via a curated Google Fonts dropdown. Each new entry shows up immediately in the style panel and applies to any selected shape. New colors and fonts are wired into the theme via `registerColorsFromThemes` / `registerFontsFromThemes` and `editor.updateTheme()`, so the style enum and theme atom update in place — no editor remount.
