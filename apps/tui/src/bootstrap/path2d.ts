/**
 * A `Path2D` polyfill for jsdom. tldraw builds every shape indicator, scribble and arrow hint as a
 * Path2D (from SVG `d` strings via PathBuilder.toPath2D, from canvas-style calls in
 * ArrowShapeUtil.addRoundedRectPath, and via `addPath(path, Mat)` in strokeShapeIndicators), so the
 * class must exist on `globalThis` and on `window` before tldraw is imported, and it must be the
 * SAME class in both places because strokeShapeIndicators.ts:47 tests `instanceof Path2D`.
 *
 * Every drawing command is normalised to move/line/quad/cubic/close ops; arcs become cubic Béziers.
 * Rasterisation happens elsewhere: `ops` is the contract, `flatten()` is a convenience.
 */

export interface MatLike {
	a: number
	b: number
	c: number
	d: number
	e: number
	f: number
}

export interface MoveOp {
	type: 'move'
	x: number
	y: number
}
export interface LineOp {
	type: 'line'
	x: number
	y: number
}
export interface QuadOp {
	type: 'quad'
	x1: number
	y1: number
	x: number
	y: number
}
export interface CubicOp {
	type: 'cubic'
	x1: number
	y1: number
	x2: number
	y2: number
	x: number
	y: number
}
export interface CloseOp {
	type: 'close'
}
export type PathOp = MoveOp | LineOp | QuadOp | CubicOp | CloseOp

type RoundRectRadius = number | { x?: number; y?: number }

const TAU = Math.PI * 2

function isLetter(ch: string) {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
}

function isDigit(ch: string) {
	return ch >= '0' && ch <= '9'
}

function isSeparator(ch: string) {
	return ch === ' ' || ch === ',' || ch === '\n' || ch === '\r' || ch === '\t' || ch === '\f'
}

function vectorAngle(ux: number, uy: number, vx: number, vy: number) {
	const dot = ux * vx + uy * vy
	const len = Math.hypot(ux, uy) * Math.hypot(vx, vy)
	const sign = ux * vy - uy * vx < 0 ? -1 : 1
	return sign * Math.acos(Math.max(-1, Math.min(1, dot / len)))
}

export class Path2DPolyfill {
	readonly ops: readonly PathOp[]
	private readonly opList: PathOp[] = []

	// Current point and the start of the current subpath, in path space. Needed for relative SVG
	// commands, for `arc()` joining from the current point and for `closePath()` semantics.
	private cx = 0
	private cy = 0
	private sx = 0
	private sy = 0
	private hasCurrentPoint = false

	constructor(init?: string | Path2DPolyfill) {
		this.ops = this.opList
		if (typeof init === 'string') {
			this.parseSvgPath(init)
		} else if (init) {
			this.addPath(init)
		}
	}

	isEmpty(): boolean {
		return this.opList.length === 0
	}

	private push(op: PathOp) {
		this.opList.push(op)
	}

	private setCurrent(x: number, y: number) {
		this.cx = x
		this.cy = y
		this.hasCurrentPoint = true
	}

	// Canvas semantics: a segment command without a current point starts a subpath at its first
	// point instead of drawing from (0, 0).
	private ensureSubpath(x: number, y: number) {
		if (!this.hasCurrentPoint) this.moveTo(x, y)
	}

	moveTo(x: number, y: number): void {
		this.push({ type: 'move', x, y })
		this.sx = x
		this.sy = y
		this.setCurrent(x, y)
	}

	lineTo(x: number, y: number): void {
		if (!this.hasCurrentPoint) {
			this.moveTo(x, y)
			return
		}
		this.push({ type: 'line', x, y })
		this.setCurrent(x, y)
	}

	quadraticCurveTo(x1: number, y1: number, x: number, y: number): void {
		this.ensureSubpath(x1, y1)
		this.push({ type: 'quad', x1, y1, x, y })
		this.setCurrent(x, y)
	}

	bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
		this.ensureSubpath(x1, y1)
		this.push({ type: 'cubic', x1, y1, x2, y2, x, y })
		this.setCurrent(x, y)
	}

	closePath(): void {
		if (!this.hasCurrentPoint) return
		this.push({ type: 'close' })
		this.setCurrent(this.sx, this.sy)
	}

	rect(x: number, y: number, w: number, h: number): void {
		this.moveTo(x, y)
		this.lineTo(x + w, y)
		this.lineTo(x + w, y + h)
		this.lineTo(x, y + h)
		this.closePath()
		// The canvas spec leaves a fresh subpath at (x, y); flatten() drops single-point subpaths.
		this.moveTo(x, y)
	}

	// eslint-disable-next-line tldraw/no-path2d-roundrect
	roundRect(
		x: number,
		y: number,
		w: number,
		h: number,
		radii: RoundRectRadius | RoundRectRadius[] = 0
	): void {
		if (w < 0) {
			x += w
			w = -w
		}
		if (h < 0) {
			y += h
			h = -h
		}
		const list = Array.isArray(radii) ? radii : [radii]
		const nums = list.map((r) => Math.max(0, typeof r === 'number' ? r : (r.x ?? 0)))
		let [tl, tr, br, bl] = [0, 0, 0, 0]
		switch (nums.length) {
			case 1:
				tl = tr = br = bl = nums[0]
				break
			case 2:
				tl = br = nums[0]
				tr = bl = nums[1]
				break
			case 3:
				tl = nums[0]
				tr = bl = nums[1]
				br = nums[2]
				break
			default:
				;[tl = 0, tr = 0, br = 0, bl = 0] = nums
		}
		const scale = Math.min(
			1,
			w / Math.max(tl + tr, bl + br, 1e-9),
			h / Math.max(tl + bl, tr + br, 1e-9)
		)
		if (scale < 1) {
			tl *= scale
			tr *= scale
			br *= scale
			bl *= scale
		}
		this.moveTo(x + tl, y)
		this.lineTo(x + w - tr, y)
		if (tr > 0) this.pushArc(x + w - tr, y + tr, tr, tr, 0, -Math.PI / 2, 0)
		this.lineTo(x + w, y + h - br)
		if (br > 0) this.pushArc(x + w - br, y + h - br, br, br, 0, 0, Math.PI / 2)
		this.lineTo(x + bl, y + h)
		if (bl > 0) this.pushArc(x + bl, y + h - bl, bl, bl, 0, Math.PI / 2, Math.PI)
		this.lineTo(x, y + tl)
		if (tl > 0) this.pushArc(x + tl, y + tl, tl, tl, 0, Math.PI, Math.PI * 1.5)
		this.closePath()
		this.moveTo(x, y)
	}

	arc(
		x: number,
		y: number,
		radius: number,
		startAngle: number,
		endAngle: number,
		counterclockwise = false
	): void {
		this.ellipse(x, y, radius, radius, 0, startAngle, endAngle, counterclockwise)
	}

	ellipse(
		x: number,
		y: number,
		radiusX: number,
		radiusY: number,
		rotation: number,
		startAngle: number,
		endAngle: number,
		counterclockwise = false
	): void {
		let delta = endAngle - startAngle
		if (!counterclockwise) {
			if (delta >= TAU) delta = TAU
			else {
				delta %= TAU
				if (delta < 0) delta += TAU
			}
		} else {
			if (-delta >= TAU) delta = -TAU
			else {
				delta %= TAU
				if (delta > 0) delta -= TAU
			}
		}
		const cos = Math.cos(rotation)
		const sin = Math.sin(rotation)
		const px = radiusX * Math.cos(startAngle)
		const py = radiusY * Math.sin(startAngle)
		const startX = x + px * cos - py * sin
		const startY = y + px * sin + py * cos
		// Like a real canvas, an arc continues the current subpath with a straight segment to its
		// start point (ArrowHintOverlayUtil relies on moveTo + arc producing a clean circle).
		if (this.hasCurrentPoint) this.lineTo(startX, startY)
		else this.moveTo(startX, startY)
		if (delta === 0 || radiusX === 0 || radiusY === 0) return
		this.pushArc(x, y, radiusX, radiusY, rotation, startAngle, startAngle + delta)
	}

	arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
		if (!this.hasCurrentPoint) this.moveTo(x1, y1)
		const x0 = this.cx
		const y0 = this.cy
		const d1x = x0 - x1
		const d1y = y0 - y1
		const d2x = x2 - x1
		const d2y = y2 - y1
		const l1 = Math.hypot(d1x, d1y)
		const l2 = Math.hypot(d2x, d2y)
		if (l1 === 0 || l2 === 0 || radius <= 0) {
			this.lineTo(x1, y1)
			return
		}
		const u1x = d1x / l1
		const u1y = d1y / l1
		const u2x = d2x / l2
		const u2y = d2y / l2
		const cross = u1x * u2y - u1y * u2x
		const dot = u1x * u2x + u1y * u2y
		if (Math.abs(cross) < 1e-9) {
			this.lineTo(x1, y1)
			return
		}
		const halfAngle = Math.acos(Math.max(-1, Math.min(1, dot))) / 2
		const tangentDist = radius / Math.tan(halfAngle)
		const t1x = x1 + u1x * tangentDist
		const t1y = y1 + u1y * tangentDist
		const t2x = x1 + u2x * tangentDist
		const t2y = y1 + u2y * tangentDist
		const bx = u1x + u2x
		const by = u1y + u2y
		const bl = Math.hypot(bx, by)
		const centerDist = radius / Math.sin(halfAngle)
		const centerX = x1 + (bx / bl) * centerDist
		const centerY = y1 + (by / bl) * centerDist
		const a0 = Math.atan2(t1y - centerY, t1x - centerX)
		const a1 = Math.atan2(t2y - centerY, t2x - centerX)
		let sweep = a1 - a0
		while (sweep > Math.PI) sweep -= TAU
		while (sweep < -Math.PI) sweep += TAU
		this.lineTo(t1x, t1y)
		this.pushArc(centerX, centerY, radius, radius, 0, a0, a0 + sweep)
	}

	/**
	 * Appends another path's ops, optionally transformed by a matrix. tldraw passes its own `Mat`
	 * ({a, b, c, d, e, f}, same layout as DOMMatrix 2D) in strokeShapeIndicators.ts:48.
	 */
	addPath(path: Path2DPolyfill, m?: MatLike | null): void {
		const ops = path.ops
		if (!ops) return
		if (!m) {
			for (const op of ops) this.replay(op)
			return
		}
		const { a, b, c, d, e, f } = m
		const tx = (x: number, y: number) => a * x + c * y + e
		const ty = (x: number, y: number) => b * x + d * y + f
		for (const op of ops) {
			switch (op.type) {
				case 'move':
					this.replay({ type: 'move', x: tx(op.x, op.y), y: ty(op.x, op.y) })
					break
				case 'line':
					this.replay({ type: 'line', x: tx(op.x, op.y), y: ty(op.x, op.y) })
					break
				case 'quad':
					this.replay({
						type: 'quad',
						x1: tx(op.x1, op.y1),
						y1: ty(op.x1, op.y1),
						x: tx(op.x, op.y),
						y: ty(op.x, op.y),
					})
					break
				case 'cubic':
					this.replay({
						type: 'cubic',
						x1: tx(op.x1, op.y1),
						y1: ty(op.x1, op.y1),
						x2: tx(op.x2, op.y2),
						y2: ty(op.x2, op.y2),
						x: tx(op.x, op.y),
						y: ty(op.x, op.y),
					})
					break
				case 'close':
					this.replay(op)
					break
			}
		}
	}

	private replay(op: PathOp) {
		switch (op.type) {
			case 'move':
				this.moveTo(op.x, op.y)
				break
			case 'line':
				this.lineTo(op.x, op.y)
				break
			case 'quad':
				this.quadraticCurveTo(op.x1, op.y1, op.x, op.y)
				break
			case 'cubic':
				this.bezierCurveTo(op.x1, op.y1, op.x2, op.y2, op.x, op.y)
				break
			case 'close':
				this.closePath()
				break
		}
	}

	/**
	 * Emits an elliptical arc from `a0` to `a1` (signed sweep, in radians) as cubic Béziers of at
	 * most a quarter turn each, continuing from the current point (which must be the arc start).
	 */
	private pushArc(
		cx: number,
		cy: number,
		rx: number,
		ry: number,
		rotation: number,
		a0: number,
		a1: number
	) {
		const sweep = a1 - a0
		const segments = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9))
		const step = sweep / segments
		const cosR = Math.cos(rotation)
		const sinR = Math.sin(rotation)
		const k = (4 / 3) * Math.tan(step / 4)
		const map = (px: number, py: number): [number, number] => {
			const x = px * rx
			const y = py * ry
			return [cx + x * cosR - y * sinR, cy + x * sinR + y * cosR]
		}
		let theta = a0
		for (let i = 0; i < segments; i++) {
			const next = theta + step
			const c0 = Math.cos(theta)
			const s0 = Math.sin(theta)
			const c1 = Math.cos(next)
			const s1 = Math.sin(next)
			const [x1, y1] = map(c0 - k * s0, s0 + k * c0)
			const [x2, y2] = map(c1 + k * s1, s1 - k * c1)
			const [x, y] = map(c1, s1)
			this.push({ type: 'cubic', x1, y1, x2, y2, x, y })
			this.setCurrent(x, y)
			theta = next
		}
	}

	// SVG arc (endpoint parameterisation) → centre parameterisation, per SVG 1.1 appendix F.6.5.
	private svgArc(
		rx: number,
		ry: number,
		rotationDeg: number,
		largeArc: boolean,
		sweep: boolean,
		x2: number,
		y2: number
	) {
		const x1 = this.cx
		const y1 = this.cy
		if (x1 === x2 && y1 === y2) return
		rx = Math.abs(rx)
		ry = Math.abs(ry)
		if (rx === 0 || ry === 0) {
			this.lineTo(x2, y2)
			return
		}
		const phi = (rotationDeg * Math.PI) / 180
		const cosPhi = Math.cos(phi)
		const sinPhi = Math.sin(phi)
		const dx2 = (x1 - x2) / 2
		const dy2 = (y1 - y2) / 2
		const x1p = cosPhi * dx2 + sinPhi * dy2
		const y1p = -sinPhi * dx2 + cosPhi * dy2
		const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
		if (lambda > 1) {
			const s = Math.sqrt(lambda)
			rx *= s
			ry *= s
		}
		const rx2 = rx * rx
		const ry2 = ry * ry
		const num = rx2 * ry2 - rx2 * y1p * y1p - ry2 * x1p * x1p
		const den = rx2 * y1p * y1p + ry2 * x1p * x1p
		const coef = (largeArc !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, num / den))
		const cxp = coef * ((rx * y1p) / ry)
		const cyp = coef * (-(ry * x1p) / rx)
		const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
		const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2
		const ux = (x1p - cxp) / rx
		const uy = (y1p - cyp) / ry
		const vx = (-x1p - cxp) / rx
		const vy = (-y1p - cyp) / ry
		const theta1 = vectorAngle(1, 0, ux, uy)
		let dTheta = vectorAngle(ux, uy, vx, vy)
		if (!sweep && dTheta > 0) dTheta -= TAU
		else if (sweep && dTheta < 0) dTheta += TAU
		this.pushArc(cx, cy, rx, ry, phi, theta1, theta1 + dTheta)
		// Guard against float drift so relative commands continue from the exact endpoint.
		this.setCurrent(x2, y2)
	}

	/**
	 * Parses SVG path data. Covers everything tldraw emits: PathBuilder's `M x y L … C … Z`,
	 * getSvgPathFromPoints' compact `M1.2,3.4Q…T…Z`, and the relative `a` arcs of dot arrowheads
	 * and scribble dots (arrowheads.ts:97-99, ScribbleOverlayUtil.ts:97).
	 */
	private parseSvgPath(d: string) {
		let i = 0
		const n = d.length
		let cmd = ''
		// Control point of the previous C/S or Q/T command, reflected by S and T.
		let lastCmd = ''
		let lastCtrlX = 0
		let lastCtrlY = 0

		const skipSeparators = () => {
			while (i < n && isSeparator(d[i])) i++
		}
		const readNumber = (): number => {
			skipSeparators()
			const start = i
			if (i < n && (d[i] === '+' || d[i] === '-')) i++
			let sawDigits = false
			while (i < n && isDigit(d[i])) {
				i++
				sawDigits = true
			}
			if (i < n && d[i] === '.') {
				i++
				while (i < n && isDigit(d[i])) {
					i++
					sawDigits = true
				}
			}
			if (!sawDigits) {
				i = start
				return NaN
			}
			if (i < n && (d[i] === 'e' || d[i] === 'E')) {
				const expStart = i
				i++
				if (i < n && (d[i] === '+' || d[i] === '-')) i++
				if (i < n && isDigit(d[i])) {
					while (i < n && isDigit(d[i])) i++
				} else {
					i = expStart
				}
			}
			return parseFloat(d.slice(start, i))
		}
		// Arc flags are single characters and may be run together with the next number ("01" or
		// "1-3.5"), so they cannot go through readNumber.
		const readFlag = (): boolean | null => {
			skipSeparators()
			if (i >= n) return null
			const ch = d[i]
			if (ch !== '0' && ch !== '1') return null
			i++
			return ch === '1'
		}
		const hasNumberAhead = () => {
			skipSeparators()
			if (i >= n) return false
			const ch = d[i]
			return ch === '-' || ch === '+' || ch === '.' || isDigit(ch)
		}

		while (true) {
			skipSeparators()
			if (i >= n) break
			const ch = d[i]
			if (isLetter(ch)) {
				cmd = ch
				i++
				skipSeparators()
			} else if (cmd === '') {
				return
			}

			const rel = cmd === cmd.toLowerCase()
			const ox = rel ? this.cx : 0
			const oy = rel ? this.cy : 0

			switch (cmd) {
				case 'M':
				case 'm': {
					const x = readNumber()
					const y = readNumber()
					if (Number.isNaN(x) || Number.isNaN(y)) return
					this.moveTo(ox + x, oy + y)
					// Implicit repeats after a moveto are linetos.
					cmd = rel ? 'l' : 'L'
					lastCmd = 'M'
					break
				}
				case 'L':
				case 'l': {
					const x = readNumber()
					const y = readNumber()
					if (Number.isNaN(x) || Number.isNaN(y)) return
					this.lineTo(ox + x, oy + y)
					lastCmd = 'L'
					break
				}
				case 'H':
				case 'h': {
					const x = readNumber()
					if (Number.isNaN(x)) return
					this.lineTo(ox + x, this.cy)
					lastCmd = 'L'
					break
				}
				case 'V':
				case 'v': {
					const y = readNumber()
					if (Number.isNaN(y)) return
					this.lineTo(this.cx, oy + y)
					lastCmd = 'L'
					break
				}
				case 'C':
				case 'c': {
					const x1 = readNumber()
					const y1 = readNumber()
					const x2 = readNumber()
					const y2 = readNumber()
					const x = readNumber()
					const y = readNumber()
					if (Number.isNaN(y)) return
					this.bezierCurveTo(ox + x1, oy + y1, ox + x2, oy + y2, ox + x, oy + y)
					lastCtrlX = ox + x2
					lastCtrlY = oy + y2
					lastCmd = 'C'
					break
				}
				case 'S':
				case 's': {
					const x2 = readNumber()
					const y2 = readNumber()
					const x = readNumber()
					const y = readNumber()
					if (Number.isNaN(y)) return
					const x1 = lastCmd === 'C' ? 2 * this.cx - lastCtrlX : this.cx
					const y1 = lastCmd === 'C' ? 2 * this.cy - lastCtrlY : this.cy
					this.bezierCurveTo(x1, y1, ox + x2, oy + y2, ox + x, oy + y)
					lastCtrlX = ox + x2
					lastCtrlY = oy + y2
					lastCmd = 'C'
					break
				}
				case 'Q':
				case 'q': {
					const x1 = readNumber()
					const y1 = readNumber()
					const x = readNumber()
					const y = readNumber()
					if (Number.isNaN(y)) return
					this.quadraticCurveTo(ox + x1, oy + y1, ox + x, oy + y)
					lastCtrlX = ox + x1
					lastCtrlY = oy + y1
					lastCmd = 'Q'
					break
				}
				case 'T':
				case 't': {
					const x = readNumber()
					const y = readNumber()
					if (Number.isNaN(y)) return
					const x1 = lastCmd === 'Q' ? 2 * this.cx - lastCtrlX : this.cx
					const y1 = lastCmd === 'Q' ? 2 * this.cy - lastCtrlY : this.cy
					this.quadraticCurveTo(x1, y1, ox + x, oy + y)
					lastCtrlX = x1
					lastCtrlY = y1
					lastCmd = 'Q'
					break
				}
				case 'A':
				case 'a': {
					const rx = readNumber()
					const ry = readNumber()
					const rotation = readNumber()
					const largeArc = readFlag()
					const sweep = readFlag()
					const x = readNumber()
					const y = readNumber()
					if (largeArc === null || sweep === null || Number.isNaN(y)) return
					this.svgArc(rx, ry, rotation, largeArc, sweep, ox + x, oy + y)
					lastCmd = 'A'
					break
				}
				case 'Z':
				case 'z':
					this.closePath()
					lastCmd = 'Z'
					// A number after Z without a command letter is invalid; stop rather than loop.
					if (hasNumberAhead()) return
					break
				default:
					return
			}
		}
	}

	/**
	 * Flattens the path into polylines. Each subpath is a flat `[x0, y0, x1, y1, …]` array in the
	 * space produced by `transform` (x' = a·x + c·y + e, y' = b·x + d·y + f); a closed subpath has
	 * its first point appended so the closing segment is explicit. Curves are subdivided so no
	 * segment is shorter than `tolerance` while quarter arcs of 4+ units still get 8+ segments.
	 * Single-point subpaths (the dangling moveTo after `rect()`) are dropped.
	 */
	flatten(transform?: MatLike | null, tolerance = 0.25): number[][] {
		const m = transform ?? null
		const tx = m ? (x: number, y: number) => m.a * x + m.c * y + m.e : (x: number) => x
		const ty = m ? (x: number, y: number) => m.b * x + m.d * y + m.f : (_x: number, y: number) => y
		const tol = Math.max(1e-6, tolerance)

		const subpaths: number[][] = []
		let current: number[] | null = null
		// Current point and subpath start, in path space.
		let px = 0
		let py = 0
		let startX = 0
		let startY = 0

		const finish = (closed: boolean) => {
			if (current && current.length >= 4) {
				if (closed) current.push(current[0], current[1])
				subpaths.push(current)
			}
			current = null
		}
		const begin = () => {
			if (!current) current = [tx(px, py), ty(px, py)]
		}
		const segmentCount = (length: number) => {
			if (length <= tol) return 1
			return Math.min(
				Math.ceil(length / tol),
				Math.max(1, Math.min(100, Math.ceil(1.5 * Math.sqrt(length / tol))))
			)
		}

		for (const op of this.opList) {
			switch (op.type) {
				case 'move':
					finish(false)
					px = startX = op.x
					py = startY = op.y
					current = [tx(px, py), ty(px, py)]
					break
				case 'line':
					begin()
					current!.push(tx(op.x, op.y), ty(op.x, op.y))
					px = op.x
					py = op.y
					break
				case 'quad': {
					begin()
					const x0 = tx(px, py)
					const y0 = ty(px, py)
					const x1 = tx(op.x1, op.y1)
					const y1 = ty(op.x1, op.y1)
					const x2 = tx(op.x, op.y)
					const y2 = ty(op.x, op.y)
					const n = segmentCount(Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1))
					for (let i = 1; i <= n; i++) {
						const t = i / n
						const u = 1 - t
						current!.push(
							u * u * x0 + 2 * u * t * x1 + t * t * x2,
							u * u * y0 + 2 * u * t * y1 + t * t * y2
						)
					}
					px = op.x
					py = op.y
					break
				}
				case 'cubic': {
					begin()
					const x0 = tx(px, py)
					const y0 = ty(px, py)
					const x1 = tx(op.x1, op.y1)
					const y1 = ty(op.x1, op.y1)
					const x2 = tx(op.x2, op.y2)
					const y2 = ty(op.x2, op.y2)
					const x3 = tx(op.x, op.y)
					const y3 = ty(op.x, op.y)
					const n = segmentCount(
						Math.hypot(x1 - x0, y1 - y0) +
							Math.hypot(x2 - x1, y2 - y1) +
							Math.hypot(x3 - x2, y3 - y2)
					)
					for (let i = 1; i <= n; i++) {
						const t = i / n
						const u = 1 - t
						const a = u * u * u
						const b = 3 * u * u * t
						const c = 3 * u * t * t
						const d = t * t * t
						current!.push(a * x0 + b * x1 + c * x2 + d * x3, a * y0 + b * y1 + c * y2 + d * y3)
					}
					px = op.x
					py = op.y
					break
				}
				case 'close':
					finish(true)
					px = startX
					py = startY
					break
			}
		}
		finish(false)
		return subpaths
	}

	/** Axis-aligned bounds of the flattened path, or null when the path draws nothing. */
	getBounds(
		transform?: MatLike | null
	): { minX: number; minY: number; maxX: number; maxY: number } | null {
		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity
		for (const sub of this.flatten(transform, 1)) {
			for (let i = 0; i < sub.length; i += 2) {
				const x = sub[i]
				const y = sub[i + 1]
				if (x < minX) minX = x
				if (x > maxX) maxX = x
				if (y < minY) minY = y
				if (y > maxY) maxY = y
			}
		}
		return minX === Infinity ? null : { minX, minY, maxX, maxY }
	}
}

/**
 * Installs the polyfill as `Path2D` on both `globalThis` and the jsdom window. The same class must
 * back both so `indicatorPath instanceof Path2D` holds whichever global tldraw resolved.
 */
export function installPath2D(win?: Window | null): void {
	const g = globalThis as unknown as Record<string, unknown>
	g.Path2D = Path2DPolyfill
	if (win) (win as unknown as Record<string, unknown>).Path2D = Path2DPolyfill
}
