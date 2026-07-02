import { Editor, Geometry2d, Group2d, Mat, TLShape } from 'tldraw'

/** A wall segment in page space. */
export interface Segment {
	ax: number
	ay: number
	bx: number
	by: number
}

/** One shape's collision data: its page-space segments plus a bounding box for broadphase. */
export interface Obstacle {
	minX: number
	minY: number
	maxX: number
	maxY: number
	segments: Segment[]
}

export interface RayHit {
	x: number
	y: number
	/** Surface normal (unit), facing back toward the incoming ray. */
	nx: number
	ny: number
	dist: number
}

// Segments are cached per shape record. Records are immutable, so a moved or edited
// shape is a new record (a cache miss); a re-parented or frame-moved shape keeps its
// record but gets a new page transform instance, which the cache also checks.
const obstacleCache = new WeakMap<TLShape, { transform: Mat; obstacle: Obstacle | null }>()

/**
 * Every non-game shape on the page as a set of bounceable wall segments in page
 * space. Anything a player draws — freehand strokes, lines, arrows, geo shapes,
 * even text — becomes part of the level.
 */
export function getObstacles(editor: Editor): Obstacle[] {
	const out: Obstacle[] = []
	for (const shape of editor.getCurrentPageShapes()) {
		const kind = shape.meta.kind
		if (kind === 'marble' || kind === 'emitter') continue
		const transform = editor.getShapePageTransform(shape)
		const cached = obstacleCache.get(shape)
		if (cached && cached.transform === transform) {
			if (cached.obstacle) out.push(cached.obstacle)
			continue
		}
		const segments: Segment[] = []
		collectSegments(editor.getShapeGeometry(shape), transform, segments)
		let obstacle: Obstacle | null = null
		if (segments.length > 0) {
			let minX = Infinity
			let minY = Infinity
			let maxX = -Infinity
			let maxY = -Infinity
			for (const s of segments) {
				minX = Math.min(minX, s.ax, s.bx)
				minY = Math.min(minY, s.ay, s.by)
				maxX = Math.max(maxX, s.ax, s.bx)
				maxY = Math.max(maxY, s.ay, s.by)
			}
			obstacle = { minX, minY, maxX, maxY, segments }
			out.push(obstacle)
		}
		obstacleCache.set(shape, { transform, obstacle })
	}
	return out
}

function collectSegments(geometry: Geometry2d, transform: Mat, out: Segment[]) {
	// A Group2d's own vertices concatenate its children, which would add phantom
	// segments bridging between them — walk the children instead.
	if (geometry instanceof Group2d) {
		for (const child of geometry.children) collectSegments(child, transform, out)
		return
	}
	const vertices = geometry.vertices
	if (vertices.length < 2) return
	const points = vertices.map((v) => Mat.applyToPoint(transform, v))
	const count = geometry.isClosed ? points.length : points.length - 1
	for (let i = 0; i < count; i++) {
		const a = points[i]
		const b = points[(i + 1) % points.length]
		if (Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01) continue
		out.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y })
	}
}

/** Nearest intersection of the ray (ox,oy) + t·(dx,dy), t ∈ (0, maxDist], with any obstacle. */
export function raycast(
	ox: number,
	oy: number,
	dx: number,
	dy: number,
	maxDist: number,
	obstacles: Obstacle[]
): RayHit | null {
	const ex = ox + dx * maxDist
	const ey = oy + dy * maxDist
	const rMinX = Math.min(ox, ex)
	const rMinY = Math.min(oy, ey)
	const rMaxX = Math.max(ox, ex)
	const rMaxY = Math.max(oy, ey)

	let best: RayHit | null = null
	for (const ob of obstacles) {
		if (ob.maxX < rMinX || ob.minX > rMaxX || ob.maxY < rMinY || ob.minY > rMaxY) continue
		for (const s of ob.segments) {
			const sx = s.bx - s.ax
			const sy = s.by - s.ay
			const denom = dx * sy - dy * sx
			if (Math.abs(denom) < 1e-9) continue
			const qx = s.ax - ox
			const qy = s.ay - oy
			const t = (qx * sy - qy * sx) / denom
			if (t < 0.001 || t > maxDist) continue
			if (best && t >= best.dist) continue
			const u = (qx * dy - qy * dx) / denom
			if (u < 0 || u > 1) continue
			const len = Math.hypot(sx, sy)
			let nx = -sy / len
			let ny = sx / len
			if (nx * dx + ny * dy > 0) {
				nx = -nx
				ny = -ny
			}
			best = { x: ox + dx * t, y: oy + dy * t, nx, ny, dist: t }
		}
	}
	return best
}

/**
 * Advance a point `dist` along (dx,dy), reflecting off obstacle segments along the
 * way. After each bounce the point is nudged off the surface along its normal so it
 * can't immediately re-hit the same segment.
 */
export function moveWithBounces(
	x: number,
	y: number,
	dx: number,
	dy: number,
	dist: number,
	obstacles: Obstacle[]
): { x: number; y: number; dx: number; dy: number; bounced: boolean } {
	let bounced = false
	let remaining = dist
	for (let i = 0; i < 4 && remaining > 0.01; i++) {
		const hit = raycast(x, y, dx, dy, remaining, obstacles)
		if (!hit) {
			x += dx * remaining
			y += dy * remaining
			break
		}
		remaining -= hit.dist
		const dot = dx * hit.nx + dy * hit.ny
		dx -= 2 * dot * hit.nx
		dy -= 2 * dot * hit.ny
		x = hit.x + hit.nx * 0.5
		y = hit.y + hit.ny * 0.5
		bounced = true
	}
	return { x, y, dx, dy, bounced }
}
