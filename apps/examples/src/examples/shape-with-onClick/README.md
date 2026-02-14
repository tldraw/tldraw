---
title: Shape with onClick
component: ./ShapeWithOnClickExample.tsx
category: shapes/tools
priority: 1
keywords: [onClick, custom shape, drag]
---

A custom shape that uses `ShapeUtil.onClick`.

---

You can handle clicks on shapes by implementing the `onClick` method on your shape util.
Unlike using React's `onClick` on DOM elements inside the shape component, `ShapeUtil.onClick`
integrates with the editor's event system, so clicking and dragging both work correctly on
unselected shapes.
