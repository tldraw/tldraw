---
title: Dimensions HUD
component: ./DimensionsHudExample.tsx
priority: 3
keywords: [overlay, overlayutil, hud, dimensions, resize, bounds, gesture]
---

Show a live width × height pill next to the selection with a custom `OverlayUtil`.

---

A non-interactive HUD that reads the editor's selection state and draws a dimensions label on the canvas overlay layer. Because overlays render in page space, the label follows pan and zoom without any `pageToScreen` plumbing; screen-sized values like padding and font size are divided by the zoom level instead.

Select a shape and resize or rotate it: the label sticks to the edge closest to the bottom of the page and flips so it's never upside down. Select several shapes to see it fall back to the selection bounds.
