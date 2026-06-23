// Pure Voronoi geometry. No tldraw imports, no dependencies.
//
// A Voronoi cell is the set of points closer to its site than to any other. For
// a convex board that means: start with the board rectangle and, for every other
// site, clip away the half-plane that is closer to that site. Clipping a convex
// polygon by a half-plane (Sutherland–Hodgman) is exact and cheap, which is all a
// game with a few dozen sites needs — no Fortune's algorithm required.

export interface Pt {
	x: number
	y: number
}

// The four corners of a box, counter-clockwise.
export function boxPolygon(box: { minX: number; minY: number; maxX: number; maxY: number }): Pt[] {
	return [
		{ x: box.minX, y: box.minY },
		{ x: box.maxX, y: box.minY },
		{ x: box.maxX, y: box.maxY },
		{ x: box.minX, y: box.maxY },
	]
}

// Clip `poly` to the half-plane of points at least as close to `s` as to `o`.
// The bisector of s and o is the line n·p = c with n = o - s and
// c = (|o|² - |s|²) / 2; we keep the side where n·p <= c.
function clipHalfPlane(poly: Pt[], s: Pt, o: Pt): Pt[] {
	const nx = o.x - s.x
	const ny = o.y - s.y
	const c = (o.x * o.x + o.y * o.y - s.x * s.x - s.y * s.y) / 2
	const out: Pt[] = []
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i]
		const b = poly[(i + 1) % poly.length]
		const da = nx * a.x + ny * a.y - c // <= 0 means inside
		const db = nx * b.x + ny * b.y - c
		if (da <= 0) out.push(a)
		if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
			const t = da / (da - db)
			out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) })
		}
	}
	return out
}

// The Voronoi cell of `site` against `others`, clipped to `boundary`.
export function cellFor(site: Pt, others: Pt[], boundary: Pt[]): Pt[] {
	let poly = boundary
	for (const o of others) {
		if (o.x === site.x && o.y === site.y) continue
		poly = clipHalfPlane(poly, site, o)
		if (poly.length === 0) break
	}
	return poly
}

// Signed-area-free polygon area via the shoelace formula.
export function polygonArea(poly: Pt[]): number {
	let a = 0
	for (let i = 0; i < poly.length; i++) {
		const p = poly[i]
		const q = poly[(i + 1) % poly.length]
		a += p.x * q.y - q.x * p.y
	}
	return Math.abs(a) / 2
}

export function centroid(poly: Pt[]): Pt {
	let x = 0
	let y = 0
	for (const p of poly) {
		x += p.x
		y += p.y
	}
	return { x: x / poly.length, y: y / poly.length }
}

// Shrink a polygon toward its centroid, for the separated-tile look.
export function insetPolygon(poly: Pt[], k: number): Pt[] {
	const c = centroid(poly)
	return poly.map((p) => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k }))
}
