---
title: Nested clip regression
component: ./NestedClipBugReproExample.tsx
category: editor-api
priority: 2
keywords: [clipping, clip path, mask, nested, frame, spread, regression]
---

Nested clip masks: customer photobook spread layout regression.

---

## Run

```bash
yarn dev
```

`http://localhost:5420/nested-clip-bug-repro`

## Customer spread

Port of the external photobook repro: two spreads on one canvas.

| Spread             | Clipping                                                           |
| ------------------ | ------------------------------------------------------------------ |
| **Left (working)** | Only `spread` clips (`meta.role === 'spread'`)                     |
| **Right (broken)** | `spread`, `page`, `template`, `layout` all clip (`broken-*` roles) |

Uses `RoleFrameShapeUtil` — `FrameShapeUtil` with per-frame `getClipPath` via `meta.role`.

On a **fixed SDK**, both sides should render cleanly with the checkbox off. Turn on **Simulate pre-fix clip on broken left image** to apply legacy segment–segment SH on the right spread’s left image (wedge / diagonal clip).

## Tests

`packages/tldraw/src/test/nested-frames-clip-legacy.test.ts`

## Source

Customer layout adapted from `tldraw-clipping-repro` (spread / page / template / layout stack).
