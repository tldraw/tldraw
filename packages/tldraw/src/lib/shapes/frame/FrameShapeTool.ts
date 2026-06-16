import { BaseBoxShapeTool, Editor, TLShape, TLShapeId } from '@tldraw/editor'

/** @public */
export class FrameShapeTool extends BaseBoxShapeTool {
	static override id = 'frame'
	static override initial = 'idle'
	override shapeType = 'frame' as const

	override onCreate(shape: TLShape | null): void {
		if (!shape) return

		this.editor.reparentShapes(getEnclosedShapeIds(this.editor, shape), shape.id)

		if (this.editor.getInstanceState().isToolLocked) {
			this.editor.setCurrentTool('frame')
		} else {
			this.editor.setCurrentTool('select.idle')
		}
	}
}

/**
 * Get the ids of the sibling shapes that a frame would enclose at its current page bounds.
 *
 * @internal
 */
export function getEnclosedShapeIds(editor: Editor, shape: TLShape): TLShapeId[] {
	const bounds = editor.getShapePageBounds(shape)
	if (!bounds) return []

	const enclosedShapeIds: TLShapeId[] = []
	const ancestorIds = editor.getShapeAncestors(shape).map((shape) => shape.id)

	editor.getSortedChildIdsForParent(shape.parentId).map((siblingShapeId) => {
		const siblingShape = editor.getShape(siblingShapeId)
		if (!siblingShape) return
		// We don't want to frame the frame itself
		if (siblingShape.id === shape.id) return
		if (siblingShape.isLocked) return

		const pageShapeBounds = editor.getShapePageBounds(siblingShape)
		if (!pageShapeBounds) return

		// Frame shape encloses page shape
		if (bounds.contains(pageShapeBounds)) {
			if (canEnclose(siblingShape, ancestorIds, shape)) {
				enclosedShapeIds.push(siblingShape.id)
			}
		}
	})

	return enclosedShapeIds
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
