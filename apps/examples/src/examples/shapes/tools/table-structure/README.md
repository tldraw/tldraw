---
title: Table structure
component: ./TableStructureExample.tsx
priority: 2
keywords: [table, row, column, insert, delete, structure, context menu]
---

Add and remove table rows and columns from the context menu.

---

Right-click a table (or drill into a cell first) for insert/delete row and column.
When a cell is selected the operation targets that cell's row/column; otherwise it
targets the last one. The structural helpers (`insertRow`, `deleteColumn`, …) are
public, so you can wire them to any UI. Drag a column's interior edge to resize it.
Rows are auto-height by default, but dragging a row's lower edge sets a manual
height — a floor the row keeps but still grows past to fit taller content.
