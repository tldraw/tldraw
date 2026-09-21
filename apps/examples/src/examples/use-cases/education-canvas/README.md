---
title: Education canvas
component: ./EducationCanvasExample.tsx
priority: 1
keywords:
  [
    education,
    math,
    geometry,
    gcse,
    teaching,
    learning,
    camera constraints,
    grid,
    split layout,
    worksheet,
  ]
---

A math worksheet with the question on the left and a constrained drawing canvas on the right.

---

The canvas is a `Tldraw` instance embedded in a page layout rather than filling the window. Camera constraints (`options.camera`) keep the view on a 600x600 coordinate grid, the `tools` UI override strips the toolbar down to select, hand, draw, eraser, line, and text, and `maxPages: 1` hides the page menu. The grid itself is an SVG rendered in the `OnTheCanvas` slot so it moves with the camera.

Try drawing the triangle from the question on the grid, then type answers into the boxes and press "Submit answers". The editor is kept in a ref from `onMount`, which is where a real app would export the drawing (`editor.toImage`) alongside the typed answers.
