---
title: Controlling the canvas
component: ./APIExample.tsx
priority: 0
keywords: [editor api, createshapes, updateshape, rotateshapesby, zoomtofit, select, useeditor, onmount, setstyle, context]
---

Create, update, rotate, and select shapes and move the camera with the editor API.

---

The `Editor` instance is the entry point for everything you can do programmatically in tldraw. This example gets the editor two ways, from the `onMount` callback and from the `useEditor` hook inside a child component, then walks through a short timeline of API calls: `createShapes`, `updateShape`, `rotateShapesBy`, `zoomToFit`, `select`, and finally `setStyleForSelectedShapes` and `setStyleForNextShapes` to cycle the shape's color.

Watch the canvas after it loads: each step runs one second after the last so you can see what every call does.
