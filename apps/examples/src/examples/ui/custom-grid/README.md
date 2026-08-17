---
title: Custom grid
component: ./CustomGridExample.tsx
priority: 2
keywords:
  [
    grid,
    canvas,
    2d context,
    Grid component,
    getViewportPageBounds,
    devicePixelRatio,
    camera,
    custom rendering,
  ]
---

Draw a custom grid on the canvas with a 2d canvas context.

---

Override the `Grid` component via the `components` prop to draw your own grid. The component receives the camera position, zoom, and grid size, and this example uses them to draw minor and major grid lines into a 2d canvas at the device's pixel ratio. Grid mode is turned on in `onMount` so the grid is visible immediately.

Try zooming and panning; the grid redraws to match the camera and switches color in dark mode.
