---
title: Programmatic text shape creation
component: ./TextShapeConfigurationExample.tsx
category: shapes/tools
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

Create and configure text shapes programmatically.

---

This example demonstrates how to create text shapes programmatically with various configuration options:

- **Auto-sized text** - Text shapes that automatically adjust width to fit content (`autoSize: true`)
- **Fixed-width text** - Text shapes with specified width that wrap content (`autoSize: false`, `w: number`)
- **Text alignment** - Horizontal alignment: `start` (left), `middle` (center), `end` (right)
- **Font styles** - Different fonts: `draw` (handdrawn), `sans`, `serif`, `mono`
- **Sizes** - Font sizes: `s`, `m`, `l`, `xl`
- **Rich text formatting** - Bold, italic, and other formatting using marks

Text shapes use rich text format internally. Use `toRichText('your text')` to convert plain text strings. For formatting like bold or italic, construct the rich text document with marks as shown in the example.
