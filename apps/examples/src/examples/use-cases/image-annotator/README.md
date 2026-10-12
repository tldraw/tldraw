---
title: Image annotator
component: ./ImageAnnotatorExample.tsx
priority: 1
keywords:
  [
    annotation,
    image annotation,
    cameraoptions,
    constraints,
    zoom,
    pan,
    bounds,
    panspeed,
    zoomspeed,
    zoomsteps,
    image editor,
  ]
---

Annotate an image on a constrained canvas and export the result as a PNG.

---

The chosen image is placed as a locked image shape. Store side effects keep it locked and at the bottom of the page, and camera constraints (`editor.setCameraOptions` with `contain` behavior and a `fit-min-100` base zoom) stop you from panning or zooming away from it. An `InFrontOfTheCanvas` overlay dims everything outside the image so it's clear what will be exported.

Press "Done" to export with `editor.toImage`, cropped to the image bounds, then copy or download the result.

Try picking a very long, thin image to see how the camera constraints behave.
