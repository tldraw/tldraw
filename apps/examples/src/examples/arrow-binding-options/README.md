---
title: Arrow binding options
component: ./ArrowBindingOptionsExample.tsx
category: shapes/tools
priority: 3
keywords:
  [
    arrow,
    binding,
    isprecise,
    isexact,
    normalizedanchor,
    anchor point,
    arrow connections,
    technical diagrams,
  ]
---

Demonstrate arrow binding options for precise positioning.

---

This example shows the different arrow binding options that control how arrows connect to shapes:

- **isPrecise: false** - Arrow always targets the center of the shape (default safe behavior)
- **isPrecise: true** - Arrow respects the `normalizedAnchor` and targets the specified position
- **isExact: false** - Arrow stops at the shape's edge (default)
- **isExact: true** - Arrow passes through the shape to reach the exact target point

The `normalizedAnchor` property specifies where on the shape the arrow connects using normalized coordinates (0-1 on each axis). For example, `{x: 0.5, y: 0.5}` is the center, `{x: 0, y: 0}` is top-left, and `{x: 1, y: 1}` is bottom-right.

These options provide fine-grained control over arrow positioning for technical diagrams, architectural drawings, and other use cases requiring precise arrow placement.
