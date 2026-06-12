---
title: Table formula cells
component: ./TableFormulasExample.tsx
priority: 5
keywords: [table, formula, spreadsheet, cell references, computed]
---

A formula cell kind that computes its value from other cells, like a spreadsheet.

---

This builds on the cell-kind registry. A `formula` cell stores a formula such as
`=B2+C2` in its rich text; the kind's component reads the referenced cells
reactively and shows the computed result, recalculating when those cells (or the
formula itself) change. Double-click a formula cell to edit the raw formula.

The example includes a small spreadsheet expression engine that understands cell
references (`B2`), ranges (`B2:C3`), the operators `+ - * / ^` and `%`,
comparisons (`= <> < <= > >=`), parentheses and unary minus, plus functions like
`SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `IF`, `ROUND`, `MOD` and `ABS`. Try
`=(B2-C2)*2`, `=SUM(B2:C3)`, or `=IF(B2>3, B2, 0)`. References to other formula
cells are resolved recursively (with a cycle guard), so the totals and averages
rows compute from the per-row totals.
