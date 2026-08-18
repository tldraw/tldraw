---
title: Frame layout modes
component: ./FrameLayoutsExample.tsx
priority: 3
keywords:
  [
    frame,
    container,
    layout,
    grid,
    spotlight,
    resize,
    video,
    reparent,
    onChildrenChange,
    BaseFrameLikeShapeUtil,
  ]
---

A frame-like board shape that arranges its children in five swappable layouts.

---

This example shows how to give one frame-like container several ways to organize what's inside it. The board shape has a `layout` prop, and each mode is a small pure function from the children's boxes to new boxes, so adding an arrangement means adding one entry to a record.

Because a layout returns boxes rather than points, it sizes its children as well as placing them. A row gives every card the same height, a column the same width, and spotlight scales the left-most card up to a hero with the rest as thumbnails beside it. The `free` mode arranges nothing and behaves like a plain frame.

The board re-runs its layout from `onChildrenChange`, so it responds to cards being added, deleted, resized, or restored by undo. Select a board to switch its mode; drag cards between boards and they land wherever you drop them.

For a container that hands layout to the browser instead, see the [flex layout shape](https://tldraw.dev/examples/flex-layout) example.
