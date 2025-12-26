---
title: Editor features
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - editor
  - features
  - systems
  - managers
status: published
date: 12/20/2024
order: 0
---

This section documents the various subsystems and features of the tldraw Editor. Each article covers a specific capability managed by the Editor class or its associated managers.

## Configuration

- [Editor options](./editor-options.md) - Global configuration for limits, timing, and behavior

## Input and interaction

- [Click detection](./click-detection.md) - Single, double, triple, and quadruple click handling
- [Input handling](./input-handling.md) - Pointer and keyboard state management
- [Focus management](./focus-management.md) - Keyboard focus tracking and restoration
- [Tools](./tools.md) - State machine-based interaction handling

## Camera and viewport

- [Camera system](./camera-system.md) - Zoom, pan, and camera constraints
- [Coordinate systems](./coordinate-systems.md) - Screen, page, and viewport space transformations
- [Edge scrolling](./edge-scrolling.md) - Auto-scroll at viewport boundaries
- [Culling](./culling.md) - Performance optimization through visibility detection
- [Deep links](./deep-links.md) - URL-based state serialization for sharing

## Shape management

- [Shapes](./shapes.md) - Shape records, ShapeUtil, geometry, and rendering
- [Selection system](./selection-system.md) - Shape selection and bounds computation
- [Shape indexing](./shape-indexing.md) - Z-order with fractional indices
- [Shape transforms](./shape-transforms.md) - Grouping, alignment, distribution, and rotation
- [Snapping](./snapping.md) - Alignment guides and precision assistance
- [Bindings](./bindings.md) - Relationships between shapes
- [Styles](./styles.md) - Visual properties like color and opacity

## Pages and assets

- [Pages](./pages.md) - Multi-page document management
- [Assets](./assets.md) - Image, video, and media handling

## Animation and timing

- [Animation](./animation.md) - Shape and camera transitions
- [Tick system](./tick-system.md) - Frame-based update loop
- [Scribble](./scribble.md) - Temporary visual feedback

## History and state

- [History system](./history-system.md) - Undo/redo functionality
- [Side effects](./side-effects.md) - Store consistency and change reactions

## Content and export

- [Clipboard](./clipboard.md) - Copy and paste operations
- [External content handling](./external-content.md) - Processing pasted and dropped content
- [Export](./export.md) - SVG and image export

## User and collaboration

- [User preferences](./user-preferences.md) - Per-user settings and customization
- [User following](./user-following.md) - Following collaborators' viewports

## Text and rendering

- [Text measurement](./text-measurement.md) - Font and text dimension calculations
