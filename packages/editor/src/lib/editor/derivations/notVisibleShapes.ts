import { RESET_VALUE, computed, isUninitialized } from '@tldraw/state'
import { TLPageId, TLShapeId, isShape, isShapeId } from '@tldraw/tlschema'
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
	const isCullingOffScreenShapes = Number.isFinite(editor.renderingBoundsMargin)
	const shapeHistory = editor.store.query.filterHistory('shape')
	let lastPageId: TLPageId | null = null
	let prevViewportPageBounds: Box

	function fromScratch(editor: Editor): Set<TLShapeId> {
		const shapes = editor.getCurrentPageShapeIds()
		lastPageId = editor.getCurrentPageId()
		const viewportPageBounds = editor.getViewportPageBounds()
		prevViewportPageBounds = viewportPageBounds.clone()
		const notVisibleShapes = new Set<TLShapeId>()
		shapes.forEach((id) => {
			if (isShapeNotVisible(editor, id, viewportPageBounds)) {
				notVisibleShapes.add(id)
			}
		})
		return notVisibleShapes
	}
	return computed<Set<TLShapeId>>('getCulledShapes', (prevValue, lastComputedEpoch) => {
		if (!isCullingOffScreenShapes) return new Set<TLShapeId>()

		if (isUninitialized(prevValue)) {
			return fromScratch(editor)
		}
		const diff = shapeHistory.getDiffSince(lastComputedEpoch)

		if (diff === RESET_VALUE) {
			return fromScratch(editor)
		}

		const currentPageId = editor.getCurrentPageId()
		if (lastPageId !== currentPageId) {
			return fromScratch(editor)
		}
		const viewportPageBounds = editor.getViewportPageBounds()
		if (!prevViewportPageBounds || !viewportPageBounds.equals(prevViewportPageBounds)) {
			return fromScratch(editor)
		}

		let nextValue = null as null | Set<TLShapeId>
		const addId = (id: TLShapeId) => {
			// Already added
			if (prevValue.has(id)) return
			if (!nextValue) nextValue = new Set(prevValue)
			nextValue.add(id)
		}
		const deleteId = (id: TLShapeId) => {
			// No need to delete since it's not there
			if (!prevValue.has(id)) return
			if (!nextValue) nextValue = new Set(prevValue)
			nextValue.delete(id)
		}

		for (const changes of diff) {
			for (const record of Object.values(changes.added)) {
				if (isShape(record)) {
					const isCulled = isShapeNotVisible(editor, record.id, viewportPageBounds)
					if (isCulled) {
						addId(record.id)
					}
				}
			}

			for (const [_from, to] of Object.values(changes.updated)) {
				if (isShape(to)) {
					const isCulled = isShapeNotVisible(editor, to.id, viewportPageBounds)
					if (isCulled) {
						addId(to.id)
					} else {
						deleteId(to.id)
					}
				}
			}
			for (const id of Object.keys(changes.removed)) {
				if (isShapeId(id)) {
					deleteId(id)
				}
			}
		}

		return nextValue ?? prevValue
	})
}
