---
title: Programmatic text shape creation
component: ./TextShapeConfigurationExample.tsx
priority: 4
keywords:
  [
    text shape,
    create text,
    programmatic,
    autoSize,
    font,
    textAlign,
    richText,
    toRichText,
    bold,
    marks,
    formatting,
    createShape,
  ]
---

Create text shapes with `editor.createShape`, covering auto-size, fixed width, alignment, fonts, and rich text marks.

---

Text shapes store their content as rich text, so pass `toRichText('...')` for plain strings or build the document with marks for formatting like bold. The example creates five shapes on mount:

- Auto-sized text (`autoSize: true`) that grows to fit its content
- Fixed-width text (`autoSize: false`, `w`) that wraps
- Center-aligned text (`textAlign: 'middle'`)
- Bold text using a `bold` mark
- Monospace text (`font: 'mono'`)

Double-click any of them to edit and see the same options in the style panel.
