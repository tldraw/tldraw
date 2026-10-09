---
title: Native text measurement
component: ./NativeTextExample.tsx
category: configuration
priority: 30
keywords: [rich text, headless, pretext, measurement, native svg, export]
---

Measure shape text with the rich text layout engine and export native SVG text.

---

`Tldraw` uses pretext measurement by default once the engine and fonts are ready. DOM measurement handles startup, unsupported content, and initialization failures. Pass `textMeasurer="dom"` to force browser measurement, or supply your own measurer to override the default.

Paste formatted text, edit labels, switch fonts, and resize shapes to try wrapping. The **Export native SVG** button exports the current page with `text: 'native'`, producing `<text>` and `<tspan>` elements for rich text labels. Regular export menu actions keep their defaults.

The canvas still renders editable HTML text. This example changes measurement and the dedicated SVG export, not the canvas text renderer. External rasterizers need access to the referenced fonts; system fallback fonts can produce different results for CJK, RTL, and emoji.
