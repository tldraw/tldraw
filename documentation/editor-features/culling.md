---
title: Culling
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - culling
  - visibility
  - viewport
  - performance
  - rendering
---

The culling system optimizes rendering performance by determining which shapes are outside the viewport and don't need to be rendered. It uses incremental derivations to efficiently track shape visibility as the camera moves or shapes change. Shapes can opt out of culling through their `ShapeUtil.canCull()` method.

## Key files

- packages/editor/src/lib/editor/derivations/notVisibleShapes.ts - Visibility derivation
- packages/editor/src/lib/editor/Editor.ts - getCulledShapes, getNotVisibleShapes methods
- packages/editor/src/lib/editor/shapes/ShapeUtil.ts - canCull method

## Related

- [Camera system](./camera-system.md)
- [Rendering shapes](../architecture/rendering-shapes.md)
