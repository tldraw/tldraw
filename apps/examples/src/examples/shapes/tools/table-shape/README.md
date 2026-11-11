---
title: Table shape
component: ./TableShapeExample.tsx
category: shapes/tools
priority: 4
keywords: [table, grid, spreadsheet, data, cells, rows, columns]
---

Create a table shape from a two-dimensional array of strings.

---

The table is one of the default shapes. `createTableShapeProps` turns an array of rows into the shape's `rows`, `columns` and `cells` props, which are keyed by stable ids and ordered by fractional indexes.

Double-click a cell to edit it, and press Tab to move to the next cell. While editing, use the buttons to the right and below the table to add a column or a row. Press Escape to stop editing. Resizing the shape scales its columns and rows.
