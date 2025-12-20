---
title: Coordinate systems
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - coordinates
  - screen
  - page
  - viewport
  - transform
---

The editor uses multiple coordinate systems: **screen space** (browser pixels from the document origin), **viewport space** (pixels from the canvas container origin), and **page space** (the infinite canvas coordinate system). Transformation methods like `screenToPage()`, `pageToScreen()`, and `pageToViewport()` convert between these systems, accounting for camera position and zoom.

## Key files

- packages/editor/src/lib/editor/Editor.ts - Coordinate transformation methods
- packages/editor/src/lib/primitives/Mat.ts - Matrix transformations
- packages/editor/src/lib/primitives/Vec.ts - Vector operations

## Related

- [Camera system](./camera-system.md)
- [Input handling](./input-handling.md)
