import { TLShapeId } from '@tldraw/tlschema'
import { Editor } from '../editor/Editor'

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
