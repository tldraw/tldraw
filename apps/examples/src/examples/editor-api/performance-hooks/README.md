---
title: Performance hooks
component: ./PerformanceHooksExample.tsx
priority: 4
keywords:
  [performance, fps, frame, interaction, camera, resize, translate, perf, monitoring, devtools]
---

Subscribe to `editor.performance` events to show frame time stats for interactions and camera moves.

---

`editor.performance.on(event, fn)` subscribes to performance events and returns an unsubscribe function. This example listens for `interaction-end`, which fires when a translate, resize, rotate, or draw finishes, and `camera-end`, which fires once panning or zooming settles. Both include frame time stats (average, p95, p99, fps) plus context like shape counts and zoom level, which the panel renders.

It also creates a `PerformanceApiAdapter`, which mirrors the same events into the browser's Performance API as `tldraw:*` marks and measures so they show up in a DevTools performance recording.

Drag a shape, or pan and zoom the canvas, and watch the panel update.
