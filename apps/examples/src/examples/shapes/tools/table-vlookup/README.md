---
title: Cross-table VLOOKUP
component: ./TableVlookupExample.tsx
priority: 6
keywords: [table, vlookup, formula, spreadsheet, cross table, lookup, reference]
---

Formulas that reference another table shape, with spreadsheet-style VLOOKUP.

---

This extends the formula cell with **cross-table references**. A formula can name
another table on the canvas and read its cells — `Prices!A2:B5` resolves to the
table whose name is `Prices` (stored in the shape's `meta.name`).

Each table shows an editable **name tag** above it (rendered with
`InFrontOfTheCanvas`); typing in it updates `meta.name`, which is the name VLOOKUP
resolves against. Add more tables with the table tool in the toolbar — each gets a
unique default name you can rename, then reference from a formula straight away.

The example seeds two tables. The **Order** table's unit prices are pulled from the
**Prices** table with `=VLOOKUP(A2, Prices!A2:B5, 2)`, and each total is `=B2*C2`.
Edit a price in the Prices table and the order totals recompute instantly — across
two separate shapes. Because cells are real, reactive records, reading another
table is the same call as reading your own, the recompute happens automatically,
and it all works in multiplayer.

Every cell is a formula cell: type `=` to compute, or plain text to show it
literally — so you can add a formula to **any** cell, including new ones you
create. Right-click a table or cell to insert or delete rows and columns.

The bundled engine understands numbers and strings, cell refs and ranges (both
local and table-qualified), the operators `+ - * / ^ %` and `&` (text concat),
comparisons, and functions including `SUM`, `AVERAGE`, `IF`, `VLOOKUP`, `MATCH`,
`INDEX`, and the conditional family `COUNTIF`/`COUNTIFS`, `SUMIF`/`SUMIFS` and
`AVERAGEIF`/`AVERAGEIFS`. Criteria use the usual forms — `">5"`, `"<>0"`,
`"Apples"`. Try `=COUNTIF(Order!B2:B4, ">2")`, `=SUMIFS(Order!D2:D4, Order!A2:A4,
"Apples")`, or `="Total: " & SUM(D2:D4)`.
