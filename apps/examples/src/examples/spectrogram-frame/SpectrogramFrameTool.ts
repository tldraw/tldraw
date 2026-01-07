import { BaseBoxShapeTool, TLShape, TLShapeId } from 'tldraw'

export class SpectrogramFrameTool extends BaseBoxShapeTool {
	static override id = 'spectrogram-frame'
	static override initial = 'idle'
	override shapeType = 'spectrogram-frame' as const

	override onCreate(shape: TLShape | null): void {
		if (!shape) return

		const bounds = this.editor.getShapePageBounds(shape)!
		const shapesToAddToFrame: TLShapeId[] = []
		const ancestorIds = this.editor.getShapeAncestors(shape).map((s) => s.id)

		// Check siblings to see if any should be auto-captured into this frame
		this.editor.getSortedChildIdsForParent(shape.parentId).map((siblingShapeId) => {
			const siblingShape = this.editor.getShape(siblingShapeId)
			if (!siblingShape) return
			// Don't frame the frame itself
			if (siblingShape.id === shape.id) return
			if (siblingShape.isLocked) return

			const pageShapeBounds = this.editor.getShapePageBounds(siblingShape)
			if (!pageShapeBounds) return

			// Check if this frame encloses the sibling
			if (bounds.contains(pageShapeBounds)) {
				if (canEnclose(siblingShape, ancestorIds, shape)) {
					shapesToAddToFrame.push(siblingShape.id)
				}
			}
		})

		this.editor.reparentShapes(shapesToAddToFrame, shape.id)

		if (this.editor.getInstanceState().isToolLocked) {
			this.editor.setCurrentTool('spectrogram-frame')
		} else {
			this.editor.setCurrentTool('select.idle')
		}
	}
}

function canEnclose(shape: TLShape, ancestorIds: TLShapeId[], frame: TLShape): boolean {
	// Don't pull in shapes that are ancestors of the frame (would create a cycle)
	if (ancestorIds.includes(shape.id)) {
		return false
	}
	// Only pull in shapes that are siblings of the frame
	if (shape.parentId === frame.parentId) {
		return true
	}
	return false
}
