---
title: Shape with onClick
component: ./ShapeWithOnClickExample.tsx
priority: 1
keywords: [onClick, custom shape, click handler, drag]
---

Handle clicks on a custom shape with `ShapeUtil.onClick`.

---

Implement `onClick` on your shape util to react when the user clicks the shape. The select tool calls it on pointer up when the pointer didn't drag; return a shape partial and the editor applies it (and skips selecting the shape), or return nothing to fall through to normal selection.

Unlike a React `onClick` on a DOM element inside the shape component, `ShapeUtil.onClick` goes through the editor's event system, so clicking and dragging both work on selected and unselected shapes. Try clicking the shape to bump the counter, then dragging it.
