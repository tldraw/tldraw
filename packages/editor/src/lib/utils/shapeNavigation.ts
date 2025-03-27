import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { Editor } from '../editor/Editor'
import { Vec } from '../primitives/Vec'

const SHALLOW_ANGLE = 20
const ROW_THRESHOLD = 100

/** @public */
export type AdjacentDirection = 'next' | 'prev' | 'left' | 'right' | 'up' | 'down'

/** @public */
export function selectAdjacentShape(editor: Editor, direction: AdjacentDirection) {
	const currentShapeId = editor.getSelectedShapeIds()[0]

	let shapes: TLShape[] = []
	let adjacentShapeId: TLShapeId
	if (direction === 'next' || direction === 'prev') {
		shapes = getShapesInReadingOrder(editor)
		const shapeIds = shapes.map((shape) => shape.id)

		const currentIndex = shapeIds.indexOf(currentShapeId)
		const adjacentIndex =
			(currentIndex + (['next', 'right', 'down'].includes(direction) ? 1 : -1) + shapeIds.length) %
			shapeIds.length
		adjacentShapeId = shapeIds[adjacentIndex]
	} else {
		if (!currentShapeId) return
		adjacentShapeId = getNearestAdjacentShape(editor, currentShapeId, direction)
	}

	const shape = editor.getShape(adjacentShapeId)
	if (!shape) return

	editor.setSelectedShapes([shape.id])
	editor.zoomToShapeIfOffscreen(256)
}

/**
 * Generates a reading order for shapes based on rows grouping.
 * Tries to keep a natural reading order (left-to-right, top-to-bottom).
 *
 * @public
 */
export function getShapesInReadingOrder(editor: Editor): TLShape[] {
	const shapes = editor.getCurrentPageShapes()
	const tabbableShapes = shapes.filter((shape) => editor.getShapeUtil(shape).canTabTo(shape))

	if (tabbableShapes.length <= 1) return tabbableShapes

	const shapesWithCenters = tabbableShapes.map((shape) => ({
		shape,
		center: getShapeCenter(editor, shape),
	}))
	shapesWithCenters.sort((a, b) => a.center.y - b.center.y)

	const rows: Array<typeof shapesWithCenters> = []

	// First, group shapes into rows based on y-coordinates.
	for (const shapeWithCenter of shapesWithCenters) {
		let rowIndex = -1
		for (let i = rows.length - 1; i >= 0; i--) {
			const row = rows[i]
			const lastShapeInRow = row[row.length - 1]

			// If the shape is close enough vertically to the last shape in this row.
			if (Math.abs(shapeWithCenter.center.y - lastShapeInRow.center.y) < ROW_THRESHOLD) {
				rowIndex = i
				break
			}
		}

		// If no suitable row found, create a new row.
		if (rowIndex === -1) {
			rows.push([shapeWithCenter])
		} else {
			rows[rowIndex].push(shapeWithCenter)
		}
	}

	// Then, sort each row by x-coordinate (left-to-right).
	for (const row of rows) {
		row.sort((a, b) => a.center.x - b.center.x)
	}

	// Finally, apply angle/distance weight adjustments within rows for closely positioned shapes.
	for (const row of rows) {
		if (row.length <= 2) continue

		for (let i = 0; i < row.length - 2; i++) {
			const currentShape = row[i]
			const nextShape = row[i + 1]
			const nextNextShape = row[i + 2]

			// Only consider adjustment if the next two shapes are relatively close to each other.
			const dist1 = Vec.Dist(currentShape.center, nextShape.center)
			const dist2 = Vec.Dist(currentShape.center, nextNextShape.center)

			// Check if the 2nd shape is actually closer to the current shape.
			if (dist2 < dist1 * 0.9) {
				// Check if it's a shallow enough angle.
				const angle = Math.abs(
					Vec.Angle(currentShape.center, nextNextShape.center) * (180 / Math.PI)
				)
				if (angle <= SHALLOW_ANGLE) {
					// Swap swap.
					;[row[i + 1], row[i + 2]] = [row[i + 2], row[i + 1]]
				}
			}
		}
	}

	return rows.flat().map((item) => item.shape)
}

const directionToAngle = { right: 0, left: 180, down: 90, up: 270 }
/**
 * Find the nearest adjacent shape in a specific direction.
 *
 * @public
 */
export function getNearestAdjacentShape(
	editor: Editor,
	currentShapeId: TLShapeId,
	direction: 'left' | 'right' | 'up' | 'down'
): TLShapeId {
	const currentShape = editor.getShape(currentShapeId)
	if (!currentShape) return currentShapeId

	const shapes = editor.getCurrentPageShapes()
	const tabbableShapes = shapes.filter(
		(shape) => editor.getShapeUtil(shape).canTabTo(shape) && shape.id !== currentShapeId
	)
	if (!tabbableShapes.length) return currentShapeId

	const currentCenter = getShapeCenter(editor, currentShape)
	const shapesWithCenters = tabbableShapes.map((shape) => ({
		shape,
		center: getShapeCenter(editor, shape),
	}))

	// Filter shapes that are in the same direction.
	const shapesInDirection = shapesWithCenters.filter(({ center }) => {
		const isRight = center.x > currentCenter.x
		const isDown = center.y > currentCenter.y
		const xDist = center.x - currentCenter.x
		const yDist = center.y - currentCenter.y
		const isInXDirection = Math.abs(yDist) < Math.abs(xDist) * 2
		const isInYDirection = Math.abs(xDist) < Math.abs(yDist) * 2
		if (direction === 'left' || direction === 'right') {
			return isInXDirection && (direction === 'right' ? isRight : !isRight)
		}
		if (direction === 'up' || direction === 'down') {
			return isInYDirection && (direction === 'down' ? isDown : !isDown)
		}
	})

	if (shapesInDirection.length === 0) return currentShapeId

	// Ok, now score that subset of shapes.
	const scoredShapes = shapesInDirection.map(({ shape, center }) => {
		// Distance is the primary weighting factor.
		const distance = Vec.Dist(currentCenter, center)

		// Distance along the primary axis.
		const dirProp = ['left', 'right'].includes(direction) ? 'x' : 'y'
		const directionalDistance = Math.abs(center[dirProp] - currentCenter[dirProp])

		// Distance off the perpendicular to the primary axis.
		const offProp = ['left', 'right'].includes(direction) ? 'y' : 'x'
		const offAxisDeviation = Math.abs(center[offProp] - currentCenter[offProp])

		// Angle in degrees
		const angle = Math.abs(Vec.Angle(currentCenter, center) * (180 / Math.PI))
		const angleDeviation = Math.abs(angle - directionToAngle[direction])

		// Calculate final score (lower is better).
		// Weight factors to prioritize:
		// 1. Shapes directly in line with the current shape
		// 2. Shapes closer to the current shape
		// 3. Shapes with less angular deviation from the primary direction
		const score =
			distance * 1.0 + // Base distance
			offAxisDeviation * 2.0 + // Heavy penalty for off-axis deviation
			(distance - directionalDistance) * 1.5 + // Penalty for diagonal distance
			angleDeviation * 0.5 // Slight penalty for angular deviation

		return { shape, score }
	})

	scoredShapes.sort((a, b) => a.score - b.score)
	return scoredShapes[0].shape.id
}

/**
 * Gets the center point of a shape
 */
function getShapeCenter(editor: Editor, shape: TLShape): Vec {
	return editor.getShapePageBounds(shape)!.center
}
