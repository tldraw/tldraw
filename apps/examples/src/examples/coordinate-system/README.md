---
title: Coordinate system transformations
component: ./CoordinateSystemExample.tsx
category: editor-api
priority: 1
keywords:
  [
    coordinates,
    screenToPage,
    pageToScreen,
    pageToViewport,
    getViewportScreenBounds,
    getViewportPageBounds,
    viewport,
    transformation,
    screen space,
    page space,
    dom positioning,
    overlay,
    camera,
  ]
---

Convert between screen, page, and viewport coordinate systems.

---

This example demonstrates how to work with tldraw's three coordinate systems:

- **Screen space**: Pixel coordinates relative to the browser window (from DOM events)
- **Page space**: Coordinates in the infinite canvas space (where shapes live)
- **Viewport space**: Coordinates relative to the editor container (useful for UI positioning)

The key transformation methods demonstrated are:

- `editor.screenToPage(point)` - Convert DOM event coordinates to canvas coordinates
- `editor.pageToScreen(point)` - Position DOM elements relative to shapes
- `editor.pageToViewport(point)` - Get coordinates relative to the editor container
- `editor.getViewportScreenBounds()` - Get visible area bounds in screen coordinates
- `editor.getViewportPageBounds()` - Get visible area bounds in page coordinates

Move your mouse to see coordinates in all three systems. Pan and zoom the canvas to see how screen coordinates stay constant while page coordinates change. Create and select a shape to see a DOM overlay positioned using pageToScreen().
