---
title: Custom shape with handles
component: ./CustomShapeWithHandles.tsx
priority: 2
keywords:
  [handles, custom handles, gethandles, onhandledrag, interaction, geometry, tail, shapeutil, tool]
---

A speech bubble shape whose tail is moved with a custom handle.

---

Handles let the user change a shape's geometry directly. This shape returns a single handle for its tail from `getHandles`, updates the tail in `onHandleDrag`, and uses `onBeforeUpdate` to keep the tail a sensible length and outside the bubble body no matter how the shape changes. The tail is stored as a fraction of the shape's size so it scales with drag-create and resize.

Pick the speech bubble tool from the toolbar (or press S), draw a bubble, then drag the tail handle around. Double-click to add text and watch the body grow to fit.
