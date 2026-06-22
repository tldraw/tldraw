// Cheap hand-drawn look for the canvas entities. tldraw shapes get their
// character from perfect-freehand, but running that per entity per frame for a
// swarm would be far too expensive. Instead we perturb a circle by a fixed,
// deterministic wobble table — a handful of "variants" so neighbours don't look
// identical — which costs nothing per frame and still reads as hand-drawn.

const SEGMENTS = 24
const VARIANTS = 5

// Deterministic per-variant, per-vertex radius wobble (~±9%). No randomness, so
// the same entity keeps the same silhouette frame to frame (no shimmering).
const WOBBLE: number[][] = Array.from({ length: VARIANTS }, (_, v) =>
	Array.from(
		{ length: SEGMENTS },
		(_, i) => 0.06 * Math.sin(i * 1.7 + v * 2.3) + 0.035 * Math.cos(i * 3.1 + v * 1.1)
	)
)

/** Trace a wobbly, hand-drawn circle as the current path. Caller fills/strokes. */
export function sketchCircle(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	r: number,
	variant: number
) {
	const wobble = WOBBLE[((variant % VARIANTS) + VARIANTS) % VARIANTS]
	ctx.beginPath()
	for (let i = 0; i <= SEGMENTS; i++) {
		const a = (i / SEGMENTS) * Math.PI * 2
		const rr = r * (1 + wobble[i % SEGMENTS])
		const x = cx + Math.cos(a) * rr
		const y = cy + Math.sin(a) * rr
		if (i === 0) ctx.moveTo(x, y)
		else ctx.lineTo(x, y)
	}
	ctx.closePath()
}

/** Trace a slightly hand-drawn diamond as the current path. */
export function sketchDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
	ctx.beginPath()
	ctx.moveTo(cx + 0.04 * r, cy - r)
	ctx.lineTo(cx + r, cy + 0.05 * r)
	ctx.lineTo(cx - 0.05 * r, cy + r)
	ctx.lineTo(cx - r, cy - 0.04 * r)
	ctx.closePath()
}
