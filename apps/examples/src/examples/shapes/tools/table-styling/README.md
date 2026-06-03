---
title: Table styling
component: ./TableStylingExample.tsx
priority: 3
keywords: [table, style, color, fill, font, header, borders, cell]
---

Per-cell styling, header shading, and a border toggle for the table shape.

---

Every table cell carries its own style props (color, fill, font, size, alignment),
so drilling into a cell and changing the style panel restyles just that cell.
Header rows are shaded by default, but a header cell keeps its own fill if you set
one — the header style is only a fallback. Border visibility is a plain `borders`
prop (not a style); this example toggles it from the context menu.
