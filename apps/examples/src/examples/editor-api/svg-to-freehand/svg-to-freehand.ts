import type { TLDefaultColorStyle, TLDefaultFillStyle } from 'tldraw'

/** A single stroke extracted from an SVG element. */
export interface Stroke {
	points: { x: number; y: number }[]
	closed: boolean
	color: TLDefaultColorStyle
	fill: TLDefaultFillStyle
}

// ── Constants ────────────────────────────────────────────

const CURVE_SAMPLES = 16
const CIRCLE_SAMPLES = 32

// ── 2D affine matrix [a, b, c, d, e, f] ─────────────────
//  | a c e |
//  | b d f |
//  | 0 0 1 |

type Matrix = [number, number, number, number, number, number]
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

function multiplyMatrices(m1: Matrix, m2: Matrix): Matrix {
	const [a1, b1, c1, d1, e1, f1] = m1
	const [a2, b2, c2, d2, e2, f2] = m2
	return [
		a1 * a2 + c1 * b2,
		b1 * a2 + d1 * b2,
		a1 * c2 + c1 * d2,
		b1 * c2 + d1 * d2,
		a1 * e2 + c1 * f2 + e1,
		b1 * e2 + d1 * f2 + f1,
	]
}

function transformPoint(m: Matrix, x: number, y: number): { x: number; y: number } {
	return {
		x: m[0] * x + m[2] * y + m[4],
		y: m[1] * x + m[3] * y + m[5],
	}
}

// ── Transform parsing ────────────────────────────────────

function parseTransform(attr: string | null): Matrix {
	if (!attr) return IDENTITY

	let result: Matrix = IDENTITY
	const re = /(translate|scale|rotate|matrix)\s*\(([^)]+)\)/gi
	let match

	while ((match = re.exec(attr)) !== null) {
		const fn = match[1].toLowerCase()
		const args = match[2].split(/[\s,]+/).map(Number)
		let m: Matrix

		switch (fn) {
			case 'translate':
				m = [1, 0, 0, 1, args[0] || 0, args[1] || 0]
				break
			case 'scale': {
				const sx = args[0] || 1
				const sy = args[1] ?? sx
				m = [sx, 0, 0, sy, 0, 0]
				break
			}
			case 'rotate': {
				const deg = args[0] || 0
				const cx = args[1] || 0
				const cy = args[2] || 0
				const rad = (deg * Math.PI) / 180
				const cos = Math.cos(rad)
				const sin = Math.sin(rad)
				// rotate around (cx, cy)
				m = [cos, sin, -sin, cos, cx - cos * cx + sin * cy, cy - sin * cx - cos * cy]
				break
			}
			case 'matrix':
				m = [args[0] || 1, args[1] || 0, args[2] || 0, args[3] || 1, args[4] || 0, args[5] || 0]
				break
			default:
				continue
		}

		result = multiplyMatrices(result, m)
	}

	return result
}

// ── Curve sampling ───────────────────────────────────────

function sampleCubicBezier(
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	x3: number,
	y3: number,
	n: number
): { x: number; y: number }[] {
	const pts: { x: number; y: number }[] = []
	for (let i = 1; i <= n; i++) {
		const t = i / n
		const mt = 1 - t
		pts.push({
			x: mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3,
			y: mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3,
		})
	}
	return pts
}

function sampleQuadBezier(
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	n: number
): { x: number; y: number }[] {
	const pts: { x: number; y: number }[] = []
	for (let i = 1; i <= n; i++) {
		const t = i / n
		const mt = 1 - t
		pts.push({
			x: mt * mt * x0 + 2 * mt * t * x1 + t * t * x2,
			y: mt * mt * y0 + 2 * mt * t * y1 + t * t * y2,
		})
	}
	return pts
}

function sampleArc(
	x1: number,
	y1: number,
	rx: number,
	ry: number,
	xRotDeg: number,
	largeArc: boolean,
	sweep: boolean,
	x2: number,
	y2: number,
	n: number
): { x: number; y: number }[] {
	if (rx === 0 || ry === 0) return [{ x: x2, y: y2 }]
	if (x1 === x2 && y1 === y2) return []

	rx = Math.abs(rx)
	ry = Math.abs(ry)

	const phi = (xRotDeg * Math.PI) / 180
	const cosPhi = Math.cos(phi)
	const sinPhi = Math.sin(phi)

	// Step 1: Transform to unit-circle space
	const dx = (x1 - x2) / 2
	const dy = (y1 - y2) / 2
	const x1p = cosPhi * dx + sinPhi * dy
	const y1p = -sinPhi * dx + cosPhi * dy

	// Correct radii if too small
	const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
	if (lambda > 1) {
		const s = Math.sqrt(lambda)
		rx *= s
		ry *= s
	}

	// Step 2: Compute center in transformed space
	const rxSq = rx * rx
	const rySq = ry * ry
	const x1pSq = x1p * x1p
	const y1pSq = y1p * y1p

	let num = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq
	const den = rxSq * y1pSq + rySq * x1pSq
	if (num < 0) num = 0

	let sq = Math.sqrt(num / den)
	if (largeArc === sweep) sq = -sq

	const cxp = (sq * rx * y1p) / ry
	const cyp = (-sq * ry * x1p) / rx

	// Step 3: Transform center back
	const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
	const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2

	// Step 4: Compute angles
	function vecAngle(ux: number, uy: number, vx: number, vy: number): number {
		const dot = ux * vx + uy * vy
		const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy))
		let a = Math.acos(Math.max(-1, Math.min(1, dot / len)))
		if (ux * vy - uy * vx < 0) a = -a
		return a
	}

	const theta1 = vecAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
	let dtheta = vecAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)

	if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI
	if (sweep && dtheta < 0) dtheta += 2 * Math.PI

	// Sample points
	const pts: { x: number; y: number }[] = []
	for (let i = 1; i <= n; i++) {
		const t = i / n
		const theta = theta1 + dtheta * t
		const cosT = Math.cos(theta)
		const sinT = Math.sin(theta)
		pts.push({
			x: cosPhi * rx * cosT - sinPhi * ry * sinT + cx,
			y: sinPhi * rx * cosT + cosPhi * ry * sinT + cy,
		})
	}
	return pts
}

// ── Path d-attribute parsing ─────────────────────────────

interface RawStroke {
	points: { x: number; y: number }[]
	closed: boolean
}

const PATH_TOKEN_RE = /([mzlhvcsqta])|([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)/gi

function tokenizePath(d: string): (string | number)[] {
	const tokens: (string | number)[] = []
	let match
	PATH_TOKEN_RE.lastIndex = 0
	while ((match = PATH_TOKEN_RE.exec(d)) !== null) {
		tokens.push(match[1] ? match[1] : parseFloat(match[2]))
	}
	return tokens
}

function parsePath(d: string): RawStroke[] {
	const tokens = tokenizePath(d)
	const subpaths: RawStroke[] = []

	let pts: { x: number; y: number }[] = []
	let cx = 0,
		cy = 0 // current point
	let sx = 0,
		sy = 0 // subpath start
	let lastCmd = ''
	let lastCpX = 0,
		lastCpY = 0 // last control point (for S/T)
	let i = 0
	let closed = false

	function num(): number {
		while (i < tokens.length && typeof tokens[i] === 'string') i++
		return i < tokens.length ? (tokens[i++] as number) : 0
	}

	function finishSubpath() {
		if (pts.length > 0) {
			subpaths.push({ points: [...pts], closed })
			pts = []
			closed = false
		}
	}

	while (i < tokens.length) {
		let cmd: string
		if (typeof tokens[i] === 'string') {
			cmd = tokens[i] as string
			i++
		} else {
			// Implicit repeat of last command (M becomes L, m becomes l)
			cmd = lastCmd === 'M' ? 'L' : lastCmd === 'm' ? 'l' : lastCmd
			if (!cmd) break
		}

		switch (cmd) {
			case 'M':
				finishSubpath()
				cx = num()
				cy = num()
				sx = cx
				sy = cy
				pts.push({ x: cx, y: cy })
				lastCmd = 'M'
				lastCpX = cx
				lastCpY = cy
				break
			case 'm':
				finishSubpath()
				cx += num()
				cy += num()
				sx = cx
				sy = cy
				pts.push({ x: cx, y: cy })
				lastCmd = 'm'
				lastCpX = cx
				lastCpY = cy
				break
			case 'L':
				cx = num()
				cy = num()
				pts.push({ x: cx, y: cy })
				lastCmd = 'L'
				lastCpX = cx
				lastCpY = cy
				break
			case 'l':
				cx += num()
				cy += num()
				pts.push({ x: cx, y: cy })
				lastCmd = 'l'
				lastCpX = cx
				lastCpY = cy
				break
			case 'H':
				cx = num()
				pts.push({ x: cx, y: cy })
				lastCmd = 'H'
				lastCpX = cx
				lastCpY = cy
				break
			case 'h':
				cx += num()
				pts.push({ x: cx, y: cy })
				lastCmd = 'h'
				lastCpX = cx
				lastCpY = cy
				break
			case 'V':
				cy = num()
				pts.push({ x: cx, y: cy })
				lastCmd = 'V'
				lastCpX = cx
				lastCpY = cy
				break
			case 'v':
				cy += num()
				pts.push({ x: cx, y: cy })
				lastCmd = 'v'
				lastCpX = cx
				lastCpY = cy
				break
			case 'C': {
				const x1 = num(),
					y1 = num(),
					x2 = num(),
					y2 = num(),
					x = num(),
					y = num()
				pts.push(...sampleCubicBezier(cx, cy, x1, y1, x2, y2, x, y, CURVE_SAMPLES))
				lastCpX = x2
				lastCpY = y2
				cx = x
				cy = y
				lastCmd = 'C'
				break
			}
			case 'c': {
				const x1 = cx + num(),
					y1 = cy + num(),
					x2 = cx + num(),
					y2 = cy + num()
				const x = cx + num(),
					y = cy + num()
				pts.push(...sampleCubicBezier(cx, cy, x1, y1, x2, y2, x, y, CURVE_SAMPLES))
				lastCpX = x2
				lastCpY = y2
				cx = x
				cy = y
				lastCmd = 'c'
				break
			}
			case 'S': {
				// Reflected control point from previous C/S
				const cpx = 2 * cx - lastCpX
				const cpy = 2 * cy - lastCpY
				const x2 = num(),
					y2 = num(),
					x = num(),
					y = num()
				pts.push(...sampleCubicBezier(cx, cy, cpx, cpy, x2, y2, x, y, CURVE_SAMPLES))
				lastCpX = x2
				lastCpY = y2
				cx = x
				cy = y
				lastCmd = 'S'
				break
			}
			case 's': {
				const cpx = 2 * cx - lastCpX
				const cpy = 2 * cy - lastCpY
				const x2 = cx + num(),
					y2 = cy + num()
				const x = cx + num(),
					y = cy + num()
				pts.push(...sampleCubicBezier(cx, cy, cpx, cpy, x2, y2, x, y, CURVE_SAMPLES))
				lastCpX = x2
				lastCpY = y2
				cx = x
				cy = y
				lastCmd = 's'
				break
			}
			case 'Q': {
				const x1 = num(),
					y1 = num(),
					x = num(),
					y = num()
				pts.push(...sampleQuadBezier(cx, cy, x1, y1, x, y, CURVE_SAMPLES))
				lastCpX = x1
				lastCpY = y1
				cx = x
				cy = y
				lastCmd = 'Q'
				break
			}
			case 'q': {
				const x1 = cx + num(),
					y1 = cy + num()
				const x = cx + num(),
					y = cy + num()
				pts.push(...sampleQuadBezier(cx, cy, x1, y1, x, y, CURVE_SAMPLES))
				lastCpX = x1
				lastCpY = y1
				cx = x
				cy = y
				lastCmd = 'q'
				break
			}
			case 'T': {
				const cpx = 2 * cx - lastCpX
				const cpy = 2 * cy - lastCpY
				const x = num(),
					y = num()
				pts.push(...sampleQuadBezier(cx, cy, cpx, cpy, x, y, CURVE_SAMPLES))
				lastCpX = cpx
				lastCpY = cpy
				cx = x
				cy = y
				lastCmd = 'T'
				break
			}
			case 't': {
				const cpx = 2 * cx - lastCpX
				const cpy = 2 * cy - lastCpY
				const x = cx + num(),
					y = cy + num()
				pts.push(...sampleQuadBezier(cx, cy, cpx, cpy, x, y, CURVE_SAMPLES))
				lastCpX = cpx
				lastCpY = cpy
				cx = x
				cy = y
				lastCmd = 't'
				break
			}
			case 'A': {
				const arx = num(),
					ary = num(),
					rot = num(),
					la = num(),
					sw = num(),
					x = num(),
					y = num()
				pts.push(...sampleArc(cx, cy, arx, ary, rot, !!la, !!sw, x, y, CURVE_SAMPLES))
				cx = x
				cy = y
				lastCmd = 'A'
				lastCpX = cx
				lastCpY = cy
				break
			}
			case 'a': {
				const arx = num(),
					ary = num(),
					rot = num(),
					la = num(),
					sw = num()
				const x = cx + num(),
					y = cy + num()
				pts.push(...sampleArc(cx, cy, arx, ary, rot, !!la, !!sw, x, y, CURVE_SAMPLES))
				cx = x
				cy = y
				lastCmd = 'a'
				lastCpX = cx
				lastCpY = cy
				break
			}
			case 'Z':
			case 'z':
				closed = true
				cx = sx
				cy = sy
				lastCpX = cx
				lastCpY = cy
				finishSubpath()
				lastCmd = cmd
				break
			default:
				break
		}
	}

	finishSubpath()
	return subpaths
}

// ── Shape element handlers ───────────────────────────────

function circleToPoints(
	cx: number,
	cy: number,
	r: number
): { points: { x: number; y: number }[]; closed: boolean } {
	const pts: { x: number; y: number }[] = []
	for (let i = 0; i <= CIRCLE_SAMPLES; i++) {
		const theta = (i / CIRCLE_SAMPLES) * 2 * Math.PI
		pts.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) })
	}
	return { points: pts, closed: true }
}

function ellipseToPoints(
	cx: number,
	cy: number,
	rx: number,
	ry: number
): { points: { x: number; y: number }[]; closed: boolean } {
	const pts: { x: number; y: number }[] = []
	for (let i = 0; i <= CIRCLE_SAMPLES; i++) {
		const theta = (i / CIRCLE_SAMPLES) * 2 * Math.PI
		pts.push({ x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta) })
	}
	return { points: pts, closed: true }
}

function rectToPoints(
	x: number,
	y: number,
	w: number,
	h: number
): { points: { x: number; y: number }[]; closed: boolean } {
	return {
		points: [
			{ x, y },
			{ x: x + w, y },
			{ x: x + w, y: y + h },
			{ x, y: y + h },
			{ x, y },
		],
		closed: true,
	}
}

function parsePointList(attr: string): { x: number; y: number }[] {
	const pts: { x: number; y: number }[] = []
	const nums = attr
		.trim()
		.split(/[\s,]+/)
		.map(Number)
	for (let i = 0; i + 1 < nums.length; i += 2) {
		pts.push({ x: nums[i], y: nums[i + 1] })
	}
	return pts
}

// ── Style helpers ────────────────────────────────────────

interface SvgClassPaint {
	fill?: string
	stroke?: string
}

function parseInlineStyle(el: Element, prop: string): string | null {
	const style = el.getAttribute('style')
	if (!style) return null
	const match = style.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i'))
	return match ? match[1].trim() : null
}

/** Parse `<style>` blocks for `.className { fill: ...; stroke: ... }` rules (Arrow / Illustrator exports). */
function parseSvgClassStyles(svg: Element): Map<string, SvgClassPaint> {
	const map = new Map<string, SvgClassPaint>()
	for (const styleEl of Array.from(svg.querySelectorAll('style'))) {
		const text = styleEl.textContent ?? ''
		const ruleRe = /\.([a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g
		let m: RegExpExecArray | null
		while ((m = ruleRe.exec(text)) !== null) {
			const className = m[1]
			const body = m[2]
			const entry: SvgClassPaint = { ...map.get(className) }
			const fillMatch = body.match(/fill\s*:\s*([^;]+)/i)
			if (fillMatch) entry.fill = fillMatch[1].trim()
			const strokeMatch = body.match(/stroke\s*:\s*([^;]+)/i)
			if (strokeMatch) entry.stroke = strokeMatch[1].trim()
			map.set(className, entry)
		}
	}
	return map
}

function styleFromClasses(
	el: Element,
	prop: 'fill' | 'stroke',
	classStyles: Map<string, SvgClassPaint>
): string | null {
	if (classStyles.size === 0) return null
	const classAttr = el.getAttribute('class')
	if (!classAttr) return null
	for (const name of classAttr.trim().split(/\s+/)) {
		if (!name) continue
		const styles = classStyles.get(name)
		if (!styles) continue
		const v = prop === 'fill' ? styles.fill : styles.stroke
		if (v) return v
	}
	return null
}

function getStyleAttr(
	el: Element,
	prop: 'fill' | 'stroke',
	classStyles: Map<string, SvgClassPaint>
): string | null {
	let current: Element | null = el
	while (current) {
		const tag = current.tagName.toLowerCase()
		const direct = current.getAttribute(prop) ?? parseInlineStyle(current, prop)
		if (direct) return direct
		const fromClass = styleFromClasses(current, prop, classStyles)
		if (fromClass) return fromClass
		if (tag === 'svg') break
		current = current.parentElement
	}
	return null
}

// ── Color mapping ────────────────────────────────────────

const TLDRAW_COLORS: { name: TLDefaultColorStyle; r: number; g: number; b: number }[] = [
	{ name: 'black', r: 0, g: 0, b: 0 },
	{ name: 'red', r: 220, g: 40, b: 40 },
	{ name: 'orange', r: 255, g: 165, b: 0 },
	{ name: 'yellow', r: 255, g: 230, b: 0 },
	{ name: 'green', r: 0, g: 128, b: 0 },
	{ name: 'blue', r: 30, g: 80, b: 220 },
	{ name: 'violet', r: 130, g: 0, b: 200 },
	{ name: 'grey', r: 140, g: 140, b: 140 },
	{ name: 'light-red', r: 255, g: 150, b: 150 },
	{ name: 'light-green', r: 130, g: 220, b: 130 },
	{ name: 'light-blue', r: 100, g: 180, b: 255 },
	{ name: 'light-violet', r: 200, g: 150, b: 255 },
]

const NAMED_COLOR_MAP: Record<string, TLDefaultColorStyle> = {
	black: 'black',
	white: 'grey',
	red: 'red',
	green: 'green',
	blue: 'blue',
	yellow: 'yellow',
	orange: 'orange',
	purple: 'violet',
	violet: 'violet',
	magenta: 'violet',
	fuchsia: 'violet',
	cyan: 'light-blue',
	aqua: 'light-blue',
	teal: 'light-blue',
	lime: 'light-green',
	pink: 'light-red',
	gray: 'grey',
	grey: 'grey',
	silver: 'grey',
	brown: 'red',
	maroon: 'red',
	navy: 'blue',
	olive: 'green',
	coral: 'orange',
	tomato: 'orange',
	salmon: 'light-red',
	gold: 'yellow',
	indigo: 'violet',
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
	hex = hex.replace('#', '')
	if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
	if (hex.length !== 6) return null
	const n = parseInt(hex, 16)
	if (isNaN(n)) return null
	return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}

function parseRgbColor(str: string): { r: number; g: number; b: number } | null {
	const match = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
	if (!match) return null
	return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) }
}

function closestTldrawColor(r: number, g: number, b: number): TLDefaultColorStyle {
	let best: TLDefaultColorStyle = 'black'
	let bestDist = Infinity
	for (const c of TLDRAW_COLORS) {
		const dr = c.r - r
		const dg = c.g - g
		const db = c.b - b
		const dist = dr * dr + dg * dg + db * db
		if (dist < bestDist) {
			bestDist = dist
			best = c.name
		}
	}
	return best
}

export function mapSvgColorToTldraw(svgColor: string | null): TLDefaultColorStyle {
	if (!svgColor || svgColor === 'none' || svgColor === 'transparent') return 'black'
	const lower = svgColor.trim().toLowerCase()
	if (NAMED_COLOR_MAP[lower]) return NAMED_COLOR_MAP[lower]
	const hex = parseHexColor(lower)
	if (hex) return closestTldrawColor(hex.r, hex.g, hex.b)
	const rgb = parseRgbColor(lower)
	if (rgb) return closestTldrawColor(rgb.r, rgb.g, rgb.b)
	return 'black'
}

// ── Element walker ───────────────────────────────────────

function elementToRawStrokes(el: Element): RawStroke[] | null {
	const tag = el.tagName.toLowerCase()

	switch (tag) {
		case 'path': {
			const d = el.getAttribute('d')
			if (!d) return null
			return parsePath(d)
		}
		case 'circle': {
			const cx = parseFloat(el.getAttribute('cx') || '0')
			const cy = parseFloat(el.getAttribute('cy') || '0')
			const r = parseFloat(el.getAttribute('r') || '0')
			if (r <= 0) return null
			return [circleToPoints(cx, cy, r)]
		}
		case 'ellipse': {
			const cx = parseFloat(el.getAttribute('cx') || '0')
			const cy = parseFloat(el.getAttribute('cy') || '0')
			const rx = parseFloat(el.getAttribute('rx') || '0')
			const ry = parseFloat(el.getAttribute('ry') || '0')
			if (rx <= 0 || ry <= 0) return null
			return [ellipseToPoints(cx, cy, rx, ry)]
		}
		case 'rect': {
			const x = parseFloat(el.getAttribute('x') || '0')
			const y = parseFloat(el.getAttribute('y') || '0')
			const w = parseFloat(el.getAttribute('width') || '0')
			const h = parseFloat(el.getAttribute('height') || '0')
			if (w <= 0 || h <= 0) return null
			return [rectToPoints(x, y, w, h)]
		}
		case 'line': {
			const x1 = parseFloat(el.getAttribute('x1') || '0')
			const y1 = parseFloat(el.getAttribute('y1') || '0')
			const x2 = parseFloat(el.getAttribute('x2') || '0')
			const y2 = parseFloat(el.getAttribute('y2') || '0')
			return [
				{
					points: [
						{ x: x1, y: y1 },
						{ x: x2, y: y2 },
					],
					closed: false,
				},
			]
		}
		case 'polyline': {
			const attr = el.getAttribute('points')
			if (!attr) return null
			return [{ points: parsePointList(attr), closed: false }]
		}
		case 'polygon': {
			const attr = el.getAttribute('points')
			if (!attr) return null
			const pts = parsePointList(attr)
			if (pts.length > 0) pts.push(pts[0])
			return [{ points: pts, closed: true }]
		}
		default:
			return null
	}
}

function walkElement(
	el: Element,
	parentTransform: Matrix,
	strokes: Stroke[],
	classStyles: Map<string, SvgClassPaint>
): void {
	for (const child of Array.from(el.children)) {
		const tag = child.tagName.toLowerCase()

		// Skip non-visual elements
		if (['defs', 'clippath', 'mask', 'metadata', 'title', 'desc', 'style'].includes(tag)) {
			continue
		}

		const localTransform = parseTransform(child.getAttribute('transform'))
		const combined = multiplyMatrices(parentTransform, localTransform)

		// Recurse into groups and svg elements
		if (tag === 'g' || tag === 'svg') {
			walkElement(child, combined, strokes, classStyles)
			continue
		}

		const rawStrokes = elementToRawStrokes(child)
		if (!rawStrokes) continue

		// Determine stroke color and fill
		const strokeAttr = getStyleAttr(child, 'stroke', classStyles)
		const fillAttr = getStyleAttr(child, 'fill', classStyles)
		const hasFill = fillAttr && fillAttr !== 'none'
		const hasStroke = strokeAttr && strokeAttr !== 'none'

		const color = mapSvgColorToTldraw(hasStroke ? strokeAttr : hasFill ? fillAttr : 'black')
		const fill: TLDefaultFillStyle = hasFill ? 'solid' : 'none'

		for (const raw of rawStrokes) {
			if (raw.points.length < 2) continue
			const transformedPoints = raw.points.map((p) => transformPoint(combined, p.x, p.y))
			// If there's a fill, ensure the stroke is closed
			const isClosed = raw.closed || !!hasFill
			strokes.push({ points: transformedPoints, closed: isClosed, color, fill })
		}
	}
}

// ── Entry point ──────────────────────────────────────────

/** Parse SVG markup and return freehand strokes in display coordinates. */
export function parseSvgToStrokes(svgCode: string, canvasW: number, canvasH: number): Stroke[] {
	const parser = new DOMParser()
	const doc = parser.parseFromString(svgCode, 'image/svg+xml')
	const svg = doc.querySelector('svg')
	if (!svg) return []

	// Extract viewBox
	let vbX = 0,
		vbY = 0,
		vbW = canvasW,
		vbH = canvasH
	const viewBox = svg.getAttribute('viewBox')
	if (viewBox) {
		const parts = viewBox.split(/[\s,]+/).map(Number)
		if (parts.length >= 4) {
			;[vbX, vbY, vbW, vbH] = parts
		}
	}

	const scaleX = canvasW / vbW
	const scaleY = canvasH / vbH

	// Base transform: viewBox coordinates → display coordinates
	const baseTransform: Matrix = [scaleX, 0, 0, scaleY, -vbX * scaleX, -vbY * scaleY]

	const classStyles = parseSvgClassStyles(svg)
	const strokes: Stroke[] = []
	walkElement(svg, baseTransform, strokes, classStyles)
	return strokes
}
