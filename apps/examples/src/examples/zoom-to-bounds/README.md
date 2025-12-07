---
title: Zoom to bounds
component: ./ZoomToBoundsExample.tsx
category: editor-api
priority: 1
keywords: [zoom, camera, bounds, inset]
---

Zoom the camera to specific bounds using the editor's `zoomToBounds` function.

---

This example shows how to use the `zoomToBounds` method to programmatically zoom the camera to specific areas of the canvas. The example creates two boxes at different positions and provides buttons to zoom to each one. Note that the bounds the camera ultimately moves to may be different than the bounds you pass into the function. This is because the values of the bounds are massaged to maintain your viewport's aspect ratio. Also, if an inset is not specified, a default one will be set, adding inset padding to the bounds.
