---
title: Data grid shape
component: ./DataGridExample.tsx
keywords:
  [
    custom shape,
    shapeutil,
    baseboxshapeutil,
    ag grid,
    data grid,
    table,
    spreadsheet,
    canedit,
    canscroll,
    usedelaysvgexport,
  ]
priority: 5
---

Embed an AG Grid data table inside a custom shape.

---

The `AgGridShapeUtil` extends `BaseBoxShapeUtil` and renders an `AgGridReact` component sized to the shape. Two overrides make the grid usable on the canvas: `canEdit` so double-clicking enters the editing state, which is when the shape turns on pointer events for the grid's filters and sorting, and `canScroll` so wheel events over the shape scroll the rows instead of panning while it's being edited.

Because AG Grid renders asynchronously, the shape uses `useDelaySvgExport` and resolves it from `onGridReady`, so exporting the shape as an image waits until the rows are actually on screen.

Try double-clicking the grid, then sorting a column or typing in a filter. Press Escape to leave editing mode and drag the shape around like any other.
