---
title: Drag and drop shape
component: ./DragAndDropExample.tsx
priority: 5
keywords:
  [
    reparent,
    ondragshapesin,
    ondragshapesout,
    parent,
    children,
    shape hierarchy,
    baseframelikeshapeutil,
    canreceivenewchildrenoftype,
    canremovechildrenoftype,
  ]
---

Build a container shape that accepts dropped shapes with `BaseFrameLikeShapeUtil`.

---

`BaseFrameLikeShapeUtil` gives a custom shape the same drag-and-drop behaviour as the built-in frame: shapes dragged onto it become its children (`onDragShapesIn`), shapes dragged out return to the page (`onDragShapesOut`), and children are clipped to its geometry. Two hooks control what's allowed: `canReceiveNewChildrenOfType` decides which shape types can be dropped in, and `canRemoveChildrenOfType` decides which children can be dragged back out.

The grid shape here accepts only the red counter shapes and never lets them leave. Try dragging a counter onto the grid, then try dragging it back out: it stays a child and is clipped at the grid's edge. Draw a geo shape and drag it over the grid to see it rejected.
