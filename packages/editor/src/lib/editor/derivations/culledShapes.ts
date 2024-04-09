import { computed, isUninitialized, RESET_VALUE } from '@tldraw/state'
import { isShape, isShapeId, TLPageId, TLShapeId } from '@tldraw/tlschema'
import { Box } from '../../primitives/Box'
import { Editor } from '../Editor'

export function culledShapes(editor: Editor) {
	function getShapeCullingInfo(
		id: TLShapeId,
		selectedShapeIds: TLShapeId[],
		editingId: TLShapeId | null,
		viewportPageBounds: Box
	): boolean {
		if (editingId === id) return false
		const maskedPageBounds = editor.getShapeMaskedPageBounds(id)
		// if the shape is fully outside of its parent's clipping bounds...
		if (maskedPageBounds === undefined) return true
		// We don't cull selected shapes
		if (selectedShapeIds.includes(id)) return false
		// the shape is outside of the expanded viewport bounds...
		return !viewportPageBounds.includes(maskedPageBounds)
	}

	const isCullingOffScreenShapes = Number.isFinite(editor.renderingBoundsMargin)

	const shapeHistory = editor.store.query.filterHistory('shape')
	let lastPageId: TLPageId | null = null
	let prevBounds: Box

	function fromScratch(editor: Editor): Set<TLShapeId> {
		const bounds = editor.getViewportPageBounds()
		prevBounds = bounds.clone()
		lastPageId = editor.getCurrentPageId()
		const shapes = editor.getCurrentPageShapeIds()
		const culledShapes = new Set<TLShapeId>()
		const selectedShapeIds = editor.getSelectedShapeIds()
		const editingId = editor.getEditingShapeId()
		shapes.forEach((id) => {
			if (getShapeCullingInfo(id, selectedShapeIds, editingId, bounds)) {
				culledShapes.add(id)
			}
		})
		return culledShapes
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
		const renderingBoundsExpanded = editor.getViewportPageBounds()
		if (!prevBounds || !renderingBoundsExpanded.equals(prevBounds)) {
			return fromScratch(editor)
		}
		const selectedShapeIds = editor.getSelectedShapeIds()
		const editingId = editor.getEditingShapeId()
		const nextValue = new Set(prevValue)
		let isDirty = false
		const checkShapeCullingInfo = (id: TLShapeId) => {
			if (
				getShapeCullingInfo(id, selectedShapeIds, editingId, renderingBoundsExpanded) &&
				!prevValue.has(id)
			) {
				nextValue.add(id)
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
					if (nextValue.delete(id)) {
						isDirty = true
					}
				}
			}
		}

		return isDirty ? nextValue : prevValue
	})
}
