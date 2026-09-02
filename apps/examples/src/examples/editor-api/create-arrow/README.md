---
title: Create an arrow
component: ./CreateArrowExample.tsx
priority: 1
keywords:
  [
    arrow,
    createShape,
    createBindings,
    binding,
    connection,
    normalizedAnchor,
    isPrecise,
    isExact,
    terminal,
    programmatic creation,
  ]
---

Create an arrow bound to two shapes with `createShape` and `createBindings`.

---

Arrows attach to shapes through arrow bindings, one per terminal. This example creates two geo shapes, then creates an arrow shape and two `arrow` binding records connecting its `start` and `end` terminals to them. The `normalizedAnchor`, `isPrecise`, and `isExact` binding props control where on each shape the arrow attaches.

Try dragging either shape: the arrow stays connected because the bindings, not the arrow's own props, define where its terminals go.
