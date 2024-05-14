import {
	Editor,
	Mat,
	PI,
	PI2,
	SelectionCorner,
	SelectionEdge,
	TLFrameShape,
	TLResizeHandle,
	TLShape,
	TLShapeId,
	Vec,
	areAnglesCompatible,
	compact,
} from 'tldraw'

export type ResizingSnapshot = ReturnType<typeof getResizingSnapshot>
type ShapeSnapshot = ReturnType<typeof createShapeSnapshot>

export function getResizingSnapshot(editor: Editor, handle: TLResizeHandle) {
	const selectedShapeIds = editor.getSelectedShapeIds()
	const selectionRotation = editor.getSelectionRotation()
	const {
		inputs: { originPagePoint },
	} = editor

	const selectionBounds = editor.getSelectionRotatedPageBounds()!

	const dragHandlePoint = Vec.RotWith(
		selectionBounds.getHandlePoint(handle!),
		selectionBounds.point,
		selectionRotation
	)

	const cursorHandleOffset = Vec.Sub(originPagePoint, dragHandlePoint)

	const shapeSnapshots = new Map<TLShapeId, ShapeSnapshot>()

	const frames: { id: TLShapeId; children: TLShape[] }[] = []

	selectedShapeIds.forEach((id) => {
		const shape = editor.getShape(id)
		if (shape) {
			if (shape.type === 'frame') {
				frames.push({
					id,
					children: compact(
						editor.getSortedChildIdsForParent(shape).map((id) => editor.getShape(id))
					),
				})
			}
			shapeSnapshots.set(shape.id, createShapeSnapshot(editor, shape))
			if (editor.isShapeOfType<TLFrameShape>(shape, 'frame') && selectedShapeIds.length === 1)
				return
			editor.visitDescendants(shape.id, (descendantId) => {
				const descendent = editor.getShape(descendantId)
				if (descendent) {
					shapeSnapshots.set(descendent.id, createShapeSnapshot(editor, descendent))
					if (editor.isShapeOfType<TLFrameShape>(descendent, 'frame')) {
						return false
					}
				}
				return
			})
		}
	})

	const canShapesDeform = ![...shapeSnapshots.values()].some(
		(shape) =>
			!areAnglesCompatible(shape.pageRotation, selectionRotation) || shape.isAspectRatioLocked
	)

	return {
		shapeSnapshots,
		selectionBounds,
		cursorHandleOffset,
		selectionRotation,
		selectedShapeIds,
		canShapesDeform,
		initialSelectionPageBounds: editor.getSelectionPageBounds()!,
		frames,
	}
}

function createShapeSnapshot(editor: Editor, shape: TLShape) {
	const pageTransform = editor.getShapePageTransform(shape)!
	const util = editor.getShapeUtil(shape)

	return {
		shape,
		bounds: editor.getShapeGeometry(shape).bounds,
		pageTransform,
		pageRotation: Mat.Decompose(pageTransform!).rotation,
		isAspectRatioLocked: util.isAspectRatioLocked(shape),
	}
}

const ORDERED_SELECTION_HANDLES: (SelectionEdge | SelectionCorner)[] = [
	'top',
	'top_right',
	'right',
	'bottom_right',
	'bottom',
	'bottom_left',
	'left',
	'top_left',
]

export function rotateSelectionHandle(handle: SelectionEdge | SelectionCorner, rotation: number) {
	// first find out how many tau we need to rotate by
	rotation = rotation % PI2
	const numSteps = Math.round(rotation / (PI / 4))

	const currentIndex = ORDERED_SELECTION_HANDLES.indexOf(handle)
	return ORDERED_SELECTION_HANDLES[(currentIndex + numSteps) % ORDERED_SELECTION_HANDLES.length]
}
