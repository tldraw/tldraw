---
title: Clickable custom shape
component: ./InteractiveShapeExample.tsx
priority: 2
keywords:
  [
    interaction,
    pointer events,
    stop propagation,
    click,
    input,
    button,
    checkbox,
    todo,
    html,
    custom shape,
    onclick,
  ]
---

A todo shape with a checkbox and text input that handle their own pointer events.

---

By default the editor handles all pointer events on the canvas, so clicking a shape selects it and dragging moves it. To let part of a shape handle its own interactions, set `pointer-events: all` on the shape's `HTMLContainer` and call `stopPropagation()` on the events you want to keep from reaching the canvas.

Try clicking the checkbox to toggle the todo and typing in the input. Once a todo is checked, the input becomes read-only and lets pointer events through, so clicking it selects the shape as usual. See `my-interactive-shape-util.tsx` for the shape.
