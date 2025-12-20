---
title: Editor features
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - editor
  - features
  - systems
  - managers
---

This section documents the various subsystems and features of the tldraw Editor. Each article covers a specific capability managed by the Editor class or its associated managers.

## Input and interaction

- [Click detection](./click-detection.md) - Single, double, triple, and quadruple click handling
- [Input handling](./input-handling.md) - Pointer and keyboard state management
- [Focus management](./focus-management.md) - Keyboard focus tracking and restoration

## Camera and viewport

- [Camera system](./camera-system.md) - Zoom, pan, and camera constraints
- [Coordinate systems](./coordinate-systems.md) - Screen, page, and viewport space transformations
- [Edge scrolling](./edge-scrolling.md) - Auto-scroll at viewport boundaries
- [Culling](./culling.md) - Performance optimization through visibility detection

## Shape management

- [Selection system](./selection-system.md) - Shape selection and bounds computation
- [Shape indexing](./shape-indexing.md) - Z-order with fractional indices
- [Snapping](./snapping.md) - Alignment guides and precision assistance

## Animation and timing

- [Animation](./animation.md) - Shape and camera transitions
- [Tick system](./tick-system.md) - Frame-based update loop
- [Scribble](./scribble.md) - Temporary visual feedback

## History and state

- [History system](./history-system.md) - Undo/redo functionality

## Collaboration

- [User following](./user-following.md) - Following collaborators' viewports

## Text and rendering

- [Text measurement](./text-measurement.md) - Font and text dimension calculations

## Related

- [Editor](../packages/editor.md)
- [UI components](../architecture/ui-components.md)
