---
title: Before create/update shape
component: ./BeforeCreateUpdateShapeExample.tsx
priority: 4
keywords:
  [
    side effects,
    registerbeforecreatehandler,
    registerbeforechangehandler,
    intercept,
    validation,
    lifecycle,
    hooks,
    shape creation,
  ]
---

Intercept shapes before they're created or updated and keep them inside a circle.

---

`editor.sideEffects.registerBeforeCreateHandler` and `registerBeforeChangeHandler` run before a
record is written to the store. Whatever the handler returns is what gets written, so you can
adjust (or reject, by returning the previous record) a change instead of reacting to it afterwards.
In this example, both handlers run the same function that pulls a shape's origin back inside a
circle around the page origin.

Try drawing shapes and dragging them out past the circle: they stop at the edge. The camera is
locked on the circle so the constraint is easy to see. For the "after" side of this API, see the
after create/update shape example.
