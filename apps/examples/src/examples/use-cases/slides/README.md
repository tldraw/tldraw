---
title: Slideshow (free camera)
component: ./SlidesExample.tsx
priority: 0
keywords:
  [
    annotation,
    camera options,
    constraints,
    zoom,
    pan,
    camera bounds,
    pan speed,
    zoom speed,
    scroll,
    slides,
    presentation,
  ]
---

A slideshow built from a custom slide shape, with a free camera that animates between slides.

---

A `slide` custom shape is an unfilled dashed rectangle you can draw with the slide tool (`S`), place other shapes on, and move around freely. The slides panel in the `HelperButtons` slot lists slides in page order; clicking one, or pressing the left and right arrow keys, calls `editor.zoomToBounds` to animate the camera to that slide. Double-clicking a slide's border does the same (the interior isn't filled, so double-clicking inside it creates text as usual).

Compare with the "Slideshow (fixed camera)" example, which locks the camera to the current slide instead of letting you pan and zoom.
