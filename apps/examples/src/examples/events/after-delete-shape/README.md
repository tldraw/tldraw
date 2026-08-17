---
title: After delete shape
component: ./AfterDeleteShapeExample.tsx
priority: 5
keywords:
  [
    side effects,
    registerafterdeletehandler,
    lifecycle,
    hooks,
    shape deletion,
    frames,
    parent shapes,
  ]
---

Run a handler after shapes are deleted to remove frames that have become empty.

---

`editor.sideEffects.registerAfterDeleteHandler` runs after a record has been removed from the
store, which makes it a good place to clean up anything that depended on that record. In this
example, deleting the last child of a frame deletes the frame too.

Try deleting the shapes inside the frame one by one. Once the last one goes, the frame disappears
with it. The handler also runs for the frame it just deleted, so nested frames cascade: emptying an
inner frame can empty and delete its outer frame too.
