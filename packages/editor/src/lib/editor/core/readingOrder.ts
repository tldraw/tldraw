import { minBy } from '@tldraw/utils'
import { Vec, VecLike } from '../../primitives/Vec'
import type { TLAdjacentDirection } from '../types/selection-types'

// Pure reading-order and adjacency geometry. Editor decides which shapes are tabbable and measures
// their page bounds through its own (overridable, reactive) methods at the same points it always
// did, then calls in here, so nothing in this file may read editor state.

export type TLCardinalDirection = Exclude<TLAdjacentDirection, 'next' | 'prev'>

/** A shape (or anything else) paired with the page-space center Editor measured for it. */
export interface CenteredItem<T> {
	payload: T
	center: VecLike
}

const SHALLOW_ANGLE = 20
const ROW_THRESHOLD = 100

/**
 * Order items the way a person would read them: grouped into rows, then left to right. Sorts
 * `items` in place, so callers pass an array they own.
 */
export function sortIntoReadingOrder<T>(items: CenteredItem<T>[]): T[] {
	items.sort((a, b) => a.center.y - b.center.y)

	const rows: Array<typeof items> = []

	// First, group shapes into rows based on y-coordinates.
	for (const item of items) {
		let rowIndex = -1
		for (let i = rows.length - 1; i >= 0; i--) {
			const row = rows[i]
			const lastShapeInRow = row[row.length - 1]

			// If the shape is close enough vertically to the last shape in this row.
			if (Math.abs(item.center.y - lastShapeInRow.center.y) < ROW_THRESHOLD) {
				rowIndex = i
				break
			}
		}

		// If no suitable row found, create a new row.
		if (rowIndex === -1) {
			rows.push([item])
		} else {
			rows[rowIndex].push(item)
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
			const dist1 = Vec.Dist2(currentShape.center, nextShape.center)
			const dist2 = Vec.Dist2(currentShape.center, nextNextShape.center)

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

	return rows.flat().map((item) => item.payload)
}

/**
 * The best item to move to from `currentCenter` in a cardinal direction, or null when nothing lies
 * that way.
 */
export function findNearestItemInDirection<T>(
	items: CenteredItem<T>[],
	currentCenter: VecLike,
	direction: TLCardinalDirection
): T | null {
	const directionToAngle = { right: 0, left: 180, down: 90, up: 270 }

	// Filter shapes that are in the same direction.
	const shapesInDirection = items.filter(({ center }) => {
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

	if (shapesInDirection.length === 0) return null

	// Ok, now score that subset of shapes.
	const lowestScoringShape = minBy(shapesInDirection, ({ center }) => {
		// Linear, not squared: the off-axis and diagonal penalties below are page units too, and
		// squared distance swamps them, so a nearer diagonal shape beats an aligned one.
		const distance = Vec.Dist(currentCenter, center)

		// Distance along the primary axis.
		const dirProp = ['left', 'right'].includes(direction) ? 'x' : 'y'
		const directionalDistance = Math.abs(center[dirProp] - currentCenter[dirProp])

		// Distance off the perpendicular to the primary axis.
		const offProp = ['left', 'right'].includes(direction) ? 'y' : 'x'
		const offAxisDeviation = Math.abs(center[offProp] - currentCenter[offProp])

		// atan2 gives -180..180, so 'up' is -90; normalize to 0..360 to match 270, and wrap the
		// deviation so that 350 is 10 away from 'right' (0), not 350.
		const angle = (Vec.Angle(currentCenter, center) * (180 / Math.PI) + 360) % 360
		const rawAngleDeviation = Math.abs(angle - directionToAngle[direction])
		const angleDeviation = Math.min(rawAngleDeviation, 360 - rawAngleDeviation)

		// Calculate final score (lower is better).
		// Weight factors to prioritize:
		// 1. Shapes directly in line with the current shape
		// 2. Shapes closer to the current shape
		// 3. Shapes with less angular deviation from the primary direction
		return (
			distance * 1.0 + // Base distance
			offAxisDeviation * 2.0 + // Heavy penalty for off-axis deviation
			(distance - directionalDistance) * 1.5 + // Penalty for diagonal distance
			angleDeviation * 0.5
		) // Slight penalty for angular deviation
	})

	return lowestScoringShape!.payload
}

/**
 * Step one place through a wrapping list. `currentIndex` is -1 when nothing is selected, and null
 * comes back when there is nowhere to step.
 */
export function getAdjacentIndex(
	count: number,
	currentIndex: number,
	direction: 'next' | 'prev'
): number | null {
	// Every candidate can be filtered out (e.g. a locked shape is selected and nothing
	// else is unlocked); indexing an empty list would hand getShape undefined
	if (count === 0) return null

	// With no current index, stepping from -1 makes 'prev' land one shape
	// before the last; seed it from 0 so it wraps to the last shape. See #10559.
	const startIndex = currentIndex === -1 && direction === 'prev' ? 0 : currentIndex
	return (startIndex + (direction === 'next' ? 1 : -1) + count) % count
}
