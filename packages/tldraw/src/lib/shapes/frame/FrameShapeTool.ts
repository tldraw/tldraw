import { BaseBoxShapeTool, TLShape, TLShapeId } from '@tldraw/editor'

/** @public */
export class FrameShapeTool extends BaseBoxShapeTool {
	static override id = 'frame'
	static override initial = 'idle'
	override shapeType = 'frame'

	override onCreate = (shape: TLShape | null): void => {
		if (!shape) return

		const bounds = this.editor.getShapePageBounds(shape)!
		const shapesToAddToFrame: TLShapeId[] = []
		const ancestorIds = this.editor.getShapeAncestors(shape).map((shape) => shape.id)

		this.editor.getCurrentPageShapes().map((pageShape) => {
			// We don't want to frame the frame itself
			if (pageShape.id === shape.id) return
			if (pageShape.isLocked) return

			const pageShapeBounds = this.editor.getShapePageBounds(pageShape)
			if (!pageShapeBounds) return

			// Frame shape encloses page shape
			if (bounds.contains(pageShapeBounds)) {
				if (canEnclose(pageShape, ancestorIds, shape)) {
					shapesToAddToFrame.push(pageShape.id)
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
