---
title: Canvas cleanup
component: ./CanvasCleanupExample.tsx
category: editor-api
priority: 5
keywords:
  [
    cleanup,
    layout,
    word wrap,
    overlap,
    arrow,
    routing,
    bend,
    programmatic,
    resolveTextWordWrap,
    resolveShapeOverlaps,
    rerouteArrows,
    cleanupCanvas,
    mermaid,
    diagram,
  ]
---

Clean up a programmatically generated canvas by fixing word wrap, resolving shape overlaps, and rerouting arrows around bystander shapes.

---

Use `resolveTextWordWrap`, `resolveShapeOverlaps`, and `rerouteArrows` to fix common layout problems in programmatically generated canvases (e.g. from a mermaid diagram or database schema). `cleanupCanvas` runs all three in order as a single undoable step. The example pre-loads a canvas with five shape groups that each demonstrate a different problem — use the buttons to apply fixes individually or all at once.
