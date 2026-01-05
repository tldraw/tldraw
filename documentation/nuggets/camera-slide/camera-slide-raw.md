# Camera slide momentum - Raw research notes

## Topic overview

Camera slide momentum: when you drag the canvas with the hand tool and release while moving, the camera continues sliding in that direction with gradually decreasing speed (like sliding something across ice).

## Key implementation files

### HandTool Dragging state
`packages/tldraw/src/lib/tools/HandTool/childStates/Dragging.ts:39-50`

The `complete()` method captures pointer velocity at release:
- Gets pointer velocity from editor inputs
- Caps velocity at 2 px/ms (prevents flying off)
- Minimum threshold of 0.1 px/ms to trigger slide (filters out slow drags)
- Calls `editor.slideCamera()` with speed and direction

```typescript
private complete() {
	const { editor } = this
	const pointerVelocity = editor.inputs.getPointerVelocity()

	const velocityAtPointerUp = Math.min(pointerVelocity.len(), 2)

	if (velocityAtPointerUp > 0.1) {
		this.editor.slideCamera({ speed: velocityAtPointerUp, direction: pointerVelocity })
	}

	this.parent.transition('idle')
}
```

### Editor slideCamera method
`packages/editor/src/lib/editor/Editor.ts:3585-3633`

The core animation loop:
- Checks camera lock and animation speed settings
- Uses default friction of 0.09 (from options)
- Speed capped at 1 (after initial velocity check)
- Movement divided by zoom level (cz) for zoom-consistent feel
- Friction applied multiplicatively: `currentSpeed *= 1 - friction`
- Stops when speed drops below threshold (default 0.01)
- Listens to 'tick' event for animation frames

Key parameters:
- `speed`: initial velocity magnitude
- `direction`: normalized velocity vector
- `friction`: decay rate (default 0.09)
- `speedThreshold`: minimum speed before stopping (default 0.01)
- `force`: override camera lock

Conditions that prevent sliding:
- Camera is locked (`isLocked`) unless `force: true`
- Animation speed is 0 (user preference)
- No checks for reduced motion here (might be elsewhere?)

### Velocity tracking
`packages/editor/src/lib/editor/managers/InputsManager/InputsManager.ts:452-474`

The `updatePointerVelocity()` method smooths velocity:
- Called on tick (not per pointer event)
- Calculates delta from previous point
- Uses linear interpolation (lrp) at 0.5 to blend with previous velocity
- Zeros out components < 0.01 to prevent imperceptible drift
- Comment suggests considering easing instead of linear interpolation

```typescript
// Blend current velocity with new measurement
const next = pointerVelocity.clone().lrp(direction.mul(length / elapsed), 0.5)

// if the velocity is very small, just set it to 0
if (Math.abs(next.x) < 0.01) next.x = 0
if (Math.abs(next.y) < 0.01) next.y = 0
```

### Friction constant
`packages/editor/src/lib/options.ts:124`

Default friction: `cameraSlideFriction: 0.09`

Located in default editor options alongside other constants like:
- `doubleClickDurationMs: 450`
- `dragDistanceSquared: 16`
- etc.

## Tests
`packages/editor/src/lib/editor/Editor.test.ts:161-171`

Basic tests for:
1. No-op when camera is locked
2. Animation runs when locked with `force: true` flag

No tests for:
- Friction behavior
- Velocity threshold
- Speed capping
- Zoom consistency

## Design decisions & trade-offs

### Friction value: 0.09
- Feels natural, like sliding on smooth surface
- Mentioned to match Mac trackpad scroll decay
- 0.91 speed retention per tick (91% of previous speed)
- Creates exponential decay curve
- Too high (0.2): stops too abruptly
- Too low (0.03): drifts too far

### Velocity smoothing: 0.5 lrp factor
- Removes spikes from individual frames
- Still responsive to movement changes
- Half-way blend between previous and new velocity
- Similar smoothing used for drawing positions

### Speed cap: 2 px/ms
- Prevents canvas flying off to infinity
- Still allows fast momentum feel
- Applied at capture, not during slide

### Minimum velocity: 0.1 px/ms
- Filters out unintentional momentum from slow drags
- Deliberate pans just stop without sliding
- Prevents accidental triggering

### Speed threshold: 0.01 px/ms
- Stop point for animation
- Movement below this is imperceptible
- Prevents infinite tiny movements

### Zoom adjustment
- Divides movement by zoom level (`/ cz`)
- Makes slide feel consistent at any zoom
- Higher zoom = less canvas-space movement for same screen-space velocity

## Similar patterns in codebase

Drawing smoothing also uses lrp at 0.5 to remove noise in pointer positions.

## Public API exposure

`slideCamera` is part of the public Editor API:
```typescript
editor.slideCamera({
	speed: velocity.len(),
	direction: velocity,
	friction: 0.09  // optional
})
```

Can be used in custom tools and interactions.

## Related concepts

- Mac trackpad momentum scrolling (natural decay curve)
- Physics simulation: friction proportional to velocity
- Exponential decay: `speed *= (1 - friction)` per frame
- "Ease-out" feeling from exponential decay
- ~60fps animation via tick events

## Edge cases to mention

- Camera lock (with force override)
- Animation disabled (animationSpeed === 0)
- Reduced motion preferences (not in slideCamera itself?)
- Minimum velocity threshold
- Speed capping
- Imperceptible movement cutoff

## Potential improvements / open questions

- Comment in InputsManager suggests considering easing instead of linear interpolation
- Could friction be configurable per-instance?
- How does this interact with other camera animations?
- `stopCameraAnimation()` is called at start of slideCamera - prevents conflicting animations

## Writing angle

- Lead with the user experience: "drag and release with momentum"
- Explain the physical feeling: "like sliding on ice"
- Cover three main phases:
  1. Capturing velocity at release
  2. Smoothing velocity tracking
  3. Applying friction to slide
- Emphasize design choices: why 0.09 friction, why smooth velocity
- Mention zoom consistency (subtle but important)
- Show it's a public API for custom tools

## Related nuggets/topics

- Hand tool implementation
- Input system / pointer tracking
- Camera animation system
- Tick-based animation
- Editor options and configuration
