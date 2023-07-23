import { TLShape } from '@tldraw/tlschema'
import { HIT_TEST_MARGIN } from '../constants'
import { Editor } from '../editor/Editor'
import { Vec2d } from '../primitives/Vec2d'
import { Group2d } from '../primitives/geometry/Group2d'
import { pointInPolygon } from '../primitives/utils'
import { sortByIndex } from './reordering/reordering'

/** @public */
export function getHoveredShapeId(editor: Editor) {
	const {
		inputs: { currentPagePoint },
		sortedShapesArray,
		selectedIds,
		focusLayerId,
		zoomLevel,
	} = editor

	const len = sortedShapesArray.length
	if (!len) return null

	for (let i = len - 1; i >= 0; i--) {
		const shape = sortedShapesArray[i]

		if (
			editor.isPointInShape(shape.id, currentPagePoint, {
				hitInside: false,
				margin: HIT_TEST_MARGIN / zoomLevel,
			})
		) {
			const shapeToHover = editor.getOutermostSelectableShape(
				shape,
				(parent) => !selectedIds.includes(parent.id)
			)
			return shapeToHover.id
		}

		if (
			shape.type === 'frame' &&
			editor.isPointInShape(shape.id, currentPagePoint, {
				hitInside: true,
				margin: HIT_TEST_MARGIN / zoomLevel,
			})
		) {
			// todo: extract this frame behavior into an API, like isBlocking
			return null
		}

		if (shape.id === focusLayerId) {
			return null
		}
	}

	return null

	// ...

	// if (nextHoveredId) {
	// 	const shape = editor.getShape(nextHoveredId)!

	// 	const hoveringShape = editor.getOutermostSelectableShape(
	// 		shape,
	// 		(parent) => !selectedIds.includes(parent.id)
	// 	)
	// 	if (hoveringShape.id !== focusLayerId) {
	// 		nextHoveredId = hoveringShape.id
	// 	}
	// }

	// return nextHoveredId
}

/** @public */
export function updateHoveredId(editor: Editor) {
	const nextHoveredId =
		getSmallestShapeContainingPoint(editor, editor.inputs.currentPagePoint, {
			hitInside: false,
			margin: HIT_TEST_MARGIN / editor.zoomLevel,
		})?.id ?? null
	if (nextHoveredId !== editor.hoveredId) {
		editor.setHoveredId(nextHoveredId)
	}
}

// inside of hollow geo shape -> true
// inside of frame shape -> true, but not always; false
// on pointer down because we want to be able to brush
// from inside of the frame

/** @public */
export function getSmallestShapeContainingPoint(
	editor: Editor,
	point: Vec2d,
	opts = {} as {
		hitInside?: boolean
		margin?: number
		hitFrameInside?: boolean
		filter?: (shape: TLShape) => boolean
	}
): TLShape | null {
	// are we inside of a shape but not hovering it?
	const { viewportPageBounds, zoomLevel, sortedShapesArray } = editor
	const { filter, margin = 0, hitInside = false, hitFrameInside = false } = opts

	let inHollowSmallestArea = Infinity
	let inHollowSmallestAreaHit: TLShape | null = null

	let inMarginClosestToEdgeDistance = Infinity
	let inMarginClosestToEdgeHit: TLShape | null = null

	const shapesToCheck = sortedShapesArray.filter((shape) => {
		const pageMask = editor.getPageMask(shape)
		if (pageMask && !pointInPolygon(point, pageMask)) return false
		if (filter) return filter(shape)
		return true
	})

	for (let i = shapesToCheck.length - 1; i >= 0; i--) {
		const shape = shapesToCheck[i]
		let geometry = editor.getGeometry(shape)

		// todo: this always presumes that the first child defines the bounds
		if (geometry instanceof Group2d) {
			geometry = geometry.children[0]
		}

		const pointInShapeSpace = editor.getPointInShapeSpace(shape, point)
		const distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)

		// On the rare case that we've hit a frame, test again hitInside to be forced true;
		// this prevents clicks from passing through the body of a frame to shapes behhind it.
		if (shape.type === 'frame') {
			// If the hit is within the frame's outer margin, then select the frame
			if (Math.abs(distance) <= margin) {
				return inMarginClosestToEdgeHit || shape
			}

			if (geometry.hitTestPoint(pointInShapeSpace, 0, true)) {
				// Once we've hit a frame, we want to end the search. If we have hit a shape
				// already, then this would either be above the frame or a child of the frame,
				// so we want to return that. Otherwise, the point is in the empty space of the
				// frame. If `hitFrameInside` is true (e.g. used drawing an arrow into the
				// frame) we the frame itself; other wise, (e.g. when hovering or pointing)
				// we would want to return null.
				return (
					inMarginClosestToEdgeHit || inHollowSmallestAreaHit || (hitFrameInside ? shape : null)
				)
			}
			continue
		}

		if (geometry.isClosed) {
			// For closed shapes, the distance will be positive if outside of
			// the shape or negative if inside of the shape. If the distance
			// is greater than the margin, then it's a miss. Otherwise...
			if (distance <= margin) {
				if (geometry.isFilled) {
					// If the shape is filled, then it's a hit. Remember, we're
					// starting from the TOP-MOST shape in z-index order, so any
					// other hits would be occluded by the shape.
					return inMarginClosestToEdgeHit || shape
				} else {
					// If the shape is bigger than the viewport, then skip it.
					if (editor.getPageBounds(shape)!.contains(viewportPageBounds)) continue

					// For hollow shapes...
					if (Math.abs(distance) < margin) {
						// We want to preference shapes where we're inside of the
						// shape margin; and we would want to hit the shape with the
						// edge closest to the point.
						if (Math.abs(distance) < inMarginClosestToEdgeDistance) {
							inMarginClosestToEdgeDistance = Math.abs(distance)
							inMarginClosestToEdgeHit = shape
						}
					} else if (!inMarginClosestToEdgeHit) {
						// If we're not within margin distnce to any edge, and if the
						// shape is hollow, then we want to hit the shape with the
						// smallest area. (There's a bug here with self-intersecting
						// shapes, like a closed drawing of an "8", but that's a bigger
						// problem to solve.)
						const { area } = geometry
						if (area < inHollowSmallestArea) {
							inHollowSmallestArea = area
							inHollowSmallestAreaHit = shape
						}
					}
				}
			}
		} else {
			// For open shapes (e.g. lines or draw shapes) always use the margin.
			// If the distance is less than the margin, return the shape as the hit.
			if (distance < HIT_TEST_MARGIN / zoomLevel) {
				return shape
			}
		}
	}

	// If we haven't hit any filled shapes or frames, then return either
	// the shape who we hit within the margin (and of those, the one that
	// had the shortest distance between the point and the shape edge),
	// or else the hollow shape with the smallest area—or if we didn't hit
	// any margins or any hollow shapes, then null.
	return inMarginClosestToEdgeHit || inHollowSmallestAreaHit || null
}

/** @public */
export function getTopSelectedIdUnderPoint(editor: Editor, point: Vec2d) {
	const { selectedShapes } = editor
	return selectedShapes
		.sort(sortByIndex)
		.findLast((shape) => editor.isPointInShape(shape, point, { hitInside: true, margin: 0 }))
}
