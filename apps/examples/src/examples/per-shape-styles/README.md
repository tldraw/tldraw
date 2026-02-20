---
title: Per-shape-type styles
component: ./PerShapeStylesExample.tsx
category: configuration
priority: 6
keywords: [styles, per-shape, sizes, stroke, override, shape-specific, shapes]
---

Override style tokens for a specific shape type using `styles.shapes`.

---

Set global style tokens on the top-level `styles` config, then add per-shape overrides
under `styles.shapes.<shapeType>`. This uses the same token format (`colors`, `sizes`,
`fonts`) and only affects the matching shape type. Other shapes continue using global values.
