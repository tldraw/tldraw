---
title: Custom shape SVG export
component: ./CustomShapeToSvgExample.tsx
priority: 3
keywords:
  [
    svg export,
    toSvg,
    toBackgroundSvg,
    custom shape export,
    SvgExportContext,
    export image,
    copy as svg,
    foreignObject,
    shapeutil,
  ]
---

Control how a custom shape looks when exported or copied as SVG or PNG with `toSvg`.

---

The "export as SVG/PNG" and "copy as SVG/PNG" actions call a shape util's `toSvg` (and optional `toBackgroundSvg`) methods. If a shape defines neither, its component is placed inside a `<foreignObject>` in the exported SVG, which works but is less portable than a real SVG representation.

This shape's `toSvg` returns a `rect` matching its HTML component and reads `ctx.isDarkMode` from the `SvgExportContext` so the export uses the right fill for the requested mode. Select the shape and choose "Copy as SVG" or "Export as PNG" from the context menu to see it.
