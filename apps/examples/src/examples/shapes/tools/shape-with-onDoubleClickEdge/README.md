---
title: Shape with onDoubleClickEdge
component: ./ShapeWithOnDoubleClickEdgeExample.tsx
category: shapes/tools
priority: 1
keywords: [onDoubleClickEdge, custom shape, resize, edge, double click]
---

A custom shape that uses `ShapeUtil.onDoubleClickEdge` to toggle between two preset sizes.

---

You can handle double-clicks on a shape's resize edges by implementing the `onDoubleClickEdge`
method on your shape util. The editor calls this handler when the user double-clicks one of
the four edge resize handles (top, right, bottom, left) of a selected shape. Return a shape
partial to update the shape, or `void` to do nothing.

In this example the handler toggles the shape between 400×320 and 200×200 every time an
edge is double-clicked.
