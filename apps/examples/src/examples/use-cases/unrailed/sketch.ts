// Cheap hand-drawn look for the canvas overlays. Running perfect-freehand per
// entity per frame would be far too expensive, so instead we perturb simple
// primitives by a fixed, deterministic wobble table — a handful of "variants"
// so neighbouring trees/rocks don't look identical — which costs nothing per
// frame and still reads as hand-sketched, matching tldraw's house style.

const SEGMENTS = 22
const VARIANTS = 6

const WOBBLE: number[][] = Array.from({ length: VARIANTS }, (_, v) =>
	Array.from(
		{ length: SEGMENTS },
		(_, i) => 0.08 * Math.sin(i * 1.7 + v * 2.3) + 0.045 * Math.cos(i * 3.1 + v * 1.1)
	)
)

/** Stable per-key variant index so a given tile keeps its silhouette. */
export function variantFor(key: string): number {
	let h = 0
	for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
	return ((h % VARIANTS) + VARIANTS) % VARIANTS
}

/** Trace a wobbly, hand-drawn blob as the current path. Caller fills/strokes. */
export function sketchBlob(
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

/** A slightly hand-drawn rounded rectangle path (e.g. train body, wagon). */
export function sketchRoundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	const j = Math.min(w, h) * 0.04 // tiny jitter on the corners
	ctx.beginPath()
	ctx.moveTo(x + r, y + j)
	ctx.lineTo(x + w - r, y - j)
	ctx.quadraticCurveTo(x + w + j, y, x + w + j, y + r)
	ctx.lineTo(x + w - j, y + h - r)
	ctx.quadraticCurveTo(x + w, y + h + j, x + w - r, y + h + j)
	ctx.lineTo(x + r, y + h - j)
	ctx.quadraticCurveTo(x - j, y + h, x - j, y + h - r)
	ctx.lineTo(x + j, y + r)
	ctx.quadraticCurveTo(x, y - j, x + r, y + j)
	ctx.closePath()
}
