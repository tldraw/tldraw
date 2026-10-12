---
title: Shape meta (on create)
component: ./OnCreateShapeMetaExample.tsx
priority: 7
keywords: [meta, metadata, getinitialmeta, getinitialmetaforshape, oncreate, custom data, usevalue]
---

Record who created each shape and when by replacing `editor.getInitialMetaForShape`.

---

Every shape has a `meta` property for your own JSON data. When `createShapes` creates a shape it
merges the result of `editor.getInitialMetaForShape(shape)` with whatever `meta` you passed. This
example replaces that method in `onMount` to stamp `createdBy` and `createdAt` on every new shape.
A panel at the top shows the selected shape's meta.

Create a shape and select it to see its meta. Since this only runs at creation, later edits leave
the values alone. To keep meta current as shapes change, see the shape meta (on change) example.
