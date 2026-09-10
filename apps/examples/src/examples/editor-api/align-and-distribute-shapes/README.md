---
title: Align and distribute shapes
component: ./AlignAndDistributeShapesExample.tsx
priority: 3
keywords:
  [
    align,
    distribute,
    alignshapes,
    distributeshapes,
    layout,
    position,
    arrange,
    horizontal,
    vertical,
  ]
---

Align and distribute selected shapes with `alignShapes` and `distributeShapes`.

---

The editor exposes the same alignment and distribution operations that the built-in context menu uses. `editor.alignShapes(ids, operation)` accepts `left`, `center-horizontal`, `right`, `top`, `center-vertical`, `bottom`, or `center`, and `editor.distributeShapes(ids, operation)` accepts `horizontal` or `vertical`.

The example creates five shapes and selects them. Try clicking the buttons in the top panel, then use "Reset positions" to put the shapes back. Align operations need at least two selected shapes, and distribute operations need at least three, so change the selection to see the buttons become no-ops.
