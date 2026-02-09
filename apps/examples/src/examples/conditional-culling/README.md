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

Override the `canCull()` method in your ShapeUtil to conditionally prevent culling. In this example, both shapes have a glow effect, but only one has culling disabled via the checkbox.

Try panning the canvas horizontally - notice how the shape with "Prevent culling" checked stays visible while the other disappears abruptly at the viewport edge.
