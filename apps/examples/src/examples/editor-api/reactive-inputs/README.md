---
title: Reactive inputs
component: ./ReactiveInputsExample.tsx
priority: 3
keywords:
  [
    inputs manager,
    pointer tracking,
    mouse position,
    velocity,
    usevalue,
    reactive state,
    screen point,
    page point,
    origin point,
    pointer events,
    modifier keys,
  ]
---

Track pointer positions, velocity, and modifier keys reactively with `editor.inputs` and `useValue`.

---

`editor.inputs` exposes the current, previous, and origin pointer positions in both screen and page space, the pointer velocity, and the state of the modifier keys. Each getter (`getCurrentPagePoint()`, `getPointerVelocity()`, `getShiftKey()`, and so on) reads a reactive atom, so wrapping a call in `useValue` subscribes the component and re-renders it whenever the value changes.

Move the pointer around the canvas and hold modifier keys to watch the panel update. Origin points only change on pointer down.
