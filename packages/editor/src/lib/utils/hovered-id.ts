import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { Editor } from '../editor/Editor'
import { ShapeUtil } from '../editor/shapes/ShapeUtil'
import { Group2d } from '../primitives/geometry/Group2d'
import { sortByIndex } from './reordering/reordering'

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
		if (editor.isPointInShape(id, currentPagePoint, false, false)) {
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

/** @public */
export function getSmallestShapeContainingCurrentPagePoint(
	editor: Editor,
	filter?: (shape: TLShape, util: ShapeUtil) => boolean
): TLShape | null {
	// are we inside of a shape but not hovering it?
	const {
		zoomLevel,
		renderingShapes,
		inputs: { currentPagePoint },
	} = editor

	let smallestArea = Infinity
	let hit: TLShape | null = null

	let state = 'not-filled' as 'not-filled' | 'filled'

	const shapesToCheck = (
		filter ? renderingShapes.filter((s) => filter(s.shape, s.util)) : renderingShapes
	)
		.map((s) => s.shape)
		.sort(sortByIndex)

	for (const shape of shapesToCheck) {
		let geometry = editor.getGeometry(shape)
		if (geometry instanceof Group2d) {
			geometry = geometry.children[0]
		}

		const pointInShapeSpace = editor.getPointInShapeSpace(shape, currentPagePoint)
		const distance = geometry.distanceToPoint(pointInShapeSpace, true)

		if (!geometry.isClosed) {
			if (distance > geometry.margin / zoomLevel) continue
		} else {
			if (distance > 0) continue
		}

		if (state === 'not-filled' && (geometry.isFilled || !geometry.isClosed)) {
			state = 'filled'
		}

		if (state === 'filled') {
			if (geometry.isFilled || !geometry.isClosed) {
				hit = shape
			}
			continue
		} else {
			const { area } = geometry
			if (area < smallestArea) {
				smallestArea = area
				hit = shape
			}
		}
	}

	return hit ?? null
}
