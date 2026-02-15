---
title: Cursor shadow diagram
component: ./CursorShadowDiagramExample.tsx
category: ui
priority: 7
keywords: [cursor, shadow, rotation, counter-rotate, diagram]
---

Static diagram showing how cursor shadow counter-rotation works.

---

Compares cursor drop shadows at four rotation angles (0°, 90°, 180°, 270°). The top row shows the naive approach where the shadow rotates with the cursor — at 180° the shadow points up-left instead of down-right. The bottom row shows the correct approach where the shadow offset is pre-rotated to always fall down-right in screen space.
