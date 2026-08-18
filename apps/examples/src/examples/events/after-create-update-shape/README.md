---
title: After create/update shape
component: ./AfterCreateUpdateShapeExample.tsx
priority: 5
keywords:
  [
    side effects,
    registeraftercreatehandler,
    registerafterchangehandler,
    lifecycle,
    hooks,
    shape creation,
    shape update,
  ]
---

Run a handler after shapes are created or updated to keep only one red shape on the page.

---

`editor.sideEffects.registerAfterCreateHandler` and `registerAfterChangeHandler` run after a
record has been written to the store. That makes them the right place to update _other_ records in
response to a change. Here, whenever a shape is created or changed and it turns out to be red, every
other red shape on the same page is turned black.

Try selecting one of the black words and setting its color to red in the style panel: the previously
red word turns black. Because after-change handlers also fire for the updates they cause, make sure
your handler is a no-op for records that already satisfy your rule, or it will loop.
