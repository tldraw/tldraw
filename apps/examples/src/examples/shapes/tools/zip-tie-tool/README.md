---
title: Zip tie tool
component: ./ZipTieToolExample.tsx
priority: 11
keywords:
  [
    arrows,
    bindings,
    bindingutil,
    custom tool,
    arrowshapeutil,
    bundle,
    routing,
    waypoints,
    parallel,
    overlayutil,
    pathbuilder,
  ]
---

Draw a line across arrows to zip tie them together into a bundle.

---

Pick the zip tie tool (or press Z, which replaces the zoom tool's shortcut) and drag a line across any number of arrows. When you let go, it creates a zip tie shape where the line crossed them and binds each arrow to it. Every arrow can pass through any number of ties, and every tie can hold any number of arrows.

Tied arrows are still tldraw's own arrows: `ZipArrowShapeUtil` extends `ArrowShapeUtil` and is registered as the `arrow` shape, so the arrow tool, start and end bindings, styles, and arrowheads all keep working, though tied arrows drop their label and bend handle. Once an arrow has ties, its body is routed through them as a chain of cubic curves. Between two ties, every arrow is an offset of one shared curve, with control arms scaled by the curve's bend so the bundle stays perfectly parallel. Drag or rotate a tie to reshape the bundle, or delete it to set its arrows free.
