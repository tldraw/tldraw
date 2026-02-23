import { Editor, Mat, Vec } from 'tldraw'

/** A contour shape with its page-space polygon and computed properties. */
export interface ContourShape {
	id: string
	/** Vertices in page space */
	vertices: Vec[]
	centroid: Vec
	area: number
}

/** A node in the contour nesting tree. */
export interface ContourNode {
	shape: ContourShape
	depth: number
	height: number
	children: ContourNode[]
	parent: ContourNode | null
}

/** A grid of normalized depth values for terrain rendering. */
export interface Heightfield {
	/** Normalized depth values (0–1) for each grid point. 0 = outside terrain, 1 = deepest nesting. */
	depths: Float64Array
	gridW: number
	gridH: number
	minX: number
	minY: number
	cellSize: number
	maxDepth: number
	/** The contour tree, for drawing contour line overlays. */
	roots: ContourNode[]
}

// ── Extraction ──────────────────────────────────────────────────────

/** Extract closed shapes from the editor, returning page-space polygons. */
export function extractContourShapes(editor: Editor): ContourShape[] {
	const shapes = editor.getCurrentPageShapes()
	const contours: ContourShape[] = []

	for (const shape of shapes) {
		const geometry = editor.getShapeGeometry(shape)
		if (!geometry.isClosed) continue

		const localVerts = geometry.vertices
		if (localVerts.length < 3) continue

		const transform = editor.getShapePageTransform(shape.id)
		const pageVerts = localVerts.map((v) => Mat.applyToPoint(transform, v))

		const centroid = computeCentroid(pageVerts)
		const area = Math.abs(shoelaceArea(pageVerts))

		contours.push({ id: shape.id, vertices: pageVerts, centroid, area })
	}

	return contours
}

// ── Nesting hierarchy ───────────────────────────────────────────────

/** Build a forest of contour nodes based on polygon containment. */
export function buildNestingHierarchy(contours: ContourShape[]): ContourNode[] {
	// Sort largest to smallest
	const sorted = [...contours].sort((a, b) => b.area - a.area)

	const nodes: ContourNode[] = sorted.map((shape) => ({
		shape,
		depth: 0,
		height: 0,
		children: [],
		parent: null,
	}))

	// For each shape, find parent = smallest shape that contains its centroid
	for (let i = 0; i < nodes.length; i++) {
		for (let j = i - 1; j >= 0; j--) {
			if (pointInPolygon(nodes[i].shape.centroid, nodes[j].shape.vertices)) {
				nodes[i].parent = nodes[j]
				nodes[j].children.push(nodes[i])
				break
			}
		}
	}

	// Assign depths via BFS
	const roots = nodes.filter((n) => n.parent === null)
	const queue: ContourNode[] = [...roots]
	let maxDepth = 0

	while (queue.length > 0) {
		const node = queue.shift()!
		if (node.parent) {
			node.depth = node.parent.depth + 1
		}
		maxDepth = Math.max(maxDepth, node.depth)
		queue.push(...node.children)
	}

	return roots
}

/** Flatten a forest of nodes into a single array. */
export function flattenNodes(roots: ContourNode[]): ContourNode[] {
	const result: ContourNode[] = []
	const stack = [...roots]
	while (stack.length > 0) {
		const node = stack.pop()!
		result.push(node)
		stack.push(...node.children)
	}
	return result
}

// ── Heightfield ─────────────────────────────────────────────────────

const GRID_RESOLUTION = 80

/** Build a heightfield grid from contour shapes. Heights are stored as normalized depths (0–1). */
export function buildHeightfield(contours: ContourShape[]): Heightfield | null {
	const roots = buildNestingHierarchy(contours)
	const allNodes = flattenNodes(roots)
	if (allNodes.length === 0) return null

	// Find max depth
	let maxDepth = 0
	for (const node of allNodes) {
		maxDepth = Math.max(maxDepth, node.depth)
	}

	// Bounding box with padding
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const node of allNodes) {
		for (const v of node.shape.vertices) {
			if (v.x < minX) minX = v.x
			if (v.y < minY) minY = v.y
			if (v.x > maxX) maxX = v.x
			if (v.y > maxY) maxY = v.y
		}
	}

	const pad = Math.max(maxX - minX, maxY - minY) * 0.15
	minX -= pad
	minY -= pad
	maxX += pad
	maxY += pad

	const width = maxX - minX
	const height = maxY - minY
	const cellSize = Math.max(width, height) / GRID_RESOLUTION
	const gridW = Math.ceil(width / cellSize) + 1
	const gridH = Math.ceil(height / cellSize) + 1

	// Sort nodes deepest first for early exit
	const sortedNodes = [...allNodes].sort((a, b) => b.depth - a.depth)

	const depths = new Float64Array(gridW * gridH)
	const pt = new Vec()

	for (let gy = 0; gy < gridH; gy++) {
		pt.y = minY + gy * cellSize
		for (let gx = 0; gx < gridW; gx++) {
			pt.x = minX + gx * cellSize

			for (const node of sortedNodes) {
				if (pointInPolygon(pt, node.shape.vertices)) {
					depths[gy * gridW + gx] = maxDepth > 0 ? node.depth / maxDepth : 0
					break
				}
			}
		}
	}

	// Smooth for natural slopes
	smoothHeightfield(depths, gridW, gridH, 4)

	return { depths, gridW, gridH, minX, minY, cellSize, maxDepth, roots }
}

function smoothHeightfield(h: Float64Array, w: number, ht: number, passes: number) {
	const tmp = new Float64Array(h.length)
	for (let p = 0; p < passes; p++) {
		for (let y = 0; y < ht; y++) {
			for (let x = 0; x < w; x++) {
				let sum = 0
				let count = 0
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						const nx = x + dx
						const ny = y + dy
						if (nx >= 0 && nx < w && ny >= 0 && ny < ht) {
							sum += h[ny * w + nx]
							count++
						}
					}
				}
				tmp[y * w + x] = sum / count
			}
		}
		h.set(tmp)
	}
}

// ── Projection ──────────────────────────────────────────────────────

export interface ProjectionParams {
	centerX: number
	centerY: number
	tiltAngle: number // radians
	focalLength: number
}

/** Project a 3D point (px, py at height h) to 2D screen coordinates. */
export function projectPoint(
	px: number,
	py: number,
	h: number,
	params: ProjectionParams
): { x: number; y: number; z: number } {
	const dx = px - params.centerX
	const dy = py - params.centerY

	const cosT = Math.cos(params.tiltAngle)
	const sinT = Math.sin(params.tiltAngle)

	const yTilted = dy * cosT - h * sinT
	// Far edge (dy < 0, top of canvas) → positive z (farther)
	// Near edge (dy > 0, bottom of canvas) → negative z (closer)
	// Height → negative z (pops toward viewer)
	const zTilted = -dy * sinT - h * cosT

	const scale = params.focalLength / (params.focalLength + zTilted)

	return {
		x: params.centerX + dx * scale,
		y: params.centerY + yTilted * scale,
		z: zTilted,
	}
}

/** Project an entire polygon at a given height. */
export function projectPolygon(
	vertices: Vec[],
	height: number,
	params: ProjectionParams
): { projected: { x: number; y: number }[]; avgZ: number } {
	let totalZ = 0
	const projected = vertices.map((v) => {
		const p = projectPoint(v.x, v.y, height, params)
		totalZ += p.z
		return { x: p.x, y: p.y }
	})
	return { projected, avgZ: totalZ / vertices.length }
}

// ── Colors ──────────────────────────────────────────────────────────

const TERRAIN_COLORS: [number, number, number][] = [
	[34, 120, 60], // dark green (base)
	[70, 155, 70], // green
	[140, 185, 70], // yellow-green
	[195, 185, 100], // sandy
	[170, 135, 80], // light brown
	[140, 100, 65], // brown
	[180, 170, 165], // grey rock
	[240, 240, 240], // snow (peak)
]

/** Get terrain RGB values for a given normalized depth (0 = base, 1 = peak). */
export function getTerrainColorRGB(normalizedDepth: number): [number, number, number] {
	const t = Math.max(0, Math.min(1, normalizedDepth))
	const idx = t * (TERRAIN_COLORS.length - 1)
	const lo = Math.floor(idx)
	const hi = Math.min(lo + 1, TERRAIN_COLORS.length - 1)
	const frac = idx - lo

	return [
		TERRAIN_COLORS[lo][0] + (TERRAIN_COLORS[hi][0] - TERRAIN_COLORS[lo][0]) * frac,
		TERRAIN_COLORS[lo][1] + (TERRAIN_COLORS[hi][1] - TERRAIN_COLORS[lo][1]) * frac,
		TERRAIN_COLORS[lo][2] + (TERRAIN_COLORS[hi][2] - TERRAIN_COLORS[lo][2]) * frac,
	]
}

export const CONTOUR_LINE_COLOR = 'rgba(60, 40, 20, 0.6)'

// ── Geometry helpers ────────────────────────────────────────────────

function shoelaceArea(verts: Vec[]): number {
	let area = 0
	const n = verts.length
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n
		area += verts[i].x * verts[j].y
		area -= verts[j].x * verts[i].y
	}
	return area / 2
}

function computeCentroid(verts: Vec[]): Vec {
	let cx = 0
	let cy = 0
	for (const v of verts) {
		cx += v.x
		cy += v.y
	}
	return new Vec(cx / verts.length, cy / verts.length)
}

/** Winding number point-in-polygon test. */
function pointInPolygon(point: Vec, polygon: Vec[]): boolean {
	let winding = 0
	const n = polygon.length
	for (let i = 0; i < n; i++) {
		const a = polygon[i]
		const b = polygon[(i + 1) % n]
		if (a.y <= point.y) {
			if (b.y > point.y && cross(a, b, point) > 0) winding++
		} else {
			if (b.y <= point.y && cross(a, b, point) < 0) winding--
		}
	}
	return winding !== 0
}

function cross(a: Vec, b: Vec, p: Vec): number {
	return (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y)
}
