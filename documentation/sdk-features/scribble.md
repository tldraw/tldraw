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
status: published
date: 12/20/2024
order: 20
---

The scribble system provides temporary freehand visual feedback for pointer-based interactions. Scribbles are ephemeral paths that appear during tool operations and automatically fade out after completion. The system is accessed via `editor.scribbles` and manages multiple concurrent scribbles through a state-based lifecycle.

Scribbles are not persisted to the document. They exist only in the instance state and provide real-time visual feedback for operations like erasing, laser pointer drawing, and scribble-brush selection.

## How it works

### Scribble lifecycle

Every scribble progresses through a sequence of states managed by the ScribbleManager:

1. **Starting**: The scribble is initialized and collects its first 8 points. This prevents flickering for very short strokes.
2. **Active**: The scribble actively accumulates points as the pointer moves. Points are added with each pointer move event.
3. **Stopping**: The tool has finished, and the scribble begins fading out by progressively removing points from its tail.
4. **Removed**: After all points are cleared, the scribble is deleted from the manager.

The manager updates all active scribbles on every animation frame via its `tick` method, which handles state transitions, point management, and the fade-out effect.

### Fade-out behavior

When a scribble enters the stopping state, it shrinks from the tail by removing points at regular intervals. If the scribble has a `shrink` property greater than zero, its stroke width also decreases during the fade-out, creating a smooth disappearance effect.

The `delay` property controls how long a scribble remains at full length before starting to shrink. For the laser pointer, this creates a trailing effect that persists briefly before disappearing.

## Using scribbles

### Creating a scribble

Tools create scribbles by calling `editor.scribbles.addScribble()` with optional configuration:

```typescript
const scribble = this.editor.scribbles.addScribble({
	color: 'laser',
	opacity: 0.7,
	size: 4,
	delay: 1000,
	shrink: 0.05,
	taper: true,
})
```

### Adding points

As the pointer moves, add points to the scribble using the returned scribble ID:

```typescript
const { x, y } = this.editor.inputs.getCurrentPagePoint()
this.editor.scribbles.addPoint(scribble.id, x, y)
```

The manager automatically deduplicates points that are too close together, ensuring smooth rendering.

### Stopping a scribble

When the tool operation completes, stop the scribble to begin the fade-out:

```typescript
this.editor.scribbles.stop(scribble.id)
```

The scribble transitions to the stopping state and removes itself once all points are cleared.

## Scribble properties

Scribbles support extensive visual customization:

- **color**: A canvas UI color like `'accent'`, `'laser'`, `'muted-1'`, or `'selection-stroke'`
- **size**: Stroke width in pixels
- **opacity**: Transparency from 0 to 1
- **delay**: Milliseconds before the scribble starts shrinking (used for trailing effects)
- **shrink**: Rate at which the stroke width decreases during fade-out (0 to 1)
- **taper**: Whether the stroke tapers at the ends

Default values are set automatically but can be overridden when creating the scribble.

## Common use cases

### Eraser tool

The eraser creates a thick, semi-transparent scribble to show the erasure path:

```typescript
const scribble = this.editor.scribbles.addScribble({
	color: 'muted-1',
	size: 12,
})
```

### Laser pointer

The laser pointer uses delay and shrink properties to create a trailing effect:

```typescript
const scribble = this.editor.scribbles.addScribble({
	color: 'laser',
	opacity: 0.7,
	size: 4,
	delay: 1000, // Trail persists for 1 second
	shrink: 0.05,
	taper: true,
})
```

### Scribble-brush selection

The selection tool uses scribbles for freehand selection with a distinctive color:

```typescript
const scribble = this.editor.scribbles.addScribble({
	color: 'selection-stroke',
	opacity: 0.32,
	size: 12,
})
```

## Key files

- packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts - Scribble lifecycle management and rendering
- packages/tlschema/src/misc/TLScribble.ts - Scribble type definition and states
- packages/tldraw/src/lib/tools/LaserTool/childStates/Lasering.ts - Laser pointer scribble implementation
- packages/tldraw/src/lib/tools/EraserTool/childStates/Erasing.ts - Eraser tool scribble implementation
- packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts - Scribble-brush selection implementation

## Related

- [Input handling](./input-handling.md)
- [Tick system](./tick-system.md)
