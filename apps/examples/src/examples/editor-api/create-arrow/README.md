---
title: Create an arrow
component: ./CreateArrowExample.tsx
priority: 1
keywords:
  [
    arrow,
    createShape,
    createBindings,
    binding,
    connection,
    normalizedAnchor,
    isPrecise,
    isExact,
    terminal,
    programmatic creation,
  ]
---

Create an arrow bound to two shapes with `createShape` and `createBindings`.

---

Arrows attach to shapes through arrow bindings, one per terminal. This example creates two geo shapes, then creates an arrow shape and two `arrow` binding records connecting its `start` and `end` terminals to them. The `normalizedAnchor`, `isPrecise`, and `isExact` binding props control where on each shape the arrow attaches.

Try dragging either shape: the arrow stays connected because the bindings, not the arrow's own props, define where its terminals go.

To draw a spline arrow, select the arrow tool, click its start, then Shift-click its end. Keep Shift-clicking to add anchors to the same arrow. Hold the pointer down and drag to adjust each new point before releasing. Press Escape to finish. Select a spline arrow to drag its anchors, insert an anchor with a handle between points, or double-click an intermediate anchor to remove it.

For programmatic creation, set `props.points` to a map of intermediate anchors with `id`, `index`, `x`, and `y`, using the same point format as a line shape. Coordinates are in arrow space and indices determine their order between `start` and `end`. Arc arrows use the line tool's cubic spline interpolation; elbow arrows use orthogonal segments through the anchors.

To bind an intermediate anchor, create an `arrow` binding with `pointId` matching the anchor's ID, `terminal: 'end'`, `isPrecise: true`, and `isExact: true`. Each bound anchor follows its target independently; moving that target leaves the other anchors fixed.
