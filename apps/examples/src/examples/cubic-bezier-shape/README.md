---
title: Cubic bezier curve shape
component: ./CubicBezierShapeExample.tsx
category: shapes/tools
priority: 1
keywords:
  [
    bezier,
    curve,
    handles,
    control points,
    shapeutil,
    custom tool,
    draggable,
    editing mode,
    statenode,
    getHandles,
    onHandleDrag,
  ]
---

A custom shape with interactive bezier curve editing.

---

This example demonstrates how to create a cubic bezier curve shape with draggable control handles. It includes a custom pen tool for entering edit mode and shows how to customize handle behavior and snapping.

The shape features four handles (start, end, and two control points) that can be dragged to adjust the curve. Control points snap to the start and end positions, and moving the endpoints automatically shifts their associated control points to maintain smooth editing.
