---
title: Pen tool
component: ./PenToolExample.tsx
category: shapes/tools
priority: 2
keywords: [pen, bezier, vector, path, handles, points, curves, shapeutil, statenode]
---

Draw and edit a path made of cubic Bézier segments.

---

Select **Pen** (P). Click for corners or drag for curves. After placing three or more points, click the first to close and fill the path. Press Enter or Escape to finish an open path.

Double-click a path to edit its points:

- Drag points or handles to reshape the path.
- Double-click a segment to add a point; Cmd/Ctrl-click a point to remove it.
- Alt-click a point to toggle corner/smooth; Alt-drag a handle to move it independently.
- Press Enter or Escape, or click away, to finish editing.
