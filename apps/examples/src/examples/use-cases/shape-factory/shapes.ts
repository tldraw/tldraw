// Canvas helpers for the overlays. Machines are real tldraw shapes, but the
// items flowing along belts move every frame, so they're drawn imperatively on
// the overlay canvas instead. These trace the small family of item shapes so an
// item reads as the same vocabulary the rest of the game uses.

import { ItemShape } from './constants'

// Trace an item shape centred at (cx, cy) with "radius" r as the current path.
// The caller fills/strokes.
export function traceShape(
	ctx: CanvasRenderingContext2D,
	shape: ItemShape,
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
	// triangle, pointing up
	const sides = 3
	const start = -Math.PI / 2
	for (let i = 0; i < sides; i++) {
		const a = start + (i / sides) * Math.PI * 2
		const x = cx + Math.cos(a) * r
		const y = cy + Math.sin(a) * r
		if (i === 0) ctx.moveTo(x, y)
		else ctx.lineTo(x, y)
	}
	ctx.closePath()
}
