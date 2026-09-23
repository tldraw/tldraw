---
title: Before delete shape
component: ./BeforeDeleteShapeExample.tsx
priority: 4
keywords:
  [
    side effects,
    registerbeforedeletehandler,
    intercept,
    prevent deletion,
    lifecycle,
    hooks,
    validation,
  ]
---

Intercept shape deletions and cancel the ones you don't want to allow.

---

`editor.sideEffects.registerBeforeDeleteHandler` runs before a record is removed from the store.
Return `false` to cancel the deletion; return nothing to let it proceed. In this example, red shapes
can't be deleted but everything else can.

Try selecting each text shape and pressing delete. The red one stays put, whether you delete it
directly, select all and delete, or cut it. This only guards deletions: the user can still
recolor the shape and then delete it.
