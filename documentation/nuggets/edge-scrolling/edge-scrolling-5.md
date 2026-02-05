---
title: Edge scrolling
created_at: 02/03/2026
updated_at: 02/03/2026
keywords:
  - edge
  - scrolling
  - touch
  - pointer
readability: 8
voice: 7
potential: 7
accuracy: 10
notes: "Clear structure with intro outlining three problems. Uses 'we' well. Two sections still use **Problem:** labels which feel formulaic. The topic is niche—edge scrolling implementation details may not generate broad HN interest, though the touch compensation and cubic easing insights are genuinely useful."
status: draft
date: 02/03/2026
order: 0
---

- Fingers aren't points. Touch screens report the center of your fingertip, but your finger reaches the edge before that center does. Without compensation, you'd have to push past the screen to trigger scrolling.
- Near isn't the same as intent. Dragging close to an edge doesn't mean you want to scroll. Accidental triggers break concentration. But waiting too long feels laggy.
- Speed needs gradation. Scrolling that snaps to full speed is jarring. Scrolling that's always slow is frustrating. The right feel comes from a curve—slow at first, then accelerating.

design details on the canvas

“haven’t seen this done well in other apps”

what is edge scrolling?

if a user has zoomed in to a part of the canvas and then selected a shape, automatically scroll the viewport when the user moves the point near the edge

scroll. then other parts of the document can be brought into view

why edge scrolling?

on a canvas app, users could place information in an area outside of the visible area of display

need a way to allow users to navigate or view off-screen content

acceleration: gradation of speed.

In any canvas application,

When dragging shapes toward the edge of the screen, the canvas should scroll to reveal more space.

design: acceleration. how do you make this feel good?

finger width compensation

screen size compensation

Users often drag near edges without wanting to scroll.

**Accidental triggers**: Users often drag near edges without wanting to scroll. We need a delay before scrolling starts, then smooth acceleration.

**Screen size and zoom**: Full-speed scrolling on a phone feels disorienting. Zoomed-in views need adjusted speeds to feel consistent.

## Finger width compensation

Browsers only report the center point of the touch surface area, and our fingers are roughly 12 pixels wide. A user's finger might physically reach the viewport edge while the reported position is still 12 pixels away. If we didn’t account for this, touch users would have to push their finger past the screen edge to trigger scrolling.

We solve this by giving width to coarse touch pointers. When calculating edge proximity, we extend the touch position 12 pixels in each direction.

```tsx
// packages/editor/src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.ts
const pw = isCoarse ? editor.options.coarsePointerWidth : 0
const pMin = position - pw
const pMax = position + pw
```

A touch at x=20 creates an effective range from 8 to 32. If the edge scroll zone is 8 pixels (the default), scrolling triggers when `pMin < 8`, even though the reported position is still 20 pixels away.

Mouse pointers get `pw = 0`. The pointer has no width. Position 8 triggers at 8, position 9 doesn't trigger at all. Mouse users can see their cursor and control it precisely—this is what they expect.

## Two-phase acceleration

Accidental triggers are frustrating. But instant full-speed scrolling is jarring.

We solve this with two phases. First, a 200ms delay where nothing happens—you can drag near an edge without triggering scrolling. Then, a 200ms cubic ease-in from zero to full speed.

```tsx
const eased = EASINGS.easeInCubic(
	Math.min(1, this._edgeScrollDuration / (edgeScrollDelay + edgeScrollEaseDuration))
)
```

The cubic curve is key. A linear ramp hits 50% speed at the halfway point. But t³ hits only 12.5% speed at the halfway point (0.5³ = 0.125). This front-loads the slow phase where users need control, then accelerates hard in the second half.

The timing breaks down like this: 0–200ms is the delay (no motion). 200–300ms is slow (roughly 1–12% speed). 300–400ms accelerates hard (12–100% speed). After 400ms you're at full speed based on proximity.

Speed also scales with how close you are to the edge:

```tsx
if (pMin < min) {
	return Math.min(1, (min - pMin) / dist)
} else if (pMax > max) {
	return -Math.min(1, (pMax - max) / dist)
}
return 0
```

The proximity factor ranges from 0 (just entered the zone) to 1 (at or past the edge). At 4 pixels from the edge (halfway into the 8-pixel zone), the factor is 0.5. At the edge itself, it's 1.0. Push past the edge and it stays capped at 1.0.

These factors combine multiplicatively. At 300ms into edge scrolling (100ms into the ease), eased = 0.125. If you're 4 pixels from the edge, proximity = 0.5. Final velocity is 0.125 × 0.5 = 0.0625 (6.25% of max speed). Move 2 pixels closer to the edge, proximity jumps to 0.75, velocity becomes 9.4%. You can modulate speed by adjusting your distance from the edge.

## Screen size and zoom

We also needed to make sure that the edge scrolling matched the size of the screen. Full-speed edge scrolling on a phone-sized screen feels out of control. And at high zoom levels, the same pixel movement covers less canvas distance.

For small screens, we multiply scroll speed by 0.612 when the viewport width or height is under 1000 pixels:

```tsx
const screenSizeFactorX = screenBounds.w < 1000 ? 0.612 : 1
const screenSizeFactorY = screenBounds.h < 1000 ? 0.612 : 1
```

Why 0.612? It's close to the golden ratio's reciprocal (1/φ ≈ 0.618). Whether this was intentional or empirical tuning that landed near a mathematical constant is unclear from the code. But the effect is practical: the ~40% reduction makes scrolling feel controlled on smaller screens.

The factor applies independently to each axis. An 800×1200 screen gets the reduction on width but not height. A 600×400 screen gets it on both.

Zoom level divides the final velocity:

```tsx
const scrollDeltaX = (pxSpeed * proximityFactor.x * screenSizeFactorX) / zoomLevel
```

At 2× zoom, the same pixel movement covers half the canvas distance. Dividing by zoom keeps the perceived speed constant—you're looking at a zoomed area, so scrolling needs to move fewer canvas units to maintain the same visual rate.

## When it stops

Edge scrolling only runs during drag operations. Three conditions must be met:

```tsx
if (
	!editor.inputs.getIsDragging() ||
	editor.inputs.getIsPanning() ||
	editor.getCameraOptions().isLocked
)
	return
```

If you're not dragging, there's nothing to scroll for. If you're panning (two-finger touch or middle mouse button), that's an explicit camera movement—edge scroll would fight it. If the camera is locked, the canvas can't move anyway.

The edge scroll manager runs on every editor tick while these conditions are met. Each tick recalculates pointer position, proximity factors, and applies the appropriate velocity. Leave the edge zone and the timer resets. Re-enter and the 200ms delay starts fresh.

The `insetStart` and `insetEnd` parameters handle cases where UI elements cover the viewport edges. If there's a toolbar at the top, you can disable edge scrolling on that edge by passing `insetStart: true` for the Y axis.
