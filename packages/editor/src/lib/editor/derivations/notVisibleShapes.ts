import { computed, isUninitialized } from '@tldraw/state'
import { TLShapeId } from '@tldraw/tlschema'
import { Box } from '../../primitives/Box'
import { Editor } from '../Editor'

function isShapeNotVisible(editor: Editor, id: TLShapeId, viewportPageBounds: Box): boolean {
	const maskedPageBounds = editor.getShapeMaskedPageBounds(id)
	// if the shape is fully outside of its parent's clipping bounds...
	if (maskedPageBounds === undefined) return true

	// if the shape is fully outside of the viewport page bounds...
	return !viewportPageBounds.includes(maskedPageBounds)
}

/**
 * Incremental derivation of not visible shapes.
 * Non visible shapes are shapes outside of the viewport page bounds and shapes outside of parent's clipping bounds.
 *
 * @param editor - Instance of the tldraw Editor.
 * @returns Incremental derivation of non visible shapes.
 */
export const notVisibleShapes = (editor: Editor) => {
	function fromScratch(editor: Editor): Set<TLShapeId> {
		const shapes = editor.getCurrentPageShapeIds()
		const viewportPageBounds = editor.getViewportPageBounds()
		const notVisibleShapes = new Set<TLShapeId>()
		shapes.forEach((id) => {
			if (isShapeNotVisible(editor, id, viewportPageBounds)) {
				notVisibleShapes.add(id)
			}
		})
		return notVisibleShapes
	}
	return computed<Set<TLShapeId>>('getCulledShapes', (prevValue) => {
		if (isUninitialized(prevValue)) {
			return fromScratch(editor)
		}

		const nextValue = fromScratch(editor)

		if (prevValue.size !== nextValue.size) return nextValue
		for (const prev of prevValue) {
			if (!nextValue.has(prev)) {
				return nextValue
			}
		}
		return prevValue
	})
}
