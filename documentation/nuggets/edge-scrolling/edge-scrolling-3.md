---
title: Edge scrolling
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - edge
  - scrolling
  - camera
---

# Edge scrolling

When you drag a shape toward the edge of the viewport in tldraw, the canvas starts scrolling to reveal more space. This is edge scrolling—a feature that feels obvious until you try to make it feel right. The scroll speed needs to respond smoothly to how close you are to the edge, compensate for zoom level so it doesn't feel slower when zoomed in, and slow down on small screens where full speed is disorienting. All of this happens through a single formula with five factors.

Here's how it works.

## The formula

Every time the editor ticks while you're dragging near an edge, we calculate how far to move the camera:

```typescript
const scrollDelta = (baseSpeed × userPref × proximity × easing × screenFactor) / zoom
```

Each factor serves a specific purpose:

- `baseSpeed` — The raw pixel speed (25 pixels per tick)
- `userPref` — User's speed multiplier preference (default 1.0)
- `proximity` — How close you are to the edge (0 to 1)
- `easing` — Cubic ramp-up over 400ms (0 to 1)
- `screenFactor` — Reduction for small screens (0.612 or 1.0)
- `zoom` — Current zoom level

The first four factors multiply together to determine speed. The last one—zoom—divides to keep perceived speed constant. Let's walk through why each one exists.

## Base speed and user preference

The base speed is straightforward: 25 pixels per tick. At 60 FPS, that's 1500 pixels per second at maximum scroll. This is fast enough to feel responsive but not so fast that you lose track of what you're doing.

The user preference multiplier sits on top of this. If you set your preference to 0.5, you get half speed. Set it to 2.0, you get double speed. Set it to 0, edge scrolling is disabled. This just multiplies through:

```typescript
const pxSpeed = editor.user.getEdgeScrollSpeed() * editor.options.edgeScrollSpeed
// Example: 1.0 × 25 = 25 pixels per tick
```

Nothing interesting here yet.

## Proximity factor

The proximity factor answers "how close are you to the edge?" At the boundary of the edge zone (8 pixels from the viewport edge), proximity is 0. At the viewport edge itself, proximity is 1. Halfway between, proximity is 0.5.

```typescript
private getEdgeProximityFactors(
    position: number,
    dimension: number,
    isCoarse: boolean,
    insetStart: boolean,
    insetEnd: boolean
) {
    const { editor } = this
    const dist = editor.options.edgeScrollDistance // 8 pixels
    const pw = isCoarse ? editor.options.coarsePointerWidth : 0 // 12 for touch, 0 for mouse
    const pMin = position - pw
    const pMax = position + pw
    const min = insetStart ? 0 : dist
    const max = insetEnd ? dimension : dimension - dist
    if (pMin < min) {
        return Math.min(1, (min - pMin) / dist)
    } else if (pMax > max) {
        return -Math.min(1, (pMax - max) / dist)
    }
    return 0
}
```

For a mouse at x=4 with an edge zone at x=8:
- `pMin = 4 - 0 = 4`
- `proximity = (8 - 4) / 8 = 0.5`

You're halfway into the zone, so you get 50% of maximum speed (once easing completes).

The `pw` (pointer width) adjustment handles touch input. Since your finger is larger than the reported touch position, we treat a touch pointer as if it extends 12 pixels in all directions. This means edge scrolling triggers earlier for touch than for mouse—you don't have to push your finger past the screen edge to start scrolling.

## Cubic easing

Edge scrolling doesn't start immediately when you enter the edge zone. There's a 200ms delay, then a 200ms cubic ramp-up. This prevents accidental triggers when you're dragging near the edge but not trying to scroll.

The cubic curve (t³) front-loads the slow phase:

```typescript
const eased =
    editor.options.edgeScrollEaseDuration > 0
        ? EASINGS.easeInCubic(
            Math.min(
                1,
                this._edgeScrollDuration /
                    (editor.options.edgeScrollDelay + editor.options.edgeScrollEaseDuration)
            )
        )
        : 1
```

At 300ms (100ms into the ease phase):
- Linear ramp would give 50% speed
- Cubic ramp gives 12.5% speed (0.5³ = 0.125)

You spend most of the ramp at slow speeds, which gives you fine control. Then it accelerates hard in the second half. By 400ms, you're at full speed.

## The 0.612 screen factor

Here's where it gets interesting. On screens narrower than 1000 pixels, we apply a reduction factor:

```typescript
const screenSizeFactorX = screenBounds.w < 1000 ? 0.612 : 1
const screenSizeFactorY = screenBounds.h < 1000 ? 0.612 : 1
```

Why 0.612? It's close to 1/φ (the reciprocal of the golden ratio, approximately 0.618). Whether this is intentional or empirical isn't clear from the code, but the effect is clear: full-speed edge scrolling on a phone-sized screen is disorienting. The viewport moves too fast relative to how much you can see. Reducing speed by about 38% makes it feel controlled.

The threshold is applied per-axis. A 800×1200 screen gets reduced X-axis speed and full Y-axis speed. A 1200×800 screen gets the opposite. Both axes reduced on a 600×400 screen.

The 1000-pixel threshold is a rough boundary between mobile and desktop viewport sizes. Most phones are under 1000 pixels in both dimensions. Most tablets and desktops are over 1000 pixels in at least one dimension.

This factor multiplies through like the others:

```typescript
const scrollDeltaX = (pxSpeed * proximityFactor.x * screenSizeFactorX) / zoomLevel
// On small screen: (25 × 1.0 × 1.0 × 0.612) / 1.0 = 15.3 pixels per tick
// On large screen: (25 × 1.0 × 1.0 × 1.0) / 1.0 = 25 pixels per tick
```

## Zoom compensation

The last factor is zoom, and it divides rather than multiplies. This keeps the visual scroll speed constant regardless of zoom level.

At 2× zoom, the canvas coordinate space is magnified. Moving the camera 10 canvas units only covers 5 units of visible content. To maintain the same perceived scroll speed, we need to move half as many canvas units:

```typescript
const zoomLevel = editor.getZoomLevel()
const scrollDeltaX = (pxSpeed * proximityFactor.x * screenSizeFactorX) / zoomLevel
const scrollDeltaY = (pxSpeed * proximityFactor.y * screenSizeFactorY) / zoomLevel
```

Example at different zoom levels:
- 1× zoom: `(25 × 1.0 × 1.0) / 1.0 = 25` canvas units per tick
- 2× zoom: `(25 × 1.0 × 1.0) / 2.0 = 12.5` canvas units per tick
- 0.5× zoom: `(25 × 1.0 × 1.0) / 0.5 = 50` canvas units per tick

On screen, all three appear to scroll at the same visual speed. The camera moves more canvas units when zoomed out and fewer when zoomed in, but the rate of change you see is constant.

Without this compensation, edge scrolling would feel sluggish when zoomed in (you're near the edge but the canvas barely moves) and frantic when zoomed out (small movements cause large viewport changes).

## Putting it together

Let's walk through a realistic example. You're on a laptop (1440×900 screen), zoomed to 2×, dragging a shape. Your pointer is 2 pixels from the left edge. You've been in the edge zone for 350ms.

Calculate each factor:
- Base speed: 25 pixels per tick
- User preference: 1.0 (default)
- Proximity: `(8 - 2) / 8 = 0.75` (75% of the way to the edge)
- Easing: `(350 / 400)³ = 0.875³ = 0.670` (into the fast acceleration phase)
- Screen factor: 1.0 (width is over 1000 pixels, but height is under—we use width for X-axis)
- Zoom: 2.0

Scroll delta:
```
scrollDelta = (25 × 1.0 × 0.75 × 0.670 × 1.0) / 2.0
           = (12.56) / 2.0
           = 6.28 canvas units per tick
```

At 60 FPS, that's about 377 canvas units per second of leftward scroll.

Now you move 2 pixels closer to the edge (pointer at 0, right at the viewport edge):
- Proximity: `(8 - 0) / 8 = 1.0`
- Everything else unchanged

New scroll delta:
```
scrollDelta = (25 × 1.0 × 1.0 × 0.670 × 1.0) / 2.0
           = 8.37 canvas units per tick
```

The proximity increase from 0.75 to 1.0 bumps you from 6.28 to 8.37 units per tick—a 33% speed increase for getting closer to the edge.

## Where this lives

The edge scroll manager lives in `packages/editor/src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.ts`. The core calculation is under 150 lines. The constants (8-pixel edge zone, 200ms delay, 200ms ease, 12-pixel touch width, 0.612 small screen factor) are in `packages/editor/src/lib/options.ts`.

The implementation is straightforward—a few dozen lines of math—but getting the constants right required real-world testing. Change any one of these and the feel degrades noticeably. The 0.612 factor in particular looks arbitrary until you try other values; anything higher feels too fast on mobile, anything lower feels sluggish on tablets. Whether it's the golden ratio reciprocal by design or just a number that worked, it's the right number.
