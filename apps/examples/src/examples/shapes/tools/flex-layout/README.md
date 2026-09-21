---
title: Flex layout shape
component: ./FlexLayoutExample.tsx
priority: 2
keywords: [custom shape, flexbox, layout, frame, children, BaseFrameLikeShapeUtil]
---

A frame-like shape that lets the browser's flexbox engine arrange its children.

---

The layout shape extends `BaseFrameLikeShapeUtil`, so it clips its children and reparents shapes in and out as they're dragged over it, like a frame. What's different is how children get positioned: the shape renders a hidden flex container with a placeholder div per child, and a `ResizeObserver` reads each placeholder's offset and writes it back to the child's `x`/`y`. A contextual toolbar exposes the flex direction, `justify-content`, and `align-items` for the selected layout.

The layout grows to fit its children. Dragging a shape over it shows an insertion line and, on drop, `onDropShapesOver` sets the child order from the pointer position. Dragging a child out to empty page space returns it to the page and shrinks the layout.

Try dragging the loose blue shape into the layout, reordering children by dragging, and switching direction and alignment in the toolbar. For a container that computes layouts itself instead, see the [frame layout modes](https://tldraw.dev/examples/frame-layouts) example.
