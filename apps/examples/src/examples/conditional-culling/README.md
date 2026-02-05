---
title: Conditional culling
component: ./ConditionalCullingExample.tsx
category: editor-api
priority: 3
keywords: [culling, canCull, viewport, performance, glow, shadow, overflow, custom shape]
---

Prevent shapes with overflow effects from being culled when off-screen.

---

Culling is an optimization that hides shapes when they're outside the viewport. However, shapes with visual effects that extend beyond their bounds (like glows or shadows) can appear to "pop" when scrolled on/off screen.

Override the `canCull()` method in your ShapeUtil to conditionally prevent culling. In this example, shapes with a glow effect return `false` from `canCull()`, keeping them rendered even when their bounds are outside the viewport.

Try panning the canvas so shapes are partially off-screen - notice how glow shapes remain visible while non-glow shapes get culled.
