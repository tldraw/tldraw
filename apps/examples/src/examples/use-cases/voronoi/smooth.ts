// Turn a polygon into a smooth closed "bubble", the way the paper.js Voronoi
// example does: instead of drawing the straight cell edges, route a curve
// through each edge's midpoint with bezier handles of ±half the edge vector.
// That works out to rounding every corner with a quadratic curve whose control
// point is the corner and whose endpoints are the two neighbouring midpoints.

import { Pt } from './voronoi'

function mid(a: Pt, b: Pt): Pt {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

// SVG path data for the smoothed polygon (used by the cell shapes).
export function smoothPathData(pts: Pt[]): string {
	const n = pts.length
	if (n < 3) return ''
	const m0 = mid(pts[0], pts[1])
	let d = `M${m0.x.toFixed(2)},${m0.y.toFixed(2)}`
	for (let i = 1; i <= n; i++) {
		const corner = pts[i % n]
		const m = mid(pts[i % n], pts[(i + 1) % n])
		d += `Q${corner.x.toFixed(2)},${corner.y.toFixed(2)} ${m.x.toFixed(2)},${m.y.toFixed(2)}`
	}
	return d + 'Z'
}

// Trace the same smoothed polygon onto a canvas context (used by the overlay).
export function traceSmooth(ctx: CanvasRenderingContext2D, pts: Pt[]) {
	const n = pts.length
	if (n < 3) return
	const m0 = mid(pts[0], pts[1])
	ctx.beginPath()
	ctx.moveTo(m0.x, m0.y)
	for (let i = 1; i <= n; i++) {
		const corner = pts[i % n]
		const m = mid(pts[i % n], pts[(i + 1) % n])
		ctx.quadraticCurveTo(corner.x, corner.y, m.x, m.y)
	}
	ctx.closePath()
}
