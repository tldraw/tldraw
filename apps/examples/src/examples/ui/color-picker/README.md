---
title: Color picker
component: ./ColorPickerExample.tsx
priority: 3
keywords: [color, picker, theme, palette, custom, fonts, updatetheme, meta]
---

Add custom colors and fonts to the theme palette at runtime.

---

A toolbar in the top-left adds new entries to the editor's color palette via a native color picker, and to the font palette via a curated Google Fonts dropdown. Each new entry shows up immediately in the style panel and applies to any selected shape.

All possible custom slots (`custom-1..20`, `gf-1..10`) are declared up front via module augmentation and registered through a stable `themes` prop, so persisted shapes always pass validation. The actual colors and fonts are pushed into the live theme with `editor.updateTheme()`. The palette itself is stored on the document's `meta`, so it persists, syncs across tabs, and takes part in undo/redo together with the shapes that use it.

Try adding a color, applying it to a shape, then pressing undo.
