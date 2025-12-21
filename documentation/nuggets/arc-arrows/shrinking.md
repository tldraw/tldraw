# Arrow shrinking

Drag two connected shapes close together in tldraw—really close, until they're almost touching. The arrow between them stays visible the whole time. It doesn't shrink to nothing or flicker out of existence. Even when there's barely any space between the shapes, you can still see the connection and which way it points.

This might seem like a small detail, but it's easy to get wrong. Arrowheads need room to render outside the shape boundaries, and when shapes get close, those offsets can eat the entire arrow body. The naive implementation would make arrows disappear right when you need to see them most—when you're arranging shapes precisely.

We handle this by flipping the offsets outward when space gets tight. Here's how it works.

## The offset problem

Arrowheads need space. When an arrow binds to a shape, we offset the arc's endpoint by 10 pixels (plus half the stroke width) to give the arrowhead room to render cleanly outside the shape boundary. This works perfectly for normal-sized arrows.

```typescript
const BOUND_ARROW_OFFSET = 10

if (arrowheadStart !== 'none') {
	const strokeOffset = STROKE_SIZES[shape.props.size] / 2 + targetStrokeSize / 2
	offsetA = (BOUND_ARROW_OFFSET + strokeOffset) * shape.props.scale
}
```

The problem surfaces when shapes get close. Each endpoint offsets inward along the arc by 10+ pixels. If the endpoints are only 15 pixels apart, applying both offsets would leave a 0-5 pixel arc body—or a negative length, which is geometrically nonsensical. The arrow would vanish.

## Flipping offsets outward

When the distance between endpoints drops below a minimum threshold (10 pixels scaled), we multiply the offsets by negative values. This flips them outward instead of inward. The arc endpoints move away from the shapes rather than toward them, allowing the arrow body to maintain a visible length.

```typescript
if (Vec.DistMin(tA, tB, minLength)) {
	if (offsetA !== 0 && offsetB !== 0) {
		offsetA *= -1.5
		offsetB *= -1.5
	} else if (offsetA !== 0) {
		offsetA *= -2
	} else if (offsetB !== 0) {
		offsetB *= -2
	}
}
```

The multipliers depend on which ends have arrowheads. When both ends have arrowheads, we use -1.5. This flips the offset and adds 50% extra distance, giving each arrowhead more room. When only one end has an arrowhead, we use -2 for that side—double the normal offset, flipped outward.

## Why the asymmetric multipliers

With two arrowheads competing for space on a tiny arc, each needs slightly more than the standard offset. The factor -1.5 provides 15 pixels of clearance (10 × 1.5) per side, which prevents the arrowheads from visually colliding even when shapes nearly touch.

With one arrowhead, there's no symmetric constraint—only one side needs clearance. The factor -2 gives that side 20 pixels, ensuring the arrowhead renders fully outside the shape. The other end can sit right at the shape boundary since it has no arrowhead to accommodate.

These aren't arbitrary values. They're tuned to the typical arrowhead size. Smaller multipliers cause arrowheads to overlap shapes. Larger multipliers push the arc too far out, making tiny arrows look distorted.

## Clamping to prevent arc inversion

Negative offsets have a danger: if they're too large, the body arc can extend beyond the handle arc (the arc defined by the arrow's control handles). This creates visual discontinuity—the rendered curve no longer matches the user's intended curve shape.

We prevent this by clamping the offsets:

```typescript
const minOffsetA = 0.1 - distFn(handle_aCA, aCA) * handleArc.radius
const minOffsetB = 0.1 - distFn(aCB, handle_aCB) * handleArc.radius
offsetA = Math.max(offsetA, minOffsetA)
offsetB = Math.max(offsetB, minOffsetB)
```

The calculation finds how far the body arc's endpoint has already drifted from the handle position (the angular distance times the radius). The 0.1 constant ensures a minimum gap. By taking the max with our negative offset, we limit how far outward the endpoint can move.

This clamp only matters in extreme cases—shapes very close together with large arrowheads at high zoom levels. For typical usage, the -1.5 and -2 multipliers stay well within bounds.

## Minimum arrow length

The threshold for flipping is `MIN_ARROW_LENGTH`, set to 10 pixels. This value appears throughout the arrow system as the smallest meaningful arrow length. Below 10 pixels, arrows become ambiguous—it's hard to tell direction, arrowheads overlap bodies, and the visual noise outweighs any information value.

By triggering the offset flip at exactly this threshold, we ensure arrows never render shorter than 10 pixels. They either maintain normal offsets (for arrows above the threshold) or flip to negative offsets (keeping the body at minimum length). There's no dead zone where arrows gradually shrink to invisibility.

## What it looks like

The result is subtle but maintains usability. As shapes approach each other, the arrow behaves normally until endpoints come within 10 pixels. Then it pops to the inverted mode, with the body maintaining a clean 10-pixel minimum and arrowheads now pointing into the shapes slightly rather than sitting outside.

This isn't physically accurate—the arrows pierce the shapes—but it preserves the connection's visibility and directionality. Users can still see that an arrow connects the shapes and which direction it points. The alternative would be arrows that disappear entirely when shapes get close, which is worse.

## Key files

- `packages/tldraw/src/lib/shapes/arrow/curved-arrow.ts:294-312` — Offset flipping logic
- `packages/tldraw/src/lib/shapes/arrow/shared.ts:264-266` — Constants definition
- `packages/tldraw/src/lib/shapes/arrow/straight-arrow.ts` — Similar logic for straight arrows
