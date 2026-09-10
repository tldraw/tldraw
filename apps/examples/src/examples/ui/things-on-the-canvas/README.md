---
title: Things on the canvas
component: ./OnTheCanvasExample.tsx
priority: 1
keywords:
  [
    canvas overlay,
    OnTheCanvas,
    InFrontOfTheCanvas,
    components,
    custom component,
    camera,
    page coordinates,
    pageToViewport,
    usevalue,
  ]
---

Render React components on the canvas that either scale with the camera or float in front of it.

---

Two component slots live inside the canvas. `OnTheCanvas` components are positioned in page space and behave like shapes: they scale with the zoom and move when you pan. `InFrontOfTheCanvas` components render in screen space, so they follow the page but stay the same size. This example puts two counters on the canvas and a label in front of it that follows the current selection using `editor.getSelectionRotatedPageBounds()` and `editor.pageToViewport()`.

Try zooming: the counters grow and shrink, the label doesn't. Both slots are set through the `components` prop.
