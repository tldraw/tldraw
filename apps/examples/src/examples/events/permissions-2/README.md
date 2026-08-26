---
title: Permissions 2
component: ./PermissionsExample2.tsx
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
    resize constraint,
  ]
---

Keep a shape inside a bounding box when it's moved or resized, using a before-change side effect.

---

This is a follow-on to the permissions example. That one only clamps a shape's position; here the
`registerBeforeChangeHandler` side effect also clamps its size, so resizing past the container edge
shrinks the shape instead of letting it escape.

Try dragging the rectangle and pulling its resize handles past the dashed border. Because a
before-change handler sees the shape before it's written to the store, cached lookups like
`editor.getShapeGeometry` would return the shape's old size, so the example computes geometry from
the proposed record with `editor.getShapeUtil(shape).getGeometry(shape)`. The size clamp assumes an
unrotated rectangle; rotated shapes would need their page bounds clamped instead.
