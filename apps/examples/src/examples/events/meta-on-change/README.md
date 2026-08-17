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
---

Stamp `updatedBy` and `updatedAt` metadata on shapes every time they change.

---

Every shape has a `meta` property for your own JSON data. This example keeps it up to date with a
`registerBeforeChangeHandler` side effect that rewrites `meta` on every user-initiated shape change,
and replaces `editor.getInitialMetaForShape` so new shapes start with the same fields. A panel at the
top shows the selected shape's meta.

Create a shape, select it, and move or restyle it: the timestamp updates with each change. The
handler ignores changes with `source: 'remote'`, so in a multiplayer document a peer's edits keep
their own author. For setting meta only at creation time, see the shape meta (on create) example.
