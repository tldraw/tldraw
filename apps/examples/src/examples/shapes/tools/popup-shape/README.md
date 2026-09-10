---
title: Popup shape
component: ./PopupShapeExample.tsx
keywords:
  [
    3d effect,
    css transform,
    perspective,
    shadows,
    animation,
    interaction,
    double click,
    htmlcontainer,
    transform origin,
    visual effects,
  ]
priority: 100
---

Cards that pop up in 3D using CSS perspective anchored to the viewport center.

---

Each shape renders a card tilted with a CSS `rotateX` transform inside an `HTMLContainer` that sets `perspective`. The trick is the perspective origin: it's computed from `editor.getViewportPageBounds()` relative to the shape, so every card shares one vanishing point at the center of the screen. Shape components are reactive, so reading the bounds during render keeps that origin updated as you pan and zoom.

Try panning around and double-clicking a card to pop it upright.
