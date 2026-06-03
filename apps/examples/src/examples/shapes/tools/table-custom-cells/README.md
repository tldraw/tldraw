---
title: Custom table cells
component: ./TableCustomCellsExample.tsx
priority: 5
keywords: [table, cell, kind, custom, checkbox, rating, registry, meta]
---

Register custom cell kinds — a checkbox and a star rating — via the cell registry.

---

A cell kind controls how a cell of that `kind` renders. Register kinds with
`TableCellShapeUtil.configure({ kinds: [...] })` and pass the configured util to
`<Tldraw shapeUtils>`. This example adds a checkbox kind and a 0–5 star rating kind;
each stores its data in the cell's `meta` (a plain `JsonObject`), not a typed prop.
Right-click a checkbox or rating cell to change its value. This is all a consumer
needs to add typed cells without forking the table.
