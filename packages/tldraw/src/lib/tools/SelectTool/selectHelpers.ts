import {
	Editor,
	ExtractShapeByProps,
	richTextValidator,
	StateNode,
	TLClickEventInfo,
	TLEventInfo,
	TLPointerEventInfo,
	TLRichText,
	TLShape,
	TLShapeId,
	Vec,
	VecLike,
	pointInPolygon,
} from '@tldraw/editor'

/** @internal */
export function hasRichText(
	shape: TLShape
): shape is ExtractShapeByProps<{ richText: TLRichText }> {
	return 'richText' in shape.props && richTextValidator.isValid(shape.props.richText)
}
/**
 * Start editing a shape that has rich text, such as text, note, geo, or arrow shapes.
 * This will enter the editing state for the shape and optionally select all the text.
 *
 * @param editor - The editor instance.
 * @param shapeOrId - The shape to start editing. This shape must have a richText property with a TLRichText value.
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

	if (!hasRichText(shape)) {
		throw new Error('Shape does not have rich text')
	}
	// Finish this shape and start editing the next one
	editor.setEditingShape(shape)
	editor.setCurrentTool('select.editing_shape', {
		...options.info,
		target: 'shape',
		shape: shape,
	})
	if (options.selectAll) {
		editor.emit('select-all-text', { shapeId: shape.id })
	}
}

/**
 * Start editing any editable shape. Shapes with rich text go through
 * `startEditingShapeWithRichText`; editable shapes without it (frame, video, embed) would
 * make that helper throw, so they enter the editing state directly.
 *
 * @internal
 */
export function startEditingShape(
	editor: Editor,
	shape: TLShape,
	options: { selectAll?: boolean; info?: TLEventInfo } = {}
) {
	if (!editor.canEditShape(shape)) return
	if (hasRichText(shape)) {
		startEditingShapeWithRichText(editor, shape, options)
		return
	}
	editor.setEditingShape(shape)
	editor.setCurrentTool('select.editing_shape', { ...options.info, target: 'shape', shape })
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
 * A shift or ctrl double click is toggling shapes in and out of the selection, so it must not also
 * act.
 *
 * @internal
 */
export function isPlainDoubleClickDown(editor: Editor, info: TLClickEventInfo) {
	return info.phase === 'down' && !info.ctrlKey && !info.shiftKey && !editor.inputs.getShiftKey()
}

/**
 * Defers a double click to pointer up: its 'down' phase arrives while the second press is still
 * held, and acting on it then steals a press that is about to become a drag (#9499).
 *
 * The replay carries the target the press resolved on entry. The double click's own target is the
 * raw canvas, and resolving it again at the release point misses a handle the press drifted off.
 *
 * Call `start` in `onEnter`, or a double click whose press became a drag replays on the next plain
 * click. Add new users to `deferredDoubleClick.test.ts`.
 *
 * @internal
 */
export class DeferredDoubleClick {
	private press = {} as TLPointerEventInfo
	private info: TLClickEventInfo | null = null

	constructor(private readonly state: StateNode) {}

	start(press: TLPointerEventInfo) {
		this.press = press
		this.info = null
	}

	defer(info: TLClickEventInfo) {
		if (isPlainDoubleClickDown(this.state.editor, info)) {
			this.info = info
		}
	}

	replay() {
		if (!this.info) return false
		const { parent } = this.state
		parent.transition('idle')
		parent.getCurrent()?.handleEvent(withPressTarget(this.info, this.press))
		return true
	}
}

// Only the target carries over: entry info can also hold state options such as onInteractionEnd
function withPressTarget(info: TLClickEventInfo, press: TLPointerEventInfo): TLClickEventInfo {
	switch (press.target) {
		case 'canvas':
			return { ...info, target: 'canvas', shape: undefined }
		case 'selection':
			return { ...info, target: 'selection', handle: press.handle, shape: undefined }
		case 'shape':
			return { ...info, target: 'shape', shape: press.shape }
		case 'handle':
			return { ...info, target: 'handle', shape: press.shape, handle: press.handle }
		case 'overlay':
			return { ...info, target: 'overlay', overlay: press.overlay, shape: undefined }
	}
}
