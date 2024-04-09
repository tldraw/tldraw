import { RESET_VALUE, computed, isUninitialized } from '@tldraw/state'
import { TLPageId, TLShapeId, isShape, isShapeId } from '@tldraw/tlschema'
import { Box } from '../../primitives/Box'
import { Editor } from '../Editor'

function getShapeCullingInfo(
	editor: Editor,
	id: TLShapeId,
	viewportPageBounds: Box
): { isCulled: false } | { isCulled: true; maskedPageBounds: Box | undefined } {
	const maskedPageBounds = editor.getShapeMaskedPageBounds(id)
	// if the shape is fully outside of its parent's clipping bounds...
	if (maskedPageBounds === undefined) return { isCulled: true, maskedPageBounds: undefined }

	// if the shape is fully outside of the viewport page bounds...
	const isCulled = !viewportPageBounds.includes(maskedPageBounds)
	return isCulled ? { isCulled, maskedPageBounds } : { isCulled }
}

/**
 * Incremental derivation of non visible shapes.
 * Non visible shapes are shapes outside of the viewport page bounds and shapes outside of parent's clipping bounds.
 *
 * @param editor - Instance of the tldraw Editor.
 * @returns Incremental derivation of non visible shapes.
 */
export const notVisibleShapes = (editor: Editor) => {
	console.log('shapes outside viewport derivation')
	const isCullingOffScreenShapes = Number.isFinite(editor.renderingBoundsMargin)
	const shapeHistory = editor.store.query.filterHistory('shape')
	let lastPageId: TLPageId | null = null
	let prevViewportPageBounds: Box

	function fromScratch(editor: Editor): Map<TLShapeId, Box | undefined> {
		console.log('from scratch')
		const shapes = editor.getCurrentPageShapeIds()
		lastPageId = editor.getCurrentPageId()
		const viewportPage = editor.getViewportPageBounds()
		prevViewportPageBounds = viewportPage.clone()
		const culledShapes = new Map<TLShapeId, Box | undefined>()
		shapes.forEach((id) => {
			const ci = getShapeCullingInfo(editor, id, viewportPage)
			if (ci.isCulled) {
				culledShapes.set(id, ci.maskedPageBounds)
			}
		})
		return culledShapes
	}
	return computed<Map<TLShapeId, Box | undefined>>(
		'getCulledShapes',
		(prevValue, lastComputedEpoch) => {
			if (!isCullingOffScreenShapes) return new Map<TLShapeId, Box | undefined>()

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
			console.log('incremental')
			const nextValue = new Map(prevValue)
			let isDirty = false
			const checkShapeCullingInfo = (id: TLShapeId) => {
				const ci = getShapeCullingInfo(editor, id, viewportPageBounds)
				if (ci.isCulled && !prevValue.has(id)) {
					nextValue.set(id, ci.maskedPageBounds)
					isDirty = true
				}
			}
			for (const changes of diff) {
				for (const record of Object.values(changes.added)) {
					if (isShape(record)) {
						checkShapeCullingInfo(record.id)
					}
				}

				for (const [_from, to] of Object.values(changes.updated)) {
					if (isShape(to)) {
						checkShapeCullingInfo(to.id)
					}
				}
				for (const id of Object.keys(changes.removed)) {
					if (isShapeId(id)) {
						const hasBeenDeleted = nextValue.delete(id)
						if (hasBeenDeleted) {
							isDirty = true
						}
					}
				}
			}

			return isDirty ? nextValue : prevValue
		}
	)
}
