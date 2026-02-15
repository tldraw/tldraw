---
title: Cursor shadow rotation
component: ./CursorShadowRotationExample.tsx
category: ui
priority: 6
keywords: [cursor, shadow, rotation, resize, handles, counter-rotate]
---

Shows why cursor drop shadows need counter-rotation on rotated shapes.

---

A 180-degree rotated geo shape is pre-selected so you can immediately hover over its resize handles. Toggle between tldraw's correct shadow behavior (counter-rotated so it always points down-right) and a naive implementation where the shadow rotates with the cursor. The difference is most obvious on the bottom handles, where the naive shadow points upward.
