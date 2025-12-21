---
title: Edge scrolling
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - edge
  - scrolling
readability: 8
voice: 7
potential: 6
accuracy: 10
notes: "Opening doesn't follow 'When we...' pattern. Passive voice in places. Conclusion summarizes rather than adds perspective. Niche topic with limited broader appeal."
---

# Edge scrolling

Your finger isn't a point. When you drag a shape with touch, the contact area is roughly 12 pixels wide—but the browser only reports the center point. This creates a problem: edge scrolling needs to trigger when your finger gets close to the viewport edge, but your finger might reach the edge 12 pixels before the reported contact point does.

The solution is to treat touch pointers as having width. When calculating edge scroll proximity, tldraw extends the touch pointer position 12 pixels in each direction. A finger at 20 pixels from the edge is treated as potentially being at 8 pixels from the edge. Mouse pointers get no adjustment—they're single pixels and users expect pixel-perfect precision.

Without this adjustment, touch users would have to push their finger past the viewport edge to trigger scrolling—by which point they've likely already released the drag in frustration. The 12-pixel extension gives touch the forgiveness it needs, while mouse stays precise.

```typescript
// packages/editor/src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.ts
const pw = isCoarse ? editor.options.coarsePointerWidth : 0
const pMin = position - pw
const pMax = position + pw
```

The proximity calculation uses both `pMin` and `pMax` to create an effective "pointer range." For touch, a contact point at x=20 creates a range from 8 to 32. If the edge scroll zone extends 8 pixels from the left edge (the default), then `pMin < 8` triggers scrolling. The touch user's finger is still 20 pixels away, but the system compensates for the invisible contact area.

For mouse input, `pw` is zero. The pointer has no width. Position 8 triggers at 8, position 9 doesn't trigger at all. This is what mouse users expect—they can see the cursor and control it precisely.

## Two-phase acceleration

Edge scrolling has two timing phases that create surprisingly natural behavior. First, nothing happens. You enter the edge zone and the canvas stays still for 200ms. This delay prevents accidental triggers—you can drag near an edge without the canvas moving.

After the delay, the second phase begins: a cubic ease-in over another 200ms. The scroll velocity ramps from zero to full speed following a t³ curve. This isn't just aesthetic—it gives users fine control. In the first 100ms after the delay ends, the scroll is still quite slow. You can make small adjustments. By 400ms total (200ms delay + 200ms ease), you're at full speed.

```typescript
const eased = EASINGS.easeInCubic(
	Math.min(1, this._edgeScrollDuration / (edgeScrollDelay + edgeScrollEaseDuration))
)
```

The cubic curve is key. A linear ramp (t) would hit 50% speed at the halfway point. But t³ hits only 12.5% speed at the halfway point (0.5³ = 0.125). This front-loads the slow phase where users need control, then accelerates hard in the second half.

The result: 0-200ms (delay, no motion), 200-300ms (slow, ~1-12% speed), 300-400ms (accelerating, 12-100% speed), 400ms+ (full speed based on proximity).

```typescript
if (pMin < min) {
	return Math.min(1, (min - pMin) / dist)
} else if (pMax > max) {
	return -Math.min(1, (pMax - max) / dist)
}
return 0
```

The proximity factor ranges from 0 (just entered the zone) to 1 (at or past the edge). At position 4 pixels from the edge (halfway into the 8-pixel zone), the factor is 0.5. At the edge itself, it's 1.0. Push past the edge and it stays capped at 1.0.

This combines multiplicatively with the easing factor. At 300ms into edge scrolling (100ms into the ease), you're at `eased = 0.125`. If you're 4 pixels from the edge, `proximity = 0.5`. Final velocity is `0.125 × 0.5 = 0.0625` (6.25% of max speed). If you move 2 pixels closer to the edge, proximity jumps to 0.75, velocity becomes 9.4%. You can modulate speed by adjusting your distance from the edge.

The `insetStart` and `insetEnd` parameters handle cases where UI elements cover the viewport edges. If there's a toolbar at the top, you can disable edge scrolling on that edge by passing `insetStart: true` for the Y axis.

## The 0.612 mystery

Small screens get special treatment. If the viewport width or height is under 1000 pixels, scroll speed is multiplied by 0.612:

```typescript
const screenSizeFactorX = screenBounds.w < 1000 ? 0.612 : 1
const screenSizeFactorY = screenBounds.h < 1000 ? 0.612 : 1
```

Why 0.612 specifically? This is the golden ratio's reciprocal (1/φ ≈ 0.618), or close to it. Whether this was intentional or empirical tuning that landed near a mathematical constant is unclear from the code. But the effect is practical: edge scrolling at full speed on a phone-sized screen is disorienting. The ~40% reduction makes it feel controlled.

The factor applies independently to each axis. A 800×1200 screen gets the reduction on width but not height. A 600×400 screen gets it on both.

Zoom level also affects speed:

```typescript
const scrollDeltaX = (pxSpeed * proximityFactor.x * screenSizeFactorX) / zoomLevel
```

At 2× zoom, the same pixel movement covers half the canvas distance. Dividing by zoom level keeps the perceived speed constant. You're looking at a zoomed area, so scrolling needs to move fewer canvas units to maintain the same visual rate of change.

## When edge scrolling stops

Edge scrolling only runs during drag operations. Three conditions must be met:

```typescript
if (
	!editor.inputs.getIsDragging() ||
	editor.inputs.getIsPanning() ||
	editor.getCameraOptions().isLocked
)
	return
```

If you're not dragging, there's nothing to scroll for. If you're panning (two-finger touch or middle mouse button), that's an explicit camera movement gesture—edge scroll would fight it. If the camera is locked, the canvas can't move anyway.

The edge scroll manager runs on every editor tick while these conditions are met. Each tick recalculates pointer position, proximity factors, and applies the appropriate velocity. Leave the edge zone and the timer resets. Re-enter and the 200ms delay starts fresh.

## What makes this work

The combination of pointer width compensation, two-phase acceleration, and proximity-based speed control creates edge scrolling that feels invisible when it works. Touch users don't notice that the system compensates for their imprecise input. Mouse users don't accidentally trigger it. The cubic ease-in prevents jarring transitions.

The implementation is straightforward—a few dozen lines of math—but getting the constants right (8-pixel zone, 200ms delay, 200ms ease, 12-pixel touch width, 0.612 small screen factor) required real-world testing. Change any one of these and the feel degrades noticeably.

## Key files

- `packages/editor/src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.ts` — Main implementation
- `packages/editor/src/lib/options.ts:136` — Configuration defaults (`edgeScrollDelay`, `edgeScrollSpeed`, etc.)
- `packages/editor/src/lib/primitives/easings.ts:7` — `easeInCubic` function
