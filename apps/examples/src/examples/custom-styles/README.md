---
title: Custom styles
component: ./CustomStylesExample.tsx
category: configuration
priority: 2
keywords:
  [stroke, font, size, styles, configuration, tokens, google fonts, colors, palette, theme, brand]
---

Customize the available colors, sizes, and fonts in tldraw.

---

Use the `styles` prop to override or extend the default style tokens. You can customize colors
(with light/dark variants), sizes (stroke widths and font sizes), and fonts (CSS font-family strings).
Use module augmentation on `TLColorStyleExtensions` to make TypeScript accept new color names.
