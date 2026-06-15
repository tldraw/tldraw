---
title: 3D engine made of shapes
component: ./Engine3DExample.tsx
priority: 4
keywords: [game, raycasting, doom, 3d, fps, tick, geometry, projection, shapes, reactive]
---

A first-person 3D engine where both the world and the rendered view are real tldraw shapes.

---

This is a Doom-style raycaster with no canvas and no WebGL — every wall in the 3D
view is an actual tldraw rectangle shape.

The pipeline is shapes in, shapes out:

- **The world** is the shapes you draw on the left — rectangles, ellipses, lines,
  even freehand strokes. The engine reads their outlines with
  `editor.getShapeGeometry()` and `editor.getShapePageTransform()` and casts rays
  against the resulting wall segments.
- **The view** on the right is one geo rectangle per screen column. Each frame, on
  `editor.on('tick')`, the engine casts a ray per column and writes that column's
  height and colour back into its rectangle. The ~60-shapes-per-frame updates run
  inside `editor.run(fn, { history: 'ignore' })`, so they never touch the undo
  stack.

Walk with **WASD** and turn with the **arrow keys**. Draw a shape anywhere on the
left and it becomes a wall you can immediately walk around — and because the
engine re-reads the scene every frame, dragging, resizing, recolouring, or
deleting a wall updates the 3D view in real time. The rendered image is itself
editable scene data, which is the part a `<canvas>` can't do.
