---
title: Shape animation
component: ./ShapeAnimationExample.tsx
priority: 2
keywords: [animate, animation, shape, easing, transition, movement, rotation, opacity]
---

Animate a shape's position, rotation, and opacity with `animateShape()` and `animateShapes()`.

---

`editor.animateShape(partial, { animation })` interpolates a shape's `x`, `y`, `rotation`, and `opacity` from their current values to those in the partial over the given `duration`, using an easing function from `EASINGS` (or any `(t) => number`). `animateShapes()` does the same for many shapes at once. Shape props are also interpolated when the shape util implements `getInterpolatedProps`.

Select one shape and try the position, rotation, fade, and combined buttons, or use "Animate multiple shapes" to scatter everything on the page.
