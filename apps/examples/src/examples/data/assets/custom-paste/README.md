---
title: Custom paste behavior
component: ./CustomPasteExample.tsx
priority: 3
keywords: [paste, clipboard, external content, handler]
related: [external-content-sources, hosted-images, local-images, snapshots, drag-and-drop-tray]
---

Change how pasting works by registering an external content handler.

---

This example adds a special rule for pasting single frame shapes, so they'll try to find an empty space instead of always pasting in the location they were copied from.
