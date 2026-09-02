---
title: Soft clipping region
component: ./SoftClipExample.tsx
priority: 5
keywords:
  [
    soft clip,
    dim,
    mask,
    geo,
    meta,
    overlay,
    infrontofthecanvas,
    getshapegeometry,
    pagetoscreen,
    usequickreactor,
    fill-rule,
    evenodd,
  ]
---

A geo shape that dims everything outside it.

---

Any regular geo shape (rectangle, ellipse, triangle, star, ...) can act as a soft clipping region. The behaviour is opted into per shape through `shape.meta.softClip`, so no custom shape util is needed.

An `InFrontOfTheCanvas` SVG overlay reactively reads every shape with that meta flag, transforms its vertices to screen space, and renders a single `<path>` using `fill-rule="evenodd"`. The viewport rectangle plus each region's outline form a "donut" shape — the outside fills with a translucent colour and the inside stays untouched.

Select any geo shape and use the toggle to turn its soft-clip behaviour on or off. Use the slider to adjust how visible the outside content is (0% is fully dimmed, 100% removes the dim entirely).
