import { ensureCCW, maskPath, offsetPolygon, pathLength, polygonArea } from '../polygon-utils'
import { FillOptions, FillStrategy, Point, Polygon } from '../types'

/**
 * Contour offset fill strategy.
 *
 * Creates progressively inward offset copies of the polygon boundary,
 * then connects them into a continuous spiral-like path. Similar to
 * CNC contour/pocket milling or concentric embroidery fill.
 */
export const contourStrategy: FillStrategy = {
	name: 'contour',

	generate(polygon: Polygon, options: FillOptions): Point[][] {
		const { stepOver, margin, holes } = options

		let workPoly: Polygon = { ...polygon, points: ensureCCW(polygon.points) }

		// Apply initial margin
		if (margin > 0) {
			const inset = offsetPolygon(workPoly, -margin)
			if (!inset) return []
			workPoly = inset
		}

		// Generate concentric offset contours
		const contours: Point[][] = []
		let currentPoly = workPoly
		let prevArea = Infinity
		const minArea = stepOver * stepOver
		let maxIterations = 100 // Safety limit

		while (maxIterations-- > 0) {
			contours.push([...currentPoly.points])

			const next = offsetPolygon(currentPoly, -stepOver)
			if (!next || next.points.length < 3 || pathLength(next.points) < stepOver * 2) {
				break
			}

			const nextArea = polygonArea(next.points)
			if (nextArea >= prevArea || nextArea < minArea) {
				break
			}
			prevArea = nextArea

			currentPoly = next
		}

		if (contours.length === 0) return []

		// Connect contours into a continuous path
		// Strategy: connect end of each contour to the nearest point on the next contour
		const path: Point[] = []

		for (let i = 0; i < contours.length; i++) {
			const contour = contours[i]

			if (i === 0) {
				// First contour: just add all points
				path.push(...contour)
				// Close back to start
				path.push(contour[0])
			} else {
				// Find the point on this contour nearest to the last path point
				const lastPoint = path[path.length - 1]
				let nearestIdx = 0
				let nearestDist = Infinity

				for (let j = 0; j < contour.length; j++) {
					const dx = contour[j].x - lastPoint.x
					const dy = contour[j].y - lastPoint.y
					const dist = dx * dx + dy * dy
					if (dist < nearestDist) {
						nearestDist = dist
						nearestIdx = j
					}
				}

				// Add contour starting from nearest point, wrapping around
				for (let j = 0; j <= contour.length; j++) {
					const idx = (nearestIdx + j) % contour.length
					path.push(contour[idx])
				}
			}
		}

		// Mask path: remove points inside holes and outside concave regions
		return maskPath(path, holes || [], stepOver / 3, workPoly)
	},
}
