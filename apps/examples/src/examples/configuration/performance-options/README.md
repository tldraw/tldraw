---
title: Performance options
component: ./PerformanceOptionsExample.tsx
priority: 3
keywords: [performance, options, maxshapesperpage, debouncedzoom, limits, max-shapes, fps]
---

Configure shape limits and debounced zoom for performance.

---

Two performance-related options in `TldrawOptions`, with every metric and control in a single panel.

**`maxShapesPerPage`** (default 4000, raised to 6,000 here) caps how many shapes a page can hold. Operations that would exceed the cap are rejected and the editor emits a `max-shapes` event, which becomes a warning here (tldraw's default UI shows a toast). The shape count is shown as a progress bar that turns red and disables the add button at the limit.

**`debouncedZoom`** (default true) lets zoom-dependent code read `editor.getEfficientZoomLevel()` instead of `getZoomLevel()`. During a zoom gesture the live level changes every frame; the efficient level freezes at the gesture's start, so consumers re-render once at the end instead of on every frame (once the page exceeds `debouncedZoomThreshold`, default 500). The panel counts each signal's re-renders side by side and reports the last zoom gesture's frame rate and p95 frame time from the `editor.performance` `camera-end` event: fill the page with shapes and zoom with the wheel, then turn `debouncedZoom` off to watch both counts climb in lockstep and the frame rate drop. (For the full performance API, see the "Performance hooks" example.)

Editor options are read at creation time, so committing a control recreates the editor; `onMount` hands the panel the new instance and the document store survives, so your shapes stay put.
