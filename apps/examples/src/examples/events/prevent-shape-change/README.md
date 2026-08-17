---
title: Prevent shape changes
component: ./PreventShapeChangeExample.tsx
priority: 2
keywords:
  [
    prevent transform,
    lock shape,
    registerbeforechangehandler,
    side effects,
    immutable shape,
    disable move,
    disable resize,
    disable rotate,
    shape protection,
  ]
---

Reject changes to a shape's position, rotation, and size while still allowing style and text edits.

---

`editor.sideEffects.registerBeforeChangeHandler` sees every proposed shape change and returns the
record that will be written. This example compares `prev` and `next` for geo rectangles and returns
`prev` (cancelling the change) if `x`, `y`, `rotation`, `props.w`, or `props.h` would differ. Other
changes pass through untouched.

Try dragging, rotating, or resizing the rectangle: nothing happens. Now change its color or edit its
label: that works. This is a finer-grained alternative to `isLocked`, which would also stop the shape
being selected. A rejected change is silent, so consider giving the user some feedback if
this is a real permission rule.
