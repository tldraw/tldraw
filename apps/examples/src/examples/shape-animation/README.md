---
title: Shape animation
component: ./ShapeAnimationExample.tsx
category: editor-api
priority: 2
keywords: [animate, animation, shape, easing, transition, movement, rotation, opacity]
---

Animate shapes using `animateShape()` and `animateShapes()`.

---

This example demonstrates how to animate shapes using the editor's animation API. It shows:

- **Basic shape animation** - Animating a single shape's position using `animateShape()`
- **Rotation animation** - Spinning a shape 360 degrees
- **Opacity animation** - Fading shapes in and out
- **Combined animations** - Animating multiple properties (position, rotation, opacity) simultaneously
- **Multiple shape animation** - Animating all shapes at once with `animateShapes()`
- **Different easing functions** - Using `EASINGS.easeInOutCubic`, `EASINGS.easeInOutQuad`, and `EASINGS.easeOutCubic`

The animation system automatically interpolates between the current and target values of animated properties over the specified duration.
