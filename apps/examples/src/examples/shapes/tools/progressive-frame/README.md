---
title: Progressive disclosure frame
component: ./ProgressiveFrameExample.tsx
priority: 5
keywords: [progressive, disclosure, level of detail, lod, zoom, frame, container, custom shape]
---

A custom container shape that shows only a short description when zoomed out, and reveals its contents when you double-click to zoom in.

---

The progressive disclosure frame is a custom shape that lets you explore a canvas at different levels of detail. When the frame is small on screen it shows a title and a one-line description. Double-click the frame and the camera zooms in to fit it — once the frame is large enough on screen, its contents become visible. Zoom out again and the contents are hidden, returning the frame to its summary state.

This example demonstrates a few tldraw building blocks working together:

- A custom shape that extends `BaseFrameLikeShapeUtil`, so it can hold and clip child shapes like a regular frame.
- A double-click handler that calls `editor.zoomToBounds` to animate the camera to fit the shape.
- The `getShapeVisibility` editor option, which reactively hides child shapes while their parent frame is below a screen-size threshold.
- Inline text inputs for the title and description, with pointer events stopped so editing them doesn't fight the canvas.

The frame blocks nesting to keep the model simple — you can drag any other shape into a progressive frame, but not another progressive frame.
