import { BaseBoxShapeTool, TLShape, TLShapeId } from '@tldraw/editor'

/** @public */
export class FrameShapeTool extends BaseBoxShapeTool {
	static override id = 'frame'
	static override initial = 'idle'
	override shapeType = 'frame'

	override onCreate(shape: TLShape | null): void {
		if (!shape) return

		const bounds = this.editor.getShapePageBounds(shape)!
		const shapesToAddToFrame: TLShapeId[] = []
		const ancestorIds = this.editor.getShapeAncestors(shape).map((shape) => shape.id)

		this.editor.getSortedChildIdsForParent(shape.parentId).map((siblingShapeId) => {
			const siblingShape = this.editor.getShape(siblingShapeId)
			if (!siblingShape) return
			// We don't want to frame the frame itself
			if (siblingShape.id === shape.id) return
			if (siblingShape.isLocked) return

			const pageShapeBounds = this.editor.getShapePageBounds(siblingShape)
			if (!pageShapeBounds) return

			// Frame shape encloses page shape
			if (bounds.contains(pageShapeBounds)) {
				if (canEnclose(siblingShape, ancestorIds, shape)) {
					shapesToAddToFrame.push(siblingShape.id)
				}
			}
		})

		this.editor.reparentShapes(shapesToAddToFrame, shape.id)

		if (this.editor.getInstanceState().isToolLocked) {
			this.editor.setCurrentTool('frame')
		} else {
			this.editor.setCurrentTool('select.idle')
		}
	}
}

/** @internal */
function canEnclose(shape: TLShape, ancestorIds: TLShapeId[], frame: TLShape): boolean {
	// We don't want to pull in shapes that are ancestors of the frame (can create a cycle)
	if (ancestorIds.includes(shape.id)) {
		return false
	}
	// We only want to pull in shapes that are siblings of the frame
	if (shape.parentId === frame.parentId) {
		return true
	}
	return false
}
