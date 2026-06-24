---
title: Performance options
component: ./PerformanceOptionsExample.tsx
priority: 3
keywords: [performance, options, maxshapesperpage, debouncedzoom, limits, max-shapes, fps]
---

Configure shape limits and debounced zoom for performance.

---

Two performance-related options in `TldrawOptions`, each with a runtime control.

**`maxShapesPerPage`** (default 4000, raised to 6,000 here) caps how many shapes a page can hold. Operations that would exceed the cap are rejected and the editor emits a `max-shapes` event, which becomes a warning banner here (tldraw's default UI shows a toast). A persistent at-limit state turns the counter red and disables the add button.

**`debouncedZoom`** (default true) lets zoom-dependent code read `editor.getEfficientZoomLevel()` instead of `getZoomLevel()`. During a zoom gesture the live level changes every frame; the efficient level freezes at the gesture's start, so consumers re-render once at the end instead of on every frame (once the page exceeds `debouncedZoomThreshold`, default 500). The top panel counts each signal's changes and shows a live frame-rate readout (measured from the editor's `tick` event): fill the page with shapes and zoom with the wheel, then turn `debouncedZoom` off to watch both counters climb in lockstep and the frame rate drop.

Editor options are read at creation time, so committing a control recreates the editor; the document store survives, so your shapes stay put.
