---
title: Permissions
component: ./PermissionsExample.tsx
priority: 5
keywords:
  [
    constraints,
    bounds,
    side effects,
    permissions,
    clamping,
    registerbeforechangehandler,
    movement restriction,
    bounded region,
    shape geometry,
    svgcontainer,
  ]
---

Keep a shape inside a bounding box by clamping its position in a before-change side effect.

---

`editor.sideEffects.registerBeforeChangeHandler` sees every proposed change to a shape before it's
written and can return a modified record instead. This example uses that to keep a rectangle inside
a dashed container: whenever the shape's new position would put any of it outside, its `x` and `y`
are clamped back in.

Try dragging the rectangle, nudging it with the arrow keys, or aligning it with the alignment
actions: it stops at the container edge every time, because the constraint runs at the store level
rather than in any one tool. Note that inside a before-change handler the new shape isn't in the
store yet, so the example computes geometry with `editor.getShapeUtil(shape).getGeometry(shape)`
rather than the cached `editor.getShapeGeometry`, which would return the old version. This example
only clamps position; resizing past the edge is handled in the permissions 2 example.
