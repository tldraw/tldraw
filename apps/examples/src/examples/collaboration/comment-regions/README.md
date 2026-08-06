---
title: Region comments
component: ./CommentRegionsExample.tsx
priority: 7
keywords: [comments, commenting, region, area, drag, resize, collaboration]
---

Comment on a rectangular area of the canvas.

---

A region anchor attaches a thread to a rectangular area rather than to a point or a shape. Regions are off by default; `CommentTool.configure({ enableRegions: true })` turns them on, and that's the whole configuration.

A region reveals its dashed box while the pointer is inside it, moves by its pin, and resizes from its corners. The pin sits on whichever corner the creating drag released on. Select the comment tool (or press `c`) and drag to create one.
