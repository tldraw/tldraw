---
title: Table row & column affordances
component: ./TableAffordancesExample.tsx
priority: 4
keywords: [table, row, column, add, select, affordance, overlay, custom ui]
---

Build FigJam-style add-row / select-row table UI from public SDK APIs.

---

Select a table (or any of its cells) to reveal a strip beside each row and column
that selects the whole row/column, plus "+" bars to add a row or column. It's all
public API: `getTableLayout` for geometry, `editor.pageToScreen` with
`InFrontOfTheCanvas` to place screen-space UI, and `selectRow`/`selectColumn` +
`insertRow`/`insertColumn` for the actions. Selecting a row materialises its cells,
so you can then set a fill in the style panel to restyle the whole row — header
included. Shift-click another cell to select the rectangular range between it and
the current cell, then bulk-style or delete the block.
