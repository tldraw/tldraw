import { Point, Polygon } from './types'

/**
 * Parse an SVG string and extract all closed shapes as polygons.
 * Supports: <path>, <polygon>, <polyline>, <rect>, <circle>, <ellipse>
 * Also handles embedded SVG images (data:image/svg+xml;base64,...) and
 * skips non-rendered elements inside <defs>, <clipPath>, etc.
 */
export function parseSvg(svgString: string): Polygon[] {
	const parser = new DOMParser()
	const doc = parser.parseFromString(svgString, 'image/svg+xml')
	const svg = doc.querySelector('svg')
	if (!svg) return []

	const idCounter = { value: 0 }
	return extractPolygonsFromSvg(svg, null, idCounter)
}

function extractPolygonsFromSvg(
	svg: SVGSVGElement | Element,
	parentTransform: Transform | null,
	idCounter: { value: number }
): Polygon[] {
	const polygons: Polygon[] = []

	// Process shape elements
	const elements = svg.querySelectorAll('path, polygon, polyline, rect, circle, ellipse')
	for (const el of elements) {
		if (isInsideNonRenderedElement(el)) continue

		const shapes = extractShapes(el)
		for (const shape of shapes) {
			let points = shape
			if (parentTransform) {
				points = points.map((p) => applyTransform(p, parentTransform))
			}
			if (points.length >= 3) {
				const baseId = el.id || 'shape'
				polygons.push({
					points,
					id: `${baseId}-${idCounter.value++}`,
				})
			}
		}
	}

	// Process embedded SVG images (data:image/svg+xml;base64,...)
	const images = svg.querySelectorAll('image')
	for (const img of images) {
		if (isInsideNonRenderedElement(img)) continue

		const href =
			img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
		if (!href || !href.startsWith('data:image/svg+xml;base64,')) continue

		const base64 = href.slice('data:image/svg+xml;base64,'.length)
		let innerSvgString: string
		try {
			innerSvgString = atob(base64)
		} catch {
			continue
		}

		const innerDoc = new DOMParser().parseFromString(innerSvgString, 'image/svg+xml')
		const innerSvg = innerDoc.querySelector('svg')
		if (!innerSvg) continue

		// Compute scaling: inner SVG viewBox → <image> display size
		const imgTransform = computeImageTransform(img, innerSvg)

		// Compose with accumulated transform of the <image> element in the outer SVG
		const outerTransform = getAccumulatedTransform(img)
		let combinedTransform = imgTransform
		if (outerTransform && combinedTransform) {
			combinedTransform = multiplyTransforms(outerTransform, combinedTransform)
		} else if (outerTransform) {
			combinedTransform = outerTransform
		}

		// Compose with any parent transform passed in
		if (parentTransform && combinedTransform) {
			combinedTransform = multiplyTransforms(parentTransform, combinedTransform)
		} else if (parentTransform) {
			combinedTransform = parentTransform
		}

		const innerPolygons = extractPolygonsFromSvg(innerSvg, combinedTransform, idCounter)
		polygons.push(...innerPolygons)
	}

	return polygons
}

/** Check if an element is inside <defs>, <clipPath>, <mask>, or <pattern> */
function isInsideNonRenderedElement(el: Element): boolean {
	let current: Element | null = el.parentElement
	while (current) {
		const tag = current.tagName.toLowerCase()
		if (
			tag === 'defs' ||
			tag === 'clippath' ||
			tag === 'mask' ||
			tag === 'pattern' ||
			tag === 'symbol'
		) {
			return true
		}
		current = current.parentElement
	}
	return false
}

/** Compute the transform from an inner SVG's user-space to the <image> element's space */
function computeImageTransform(img: Element, innerSvg: Element): Transform | null {
	const imgW = parseFloat(img.getAttribute('width') || '0')
	const imgH = parseFloat(img.getAttribute('height') || '0')
	if (imgW === 0 || imgH === 0) return null

	// Parse inner SVG viewBox
	const viewBox = innerSvg.getAttribute('viewBox')
	let vbX = 0,
		vbY = 0,
		vbW = 0,
		vbH = 0

	if (viewBox) {
		const parts = viewBox
			.trim()
			.split(/[\s,]+/)
			.map(Number)
		vbX = parts[0] || 0
		vbY = parts[1] || 0
		vbW = parts[2] || 0
		vbH = parts[3] || 0
	}

	if (vbW === 0 || vbH === 0) {
		// Fall back to width/height attributes
		vbW = parseFloat(innerSvg.getAttribute('width') || '0')
		vbH = parseFloat(innerSvg.getAttribute('height') || '0')
		if (vbW === 0 || vbH === 0) return null
	}

	const sx = imgW / vbW
	const sy = imgH / vbH

	// Transform = translate(-vbX*sx, -vbY*sy) then scale(sx, sy)
	// As a matrix: [sx, 0, 0, sy, -vbX*sx, -vbY*sy]
	return { a: sx, b: 0, c: 0, d: sy, e: -vbX * sx, f: -vbY * sy }
}

/** Accumulate transforms from an element and all its ancestor groups */
function getAccumulatedTransform(el: Element): Transform | null {
	const transforms: Transform[] = []

	let current: Element | null = el
	while (current && current.tagName !== 'svg') {
		const t = parseTransform(current.getAttribute('transform'))
		if (t) transforms.push(t)
		current = current.parentElement
	}

	if (transforms.length === 0) return null

	// Multiply from outermost ancestor to the element itself (rightmost = innermost)
	let result = transforms[transforms.length - 1]
	for (let i = transforms.length - 2; i >= 0; i--) {
		result = multiplyTransforms(transforms[i], result)
	}

	return result
}

/** Extract closed polygons from an SVG element */
function extractShapes(el: Element): Point[][] {
	const tag = el.tagName.toLowerCase()
	const transform = getAccumulatedTransform(el)

	let shapes: Point[][] = []

	switch (tag) {
		case 'path':
			shapes = parsePathData(el.getAttribute('d') || '')
			break
		case 'polygon':
			shapes = [parsePointsList(el.getAttribute('points') || '')]
			break
		case 'polyline': {
			const pts = parsePointsList(el.getAttribute('points') || '')
			// Only include if first and last points are close (effectively closed)
			if (pts.length >= 3) {
				const first = pts[0],
					last = pts[pts.length - 1]
				const dist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2)
				if (dist < 1) shapes = [pts]
			}
			break
		}
		case 'rect':
			shapes = [parseRect(el)]
			break
		case 'circle':
			shapes = [parseCircle(el)]
			break
		case 'ellipse':
			shapes = [parseEllipse(el)]
			break
	}

	// Apply accumulated transform (all ancestor groups + element itself) to all shapes
	if (transform) {
		shapes = shapes.map((pts) => pts.map((p) => applyTransform(p, transform)))
	}

	return shapes
}

// ---- Path data parser ----

interface PathCommand {
	type: string
	args: number[]
}

/** Parse SVG path d attribute into closed polygon point arrays */
function parsePathData(d: string): Point[][] {
	const commands = tokenizePathData(d)
	const subpaths: Point[][] = []
	let currentPath: Point[] = []
	let cx = 0,
		cy = 0 // Current point
	let sx = 0,
		sy = 0 // Subpath start
	let lastCpX = 0,
		lastCpY = 0 // Last control point (for S/T)
	let lastCmd = ''
	let isClosed = false

	for (const cmd of commands) {
		const { type, args } = cmd
		const isRelative = type === type.toLowerCase()
		const absType = type.toUpperCase()

		switch (absType) {
			case 'M': {
				// If we have an existing closed subpath, save it
				if (isClosed && currentPath.length >= 3) {
					subpaths.push(currentPath)
				}
				currentPath = []
				isClosed = false

				for (let i = 0; i < args.length; i += 2) {
					const x = isRelative ? cx + args[i] : args[i]
					const y = isRelative ? cy + args[i + 1] : args[i + 1]
					if (i === 0) {
						sx = x
						sy = y
					}
					currentPath.push({ x, y })
					cx = x
					cy = y
				}
				break
			}
			case 'L': {
				for (let i = 0; i < args.length; i += 2) {
					const x = isRelative ? cx + args[i] : args[i]
					const y = isRelative ? cy + args[i + 1] : args[i + 1]
					currentPath.push({ x, y })
					cx = x
					cy = y
				}
				break
			}
			case 'H': {
				for (let i = 0; i < args.length; i++) {
					const x = isRelative ? cx + args[i] : args[i]
					currentPath.push({ x, y: cy })
					cx = x
				}
				break
			}
			case 'V': {
				for (let i = 0; i < args.length; i++) {
					const y = isRelative ? cy + args[i] : args[i]
					currentPath.push({ x: cx, y })
					cy = y
				}
				break
			}
			case 'C': {
				for (let i = 0; i < args.length; i += 6) {
					const x1 = isRelative ? cx + args[i] : args[i]
					const y1 = isRelative ? cy + args[i + 1] : args[i + 1]
					const x2 = isRelative ? cx + args[i + 2] : args[i + 2]
					const y2 = isRelative ? cy + args[i + 3] : args[i + 3]
					const x = isRelative ? cx + args[i + 4] : args[i + 4]
					const y = isRelative ? cy + args[i + 5] : args[i + 5]
					flattenCubicBezier(currentPath, cx, cy, x1, y1, x2, y2, x, y)
					lastCpX = x2
					lastCpY = y2
					cx = x
					cy = y
				}
				break
			}
			case 'S': {
				for (let i = 0; i < args.length; i += 4) {
					// Reflect last control point
					let x1: number, y1: number
					if (lastCmd === 'C' || lastCmd === 'S' || lastCmd === 'c' || lastCmd === 's') {
						x1 = 2 * cx - lastCpX
						y1 = 2 * cy - lastCpY
					} else {
						x1 = cx
						y1 = cy
					}
					const x2 = isRelative ? cx + args[i] : args[i]
					const y2 = isRelative ? cy + args[i + 1] : args[i + 1]
					const x = isRelative ? cx + args[i + 2] : args[i + 2]
					const y = isRelative ? cy + args[i + 3] : args[i + 3]
					flattenCubicBezier(currentPath, cx, cy, x1, y1, x2, y2, x, y)
					lastCpX = x2
					lastCpY = y2
					cx = x
					cy = y
				}
				break
			}
			case 'Q': {
				for (let i = 0; i < args.length; i += 4) {
					const x1 = isRelative ? cx + args[i] : args[i]
					const y1 = isRelative ? cy + args[i + 1] : args[i + 1]
					const x = isRelative ? cx + args[i + 2] : args[i + 2]
					const y = isRelative ? cy + args[i + 3] : args[i + 3]
					flattenQuadraticBezier(currentPath, cx, cy, x1, y1, x, y)
					lastCpX = x1
					lastCpY = y1
					cx = x
					cy = y
				}
				break
			}
			case 'T': {
				for (let i = 0; i < args.length; i += 2) {
					let x1: number, y1: number
					if (lastCmd === 'Q' || lastCmd === 'T' || lastCmd === 'q' || lastCmd === 't') {
						x1 = 2 * cx - lastCpX
						y1 = 2 * cy - lastCpY
					} else {
						x1 = cx
						y1 = cy
					}
					const x = isRelative ? cx + args[i] : args[i]
					const y = isRelative ? cy + args[i + 1] : args[i + 1]
					flattenQuadraticBezier(currentPath, cx, cy, x1, y1, x, y)
					lastCpX = x1
					lastCpY = y1
					cx = x
					cy = y
				}
				break
			}
			case 'A': {
				for (let i = 0; i < args.length; i += 7) {
					const rx = args[i]
					const ry = args[i + 1]
					const xRot = args[i + 2]
					const largeArc = args[i + 3]
					const sweep = args[i + 4]
					const x = isRelative ? cx + args[i + 5] : args[i + 5]
					const y = isRelative ? cy + args[i + 6] : args[i + 6]
					flattenArc(currentPath, cx, cy, rx, ry, xRot, largeArc, sweep, x, y)
					cx = x
					cy = y
				}
				break
			}
			case 'Z': {
				isClosed = true
				cx = sx
				cy = sy
				break
			}
		}
		lastCmd = type
	}

	// Save last subpath if closed
	if (isClosed && currentPath.length >= 3) {
		subpaths.push(currentPath)
	}

	return subpaths
}

/** Tokenize SVG path d attribute into commands */
function tokenizePathData(d: string): PathCommand[] {
	const commands: PathCommand[] = []
	// Match command letter followed by numbers (with optional signs, decimals, scientific notation)
	const re =
		/([MmLlHhVvCcSsQqTtAaZz])([\s,]*[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?(?:[\s,]+[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)*)*/g

	let match
	while ((match = re.exec(d)) !== null) {
		const type = match[1]
		const argStr = match[2] || ''
		const args: number[] = []

		if (argStr.trim()) {
			// Parse numbers, handling cases like "1.5.5" (= 1.5, 0.5) and "-1-2" (= -1, -2)
			const numRe = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g
			let numMatch
			while ((numMatch = numRe.exec(argStr)) !== null) {
				args.push(parseFloat(numMatch[0]))
			}
		}

		commands.push({ type, args })
	}

	return commands
}

// ---- Curve flattening ----

const CURVE_SEGMENTS = 16

/** Flatten a cubic bezier curve into line segments */
function flattenCubicBezier(
	path: Point[],
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	x3: number,
	y3: number
) {
	for (let i = 1; i <= CURVE_SEGMENTS; i++) {
		const t = i / CURVE_SEGMENTS
		const mt = 1 - t
		const mt2 = mt * mt
		const t2 = t * t
		path.push({
			x: mt2 * mt * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t2 * t * x3,
			y: mt2 * mt * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t2 * t * y3,
		})
	}
}

/** Flatten a quadratic bezier curve into line segments */
function flattenQuadraticBezier(
	path: Point[],
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number
) {
	for (let i = 1; i <= CURVE_SEGMENTS; i++) {
		const t = i / CURVE_SEGMENTS
		const mt = 1 - t
		path.push({
			x: mt * mt * x0 + 2 * mt * t * x1 + t * t * x2,
			y: mt * mt * y0 + 2 * mt * t * y1 + t * t * y2,
		})
	}
}

/** Flatten an SVG arc into line segments */
function flattenArc(
	path: Point[],
	x1: number,
	y1: number,
	rx: number,
	ry: number,
	xRotDeg: number,
	largeArc: number,
	sweep: number,
	x2: number,
	y2: number
) {
	if (rx === 0 || ry === 0) {
		path.push({ x: x2, y: y2 })
		return
	}

	rx = Math.abs(rx)
	ry = Math.abs(ry)
	const xRot = (xRotDeg * Math.PI) / 180
	const cosRot = Math.cos(xRot)
	const sinRot = Math.sin(xRot)

	// Step 1: Transform to center parameterization
	const dx = (x1 - x2) / 2
	const dy = (y1 - y2) / 2
	const x1p = cosRot * dx + sinRot * dy
	const y1p = -sinRot * dx + cosRot * dy

	// Ensure radii are large enough
	let lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
	if (lambda > 1) {
		const sqrtLambda = Math.sqrt(lambda)
		rx *= sqrtLambda
		ry *= sqrtLambda
	}

	// Step 2: Compute center
	const rx2 = rx * rx,
		ry2 = ry * ry
	const x1p2 = x1p * x1p,
		y1p2 = y1p * y1p
	let sq = (rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2) / (rx2 * y1p2 + ry2 * x1p2)
	if (sq < 0) sq = 0
	let coef = Math.sqrt(sq)
	if (largeArc === sweep) coef = -coef

	const cxp = coef * ((rx * y1p) / ry)
	const cyp = coef * ((-ry * x1p) / rx)

	const cx = cosRot * cxp - sinRot * cyp + (x1 + x2) / 2
	const cy = sinRot * cxp + cosRot * cyp + (y1 + y2) / 2

	// Step 3: Compute angles
	const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
	let dtheta = vectorAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
	if (sweep === 0 && dtheta > 0) dtheta -= 2 * Math.PI
	if (sweep === 1 && dtheta < 0) dtheta += 2 * Math.PI

	// Step 4: Generate points
	const segments = Math.max(CURVE_SEGMENTS, Math.ceil(Math.abs(dtheta) / (Math.PI / 4)) * 4)
	for (let i = 1; i <= segments; i++) {
		const t = i / segments
		const angle = theta1 + t * dtheta
		const xp = rx * Math.cos(angle)
		const yp = ry * Math.sin(angle)
		path.push({
			x: cosRot * xp - sinRot * yp + cx,
			y: sinRot * xp + cosRot * yp + cy,
		})
	}
}

function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
	const sign = ux * vy - uy * vx < 0 ? -1 : 1
	const dot = ux * vx + uy * vy
	const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy)
	return sign * Math.acos(Math.max(-1, Math.min(1, dot / len)))
}

// ---- Simple shape parsers ----

function parsePointsList(str: string): Point[] {
	const nums = str
		.trim()
		.split(/[\s,]+/)
		.map(Number)
	const points: Point[] = []
	for (let i = 0; i < nums.length - 1; i += 2) {
		points.push({ x: nums[i], y: nums[i + 1] })
	}
	return points
}

function parseRect(el: Element): Point[] {
	const x = parseFloat(el.getAttribute('x') || '0')
	const y = parseFloat(el.getAttribute('y') || '0')
	const w = parseFloat(el.getAttribute('width') || '0')
	const h = parseFloat(el.getAttribute('height') || '0')
	// TODO: handle rx/ry for rounded rects
	return [
		{ x, y },
		{ x: x + w, y },
		{ x: x + w, y: y + h },
		{ x, y: y + h },
	]
}

function parseCircle(el: Element, segments = 32): Point[] {
	const cx = parseFloat(el.getAttribute('cx') || '0')
	const cy = parseFloat(el.getAttribute('cy') || '0')
	const r = parseFloat(el.getAttribute('r') || '0')
	const points: Point[] = []
	for (let i = 0; i < segments; i++) {
		const angle = (2 * Math.PI * i) / segments
		points.push({
			x: cx + r * Math.cos(angle),
			y: cy + r * Math.sin(angle),
		})
	}
	return points
}

function parseEllipse(el: Element, segments = 32): Point[] {
	const cx = parseFloat(el.getAttribute('cx') || '0')
	const cy = parseFloat(el.getAttribute('cy') || '0')
	const rx = parseFloat(el.getAttribute('rx') || '0')
	const ry = parseFloat(el.getAttribute('ry') || '0')
	const points: Point[] = []
	for (let i = 0; i < segments; i++) {
		const angle = (2 * Math.PI * i) / segments
		points.push({
			x: cx + rx * Math.cos(angle),
			y: cy + ry * Math.sin(angle),
		})
	}
	return points
}

// ---- Transform parsing ----

type Transform = { a: number; b: number; c: number; d: number; e: number; f: number }

function parseTransform(attr: string | null): Transform | null {
	if (!attr) return null

	// Support basic transforms: translate, scale, rotate, matrix
	const identity: Transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
	let result = identity

	const re = /(translate|scale|rotate|matrix)\s*\(([^)]+)\)/g
	let match
	while ((match = re.exec(attr)) !== null) {
		const type = match[1]
		const args = match[2]
			.trim()
			.split(/[\s,]+/)
			.map(Number)
		let t: Transform

		switch (type) {
			case 'translate':
				t = { a: 1, b: 0, c: 0, d: 1, e: args[0] || 0, f: args[1] || 0 }
				break
			case 'scale': {
				const sx = args[0] || 1
				const sy = args[1] ?? sx
				t = { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 }
				break
			}
			case 'rotate': {
				const rad = ((args[0] || 0) * Math.PI) / 180
				const cos = Math.cos(rad),
					sin = Math.sin(rad)
				if (args.length === 3) {
					const rcx = args[1],
						rcy = args[2]
					t = {
						a: cos,
						b: sin,
						c: -sin,
						d: cos,
						e: rcx - cos * rcx + sin * rcy,
						f: rcy - sin * rcx - cos * rcy,
					}
				} else {
					t = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }
				}
				break
			}
			case 'matrix':
				t = {
					a: args[0],
					b: args[1],
					c: args[2],
					d: args[3],
					e: args[4],
					f: args[5],
				}
				break
			default:
				continue
		}

		// Multiply: result = result * t
		result = multiplyTransforms(result, t)
	}

	// Check if it's identity
	if (
		result.a === 1 &&
		result.b === 0 &&
		result.c === 0 &&
		result.d === 1 &&
		result.e === 0 &&
		result.f === 0
	) {
		return null
	}

	return result
}

function multiplyTransforms(a: Transform, b: Transform): Transform {
	return {
		a: a.a * b.a + a.c * b.b,
		b: a.b * b.a + a.d * b.b,
		c: a.a * b.c + a.c * b.d,
		d: a.b * b.c + a.d * b.d,
		e: a.a * b.e + a.c * b.f + a.e,
		f: a.b * b.e + a.d * b.f + a.f,
	}
}

function applyTransform(p: Point, t: Transform): Point {
	return {
		x: t.a * p.x + t.c * p.y + t.e,
		y: t.b * p.x + t.d * p.y + t.f,
	}
}
