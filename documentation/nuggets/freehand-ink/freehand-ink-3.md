---
title: Pressure-sensitive stroke pipeline
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - freehand
  - SVG
  - bezier
readability: 9
voice: 9
potential: 8
accuracy: 9
notes: "Strong nugget opening ('When we added stylus support...'). All technical claims verified against source. Pipeline explanation is clear and well-organized."
---

# SVG paths from hand-drawn points

When we added stylus support to tldraw, we wanted pressure-sensitive strokes to look organic—thicker where you press hard, thinner where you lift. The path from raw pointer events to smooth, variable-width SVG paths involves more than just reading pressure values. You need to strip noise from stylus lift-off, thin redundant points, and handle the difference between real pressure and simulated pressure for mouse/trackpad users. Here's how the pipeline works.

## The three-stage pipeline

The perfect-freehand library converts raw input points into stroke outlines through three functions:

```typescript
export function getStroke(points: VecLike[], options: StrokeOptions = {}): Vec[] {
	return getStrokeOutlinePoints(
		setStrokePointRadii(getStrokePoints(points, options), options),
		options
	)
}
```

Stage 1 (`getStrokePoints`) converts raw coordinates into `StrokePoint` objects with metadata—direction vectors, distances, running length. Stage 2 (`setStrokePointRadii`) calculates the stroke width at each point based on pressure and velocity. Stage 3 (`getStrokeOutlinePoints`) generates the left and right boundary points that form the shape's outline.

Each `StrokePoint` contains more than just position:

```typescript
export interface StrokePoint {
	point: Vec // adjusted/smoothed position
	input: Vec // original input position
	vector: Vec // direction vector
	pressure: number // normalized pressure 0-1
	distance: number // distance from previous point
	runningLength: number // cumulative distance
	radius: number // stroke radius at this point
}
```

The `point` field holds the smoothed position after streamline interpolation. The `input` field preserves the original pointer coordinates. This separation matters because pressure values come from the raw input, but smoothing the centerline makes strokes look less jittery.

## Stripping pressure noise

Styluses report low pressure values as the pen lifts off the surface. Without filtering, these create wispy tails at the end of strokes. We remove them:

```typescript
const MIN_START_PRESSURE = 0.025
const MIN_END_PRESSURE = 0.01
```

Before processing points, the code strips any points from the start where pressure is below 0.025, and from the end where pressure is below 0.01. This only happens when using real pressure (`simulatePressure: false`). When simulating pressure for mouse input, there's no lift-off noise to worry about.

The asymmetry in thresholds (2.5% at start, 1% at end) reflects how styluses behave. The first contact often reports slightly higher pressure than the final lift-off, so we're more aggressive about trimming the end.

## Point thinning

Pointer events arrive at device-dependent rates—60 Hz for trackpads, 100+ Hz for styluses. At high zoom levels or slow gesture speeds, consecutive points can be nearly identical. We thin them:

```typescript
// Remove points too close to first point (within size/3)
if (Vec.Dist2(pt, pts[0]) > (size / 3) ** 2) {
	// keep point
}
```

The code removes points within `size/3` of the first point and within `size/3` of the last point. This uses squared distance (`Vec.Dist2`) to avoid the square root calculation—we only need relative comparison.

When merging points, we keep the maximum pressure value. If two points are close enough to combine, we don't want to lose a pressure spike.

## Simulated vs real pressure settings

Mouse and trackpad users don't have pressure input, so we simulate it based on velocity—faster movement creates thinner strokes. The settings differ from real stylus pressure:

```typescript
const simulatePressureSettings = (strokeWidth: number): StrokeOptions => {
	return {
		size: strokeWidth,
		thinning: 0.5, // 50% pressure effect
		streamline: modulate(strokeWidth, [9, 16], [0.64, 0.74], true),
		smoothing: 0.62,
		easing: EASINGS.easeOutSine,
		simulatePressure: true,
	}
}
```

Simulated pressure uses 50% thinning—the stroke can vary from 50% to 100% of the base width. Real stylus pressure uses 62% thinning for more dramatic variation:

```typescript
const realPressureSettings = (strokeWidth: number): StrokeOptions => {
	return {
		size: 1 + strokeWidth * 1.2,
		thinning: 0.62, // 62% pressure effect
		streamline: 0.62,
		smoothing: 0.62,
		simulatePressure: false,
		easing: PEN_EASING, // Custom curve
	}
}
```

The easing function controls how pressure values map to stroke width. Simulated pressure uses `easeOutSine` for a softer curve. Real pressure uses a custom blend:

```typescript
const PEN_EASING = (t: number) => t * 0.65 + SIN((t * PI) / 2) * 0.35
```

This is 65% linear, 35% sinusoidal. The result feels more responsive to pressure changes than a pure sine curve, but less abrupt than fully linear mapping.

## Streamline interpolation

The streamline parameter controls smoothing. Higher values reduce jitter but add latency—the rendered stroke lags behind the pointer. We use a base value of 0.62 for real pressure and a width-dependent value for simulated pressure:

```typescript
streamline: modulate(strokeWidth, [9, 16], [0.64, 0.74], true)
```

Thicker simulated strokes get more smoothing (0.74 at width 16) because velocity variations are more visually noticeable at larger sizes. Thinner strokes use less smoothing (0.64 at width 9) to preserve gesture detail.

The streamline value transforms into an interpolation parameter:

```typescript
const streamline = 0.5
const t = 0.15 + (1 - streamline) * 0.85
```

This maps the 0-1 streamline range to 0.15-1.0. Even at maximum streamline, we keep 15% of the raw input to preserve some gesture character.

## From outline to SVG

After the three-stage pipeline, we have an array of points forming the stroke outline—a closed polygon. These points still need smoothing to look organic. That's where the quadratic Bézier chain comes in:

```typescript
export function getSvgPathFromStrokePoints(points: StrokePoint[], closed = false): string {
	let a = points[0].point
	let b = points[1].point
	// ... same averaging algorithm as simple points
}
```

The function uses the same midpoint averaging approach as the simpler `getSvgPathFromPoints`, but extracts the `.point` field from each `StrokePoint` first. The result is smooth SVG paths that preserve the variable width from the pressure calculations.

## Performance constraints

Draw shapes have a maximum of 600 points. When a continuous stroke exceeds this, the tool starts a new shape. This prevents performance degradation on very long gestures:

```typescript
override options: DrawShapeOptions = {
	maxPointsPerShape: 600,
}
```

The path generation itself is fast—O(n) string concatenation that completes in under 1ms even for hundreds of points. The bottleneck is SVG rendering, not path string construction.

## Solid line variant

Not all hand-drawn strokes use pressure. The "solid" line style disables thinning entirely:

```typescript
const solidSettings = (strokeWidth: number): StrokeOptions => {
	return {
		size: strokeWidth,
		thinning: 0, // No thinning
		streamline: modulate(strokeWidth, [9, 16], [0.64, 0.74], true),
		smoothing: 0.62,
		simulatePressure: false,
		easing: EASINGS.linear,
	}
}
```

With thinning set to zero, every point gets the same radius regardless of pressure or velocity. The stroke still smooths and follows the averaging algorithm for the path shape, but maintains constant width.

## Where this lives

The pressure handling pipeline is in `/packages/tldraw/src/lib/shapes/shared/freehand/`:

- `getStroke.ts` — Main pipeline entry point
- `getStrokePoints.ts` — Point processing, pressure stripping, thinning
- `setStrokePointRadii.ts` — Radius calculation from pressure/velocity
- `getStrokeOutlinePoints.ts` — Boundary generation
- `types.ts` — StrokePoint interface definition

Stroke options are configured in `/packages/tldraw/src/lib/shapes/draw/getPath.ts`. The SVG path generation lives in `/packages/tldraw/src/lib/shapes/shared/freehand/svg.ts`.

The simpler non-pressure version (`getSvgPathFromPoints`) is in `/packages/editor/src/lib/utils/getSvgPathFromPoints.ts` and handles scribbles, brush selection, and other temporary overlays where pressure isn't relevant.
