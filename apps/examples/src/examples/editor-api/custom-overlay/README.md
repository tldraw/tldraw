---
title: Custom overlay
component: ./CustomOverlayExample.tsx
priority: 2
keywords: [overlay, overlayutil, canvas, render, 2d, cursor]
---

Draw a custom canvas overlay on top of the editor.

---

Overlays are canvas UI that live above shapes — selection handles, the brush rectangle, snap indicators, collaborator cursors. This example adds a pink ring that follows the pointer, implemented as a minimal `OverlayUtil` subclass.
