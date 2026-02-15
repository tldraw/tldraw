---
title: Custom shape styles
component: ./CustomShapeStylesExample.tsx
category: configuration
priority: 3
keywords: [styles, shape, custom, getDefaultStyles, useShapeStyles, resolved, tokens]
---

Define how style tokens resolve to concrete values in a custom shape.

---

Override `getDefaultStyles()` on your ShapeUtil to control how style tokens (colors, sizes, fonts)
map to concrete CSS values for your shape. Then use `useShapeStyles()` in your component to
consume the resolved values. The style system automatically handles theme changes, token
overrides, and runtime style overrides.
