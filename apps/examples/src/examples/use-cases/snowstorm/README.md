---
title: Snowstorm
component: ./SnowStormExample.tsx
keywords: [overlay, visual effects, animation, css, children, layering, infrontofthecanvas]
priority: 10
---

Animate a snowstorm over the canvas that reacts to camera movement and the pointer.

---

The `SnowStorm` component is passed as a child of `Tldraw`, so it renders inside the editor container above the canvas. It listens to the editor's `tick` event and moves a set of absolutely positioned DOM snowflakes each frame, adding wind from camera movement (`editor.getCamera()`) and pushing flakes near a fast pointer (`editor.inputs.getPointerVelocity()`). It does nothing when the OS "reduce motion" preference is on (`usePrefersReducedMotion`).

Try panning the canvas quickly, or waving the pointer through the snow.
