# Edge scrolling

When you drag a shape toward the edge of the viewport, tldraw automatically scrolls the canvas to reveal more space. This sounds simple—just detect when the pointer is near an edge and move the camera—but getting it to feel good requires handling touch vs mouse input differently, preventing accidental triggers, and easing into the scroll smoothly.

## The problem

Dragging without edge scrolling is frustrating. You grab a shape, move it toward where you want it, hit the viewport boundary, and have to stop, pan the canvas, then continue dragging. This breaks flow and requires multiple gestures for what should be a single action.

But naive edge scrolling creates its own problems. If the canvas scrolls immediately when the pointer gets close to an edge, you'll trigger it accidentally any time you drag near the viewport boundary. And if the scroll starts at full speed, it feels jarring and is hard to control.

## Pointer width matters

Touch input is less precise than mouse input. When you drag with your finger, the "pointer" isn't a single pixel—it's the center of a contact area that's roughly 12 pixels wide. This means touch users trigger edge scrolling from further away than mouse users, because the effective edge of their pointer is further from the actual contact point.

```typescript
// packages/editor/src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.ts
const pw = isCoarse ? editor.options.coarsePointerWidth : 0
const pMin = position - pw
const pMax = position + pw
```

For coarse pointers (touch, stylus on some devices), the pointer width extends 12 pixels in each direction. A finger at position 20 pixels from the edge is treated as if it might be at position 8 pixels from the edge. Fine pointers (mouse) have no width adjustment—the pointer position is exact.

This asymmetry feels natural. Touch users expect more forgiveness because they can't see exactly where they're pointing. Mouse users expect precision.

## The edge scroll zone

Edge scrolling activates within a configurable distance from each viewport edge (default: 8 pixels). Within this zone, a "proximity factor" determines how aggressively the canvas scrolls:

```typescript
const min = insetStart ? 0 : dist
const max = insetEnd ? dimension : dimension - dist

if (pMin < min) {
	return Math.min(1, (min - pMin) / dist)
} else if (pMax > max) {
	return -Math.min(1, (pMax - max) / dist)
}
return 0
```

The proximity factor ranges from 0 (just entered the zone) to 1 (at or past the viewport edge). The sign indicates direction: positive scrolls right/down, negative scrolls left/up.

The `insetStart` and `insetEnd` parameters handle cases where the canvas is embedded with UI elements on certain edges. If there's a toolbar at the top of the viewport, you might not want edge scrolling on that edge since the toolbar already "steals" that space.

## Delay before scrolling

To prevent accidental triggers, edge scrolling doesn't start immediately. There's a 200ms delay after the pointer enters an edge zone before scrolling begins:

```typescript
this._edgeScrollDuration += elapsed
if (this._edgeScrollDuration > editor.options.edgeScrollDelay) {
	// Now we can scroll
}
```

This delay is critical for usability. Without it, dragging a shape anywhere near the edge—even briefly—would scroll the canvas. The delay gives users time to complete their drag without interference.

## Easing into the scroll

Even after the delay, scrolling doesn't jump to full speed. The implementation uses `easeInCubic` (t³) to ramp up over an additional 200ms:

```typescript
const eased = EASINGS.easeInCubic(
	Math.min(1, this._edgeScrollDuration / (edgeScrollDelay + edgeScrollEaseDuration))
)
this.moveCameraWhenCloseToEdge({
	x: proximityFactorX * eased,
	y: proximityFactorY * eased,
})
```

The cubic easing starts slow and accelerates. Combined with the proximity factor, this creates a smooth ramp:

- **0-200ms**: Delay, no scrolling
- **200-400ms**: Gradual acceleration (cubic curve)
- **400ms+**: Full speed based on proximity factor

Moving closer to the edge increases the proximity factor, making scrolling faster. Moving away reduces it. This gives users fine control—they can scroll slowly by hovering near the edge or quickly by pushing past it.

## Speed adjustments

The final scroll speed depends on several factors:

```typescript
const zoomLevel = editor.getZoomLevel()
const pxSpeed = editor.user.getEdgeScrollSpeed() * editor.options.edgeScrollSpeed
const scrollDeltaX = (pxSpeed * proximityFactor.x * screenSizeFactorX) / zoomLevel
```

**Zoom level**: At higher zoom levels, the same pixel movement covers less canvas distance. Dividing by zoom level keeps the perceived speed consistent regardless of zoom.

**Screen size**: Small screens (width or height under 1000 pixels) get a 0.612 multiplier. Edge scrolling at full speed on a phone would be disorienting.

**User preference**: The `getEdgeScrollSpeed()` multiplier lets users adjust or disable edge scrolling entirely. Setting it to 0 disables the feature.

## Conditions for scrolling

Edge scrolling only happens under specific conditions:

```typescript
if (
	!editor.inputs.getIsDragging() ||
	editor.inputs.getIsPanning() ||
	editor.getCameraOptions().isLocked
)
	return
```

- **Must be dragging**: No point scrolling the canvas if you're not moving something
- **Not while panning**: If you're already panning with two fingers or middle mouse button, edge scroll would fight with your explicit pan gesture
- **Camera not locked**: Some contexts (embedded views, constrained editors) lock the camera in place

## Putting it together

The edge scroll manager runs on every editor tick during a drag operation. Each tick, it:

1. Gets the current pointer position and type (coarse vs fine)
2. Calculates proximity factors for X and Y edges, accounting for pointer width
3. Updates the scroll duration timer
4. If past the delay, applies easing and moves the camera

The result feels natural: you can drag shapes off the edge of the viewport and the canvas follows smoothly, accelerating as you push further past the edge. Touch users get extra leeway. Accidental triggers are rare thanks to the delay.

## Key files

- `packages/editor/src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.ts` — Main implementation
- `packages/editor/src/lib/options.ts:136` — Configuration defaults (`edgeScrollDelay`, `edgeScrollSpeed`, etc.)
- `packages/editor/src/lib/primitives/easings.ts:7` — `easeInCubic` function
