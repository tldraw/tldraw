import {
	Editor,
	ExtractShapeByProps,
	HALF_PI,
	richTextValidator,
	TLEventInfo,
	TLRichText,
	TLShape,
	TLShapeId,
	Vec,
	VecLike,
	approximately,
	pointInPolygon,
} from '@tldraw/editor'

/** @internal */
export function hasRichText(
	shape: TLShape
): shape is ExtractShapeByProps<{ richText: TLRichText }> {
	return 'richText' in shape.props && richTextValidator.isValid(shape.props.richText)
}
/**
 * Start editing a shape. Shapes with rich text, such as text, note, geo, or arrow shapes, can
 * optionally have all of their text selected; other editable shapes (such as frames) simply enter
 * the editing state.
 *
 * @param editor - The editor instance.
 * @param shapeOrId - The shape to start editing.
 * @param options - Options: selectAll or info (TLEventInfo)
 *
 * @public
 */
export function startEditingShapeWithRichText(
	editor: Editor,
	shapeOrId: TLShape | TLShapeId,
	options: { selectAll?: boolean; info?: TLEventInfo } = {}
) {
	const shape = typeof shapeOrId === 'string' ? editor.getShape(shapeOrId) : shapeOrId
	if (!shape) return

	if (!editor.canEditShape(shape)) return

	// Finish this shape and start editing the next one
	editor.setEditingShape(shape)
	editor.setCurrentTool('select.editing_shape', {
		...options.info,
		target: 'shape',
		shape: shape,
	})
	if (options.selectAll && hasRichText(shape)) {
		editor.emit('select-all-text', { shapeId: shape.id })
	}
}

/**
 * Whether a page point is inside the selection's rotated bounding box. The box returned by
 * `getSelectionRotatedPageBounds` is expressed in the rotated frame, so a plain `containsPoint`
 * on it is only meaningful when the selection rotation is zero.
 *
 * @internal
 */
export function isPointInRotatedSelectionBounds(editor: Editor, point: VecLike) {
	const selectionBounds = editor.getSelectionRotatedPageBounds()
	if (!selectionBounds) return false

	const selectionRotation = editor.getSelectionRotation()
	if (!selectionRotation) return selectionBounds.containsPoint(point)

	return pointInPolygon(
		point,
		selectionBounds.corners.map((c) => Vec.RotWith(c, selectionBounds.point, selectionRotation))
	)
}

/**
 * Whether a rotation is a multiple of 90 degrees. An exact `rotation % HALF_PI === 0` misses
 * page rotations accumulated through rotated parents, which land a few ulps off and silently
 * disable right-angle-only behavior such as bounds snapping.
 *
 * @internal
 */
export function isRightAngleRotation(rotation: number) {
	const turns = rotation / HALF_PI
	return approximately(turns, Math.round(turns))
}
