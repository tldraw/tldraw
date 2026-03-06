---
title: Shape meta (on change)
component: ./OnChangeShapeMetaExample.tsx
priority: 7
keywords:
  [
    meta,
    metadata,
    side effects,
    registerbeforechangehandler,
    getinitialmeta,
    onchange,
    tracking,
    audit,
    custom data,
  ]
related:
  [
    meta-on-create,
    meta-migrations,
    after-create-update-shape,
    before-create-update-shape,
    derived-view,
  ]
---

Add custom metadata to shapes when they're changed.

---

We can update a shape's metadata whenever it changes. A UI displays the current selected shape's metadata. Create a shape, select it, and move it around. The metadata will updated any time the shape changes.
