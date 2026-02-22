---
title: Watercolor flowers
component: ./WatercolorFlowersExample.tsx
category: use-cases
priority: 10
keywords: [watercolor, flowers, drawing, generative, creative, freehand]
---

Draw and watch a soft watercolor wash trail behind your strokes while little flowers sprout along the path.

---

This example combines custom shape utilities with reactive side effects. As you draw
with the freehand tool, the system creates a companion watercolor trail shape behind
your stroke and periodically spawns flower shapes along the path.

The watercolor effect uses layered translucent SVG paths with jitter, pooling, and
wetness effects to simulate paint on paper. Flowers are rendered with the same
watercolor stroke pipeline, giving each petal an organic, hand-painted look.
