---
title: Precise exact arrows
component: ./ArrowsPreciseExactExample.tsx
category: configuration
priority: 5
keywords: [arrow, configure, isPrecise, isExact]
---

Make arrows adopt "isExact" behavior instead of "isPrecise".

---

Arrows can be precise, which means that instead of just pointing to the center of a shape, they point to a specific place within the shape. If they're precise, they can also be exact. When they're the exact, the arrow won't stop at the edge of the shape, it'll pass through the shape right the way to the point the arrow is targeting.

By default, arrows are precise when moving slowly, and exact when holding the alt key. This example shows how to customize this behavior, so that a precise arrow is always exact.
