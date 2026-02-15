---
title: Shape style overrides
component: ./ShapeStyleOverridesExample.tsx
category: configuration
priority: 7
keywords: [styles, overrides, dynamic, per-shape, runtime, conditional]
---

Override resolved styles dynamically per-shape at render time.

---

Use the `getShapeStyleOverrides` prop to dynamically modify the resolved styles of
any shape based on its properties or state. This callback runs after the shape util's
`getDefaultStyles()` and can override any resolved style value. Overrides can also
vary by light/dark mode using the `{ light, dark }` format.
