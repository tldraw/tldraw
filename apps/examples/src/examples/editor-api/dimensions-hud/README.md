---
title: Dimensions HUD
component: ./DimensionsHudExample.tsx
priority: 3
keywords: [overlay, overlayutil, hud, dimensions, resize, bounds, gesture]
---

Show a live width × height pill for the current selection.

---

A non-interactive HUD that piggybacks on the editor's existing selection and resize state. The overlay renders into the canvas in page space, so it follows pan and zoom for free without any `pageToScreen` plumbing.
