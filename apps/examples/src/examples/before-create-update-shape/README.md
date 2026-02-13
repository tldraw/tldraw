---
title: Before create/update shape
component: ./BeforeCreateUpdateShapeExample.tsx
category: events
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

Register a handler to run before shapes are created or updated.

---

You can intercept the creation or update of any record in the store and return a new record to be
used in it place. In this example, we lock shapes to a circle in the center of the screen.
