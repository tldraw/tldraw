---
title: Edge scrolling
created_at: 02/03/2026
updated_at: 02/03/2026
keywords:
  - edge
  - scrolling
  - touch
  - pointer
status: draft
date: 02/03/2026
order: 0
---

# Edge scrolling

When we drag a shape toward the edge of the screen, the canvas should scroll to reveal more space. This sounds simple, but three problems make it tricky:

1. **Finger width**: Our fingers aren't points—they have thickness. The browser reports touch position at the center, but the finger reaches the edge before the reported position does.
2. **Accidental triggers**: Users often drag near edges without wanting to scroll. We need a delay before scrolling starts, then smooth acceleration.
3. **Screen size and zoom**: Full-speed scrolling on a phone feels disorienting. Zoomed-in views need adjusted speeds to feel consistent.

## Finger width compensation

**Problem**: Touch contact areas are roughly 12 pixels wide, but browsers only report the center point. A user's finger might physically reach the viewport edge while the reported position is still 12 pixels away.

We solve this by giving width to coarse touch pointers. When calculating edge proximity, extend the touch position 12 pixels in each direction.

```tsx
// packages/editor/src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.ts
const pw = isCoarse ? editor.options.coarsePointerWidth : 0
const pMin = position - pw
const pMax = position + pw
```

A touch at x=20 creates an effective range from 8 to 32. If the edge scroll zone is 8 pixels, scrolling triggers when `pMin < 8`—even though the reported position is still 20 pixels away. Mouse pointers get `pw = 0`: position 8 triggers at 8, position 9 doesn't trigger at all. Mouse users expect this precision.

## Two-phase acceleration

**Problem**: Accidental triggers are frustrating. But instant full-speed scrolling is jarring.

Acceleration in two phases. First, a 200ms delay where nothing happens—you can drag near an edge without triggering scrolling. Then, a 200ms cubic ease-in from zero to full speed.

```tsx
const eased = EASINGS.easeInCubic(
	Math.min(1, this._edgeScrollDuration / (edgeScrollDelay + edgeScrollEaseDuration))
)
```

The cubic curve front-loads the slow phase. A linear ramp hits 50% speed at the halfway point; a cubic ramp (t³) hits only 12.5% at halfway. This gives users fine control early, then accelerates hard.

Speed also scales with proximity to the edge:

```tsx
if (pMin < min) {
	return Math.min(1, (min - pMin) / dist)
} else if (pMax > max) {
	return -Math.min(1, (pMax - max) / dist)
}
return 0
```

At 4 pixels from an 8-pixel edge zone, proximity factor is 0.5. At the edge itself, it's 1.0. This multiplies with the easing factor—users can modulate speed by adjusting their distance from the edge.

## Screen size and zoom

**Problem**: Full-speed edge scrolling on a phone-sized screen feels out of control. And at high zoom levels, the same pixel movement covers less canvas.

**Solution**: Screens under 1000 pixels in width or height get scroll speed multiplied by 0.612 (close to 1/φ, the golden ratio's reciprocal). The ~40% reduction keeps things manageable.

```tsx
const screenSizeFactorX = screenBounds.w < 1000 ? 0.612 : 1
const screenSizeFactorY = screenBounds.h < 1000 ? 0.612 : 1
```

Zoom level divides the final velocity:

```tsx
const scrollDeltaX = (pxSpeed * proximityFactor.x * screenSizeFactorX) / zoomLevel
```

At 2× zoom, the same pixel movement covers half the canvas distance. Dividing by zoom keeps perceived speed constant.

## When it stops

Edge scrolling only runs during drags, and stops if you're panning or the camera is locked:

```tsx
if (
	!editor.inputs.getIsDragging() ||
	editor.inputs.getIsPanning() ||
	editor.getCameraOptions().isLocked
)
	return
```

Leave the edge zone and the timer resets. Re-enter and the 200ms delay starts fresh.
