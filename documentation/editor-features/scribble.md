---
title: Scribble
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - scribble
  - highlight
  - ScribbleManager
  - gesture
  - visual-feedback
---

The scribble system provides temporary freehand visual feedback through the `ScribbleManager`. It's used by tools like the eraser and laser pointer to show the path being drawn. Scribbles are ephemeral and not persisted—they fade out after a configurable duration. Multiple scribbles can be active simultaneously.

## Key files

- packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts - Scribble tracking and rendering

## Related

- [Input handling](./input-handling.md)
