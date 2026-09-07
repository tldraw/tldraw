---
title: Native text measurement
component: ./NativeTextExample.tsx
category: configuration
priority: 30
keywords: [rich text, headless, pretext, measurement, native svg, export]
---

Measure shape text with the rich text layout engine and export native SVG text.

---

This example loads the bundled fonts and initializes pretext before mounting `Tldraw` with a `textMeasurer`. Text shapes, shape labels, notes, arrows, and frame headings use the injected measurer immediately.

Paste formatted text, edit labels, switch fonts, and resize shapes to try wrapping. The **Export native SVG** button exports the current page with `text: 'native'`, producing `<text>` and `<tspan>` elements for rich text labels. Regular export menu actions keep their defaults.

The canvas still renders editable HTML text. This example changes measurement and the dedicated SVG export, not the canvas text renderer. External rasterizers need access to the referenced fonts; system fallback fonts can produce different results for CJK, RTL, and emoji.
