# Scribble animation sequencing

When you use the eraser tool in tldraw, a fading trail follows your pointer. When the laser pointer draws, the line persists briefly before dissolving from its tail. These are scribbles—temporary animated marks that provide immediate visual feedback. The animation effect comes from a delay queue where points are added to the head while simultaneously being removed from the tail, creating a "worm" that crawls along your path.

## The problem with instant feedback

Drawing tools need immediate visual response. When you move the eraser across shapes, you want to see exactly where you've been—not just to confirm the action, but to aim your next movement. A simple approach would render every point you've touched, but that creates an ever-growing trail that obscures the canvas.

The laser pointer has an even stricter constraint. It's a presentation tool—the line should persist long enough for your audience to follow, then disappear so it doesn't clutter subsequent annotations. Static lines that accumulate defeat the purpose.

Scribbles solve both problems with the same mechanism: a bounded trail that follows your movement, then gracefully shrinks when you stop or finish.

## The delay queue

Each scribble maintains an array of points and a delay timer. Points are pushed to the end of the array as you move. When the delay expires, points are shifted off the beginning. The visible scribble is whatever remains in the array:

```typescript
// packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts
if (next && next !== prev) {
    item.prev = next
    scribble.points.push(next)

    // If we've run out of delay, shrink from the start
    if (delayRemaining === 0) {
        if (scribble.points.length > 8) {
            scribble.points.shift()
        }
    }
}
```

The `delayRemaining` timer counts down each animation frame. While delay remains, points accumulate without being removed—the scribble grows. Once the delay hits zero, the head and tail move together: each new point pushes one and shifts one, maintaining constant length.

## Three states

Scribbles progress through a state machine:

```
starting → active → stopping
```

**Starting**: The scribble collects its first 8 points without any removal. This ensures there's enough geometry to render smoothly before the trailing animation begins:

```typescript
if (item.scribble.state === 'starting') {
    if (next && next !== prev) {
        item.prev = next
        item.scribble.points.push(next)
    }

    if (item.scribble.points.length > 8) {
        item.scribble.state = 'active'
    }
    return
}
```

**Active**: Points are added at the cursor and removed from the tail (after the delay expires). The scribble maintains a roughly constant length, sliding along the path you draw.

**Stopping**: When a tool calls `stop()`, the scribble transitions to stopping state. It no longer accepts new points. The delay timer is capped to 200ms (so the trail doesn't linger too long), and then points shift off until only one remains:

```typescript
case 'stopping': {
    if (item.delayRemaining === 0) {
        if (timeoutMs === 0) {
            if (scribble.points.length === 1) {
                this.scribbleItems.delete(item.id)
                return
            }

            if (scribble.shrink) {
                // Drop the scribble's size as it shrinks
                scribble.size = Math.max(1, scribble.size * (1 - scribble.shrink))
            }

            scribble.points.shift()
        }
    }
    break
}
```

The `shrink` factor (default 0.1) makes the line get thinner as it disappears, creating a tapered fade-out rather than an abrupt cutoff.

## The idle case

What happens when you stop moving but haven't released? The scribble needs to handle this gracefully. If there's no new point but the scribble is active, it continues shrinking:

```typescript
} else {
    // While not moving, shrink the scribble from the start
    if (timeoutMs === 0) {
        if (scribble.points.length > 1) {
            scribble.points.shift()
        } else {
            // Reset the item's delay
            item.delayRemaining = scribble.delay
        }
    }
}
```

This prevents scribbles from freezing in place when you pause. The trail continues retracting toward your cursor, so the visible mark always reflects recent movement.

## Rendering with variable width

The `TldrawScribble` component renders scribbles using the same `getStroke` algorithm that draws freehand shapes:

```typescript
// packages/tldraw/src/lib/canvas/TldrawScribble.tsx
const stroke = getStroke(scribble.points, {
    size: scribble.size / zoom,
    start: { taper: scribble.taper, easing: EASINGS.linear },
    last: scribble.state === 'stopping',
    simulatePressure: false,
    streamline: 0.32,
})
```

The `taper` option creates the tapered ends that make scribbles feel organic. When `scribble.state === 'stopping'`, the `last` flag tells `getStroke` to taper the end, creating the shrinking effect as points are removed.

There's a fallback for very short scribbles—fewer than 4 stroke points renders as a dot rather than a malformed path:

```typescript
if (stroke.length < 4) {
    const r = scribble.size / zoom / 2
    const { x, y } = scribble.points[scribble.points.length - 1]
    d = `M ${x - r},${y} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`
}
```

## Configurable delay

Different tools need different scribble behaviors. The eraser scribble has no delay—it appears and disappears quickly because you're focused on what you're erasing, not the trail itself:

```typescript
// Eraser: immediate feedback
const scribble = this.editor.scribbles.addScribble({
    color: 'muted-1',
    size: 12,
    // No delay specified, defaults to 0
})
```

The laser tool uses a longer delay so the line persists for your audience:

```typescript
// Laser: presentation trail
const scribble = this.editor.scribbles.addScribble({
    color: 'laser',
    opacity: 0.7,
    size: 4,
    delay: this.editor.options.laserDelayMs, // typically 1200ms
    shrink: 0.05, // slower shrink for dramatic effect
})
```

The selection scribble (alt-drag lasso) uses intermediate values—visible enough to show your selection path, but not so persistent that it distracts:

```typescript
// Selection lasso
const scribbleItem = this.editor.scribbles.addScribble({
    color: 'selection-stroke',
    opacity: 0.32,
    size: 12,
})
```

## Point deduplication

Not every pointer event creates a new point. The `addPoint` method checks distance from the previous point:

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

Points within 1 pixel of the previous point are ignored. This prevents the array from filling with redundant points when the pointer moves slowly, which would make the trail longer in duration but not in visible length.

## The tick coordination

The `ScribbleManager.tick()` method runs every animation frame. It processes all active scribbles, updating their point arrays based on elapsed time. The 16ms throttle (`item.timeoutMs >= 16`) ensures point removal happens at a consistent rate regardless of frame rate:

```typescript
item.timeoutMs += elapsed
if (item.timeoutMs >= 16) {
    item.timeoutMs = 0
}
```

After processing all scribbles, the manager updates the editor's instance state with the current scribble data. This triggers React to re-render the scribble overlays:

```typescript
this.editor.updateInstanceState({
    scribbles: Array.from(this.scribbleItems.values())
        .map(({ scribble }) => ({
            ...scribble,
            points: [...scribble.points],
        }))
        .slice(-5), // sanity check: max 5 concurrent scribbles
})
```

The array copy is necessary because the scribble points are mutated in place, but the store needs immutable data.

## Why not just CSS animation?

CSS animations work well for fixed paths, but scribbles are dynamic—points are constantly being added and removed. An SVG path's `d` attribute changes every frame. CSS transitions on path data don't interpolate meaningfully; you can't smoothly animate between arbitrary path shapes.

The point-shifting approach is simpler than it might seem. We're not animating anything—we're just maintaining a sliding window over a stream of points. The "animation" emerges from the removal pattern, not from any interpolation.

## Key files

- `packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts` — State machine and point management
- `packages/tldraw/src/lib/canvas/TldrawScribble.tsx` — Variable-width SVG rendering using getStroke
- `packages/editor/src/lib/components/default-components/DefaultScribble.tsx` — Simple constant-width scribble
- `packages/tldraw/src/lib/tools/EraserTool/childStates/Erasing.ts` — Eraser tool scribble usage
- `packages/tldraw/src/lib/tools/LaserTool/childStates/Lasering.ts` — Laser tool with delay configuration
