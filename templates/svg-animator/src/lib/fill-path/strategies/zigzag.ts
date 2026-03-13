import {
	ensureCCW,
	maskPath,
	offsetPolygon,
	polygonBounds,
	polygonCentroid,
	rotatePoints,
	scanLineIntersections,
} from '../polygon-utils'
import { FillOptions, FillStrategy, Point, Polygon } from '../types'

/**
 * Zigzag (linear hatching) fill strategy.
 *
 * Generates parallel scan lines at a configurable angle, clips them to the
 * polygon boundary, and connects them in a zigzag pattern. When holes are
 * present, the path is densified and masked — any points inside a hole are
 * removed and the path is split into separate sub-paths.
 */
export const zigzagStrategy: FillStrategy = {
	name: 'zigzag',

	generate(polygon: Polygon, options: FillOptions): Point[][] {
		const { stepOver, angle, margin, connectEnds, holes } = options

		// Apply margin by insetting the polygon
		let workPoly = { ...polygon, points: ensureCCW(polygon.points) }
		if (margin > 0) {
			const inset = offsetPolygon(workPoly, -margin)
			if (!inset) return []
			workPoly = inset
		}

		const center = polygonCentroid(workPoly)

		// Rotate polygon so we can scan with horizontal lines
		const rotatedPoints = rotatePoints(workPoly.points, -angle, center)
		const rotatedPoly: Polygon = { points: rotatedPoints }

		const bounds = polygonBounds(rotatedPoly)

		// Generate scan lines using outer polygon only
		const scanLines: { y: number; segments: [number, number][] }[] = []
		const startY = bounds.minY + stepOver / 2
		const endY = bounds.maxY

		for (let y = startY; y <= endY; y += stepOver) {
			const intersections = scanLineIntersections(rotatedPoly, y)

			const segments: [number, number][] = []
			for (let i = 0; i < intersections.length - 1; i += 2) {
				segments.push([intersections[i], intersections[i + 1]])
			}

			if (segments.length > 0) {
				scanLines.push({ y, segments })
			}
		}

		if (scanLines.length === 0) return []

		// Build simple zigzag path
		const rotatedPath = buildSimpleZigzag(scanLines, connectEnds)

		// If holes: densify path, remove points inside holes, split into sub-paths
		const rotatedHoles: Polygon[] = (holes || []).map((hole) => ({
			points: rotatePoints(hole.points, -angle, center),
		}))

		// Always mask: removes points outside the outer polygon (concave regions)
		// and points inside holes
		const masked = maskPath(rotatedPath, rotatedHoles, stepOver / 3, rotatedPoly)
		return masked.map((subPath) => rotatePoints(subPath, angle, center))
	},
}

function buildSimpleZigzag(
	scanLines: { y: number; segments: [number, number][] }[],
	connectEnds: boolean
): Point[] {
	const path: Point[] = []
	let leftToRight = true

	for (const { y, segments } of scanLines) {
		const sorted = leftToRight
			? [...segments].sort((a, b) => a[0] - b[0])
			: [...segments].sort((a, b) => b[0] - a[0])

		for (const seg of sorted) {
			const x1 = leftToRight ? seg[0] : seg[1]
			const x2 = leftToRight ? seg[1] : seg[0]

			if (connectEnds && path.length > 0) {
				path.push({ x: x1, y })
			} else if (path.length === 0) {
				path.push({ x: x1, y })
			}
			path.push({ x: x2, y })
		}

		leftToRight = !leftToRight
	}

	return path
}
