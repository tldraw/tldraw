---
title: Coordinate system transformations
component: ./CoordinateSystemExample.tsx
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

Convert between screen, page, and viewport coordinates and position DOM elements over shapes.

---

The editor uses three coordinate systems:

- **Screen space**: browser pixels, as reported by DOM events
- **Viewport space**: pixels relative to the editor container, used to position DOM elements over the canvas
- **Page space**: the infinite canvas that shapes live in

`editor.screenToPage(point)`, `editor.pageToScreen(point)`, and `editor.pageToViewport(point)` convert between them, and `editor.getViewportScreenBounds()` and `editor.getViewportPageBounds()` describe the visible area in screen and page space.

Move the mouse to see the pointer position in all three systems, then pan and zoom to see how screen coordinates stay put while page coordinates change. Draw and select a shape to see a DOM label positioned above it with `pageToViewport`.
