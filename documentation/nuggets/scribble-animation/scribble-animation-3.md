---
title: Scribble animation
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - scribble
  - animation
  - trail
status: published
date: 12/21/2025
order: 2
---

# Scribble animation

When we added visual feedback trails to tldraw—the animated marks that follow your cursor when erasing, selecting, or using the laser pointer—we needed each tool to feel different. The eraser should disappear quickly. The laser pointer should linger for presentations. The selection lasso should be subtle and immediate.

We use the same `ScribbleManager` for all three, but each tool configures it differently to create the right feel.

## The parameters

A scribble has five key parameters that control its behavior:

**Size**: The trail width in pixels. Larger values create more prominent visual feedback.

**Delay**: Time in milliseconds before the trail starts shrinking. While the delay runs, points accumulate without being removed, creating a sliding window effect. Once the delay expires, the oldest points start disappearing as new ones are added.

**Shrink**: A multiplier (0-1) applied each frame during the stopping phase. Lower values create slower fades. The formula is `size = size * (1 - shrink)`, so a shrink of 0.1 reduces the size by 10% each frame (exponential decay).

**Opacity**: Transparency level (0-1). Lower values make trails less obtrusive.

**Color**: The theme color to use. Each tool picks a semantically appropriate color from the theme.

## Eraser configuration

```typescript
const scribble = this.editor.scribbles.addScribble({
	color: 'muted-1',
	size: 12,
	// delay defaults to 0
	// shrink defaults to 0.1
})
```

The eraser needs immediate, responsive feedback. You're actively removing shapes, so the visual trail should confirm what you're erasing without cluttering the view.

**No delay**: Points start disappearing immediately as you move. The trail stays short and tracks your cursor closely.

**Size 12**: Smaller than the default (20) to avoid overwhelming the canvas. You're erasing, not drawing—the trail should be noticeable but not dominant.

**Fast shrink (0.1)**: When you stop moving, the trail fades quickly. At 60fps, a shrink of 0.1 reduces the size to half in about 110ms. This keeps the eraser feedback ephemeral.

The muted color keeps it visually distinct from content without being distracting.

## Laser pointer configuration

```typescript
const scribble = this.editor.scribbles.addScribble({
	color: 'laser',
	opacity: 0.7,
	size: 4,
	delay: this.editor.options.laserDelayMs, // 1200ms
	shrink: 0.05,
	taper: true,
})
```

The laser pointer is for presentations—you want a trail that others can follow as you gesture at the canvas. The configuration reflects that use case.

**1200ms delay**: The trail persists for over a second after you move. As you draw patterns or circle areas of interest, the full gesture remains visible long enough for viewers to track it.

**Size 4**: Small and precise. You're pointing, not painting. The thin trail keeps attention on what you're indicating rather than the indicator itself.

**Slow shrink (0.05)**: When you stop, the trail fades dramatically slowly. At 60fps, shrink of 0.05 takes about 275ms to reach half size. Combined with the 1200ms delay, the entire trail can persist for 1.5+ seconds, giving viewers time to follow your movements.

**Opacity 0.7**: Slightly transparent to avoid obscuring content beneath it.

The taper adds a tapered start to the stroke, making it feel more like a pen than a stamp.

## Selection lasso configuration

```typescript
const scribbleItem = this.editor.scribbles.addScribble({
	color: 'selection-stroke',
	opacity: 0.32,
	size: 12,
	// delay defaults to 0
})
```

The selection lasso appears when you alt-drag to select shapes. It's a functional tool, not a presentation feature, so it prioritizes clarity over persistence.

**No delay**: The lasso should follow your gesture exactly. Like the eraser, there's no sliding window effect—the trail matches your movement directly.

**Opacity 0.32**: Very transparent. You're selecting through it, not looking at it. The low opacity ensures you can still see the shapes you're capturing.

**Size 12**: Medium width. Thicker than the laser (you're defining an area, not pointing at something) but not as thick as the default.

The selection-stroke color ties it to the selection UI, making the interaction feel cohesive with the rest of the selection system.

## The delay queue

The delay parameter controls when points start being removed. During the delay period, points accumulate in an array. Once the delay expires, the scribble enters a sliding window mode: each new point pushes in at the head while the oldest point gets shifted off the tail.

This happens at 16ms intervals (roughly 60fps) regardless of the actual frame rate. The `ScribbleManager` tracks elapsed time per scribble and only removes points when the throttle expires:

```typescript
item.timeoutMs += elapsed
if (item.timeoutMs >= 16) {
	item.timeoutMs = 0
	// Remove oldest point if delay has expired
}
```

The delay countdown runs separately:

```typescript
if (item.delayRemaining > 0) {
	item.delayRemaining = Math.max(0, item.delayRemaining - elapsed)
}
```

This decouples the delay duration (controlled by the tool) from the frame rate (controlled by the browser).

## Stopping behavior

When a tool calls `stop()` on a scribble, the state changes to 'stopping' and no new points are accepted. The delay is capped at 200ms to prevent trails from lingering too long after you've released the pointer.

Each frame, the shrink factor is applied:

```typescript
scribble.size = Math.max(1, scribble.size * (1 - scribble.shrink))
```

The oldest point gets removed until only one remains, then the scribble is deleted from the manager.

For the laser pointer with shrink 0.05, this creates a slow, dramatic fade. For the eraser with shrink 0.1, it disappears twice as fast. The exponential decay means the last few frames accelerate—the trail becomes tiny and disappears rather than lingering as a thin line.

## Point deduplication

The `ScribbleManager` filters out redundant points. When you call `addPoint(x, y)`, it only adds the point if it's at least 1 pixel away from the previous point:

```typescript
const point = { x, y, z }
if (!prev || Vec.Dist(prev, point) >= 1) {
	item.next = point
}
```

This prevents trails from accumulating thousands of points when you hold still while dragging slowly. It also ensures that the delay-based sliding window works correctly—without deduplication, tiny movements would flood the point array and cause erratic behavior.

## Where this lives

The core implementation is in `/packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts`. Rendering happens in `/packages/tldraw/src/lib/canvas/TldrawScribble.tsx`, which uses `getStroke()` to generate variable-width SVG paths from the points.

Tool implementations show the different configurations in action:

- Eraser: `/packages/tldraw/src/lib/tools/EraserTool/childStates/Erasing.ts`
- Laser: `/packages/tldraw/src/lib/tools/LaserTool/childStates/Lasering.ts`
- Selection lasso: `/packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts`

The same system could work for touch gesture trails, loading indicators, or any UI that needs animated feedback marks with precise control over timing and appearance. The five parameters give you enough flexibility to cover a range of interaction patterns without needing separate implementations per tool.
