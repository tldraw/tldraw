---
title: Region comments
component: ./CommentRegionsExample.tsx
priority: 7
keywords: [comments, commenting, region, area, drag, resize, reveal, pin corner, collaboration]
---

Comment on a rectangular area of the canvas.

---

A region anchor attaches a thread to a rectangular area rather than to a point or a shape. Regions are off by default; `CommentTool.configure({ enableRegions: true })` turns them on, and `regionReveal`, `regionMove`, `regionResize`, and `regionPinCorner` tune the interaction.

Use the control panel to switch configurations. The editor remounts on each change, but the comments live in a shared store and survive it.
