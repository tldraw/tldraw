---
title: Pen tool
component: ./PenToolExample.tsx
category: shapes/tools
priority: 2
keywords: [pen, bezier, vector, path, handles, points, curves, shapeutil, statenode]
---

Draw and edit a path made of cubic Bézier segments.

---

Select **Pen** (P). Click to add a corner, or drag to add a smooth point with two Bézier handles. Click the first point after placing at least three points to close and fill the path. Press Enter or Escape to finish an open path. A single unfinished point is discarded.

Double-click a path to edit its points:

- Drag a point to move it and its handles.
- Drag a handle to adjust the curve. Smooth points keep the opposite handle aligned; Alt-drag breaks that link.
- Double-click a segment to insert a point without changing the curve.
- Cmd/Ctrl-click a point to remove it. Paths retain at least two points; removing a triangle's third point opens it.
- Alt-click a point to toggle between a corner and a smooth point.
- Press Enter or Escape, or click away, to finish editing. Escape during a drag cancels that gesture.

Use the standard color, size, and fill controls to style the path. Open paths have no fill. Undo and redo work for point creation and editing.

`PenShapeUtil.tsx` defines the point data, path geometry, handle overlay, rendering, resizing, and SVG export. Handle vectors are relative to each point. `PathBuilder` supplies the same path for rendering and hit testing, and `CubicBezier2d` helps locate an insertion on a segment. De Casteljau subdivision inserts the new point without deforming the curve.

`PenToolExample.tsx` registers a `StateNode` tool with drawing and editing states. The shape's `onDoubleClick` enters the editing state, which handles point interactions without modifying the built-in select tool. The toolbar and instruction panel are optional UI you can replace in your own application.

This is a starting point for a pen tool: each shape contains one path. Compound paths, joining separate paths, and multi-point selection are left for applications to add.
