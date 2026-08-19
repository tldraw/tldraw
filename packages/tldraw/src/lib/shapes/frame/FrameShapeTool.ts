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

	// We don't want to pull in shapes that are ancestors of the frame (can create a cycle)
	const ancestorIds = new Set(editor.getShapeAncestors(shape).map((shape) => shape.id))

	const enclosedShapeIds: TLShapeId[] = []
	for (const siblingShapeId of editor.getSortedChildIdsForParent(shape.parentId)) {
		// We don't want to frame the frame itself
		if (siblingShapeId === shape.id || ancestorIds.has(siblingShapeId)) continue
		const siblingShape = editor.getShape(siblingShapeId)
		if (!siblingShape || siblingShape.isLocked) continue

		const pageShapeBounds = editor.getShapePageBounds(siblingShape)
		// Frame shape encloses page shape
		if (pageShapeBounds && bounds.contains(pageShapeBounds)) {
			enclosedShapeIds.push(siblingShape.id)
		}
	}

	return enclosedShapeIds
}
