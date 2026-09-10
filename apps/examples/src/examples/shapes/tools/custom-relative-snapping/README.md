---
title: Custom handle snap reference
component: ./CustomRelativeSnappingExample.tsx
priority: 2
keywords:
  [
    handles,
    snapping,
    snapReferenceHandleId,
    angle snapping,
    shift modifier,
    getHandles,
    control points,
    vertex,
    reference point,
  ]
---

Choose which handle a shift-drag angle snap is measured from with `snapReferenceHandleId`.

---

When a user holds shift while dragging a handle, the select tool snaps the handle to 15 degree increments around a reference handle. By default that reference is the next vertex handle in index order. Setting `snapReferenceHandleId` on a handle returned from `getHandles` overrides the reference.

The Y-shaped connector here has a center junction and three arms. Each arm handle names `center` as its snap reference, so shift-dragging an arm rotates it around the junction in clean angles instead of around a neighbouring arm.

The shape is selected on load so its handles are visible. Try shift-dragging one of the arm endpoints, then compare with a plain drag.
