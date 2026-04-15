---
title: Performance hooks
component: ./PerformanceHooksExample.tsx
priority: 4
keywords: [performance, fps, frame, interaction, resize, translate, perf, monitoring]
---

Monitor editor performance with real-time interaction metrics.

---

Use `editor.performance.on()` to subscribe to performance events. In this example, we listen for `interaction-end` events to display frame time statistics (avg, p95, p99) whenever you finish resizing, translating, or drawing shapes. Try selecting a shape and resizing it to see the performance overlay update.
