---
title: Custom renderer
component: ./CustomRendererExample.tsx
keywords:
  [
    renderer,
    canvas,
    Background component,
    Canvas component,
    custom rendering,
    2d context,
    alternative rendering,
  ]
priority: 100
---

Draw shapes with your own 2d canvas renderer instead of tldraw's DOM rendering.

---

The `Background` component is replaced with a component that reads `editor.getRenderingShapes()` on every animation frame and draws draw and geo shapes to a 2d canvas, using `getColorValue` to look up theme colors. tldraw's regular shapes layer is hidden with CSS, while selection, handles, and the rest of the UI keep working.

This is a sketch of the approach rather than a complete renderer: it handles draw and geo shapes and draws a bounding box for everything else. Try drawing a few shapes and moving them around.
