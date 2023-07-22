import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { Editor } from '../editor/Editor'
import { ShapeUtil } from '../editor/shapes/ShapeUtil'
import { Vec2d } from '../primitives/Vec2d'
import { Group2d } from '../primitives/geometry/Group2d'
import { pointInPolygon } from '../primitives/utils'

/** @public */
export function getHoveredShapeId(editor: Editor) {
	const {
		inputs: { currentPagePoint },
		renderingShapes,
		selectedIds,
		focusLayerId,
	} = editor
	let i = -Infinity
	let nextHoveredId = null as TLShapeId | null
	for (const { id, index } of renderingShapes) {
		if (id === focusLayerId) continue
		if (editor.isPointInShape(id, currentPagePoint)) {
			if (index > i) {
				i = index
				nextHoveredId = id
			}
		}
	}

	if (nextHoveredId) {
		const shape = editor.getShape(nextHoveredId)!

		const hoveringShape = editor.getOutermostSelectableShape(
			shape,
			(parent) => !selectedIds.includes(parent.id)
		)
		if (hoveringShape.id !== focusLayerId) {
			nextHoveredId = hoveringShape.id
		}
	}

	return nextHoveredId
}

/** @public */
export function updateHoveredId(editor: Editor) {
	const nextHoveredId = getHoveredShapeId(editor)
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
		exact?: boolean
		filter?: (shape: TLShape, util: ShapeUtil) => boolean
	}
): TLShape | null {
	// are we inside of a shape but not hovering it?
	const { zoomLevel, renderingShapes, sortedShapesArray } = editor
	const { filter, exact, hitInside } = opts

	let smallestArea = Infinity
	let hit: TLShape | null = null

	const shapesToCheck = renderingShapes
		.filter((s) => {
			const pageMask = editor.getPageMask(s.shape)
			if (pageMask && !pointInPolygon(point, pageMask)) return false
			if (filter) return filter(s.shape, s.util)
			return true
		})
		.map((s) => s.shape)
		// .sort(sortByIndex)
		.sort((a, b) => (sortedShapesArray.indexOf(a) > sortedShapesArray.indexOf(b) ? 1 : 0)) // yikes

	for (const shape of shapesToCheck) {
		let geometry = editor.getGeometry(shape)
		if (geometry instanceof Group2d) {
			geometry = geometry.children[0]
		}

		const pointInShapeSpace = editor.getPointInShapeSpace(shape, point)
		const distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)

		if (!geometry.isClosed) {
			if (distance > geometry.margin / zoomLevel) continue
		} else {
			if (distance > (exact ? 0 : geometry.margin / zoomLevel)) continue
		}

		if (shape.type === 'frame') {
			// Once we hit a frame, stop selecting; i.e. don't select
			// the frame but also don't select anything behind it
			return hit ?? null
		}

		if (geometry.isFilled || !geometry.isClosed) {
			return shape
		}

		const { area } = geometry
		if (area < smallestArea) {
			smallestArea = area
			hit = shape
		}
	}

	return hit ?? null
}
