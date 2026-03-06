import { Editor, Mat, TLShapePartial, createShapeId } from '@tldraw/editor'
import { createOrUpdateArrowBinding } from '../../shapes/arrow/shared'

const CONNECTED_SHAPE_MIN_GAP = 40
const CONNECTED_SHAPE_GAP_RATIO = 0.4

/**
 * Create a new geo shape connected to the selected shape by an arrow.
 *
 * @param editor - The editor instance.
 * @param direction - Direction to place the new shape.
 *
 * @internal
 */
export function createConnectedShape(editor: Editor, direction: 'left' | 'right' | 'up' | 'down') {
	if (editor.getIsReadonly()) return

	const sourceShape = editor.getOnlySelectedShape()
	if (!sourceShape) return
	if (!editor.isShapeOfType(sourceShape, 'geo')) return

	const sourceBounds = editor.getShapePageBounds(sourceShape)
	if (!sourceBounds) return

	const newW = sourceShape.props.w
	const newH = sourceShape.props.h + sourceShape.props.growY

	const { geo, color, fill, dash, size, font, scale } = sourceShape.props

	const geoStyleProps = { geo, color, fill, dash, size, font, scale }
	const arrowStyleProps = { color, dash, size, scale }

	const isHorizontal = direction === 'left' || direction === 'right'
	const relevantDimension = isHorizontal ? sourceBounds.w : sourceBounds.h
	const gap = Math.max(CONNECTED_SHAPE_MIN_GAP, relevantDimension * CONNECTED_SHAPE_GAP_RATIO)

	let pageX: number
	let pageY: number
	switch (direction) {
		case 'right':
			pageX = sourceBounds.maxX + gap
			pageY = sourceBounds.midY - newH / 2
			break
		case 'left':
			pageX = sourceBounds.minX - gap - newW
			pageY = sourceBounds.midY - newH / 2
			break
		case 'down':
			pageX = sourceBounds.midX - newW / 2
			pageY = sourceBounds.maxY + gap
			break
		case 'up':
			pageX = sourceBounds.midX - newW / 2
			pageY = sourceBounds.minY - gap - newH
			break
	}

	const parentTransform = editor.getShapeParentTransform(sourceShape)
	const localPoint = Mat.applyToPoint(Mat.Inverse(parentTransform), { x: pageX, y: pageY })

	const newShapeId = createShapeId()
	const arrowId = createShapeId()

	const shapes: TLShapePartial[] = [
		{
			id: newShapeId,
			type: 'geo',
			x: localPoint.x,
			y: localPoint.y,
			parentId: sourceShape.parentId,
			props: {
				w: newW,
				h: newH,
				...geoStyleProps,
			},
		},
		{
			id: arrowId,
			type: 'arrow',
			parentId: sourceShape.parentId,
			props: arrowStyleProps,
		},
	]

	editor.markHistoryStoppingPoint('create connected shape')
	editor.run(() => {
		editor.createShapes(shapes)

		createOrUpdateArrowBinding(editor, arrowId, sourceShape.id, {
			terminal: 'start',
			normalizedAnchor: { x: 0.5, y: 0.5 },
			isExact: false,
			isPrecise: false,
			snap: 'none',
		})
		createOrUpdateArrowBinding(editor, arrowId, newShapeId, {
			terminal: 'end',
			normalizedAnchor: { x: 0.5, y: 0.5 },
			isExact: false,
			isPrecise: false,
			snap: 'none',
		})
	})

	editor.select(newShapeId)
}
