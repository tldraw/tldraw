---
title: Hovered overlay
component: ./HoveredOverlayExample.tsx
priority: 4
keywords: [overlay, overlaymanager, hover, hit test, selection, handle, reactive]
---

Read the overlay that the user is hovering.

---

The editor tracks the canvas overlay under the pointer via `editor.overlays.getHoveredOverlay()`. This example reads it reactively with `useValue` and displays its type and id. Select a shape, then hover over one of its handles to see the readout update in real time.
