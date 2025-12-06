---
title: Custom shape SVG export
component: ./CustomShapeToSvgExample.tsx
category: shapes/tools
priority: 3
keywords: [basic, svg, custom, export, copy]
---

Determine how your custom shapes look when copied/exported as an image.

---

The "export as SVG/PNG" and "copy as SVG/PNG" actions use the `toSvg` or `toBackgroundSvg` methods of a shape util. If a shape does not have a `toSvg` or `toBackgroundSvg` method defined, it will default to placing the shape's component inside a `<foreignObject>` element.
