---
title: Zoom to bounds
component: ./ZoomToBoundsExample.tsx
category: editor-api
priority: 0.5
keywords: [zoom, camera, bounds, lock, animation, force]
---

Demonstrate camera zooming to specific bounds with locking controls and forced zooming.

---

This example shows how to use the `zoomToBounds` method to programmatically zoom the camera to specific areas of the canvas. The example creates two boxes at different positions and provides buttons to zoom to each one. Note that the bounds the camera ultimately moves to may be different than the bounds you pass into the function. This is because the values of the bounds are massaged to maintain your viewport's aspect ratio. Also,if an inset is not specified, a default one will be set, adding inset padding to the bounds.

The example demonstrates:

- **Zooming**: Programmatically zoom to different bounds. 
- **Forced Zooming**: Use the `force` parameter to zoom even when the camera is locked.
- **Animation Control**: If oyu like, you can animate the canera movement.

The `zoomToBounds` method accepts a `Box` object that defines the target bounds to zoom to. It also accepts options for controlling the zoom behavior, including whether to force the zoom as well as animation settings.
