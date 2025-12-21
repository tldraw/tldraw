---
title: Scribble animation
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - scribble
  - animation
  - trail
---

# Scribble animation

When we added the laser pointer tool to tldraw, we wanted a trail that persists for a moment before fading—something that follows the cursor and gives remote viewers time to see what you're pointing at. The eraser tool needs something similar: a visible mark showing where you've dragged. These animated scribbles are simple visual effects, but getting the timing and behavior right required a small state machine.

Here's how it works.

## The state machine

Every scribble has a state that determines how it behaves during each animation frame:

```typescript
export interface TLScribble {
	id: string
	points: VecModel[]
	size: number
	color: TLCanvasUiColor
	opacity: number
	state: 'starting' | 'paused' | 'active' | 'stopping'
	delay: number
	shrink: number
	taper: boolean
}
```

The `state` field drives the whole system. Each state handles the animation loop differently.

### Starting state

When you create a scribble, it begins in the `starting` state. This state collects the first batch of points before any removal happens:

```typescript
case 'starting': {
	if (next && next !== prev) {
		points.push(next)
		item.prev = item.next
		item.next = null
	}

	if (points.length > 8) {
		scribble.state = 'active'
	}
	break
}
```

The magic number is 8. We need at least 8 points before transitioning to `active`. Why 8? It ensures the scribble has enough geometry to render smoothly before we start removing points from the tail. With fewer points, the stroke renderer can't generate a clean variable-width path, and you see visual artifacts as the sliding window begins.

### Active state

Once the scribble has enough points, it enters the `active` state. This is where the sliding window effect happens. The active state has two modes:

**Moving**: When the cursor is moving, we add new points at the head and remove old points from the tail:

```typescript
if (next && next !== prev) {
	points.push(next)
	item.prev = item.next
	item.next = null

	if (item.delayRemaining === 0 && points.length > 8) {
		points.shift()
	}
}
```

The `delayRemaining` countdown controls when removal starts. For tools like the laser pointer, `delay` is set to 1200ms. During this delay, points accumulate but nothing is removed—the trail grows longer. Once `delayRemaining` reaches zero, every new point added causes the oldest point to be removed. This keeps the trail at a constant length.

**Idle**: When the cursor stops moving but the scribble is still active, we gradually remove points:

```typescript
else {
	if (item.timeoutMs === 0 && item.delayRemaining === 0) {
		if (points.length > 1) {
			points.shift()
		} else {
			item.delayRemaining = scribble.delay
		}
	}
}
```

The `timeoutMs` field throttles operations to 16ms intervals (roughly 60fps). While idle, we remove one point every 16ms until only a single point remains. Then we reset `delayRemaining` so the trail can grow again if movement resumes.

### Stopping state

When you exit a tool, the scribble transitions to `stopping`. In this state, no new points are added. Instead, the trail shrinks and fades:

```typescript
case 'stopping': {
	if (item.delayRemaining === 0 && item.timeoutMs === 0) {
		if (points.length === 1) {
			this.scribbleItems.delete(id)
			continue
		}

		scribble.size = Math.max(1, scribble.size * (1 - scribble.shrink))
		points.shift()
	}
	break
}
```

The delay is capped at 200ms when entering `stopping` state. This prevents long delays (like the laser's 1200ms) from making the trail linger too long after you've switched tools.

The `shrink` parameter controls how quickly the stroke width decreases. It's applied as a multiplier: `size = size * (1 - shrink)`. The default is 0.1 (10% shrink per frame), which creates an exponential decay. For a size of 20, the first few frames look like this:

- Frame 1: 20 × 0.9 = 18
- Frame 2: 18 × 0.9 = 16.2
- Frame 3: 16.2 × 0.9 = 14.58

The laser tool uses a slower shrink of 0.05 for a more dramatic fade.

### Paused state

There's a fourth state, `paused`, which does nothing during tick. We don't use it in any current tools—it's there for future flexibility.

## The delay queue

The timing system uses two fields: `delayRemaining` and `timeoutMs`.

`delayRemaining` counts down from the initial `delay` value. While it's greater than zero, points accumulate without removal:

```typescript
if (item.delayRemaining > 0) {
	item.delayRemaining = Math.max(0, item.delayRemaining - elapsed)
}
```

Once `delayRemaining` reaches zero, the sliding window begins. For tools with no delay (like the eraser), the countdown is already at zero and removal starts immediately.

`timeoutMs` throttles operations to 16ms intervals:

```typescript
item.timeoutMs += elapsed
if (item.timeoutMs >= 16) {
	item.timeoutMs = 0
}
```

This ensures consistent behavior regardless of the actual frame rate. Point removal happens at roughly 60fps, even if the browser is running faster or slower.

## Tool configurations

The state machine is the same for every tool, but each tool configures the scribble differently.

The eraser creates a scribble with no delay and a small size:

```typescript
const scribble = this.editor.scribbles.addScribble({
	color: 'muted-1',
	size: 12,
})
```

The laser pointer uses a long delay and slow shrink:

```typescript
const scribble = this.editor.scribbles.addScribble({
	color: 'laser',
	opacity: 0.7,
	size: 4,
	delay: 1200,
	shrink: 0.05,
	taper: true,
})
```

The selection lasso has no delay but uses a semi-transparent stroke:

```typescript
const scribbleItem = this.editor.scribbles.addScribble({
	color: 'selection-stroke',
	opacity: 0.32,
	size: 12,
})
```

Same state machine, different parameters.

## Switch statement structure

The tick loop is a straightforward switch on the current state:

```typescript
tick(elapsed: number) {
	for (const [id, item] of this.scribbleItems) {
		const { scribble } = item
		const { points, state } = scribble

		if (item.delayRemaining > 0) {
			item.delayRemaining = Math.max(0, item.delayRemaining - elapsed)
		}

		item.timeoutMs += elapsed
		if (item.timeoutMs >= 16) {
			item.timeoutMs = 0
		}

		switch (state) {
			case 'starting': {
				// collect points until length > 8
				break
			}
			case 'active': {
				// sliding window: add and remove
				break
			}
			case 'stopping': {
				// shrink and fade
				break
			}
			case 'paused': {
				// do nothing
				break
			}
		}
	}

	// update instance state with immutable copies
	this.editor.updateInstanceState({
		scribbles: Array.from(this.scribbleItems.values())
			.map(({ scribble }) => ({
				...scribble,
				points: [...scribble.points],
			}))
			.slice(-5),
	})
}
```

The switch makes transitions explicit and behavior predictable. Each state is self-contained—no complex conditionals or shared flags.

## Why 8 points

We tried different thresholds. Below 8, the stroke renderer produces jagged edges when the sliding window starts. The `getStroke` function needs enough points to generate smooth variable-width outlines. With 8 points, the path is clean from the start of the active state.

It's not a perfect number—7 might work in some cases, 10 in others—but 8 is the sweet spot for the tools we have.

## Source files

The state machine lives in `/packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts`. The type definitions are in `/packages/tlschema/src/misc/TLScribble.ts`. Rendering happens in `/packages/tldraw/src/lib/canvas/TldrawScribble.tsx` for variable-width strokes and `/packages/editor/src/lib/components/default-components/DefaultScribble.tsx` for constant-width fallback.
