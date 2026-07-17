---
title: Replace a built-in overlay
component: ./ReplaceBrushOverlayExample.tsx
priority: 3
keywords: [overlay, overlayutil, brush, selection, custom, render]
---

Swap out a built-in overlay for a custom implementation.

---

Every canvas overlay — the selection brush, scribble, snap indicators, shape handles — is an `OverlayUtil` subclass you can replace. This example extends the built-in `BrushOverlayUtil` and overrides its `render` method to draw a dashed purple rectangle in place of the default gray one. Drag-select on the canvas to see it.
