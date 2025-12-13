---
title: Lightbox image
component: ./LightboxImageExample.tsx
category: ui
priority: 3
keywords: [image, lightbox, overlay, click, zoom, modal]
---

Click on an image to view it in a lightbox overlay.

---

This example demonstrates how to override the default click behavior on image shapes to create a lightbox viewing experience. When you click on an image:

1. The normal selection behavior is bypassed
2. A semi-transparent overlay darkens the canvas
3. The clicked image is displayed centered and enlarged
4. Smooth CSS transitions animate the overlay in and out

Key concepts shown:

- Overriding the `pointing_shape` state's `onPointerUp` method
- Using the `InFrontOfTheCanvas` component for UI overlays
- Resolving image asset URLs from shapes
- Managing lightbox state with React hooks
