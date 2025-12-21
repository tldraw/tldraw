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

When we added visual feedback trails—the eraser's path, the laser pointer's line, the selection lasso—we needed a system that could display moving marks that fade smoothly over time. The trails follow your pointer as you move, accumulate points during an initial delay period, then start removing old points as new ones arrive, creating a sliding window effect.

The core mechanism is a delay queue with a sliding window. Points accumulate during a configurable delay period. When the delay expires, the window starts: add a point at the head, remove one from the tail. This creates a trail of consistent length that follows behind the pointer.

## The delay queue

Each scribble tracks a `delayRemaining` countdown timer:

```typescript
export interface ScribbleItem {
	id: string
	scribble: TLScribble
	timeoutMs: number          // Accumulates elapsed time, resets at 16ms
	delayRemaining: number     // Countdown timer for delay queue
	prev: null | VecModel      // Previous point (for deduplication)
	next: null | VecModel      // Next point to add
}
```

During each tick, `delayRemaining` counts down by the elapsed time:

```typescript
if (item.delayRemaining > 0) {
	item.delayRemaining = Math.max(0, item.delayRemaining - elapsed)
}
```

While `delayRemaining > 0`, points accumulate without removal. This is what gives the laser pointer its characteristic behavior—the trail builds up for 1200ms before it starts disappearing, ensuring the audience can follow along during presentations.

The eraser, on the other hand, uses `delay: 0` for immediate feedback. Points start being removed as soon as the first few accumulate.

## The sliding window

Once the delay expires (`delayRemaining === 0`), the sliding window begins. In the active state, when a new point arrives:

```typescript
// Active state, moving
if (next && next !== prev) {
	scribble.points.push(next)
	if (item.delayRemaining === 0 && scribble.points.length > 8) {
		scribble.points.shift()  // Remove oldest point
	}
	item.prev = next
	item.next = null
}
```

The `shift()` operation removes the oldest point from the array while new points are added at the end with `push()`. This creates the trail effect—a fixed-length window of recent positions that follows the pointer.

The minimum of 8 points ensures smooth rendering. Scribbles start in a "starting" state that collects at least 8 points before transitioning to "active," which prevents the trail from looking choppy when it first appears.

## The 16ms throttle

Point removal doesn't happen on every frame—it's throttled to 16ms intervals:

```typescript
item.timeoutMs += elapsed
if (item.timeoutMs >= 16) {
	item.timeoutMs = 0
}
```

Operations only execute when `timeoutMs` reaches zero. This ensures a consistent removal rate of approximately 60fps regardless of the actual frame rate. On a 120Hz display, the trail doesn't disappear twice as fast. On a slower machine, it doesn't linger unpredictably.

When a scribble enters the "stopping" state (pointer released), the same throttle applies. Each 16ms interval, one point is removed:

```typescript
// Stopping state
if (item.delayRemaining === 0 && item.timeoutMs === 0) {
	if (scribble.points.length === 1) {
		this.scribbleItems.delete(id)  // Last point, remove scribble
	} else {
		scribble.points.shift()  // Remove oldest point
	}
}
```

The trail shrinks gradually until only one point remains, at which point the scribble is deleted entirely.

## Point deduplication

Not every pointer movement creates a new point. Points are deduplicated based on distance:

```typescript
addPoint(id: ScribbleItem['id'], x: number, y: number, z = 0.5) {
	const item = this.scribbleItems.get(id)
	const { prev } = item
	const point = { x, y, z }
	if (!prev || Vec.Dist(prev, point) >= 1) {
		item.next = point
	}
	return item
}
```

Only points at least 1 pixel apart from the previous point are added. This prevents the trail from accumulating redundant points during slow movement, which would make the trail length unpredictable—a dense cluster of points in one area would cause the window to cover less actual distance.

## Tool-specific configurations

Different tools configure these parameters differently:

The eraser uses immediate feedback with a fast fade:

```typescript
const scribble = this.editor.scribbles.addScribble({
	color: 'muted-1',
	size: 12,
	// delay defaults to 0
	// shrink defaults to 0.1
})
```

The laser pointer uses a long delay and slow fade for presentations:

```typescript
const scribble = this.editor.scribbles.addScribble({
	color: 'laser',
	opacity: 0.7,
	size: 4,
	delay: this.editor.options.laserDelayMs,  // 1200ms
	shrink: 0.05,  // Slower fade
	taper: true,
})
```

The selection lasso uses immediate feedback with semi-transparency:

```typescript
const scribbleItem = this.editor.scribbles.addScribble({
	color: 'selection-stroke',
	opacity: 0.32,
	size: 12,
	// delay defaults to 0
})
```

The delay queue pattern generalizes to any scenario where you need a time-windowed trail. Touch gesture visualizations, cursor path prediction, or debug overlays that show frame timing—all follow the same structure. Accumulate during a delay period, then maintain a sliding window of recent data as new points arrive.

## Source files

- `/packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts` - Main scribble state machine and point management
- `/packages/tldraw/src/lib/canvas/TldrawScribble.tsx` - Variable-width SVG rendering
- `/packages/tldraw/src/lib/tools/LaserTool/childStates/Lasering.ts` - Laser tool implementation
- `/packages/tldraw/src/lib/tools/EraserTool/childStates/Erasing.ts` - Eraser tool implementation
- `/packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts` - Selection lasso implementation
