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

function rotatePointsAround(points: Vec[], center: Vec, angle: number): Vec[] {
	return points.map((p) => Vec.Add(center, Vec.Rot(Vec.Sub(p, center), angle)))
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

	it('does not recognize an ellipse', () => {
		const pts: Vec[] = []
		for (let i = 0; i < 64; i++) {
			const t = (i / 64) * Math.PI * 2
			pts.push(new Vec(80 + 80 * Math.cos(t), 50 + 50 * Math.sin(t)))
		}
		pts.push(pts[0].clone())
		expect(recognize(pts)).toBe(null)
	})

	it('does not recognize a triangle', () => {
		const corners = [new Vec(0, 0), new Vec(120, 0), new Vec(60, 100)]
		expect(recognize(samplePolygon(corners))).toBe(null)
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
