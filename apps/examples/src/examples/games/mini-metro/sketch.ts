// Canvas helpers for the overlays. Stations and lines are real tldraw shapes,
// but passengers and trains move every frame, so they're drawn imperatively on
// the overlay canvas instead. These trace the same little family of shapes the
// stations use, so a passenger reads as "wants the triangle station".

import { StationShape } from './constants'

// Trace a regular polygon (or the circle) centred at (cx, cy) with "radius" r as
// the current path. `rotation` points the first vertex; the caller fills/strokes.
export function traceShape(
	ctx: CanvasRenderingContext2D,
	shape: StationShape,
	cx: number,
	cy: number,
	r: number
) {
	ctx.beginPath()
	if (shape === 'circle') {
		ctx.arc(cx, cy, r, 0, Math.PI * 2)
		ctx.closePath()
		return
	}
	if (shape === 'square') {
		ctx.rect(cx - r, cy - r, r * 2, r * 2)
		ctx.closePath()
		return
	}

	if (shape === 'star') {
		traceStar(ctx, cx, cy, r)
		return
	}

	const sides = shape === 'triangle' ? 3 : shape === 'diamond' ? 4 : 5
	// Point triangles/pentagons up; diamonds rest on a vertex.
	const start = shape === 'diamond' ? 0 : -Math.PI / 2
	for (let i = 0; i < sides; i++) {
		const a = start + (i / sides) * Math.PI * 2
		const x = cx + Math.cos(a) * r
		const y = cy + Math.sin(a) * r
		if (i === 0) ctx.moveTo(x, y)
		else ctx.lineTo(x, y)
	}
	ctx.closePath()
}

function traceStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
	const inner = r * 0.5
	for (let i = 0; i < 10; i++) {
		const rr = i % 2 === 0 ? r : inner
		const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
		const x = cx + Math.cos(a) * rr
		const y = cy + Math.sin(a) * rr
		if (i === 0) ctx.moveTo(x, y)
		else ctx.lineTo(x, y)
	}
	ctx.closePath()
}
