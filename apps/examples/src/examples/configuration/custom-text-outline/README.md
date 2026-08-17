---
title: Custom text outline
component: ./CustomTextOutlineExample.tsx
priority: 1
keywords:
  [
    text,
    outline,
    showTextOutline,
    configure,
    TextShapeUtil,
    ArrowShapeUtil,
    GeoShapeUtil,
    label,
    performance,
    styling,
  ]
---

Disable the text outline on text, arrow, and geo shape labels.

---

By default tldraw draws a halo in the canvas background color around text labels so they stay legible when they overlap other shapes. Each shape util that renders text (`TextShapeUtil`, `ArrowShapeUtil`, `GeoShapeUtil`) has a `showTextOutline` option; this example sets it to `false` on all three with `ShapeUtil.configure`.

The canvas starts with three overlapping text shapes and a labeled arrow so you can see the difference. Try changing `showTextOutline` back to `true` for one of the utils and compare.

You might turn outlines off for a different visual style, or for performance: the outline is drawn with a text shadow, which can be expensive on some browsers (tldraw already skips it on Safari).
