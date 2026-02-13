---
title: Per-shape-type styles
component: ./PerShapeStylesExample.tsx
category: configuration
priority: 6
keywords: [styles, per-shape, configure, sizes, stroke, override, shape-specific]
---

Override style tokens for a specific shape type using `ShapeUtil.configure()`.

---

Use `ShapeUtil.configure({ styles: { ... } })` to override size, color, or font tokens
for a single shape type. This uses the same format as the global `styles` prop on `<Tldraw>`,
but only affects shapes of that type. Other shapes continue using the global config.
