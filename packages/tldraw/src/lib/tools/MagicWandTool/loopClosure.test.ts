import { Box, Vec } from '@tldraw/editor'
import { detectClosedLoop, resamplePoints } from './loopClosure'

/** Deterministic pseudo-noise in [-amp, amp]. */
function noise(i: number, amp: number) {
	return (((Math.sin(i * 12.9898 + 7) * 43758.5453) % 1) * 2 - 1) * amp
}

/** Dense closed circle outline (points around, not explicitly closed). */
function circleOutline(r: number, samples = 240): Vec[] {
	const pts: Vec[] = []
	for (let i = 0; i < samples; i++) {
		const t = (i / samples) * Math.PI * 2
		pts.push(new Vec(r * Math.cos(t), r * Math.sin(t)))
	}
	return pts
}

/** Dense wobbly-blob outline: a circle with a 3-harmonic radius variation. */
function blobOutline(r: number, samples = 240): Vec[] {
	const pts: Vec[] = []
	for (let i = 0; i < samples; i++) {
		const t = (i / samples) * Math.PI * 2
		const rr = r * (1 + 0.18 * Math.sin(3 * t + 0.7))
		pts.push(new Vec(rr * Math.cos(t), rr * Math.sin(t)))
	}
	return pts
}

/** Dense rounded-rectangle outline starting mid-top-edge. */
function roundedRectOutline(w: number, h: number, cr: number, spacing = 3): Vec[] {
	const pts: Vec[] = []
	const edge = (ax: number, ay: number, bx: number, by: number) => {
		const len = Math.hypot(bx - ax, by - ay)
		const n = Math.max(1, Math.ceil(len / spacing))
		for (let j = 0; j < n; j++)
			pts.push(new Vec(ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n))
	}
	const arc = (cx: number, cy: number, a0: number, a1: number) => {
		const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * cr) / spacing))
		for (let j = 0; j < n; j++) {
			const t = a0 + ((a1 - a0) * j) / n
			pts.push(new Vec(cx + cr * Math.cos(t), cy + cr * Math.sin(t)))
		}
	}
	const P = Math.PI
	edge(w / 2, 0, w - cr, 0)
	arc(w - cr, cr, -P / 2, 0)
	edge(w, cr, w, h - cr)
	arc(w - cr, h - cr, 0, P / 2)
	edge(w - cr, h, cr, h)
	arc(cr, h - cr, P / 2, P)
	edge(0, h - cr, 0, cr)
	arc(cr, cr, P, (3 * P) / 2)
	edge(cr, 0, w / 2, 0)
	return pts
}

interface StrokeOpts {
	/** Fraction of the outline to draw: 1 = full lap, >1 overshoots, <1 undershoots. */
	span: number
	/** Noise amplitude in px applied per emitted point. */
	noiseAmp?: number
	/** Straight lead-in tail of this length (px), running into the outline start. */
	leadIn?: number
}

/** Builds a gesture stroke by walking a dense outline; overshoot laps get fresh
 * noise so retraced points genuinely wiggle across the first lap. */
function strokeFromOutline(outline: Vec[], opts: StrokeOpts): Vec[] {
	const n = outline.length
	const amp = opts.noiseAmp ?? 0
	const pts: Vec[] = []
	let k = 0
	if (opts.leadIn) {
		const a = outline[0]
		const tangent = Vec.Sub(outline[1], a).uni()
		const from = Vec.Sub(a, Vec.Mul(tangent, opts.leadIn))
		const steps = Math.ceil(opts.leadIn / 4)
		for (let i = 0; i < steps; i++) {
			const p = Vec.Lrp(from, a, i / steps)
			pts.push(new Vec(p.x + noise(k, amp), p.y + noise(k * 7 + 3, amp)))
			k++
		}
	}
	const total = Math.round(n * opts.span)
	for (let i = 0; i <= total; i++) {
		const base = outline[i % n]
		pts.push(new Vec(base.x + noise(k, amp), base.y + noise(k * 7 + 3, amp)))
		k++
	}
	return pts
}

function isClosed(points: Vec[], zoom = 1) {
	return detectClosedLoop(points, zoom) !== null
}

describe('resamplePoints', () => {
	it('spaces points uniformly and keeps the exact endpoints', () => {
		const raw = [new Vec(0, 0), new Vec(100, 0), new Vec(100, 37)]
		const out = resamplePoints(raw, 5)
		expect(out[0]).toMatchObject({ x: 0, y: 0 })
		expect(out[out.length - 1]).toMatchObject({ x: 100, y: 37 })
		for (let i = 1; i < out.length - 1; i++) {
			expect(Vec.Dist(out[i - 1], out[i])).toBeCloseTo(5, 6)
		}
	})

	it('interpolates across large raw gaps (fast flicks)', () => {
		const out = resamplePoints([new Vec(0, 0), new Vec(90, 0)], 5)
		expect(out.length).toBeGreaterThan(15)
	})
})

describe('detectClosedLoop battery', () => {
	const shapes: Array<[string, (size: number) => Vec[]]> = [
		['circle', (size) => circleOutline(size / 2)],
		['roundrect', (size) => roundedRectOutline(size, size, size * 0.2)],
		['blob', (size) => blobOutline(size / 2)],
	]
	const sizes = [60, 150, 400]
	const closures: Array<[string, number]> = [
		// Overshoot: degrees drawn past a full lap.
		['overshoot5', 1 + 5 / 360],
		['overshoot20', 1 + 20 / 360],
		['overshoot60', 1 + 60 / 360],
		// Undershoot: fraction of the outline left undrawn.
		['undershoot2', 1 - 0.02],
		['undershoot8', 1 - 0.08],
		['undershoot15', 1 - 0.15],
		['touch', 1],
	]
	const leadIns = [0, 40]
	const noiseAmps = [0, 2, 4]

	it('detects every natural quick loop in the battery', () => {
		const failures: string[] = []
		for (const [shapeName, makeOutline] of shapes) {
			for (const size of sizes) {
				const outline = makeOutline(size)
				for (const [closureName, span] of closures) {
					for (const leadIn of leadIns) {
						for (const noiseAmp of noiseAmps) {
							const stroke = strokeFromOutline(outline, { span, leadIn, noiseAmp })
							if (!isClosed(stroke)) {
								failures.push(
									`${shapeName} size=${size} ${closureName} leadIn=${leadIn} noise=${noiseAmp}`
								)
							}
						}
					}
				}
			}
		}
		expect(failures).toEqual([])
	})

	it('detects the same loops regardless of zoom (tolerances scale)', () => {
		// The same screen-space gesture at different zooms: page points scale by
		// 1/zoom, tolerances divide by zoom, so decisions must be identical.
		for (const zoom of [0.25, 1, 4]) {
			const scale = (pts: Vec[]) => pts.map((p) => Vec.Mul(p, 1 / zoom))
			const loop = strokeFromOutline(circleOutline(75), { span: 0.9, noiseAmp: 2 })
			expect(isClosed(scale(loop), zoom)).toBe(true)
			// A 270° C-arc stays open at every zoom.
			const arc = strokeFromOutline(circleOutline(100), { span: 0.75 })
			expect(isClosed(scale(arc), zoom)).toBe(false)
		}
	})

	it('detects a tiny loop and a long thin loop', () => {
		expect(
			isClosed(strokeFromOutline(circleOutline(15), { span: 1 + 20 / 360, noiseAmp: 1 }))
		).toBe(true)
		const thinOutline = blobOutline(250).map((p) => new Vec(p.x, p.y * 0.06)) // ~500 × 30
		expect(isClosed(strokeFromOutline(thinOutline, { span: 1 + 10 / 360, noiseAmp: 1 }))).toBe(true)
	})

	it('detects a loop circled twice for emphasis', () => {
		expect(isClosed(strokeFromOutline(circleOutline(75), { span: 2.05, noiseAmp: 2 }))).toBe(true)
	})
})

describe('detectClosedLoop negatives', () => {
	it('does not close a straight line', () => {
		const pts: Vec[] = []
		for (let i = 0; i <= 50; i++) pts.push(new Vec(i * 5 + noise(i, 2), noise(i * 7 + 3, 2)))
		expect(isClosed(pts)).toBe(false)
	})

	it('does not close a U shape (half lap)', () => {
		expect(isClosed(strokeFromOutline(circleOutline(100), { span: 0.5, noiseAmp: 2 }))).toBe(false)
	})

	it('does not close a 270° C-arc', () => {
		expect(isClosed(strokeFromOutline(circleOutline(100), { span: 0.75, noiseAmp: 2 }))).toBe(false)
	})

	it('does not close an S curve', () => {
		// Two opposing half-circles: turning +180° then −180°, net zero.
		const pts: Vec[] = []
		for (let i = 0; i <= 40; i++) {
			const t = -Math.PI / 2 + (i / 40) * Math.PI
			pts.push(new Vec(60 * Math.cos(t), 60 + 60 * Math.sin(t)))
		}
		for (let i = 1; i <= 40; i++) {
			const t = -Math.PI / 2 - (i / 40) * Math.PI
			pts.push(new Vec(60 * Math.cos(t), 180 + 60 * Math.sin(t)))
		}
		expect(isClosed(pts)).toBe(false)
	})

	it('does not close a V hook', () => {
		const pts: Vec[] = []
		for (let i = 0; i <= 30; i++) pts.push(new Vec(i * 4, i * 5))
		for (let i = 1; i <= 30; i++) pts.push(new Vec(120 + i * 4, 150 - i * 5))
		expect(isClosed(pts)).toBe(false)
	})

	it('does not close three sides of a square', () => {
		const pts: Vec[] = []
		for (let i = 0; i <= 20; i++) pts.push(new Vec(i * 5, 0))
		for (let i = 1; i <= 20; i++) pts.push(new Vec(100, i * 5))
		for (let i = 1; i <= 20; i++) pts.push(new Vec(100 - i * 5, 100))
		expect(isClosed(pts)).toBe(false)
	})

	it('does not close a spiral with a long exit tail', () => {
		const pts: Vec[] = []
		for (let i = 0; i <= 160; i++) {
			const t = (i / 40) * Math.PI // two full rings
			const r = 20 + (15 * t) / (2 * Math.PI)
			pts.push(new Vec(r * Math.cos(t), r * Math.sin(t)))
		}
		// Exit straight through and far past the rings.
		const from = pts[pts.length - 1].clone()
		for (let i = 1; i <= 60; i++) pts.push(new Vec(from.x - i * 5, from.y))
		expect(isClosed(pts)).toBe(false)
	})

	it('does not close a zigzag scribble (rows are slivers, net turning cancels)', () => {
		const pts: Vec[] = []
		for (let row = 0; row < 8; row++) {
			const y = row * 5
			for (let i = 0; i <= 20; i++) {
				const x = row % 2 === 0 ? i * 10 : 200 - i * 10
				pts.push(new Vec(x + noise(row * 21 + i, 1), y + noise((row * 21 + i) * 7 + 3, 1)))
			}
		}
		expect(isClosed(pts)).toBe(false)
	})

	it('un-closes a loop once the stroke draws far past it', () => {
		const loop = strokeFromOutline(circleOutline(100), { span: 1 + 10 / 360, noiseAmp: 2 })
		expect(isClosed(loop)).toBe(true)
		// Exit straight away from the ring: at 250px out the loop no longer reads
		// as a lasso (the endpoint has left the loop's vicinity).
		const from = loop[loop.length - 1].clone()
		const exited = [...loop]
		for (let i = 1; i <= 50; i++) exited.push(new Vec(from.x + i * 5, from.y))
		expect(isClosed(exited)).toBe(false)
	})

	it('does not let an exit path re-close as a bigger sloppy loop', () => {
		// Square loop, then a diagonal exit whose path could read as an almost-loop
		// of its own (winding stays high, endpoint moderately near the stroke). The
		// completed-then-departed loop must veto that proximity closure.
		const pts: Vec[] = []
		for (let i = 0; i <= 20; i++) pts.push(new Vec(100 + i * 5, 100))
		for (let i = 1; i <= 20; i++) pts.push(new Vec(200, 100 + i * 5))
		for (let i = 1; i <= 20; i++) pts.push(new Vec(200 - i * 5, 200))
		for (let i = 1; i <= 20; i++) pts.push(new Vec(100, 200 - i * 5))
		pts.push(new Vec(102, 100)) // closed here…
		for (let i = 1; i <= 20; i++) {
			pts.push(new Vec(102 + i * 8.9, 100 - i * 3)) // …then away to (280, 40)
		}
		expect(isClosed(pts)).toBe(false)
	})
})

describe('detectClosedLoop loop extraction', () => {
	it('returns an explicitly closed polygon', () => {
		const loop = detectClosedLoop(
			strokeFromOutline(circleOutline(75), { span: 0.95, noiseAmp: 2 }),
			1
		)!
		expect(loop).not.toBeNull()
		expect(Vec.Dist(loop.polygon[0], loop.polygon[loop.polygon.length - 1])).toBeLessThan(1e-6)
	})

	it('closes by crossing (rule A) when the overshoot genuinely crosses the stroke', () => {
		// Overshoot lap drifts from inside to outside the first lap, so it must
		// cross it exactly once regardless of noise.
		const r = 75
		const pts: Vec[] = []
		const laps = 1 + 30 / 360
		const steps = Math.round(240 * laps)
		for (let i = 0; i <= steps; i++) {
			const t = (i / 240) * Math.PI * 2
			const drift = t > Math.PI * 2 ? 0.94 + (0.12 * (t - Math.PI * 2)) / ((Math.PI / 6) * 2) : 1
			pts.push(new Vec(r * drift * Math.cos(t), r * drift * Math.sin(t)))
		}
		const loop = detectClosedLoop(pts, 1)!
		expect(loop).not.toBeNull()
		expect(loop.closure).toBe('crossing')
	})

	it('excludes lead-in and overshoot tails from the loop polygon', () => {
		const outline = circleOutline(75) // bbox: (-75,-75)–(75,75)
		const stroke = strokeFromOutline(outline, { span: 1 + 30 / 360, leadIn: 60, noiseAmp: 2 })
		const loop = detectClosedLoop(stroke, 1)!
		expect(loop).not.toBeNull()
		const bounds = Box.FromPoints(loop.polygon)
		// The lead-in runs ~60px along the tangent at (75, 0); the loop polygon
		// must stay within the circle's own bounds (plus noise).
		expect(bounds.minX).toBeGreaterThan(-85)
		expect(bounds.maxX).toBeLessThan(85)
		expect(bounds.minY).toBeGreaterThan(-85)
		expect(bounds.maxY).toBeLessThan(85)
	})

	it('picks the larger lobe of a figure eight', () => {
		const pts: Vec[] = []
		// Right lobe: r=40 around (40, 0), starting/ending at the origin.
		for (let i = 0; i <= 60; i++) {
			const t = Math.PI + (i / 60) * Math.PI * 2
			pts.push(new Vec(40 + 40 * Math.cos(t) + noise(i, 1), 40 * Math.sin(t) + noise(i * 7 + 3, 1)))
		}
		// Left lobe: r=80 around (-80, 0), drawn the opposite way round.
		for (let i = 0; i <= 100; i++) {
			const t = -((i / 100) * Math.PI * 2)
			const k = 200 + i
			pts.push(
				new Vec(-80 + 80 * Math.cos(t) + noise(k, 1), 80 * Math.sin(t) + noise(k * 7 + 3, 1))
			)
		}
		const loop = detectClosedLoop(pts, 1)!
		expect(loop).not.toBeNull()
		const bounds = Box.FromPoints(loop.polygon)
		// The polygon covers the big left lobe, not the small right one.
		expect(bounds.minX).toBeLessThan(-140)
		expect(bounds.maxX).toBeLessThan(45)
	})
})
