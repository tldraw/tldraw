---
title: Glossary
created_at: 12/17/2024
updated_at: 12/20/2025
keywords:
  - glossary
  - terms
  - definitions
  - reference
---

Short definitions for common terms used in tldraw docs and code.

## Core concepts

- Asset: a media file (image, video) stored separately from shapes and referenced by ID.
- Binding: a relationship between two shapes.
- Camera: controls viewport position and zoom; bridges screen space and page space.
- Editor: the main orchestration class for tools, shapes, and state.
- Page: a drawing surface within a document; each page has its own shapes and camera state.
- Shape: a canvas element stored as a record.
- ShapeUtil: the class that defines a shape's behavior and rendering.
- Store: the reactive record database.
- Tool: a `StateNode` that handles user input.

## Coordinate systems

- Page space: the infinite canvas coordinate system where shape positions are defined.
- Screen space: browser pixels measured from the document origin.
- Viewport: the visible rendering area of the editor.

## State management

- Atom: mutable signal value.
- Computed: derived signal value.
- History mark: a stopping point that defines where undo/redo operations pause.
- Side effect: a function that runs before or after records change to enforce consistency.
- Transaction: batched updates applied atomically.

## Rendering

- Culling: hiding shapes outside the viewport to optimize rendering performance.
- Fractional index: a string-based z-order system that enables efficient reordering and collaboration.

## Input and interaction

- Edge scrolling: auto-panning the camera when dragging near viewport edges.
- Focused group: the group shape that defines the current editing scope for selection.
- Scribble: temporary freehand visual feedback for operations like erasing or laser pointer.
- Snapping: precision alignment assistance when moving, resizing, or connecting shapes.
- Tick: a frame-synchronized update event from the animation loop.

## Styles and animation

- Easing: a function that controls the rate of change during animations.
- Style: a visual property like color, size, or opacity that can be applied to shapes.
- StyleProp: a class that defines valid values and defaults for a style property.

## Sharing

- Deep link: a URL that encodes editor state (page, viewport, selection) for sharing.

## Multiplayer

- Presence: other users' cursors and selections.
- Room: a shared editing session.
- Sync: diff-based state synchronization.

## UI

- Component override: a custom UI component replacing a default.
- Style panel: UI for editing shared styles.

## Abbreviations

| Abbreviation | Meaning                            |
| ------------ | ---------------------------------- |
| TL           | tldraw type prefix                 |
| DO           | Durable Object                     |
| R2           | Cloudflare object storage          |
| SSE          | Server-Sent Events                 |
| CRDT         | Conflict-free Replicated Data Type |
| E2E          | End-to-End testing                 |

## Related

- [Architecture overview](../overview/architecture-overview.md)
- [@tldraw/editor](../packages/editor.md)
- [@tldraw/store](../packages/store.md)
