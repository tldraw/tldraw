---
title: Edge scrolling
component: ./EdgeScrollingExample.tsx
priority: 1
keywords: [scroll, edge, auto-scroll, drag, edge scroll manager, options, camera]
---

Configure how the camera auto-scrolls when dragging near the viewport edge.

---

Edge scrolling automatically pans the camera when you drag a shape or selection brush close to the edge of the viewport. This example provides sliders for the four options that control it, passed through the `Tldraw` component's `options` prop:

- `edgeScrollSpeed`: base scroll speed in pixels per tick (default 25)
- `edgeScrollDelay`: how long the pointer must linger near the edge before scrolling starts (default 200ms)
- `edgeScrollEaseDuration`: how long the scroll takes to accelerate to full speed (default 200ms)
- `edgeScrollDistance`: the width of the edge zone that triggers scrolling (default 8px)

Drag one of the shapes toward a window edge to feel the current settings, then adjust the sliders and try again. The sliders commit on release because editor options are read when the editor is created: changing the `options` prop recreates the editor instance.
