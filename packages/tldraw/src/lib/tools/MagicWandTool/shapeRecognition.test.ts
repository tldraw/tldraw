import { Vec } from '@tldraw/editor'
import { ShapeRecognitionResult, buildRecognizerInput, recognizeShape } from './shapeRecognition'

/** Samples a closed polygon's perimeter into a dense point list. */
function samplePolygon(corners: Vec[], perEdge = 14): Vec[] {
	const pts: Vec[] = []
	for (let i = 0; i < corners.length; i++) {
		const a = corners[i]
		const b = corners[(i + 1) % corners.length]
		for (let j = 0; j < perEdge; j++) {
			const t = j / perEdge
			pts.push(new Vec(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t))
		}
	}
	pts.push(corners[0].clone()) // close the loop
	return pts
}

function rectCorners(x: number, y: number, w: number, h: number): Vec[] {
	return [new Vec(x, y), new Vec(x + w, y), new Vec(x + w, y + h), new Vec(x, y + h)]
}

/** Deterministic pseudo-noise in [-amp, amp]. */
function noise(i: number, amp: number): number {
	return (((Math.sin(i * 12.9898) * 43758.5453) % 1) * 2 - 1) * amp * 0.5
}

/** Samples a closed polygon with small absolute perpendicular noise (a hand-drawn look). */
function noisyPolygon(corners: Vec[], amp = 3, perEdge = 16): Vec[] {
	const pts: Vec[] = []
	let k = 0
	for (let i = 0; i < corners.length; i++) {
		const a = corners[i]
		const b = corners[(i + 1) % corners.length]
		const dir = Vec.Sub(b, a)
		const len = dir.len() || 1
		const perp = new Vec(-dir.y / len, dir.x / len)
		for (let j = 0; j < perEdge; j++) {
			const base = Vec.Add(a, Vec.Mul(dir, j / perEdge))
			pts.push(Vec.Add(base, Vec.Mul(perp, noise(k++, amp))))
		}
	}
	pts.push(pts[0].clone())
	return pts
}

/** Samples an ellipse outline with small absolute radial noise. */
function noisyEllipse(cx: number, cy: number, rx: number, ry: number, amp = 3, steps = 64): Vec[] {
	const pts: Vec[] = []
	for (let i = 0; i <= steps; i++) {
		const t = (i / steps) * Math.PI * 2
		const c = Math.cos(t)
		const s = Math.sin(t)
		const r = Math.hypot(c, s)
		const n = noise(i, amp)
		pts.push(new Vec(cx + rx * c + (c / r) * n, cy + ry * s + (s / r) * n))
	}
	return pts
}

function rotatePointsAround(points: Vec[], center: Vec, angle: number): Vec[] {
	return points.map((p) => Vec.Add(center, Vec.Rot(Vec.Sub(p, center), angle)))
}

/** A rounded-corner rectangle outline (models hand-drawn soft corners). */
function roundedRect(x: number, y: number, w: number, h: number, cr: number, amp = 2): Vec[] {
	const pts: Vec[] = []
	let k = 0
	const push = (px: number, py: number) =>
		pts.push(new Vec(x + px + noise(k, amp), y + py + noise(k++, amp)))
	const edge = (ax: number, ay: number, bx: number, by: number, n = 8) => {
		for (let j = 0; j < n; j++) push(ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n)
	}
	const arc = (cx: number, cy: number, a0: number, a1: number, n = 5) => {
		for (let j = 0; j <= n; j++) {
			const t = a0 + ((a1 - a0) * j) / n
			push(cx + cr * Math.cos(t), cy + cr * Math.sin(t))
		}
	}
	const P = Math.PI
	edge(cr, 0, w - cr, 0)
	arc(w - cr, cr, -P / 2, 0)
	edge(w, cr, w, h - cr)
	arc(w - cr, h - cr, 0, P / 2)
	edge(w - cr, h, cr, h)
	arc(cr, h - cr, P / 2, P)
	edge(0, h - cr, 0, cr)
	arc(cr, cr, P, (3 * P) / 2)
	pts.push(pts[0].clone())
	return pts
}

/** Reconstructs the 4 corners of a recognized rectangle. */
function reconstructCorners(r: Extract<ShapeRecognitionResult, { kind: 'rectangle' }>): Vec[] {
	const halves = [
		new Vec(-r.w / 2, -r.h / 2),
		new Vec(r.w / 2, -r.h / 2),
		new Vec(r.w / 2, r.h / 2),
		new Vec(-r.w / 2, r.h / 2),
	]
	return halves.map((half) => Vec.Add(r.center, Vec.Rot(half, r.rotation)))
}

/** Every corner in `a` has a corner in `b` within `tol`. */
function cornersMatch(a: Vec[], b: Vec[], tol = 3): boolean {
	return a.length === b.length && a.every((p) => b.some((q) => Vec.Dist(p, q) < tol))
}

function recognize(points: Vec[]): ShapeRecognitionResult | null {
	const input = buildRecognizerInput(points)
	return input ? recognizeShape(input) : null
}

describe('recognizeRectangle', () => {
	it('recognizes an axis-aligned rectangle and matches its bounds', () => {
		const corners = rectCorners(0, 0, 100, 60)
		const result = recognize(samplePolygon(corners))
		expect(result?.kind).toBe('rectangle')
		const r = result as Extract<ShapeRecognitionResult, { kind: 'rectangle' }>
		expect(Math.abs(r.rotation)).toBeLessThan(0.05)
		expect(cornersMatch(reconstructCorners(r), corners)).toBe(true)
	})

	it('recognizes a rotated rectangle at the matching angle', () => {
		const corners = rectCorners(0, 0, 120, 70)
		const center = new Vec(60, 35)
		const angle = Math.PI / 6 // 30 degrees
		const rotated = rotatePointsAround(corners, center, angle)
		const result = recognize(samplePolygon(rotated))
		expect(result?.kind).toBe('rectangle')
		const r = result as Extract<ShapeRecognitionResult, { kind: 'rectangle' }>
		// Reconstructed corners match the input regardless of rotation representation.
		expect(cornersMatch(reconstructCorners(r), rotated)).toBe(true)
		expect(Math.abs(Math.abs(r.rotation) - angle)).toBeLessThan(0.12)
	})

	it('snaps a near-axis-aligned rectangle to exactly axis-aligned', () => {
		const corners = rectCorners(0, 0, 120, 70)
		const center = new Vec(60, 35)
		const angle = (5 * Math.PI) / 180 // within the 7.5° snap zone
		const rotated = rotatePointsAround(corners, center, angle)
		const result = recognize(samplePolygon(rotated))
		expect(result?.kind).toBe('rectangle')
		const r = result as Extract<ShapeRecognitionResult, { kind: 'rectangle' }>
		expect(r.rotation).toBe(0)
	})

	it('keeps the tilt of a clearly rotated rectangle (outside the snap zone)', () => {
		const corners = rectCorners(0, 0, 120, 70)
		const center = new Vec(60, 35)
		const angle = (15 * Math.PI) / 180 // beyond the 7.5° snap zone
		const rotated = rotatePointsAround(corners, center, angle)
		const result = recognize(samplePolygon(rotated))
		const r = result as Extract<ShapeRecognitionResult, { kind: 'rectangle' }>
		expect(Math.abs(r.rotation)).toBeGreaterThan(0.1)
	})

	it('snaps a near-square rectangle to equal sides (the average)', () => {
		const corners = rectCorners(0, 0, 100, 115) // ratio 1.15 < 1.2
		const result = recognize(samplePolygon(corners))
		expect(result?.kind).toBe('rectangle')
		const r = result as Extract<ShapeRecognitionResult, { kind: 'rectangle' }>
		expect(r.w).toBeCloseTo(r.h, 6)
		expect(r.w).toBeCloseTo(107.5, 0) // (100 + 115) / 2
	})

	it('keeps distinct sides for a clearly non-square rectangle', () => {
		const corners = rectCorners(0, 0, 100, 150) // ratio 1.5 > 1.2
		const result = recognize(samplePolygon(corners))
		const r = result as Extract<ShapeRecognitionResult, { kind: 'rectangle' }>
		expect(Math.abs(r.w - r.h)).toBeGreaterThan(40)
	})

	it('recognizes a long, narrow (noisy) rectangle', () => {
		// A thin rectangle's straight edges hug the box; small edge noise drops the
		// box-fill toward an ellipse's, so fill alone misses it — the outline-fit
		// comparison still catches it.
		const result = recognize(noisyPolygon(rectCorners(0, 0, 300, 25), 3))
		expect(result?.kind).toBe('rectangle')
	})

	it('recognizes a long, narrow rotated rectangle (noisy)', () => {
		const corners = rectCorners(0, 0, 320, 26)
		const rotated = rotatePointsAround(corners, new Vec(160, 13), Math.PI / 5)
		const result = recognize(noisyPolygon(rotated, 3))
		expect(result?.kind).toBe('rectangle')
	})

	it('still tells a long, narrow ellipse apart from a thin rectangle', () => {
		const result = recognize(noisyEllipse(150, 60, 150, 13, 3))
		expect(result?.kind).toBe('ellipse')
	})

	it('recognizes an ellipse and matches its bounds', () => {
		const pts: Vec[] = []
		for (let i = 0; i < 64; i++) {
			const t = (i / 64) * Math.PI * 2
			pts.push(new Vec(80 + 80 * Math.cos(t), 50 + 50 * Math.sin(t)))
		}
		pts.push(pts[0].clone())
		const result = recognize(pts)
		expect(result?.kind).toBe('ellipse')
		const r = result as Extract<ShapeRecognitionResult, { kind: 'ellipse' }>
		expect(r.center.x).toBeCloseTo(80, 0)
		expect(r.center.y).toBeCloseTo(50, 0)
		expect(r.w).toBeGreaterThan(150)
		expect(r.w).toBeLessThan(170)
		expect(r.h).toBeGreaterThan(92)
		expect(r.h).toBeLessThan(108)
	})

	it('snaps a near-circular ellipse to a perfect circle (equal axes)', () => {
		const pts: Vec[] = []
		for (let i = 0; i < 48; i++) {
			const t = (i / 48) * Math.PI * 2
			// Slightly oval (60 × 66, ratio 1.1 < 1.2) — should snap to equal axes.
			pts.push(new Vec(100 + 60 * Math.cos(t), 100 + 66 * Math.sin(t)))
		}
		pts.push(pts[0].clone())
		const result = recognize(pts)
		expect(result?.kind).toBe('ellipse')
		const r = result as Extract<ShapeRecognitionResult, { kind: 'ellipse' }>
		expect(r.w).toBeCloseTo(r.h, 6)
	})

	it('recognizes a rotated ellipse', () => {
		const center = new Vec(100, 100)
		const angle = Math.PI / 5 // 36°, beyond the axis-snap zone
		const pts: Vec[] = []
		for (let i = 0; i < 64; i++) {
			const t = (i / 64) * Math.PI * 2
			const local = new Vec(90 * Math.cos(t), 45 * Math.sin(t))
			pts.push(Vec.Add(center, Vec.Rot(local, angle)))
		}
		pts.push(pts[0].clone())
		const result = recognize(pts)
		expect(result?.kind).toBe('ellipse')
		const r = result as Extract<ShapeRecognitionResult, { kind: 'ellipse' }>
		// Major axis ≈ 180, minor ≈ 90 (axes may swap, so compare magnitudes).
		const [major, minor] = r.w >= r.h ? [r.w, r.h] : [r.h, r.w]
		expect(major).toBeGreaterThan(170)
		expect(minor).toBeLessThan(100)
	})

	it('does not recognize a triangle', () => {
		const corners = [new Vec(0, 0), new Vec(120, 0), new Vec(60, 100)]
		expect(recognize(samplePolygon(corners))).toBe(null)
	})

	// Rectangle detection is decided by corner occupancy (the stroke filling the box
	// corners), not by which outline the points hug best overall. These guard the
	// cases an outline-fit comparison got wrong: small/noisy near-square circles and
	// mid-aspect ellipses read as "rectangle-ish" and were stolen by the rectangle.
	it('recognizes a small noisy circle as an ellipse, not a rectangle', () => {
		expect(recognize(noisyEllipse(60, 60, 30, 30, 3))?.kind).toBe('ellipse')
	})

	it('recognizes a noisy circle as an ellipse, not a rectangle', () => {
		expect(recognize(noisyEllipse(80, 80, 60, 60, 4))?.kind).toBe('ellipse')
	})

	it('recognizes a wobbly circle as an ellipse, not a rectangle', () => {
		expect(recognize(noisyEllipse(120, 120, 100, 100, 4))?.kind).toBe('ellipse')
	})

	it('recognizes a mid-aspect ellipse as an ellipse, not a rectangle', () => {
		// 160 × 80 — not thin enough for the old thin-ellipse path, was misread as a rect.
		expect(recognize(noisyEllipse(100, 60, 80, 40, 3))?.kind).toBe('ellipse')
	})

	it('still recognizes a small noisy square as a rectangle', () => {
		// The tightest rectangle case (small + noisy corners sit closest to the threshold).
		expect(recognize(noisyPolygon(rectCorners(0, 0, 60, 60), 4))?.kind).toBe('rectangle')
	})

	it('recognizes a rounded-corner rectangle as a rectangle', () => {
		// Hand-drawn corners are soft, but the stroke still reaches into them.
		expect(recognize(roundedRect(0, 0, 120, 120, 24))?.kind).toBe('rectangle')
		expect(recognize(roundedRect(0, 0, 80, 80, 16))?.kind).toBe('rectangle')
	})

	it('recognizes a straight open stroke as a line at its exact endpoints', () => {
		const a = new Vec(40, 60)
		const b = new Vec(240, 110)
		const pts: Vec[] = []
		const steps = 20
		for (let i = 0; i <= steps; i++) {
			const t = i / steps
			// Tiny perpendicular wobble (well within the straightness tolerance).
			pts.push(new Vec(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t + (i % 2 ? 1 : -1)))
		}
		const result = recognize(pts)
		expect(result?.kind).toBe('line')
		const r = result as Extract<ShapeRecognitionResult, { kind: 'line' }>
		// Exact endpoints — the first and last sampled points, not a fitted average.
		expect(r.start.x).toBeCloseTo(pts[0].x, 5)
		expect(r.start.y).toBeCloseTo(pts[0].y, 5)
		expect(r.end.x).toBeCloseTo(pts[pts.length - 1].x, 5)
		expect(r.end.y).toBeCloseTo(pts[pts.length - 1].y, 5)
	})

	it('does not recognize a clearly curved open stroke as a line', () => {
		const pts: Vec[] = []
		const steps = 24
		for (let i = 0; i <= steps; i++) {
			const t = i / steps
			// Arc bowing 70 off a 200-wide chord — far from straight.
			pts.push(new Vec(100 + 200 * t, 200 - Math.sin(t * Math.PI) * 70))
		}
		expect(recognize(pts)).toBe(null)
	})

	it('does not recognize a straight stroke with a sharp end hook', () => {
		const pts: Vec[] = []
		for (let i = 0; i <= 20; i++) pts.push(new Vec(40 + i * 10, 60)) // 200px straight body
		for (const h of [6, 12, 18]) pts.push(new Vec(240, 60 + h)) // sharp upward hook
		expect(recognize(pts)).toBe(null)
	})

	it('does not recognize a straight stroke with a sharp start hook', () => {
		const pts: Vec[] = []
		for (const h of [18, 12, 6]) pts.push(new Vec(40, 60 + h)) // sharp hook into the line
		for (let i = 0; i <= 20; i++) pts.push(new Vec(40 + i * 10, 60)) // 200px straight body
		expect(recognize(pts)).toBe(null)
	})

	it('still recognizes a straight stroke with only a tiny end flick', () => {
		const pts: Vec[] = []
		for (let i = 0; i <= 20; i++) pts.push(new Vec(40 + i * 10, 60)) // 200px body
		pts.push(new Vec(240, 63)) // 3px flick — negligible, still a line
		expect(recognize(pts)?.kind).toBe('line')
	})

	it('does not recognize an open (un-closed) rectangle path', () => {
		// Perimeter that stops three-quarters of the way around — endpoints far apart.
		const corners = rectCorners(0, 0, 100, 60)
		const full = samplePolygon(corners)
		const open = full.slice(0, Math.floor(full.length * 0.7))
		expect(recognize(open)).toBe(null)
	})

	it('does not recognize a too-small rectangle', () => {
		expect(recognize(samplePolygon(rectCorners(0, 0, 10, 8)))).toBe(null)
	})

	it('does not recognize an extreme sliver', () => {
		expect(recognize(samplePolygon(rectCorners(0, 0, 600, 25)))).toBe(null)
	})
})
