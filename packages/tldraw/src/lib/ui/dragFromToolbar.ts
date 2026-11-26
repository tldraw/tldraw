import { Editor, TLPointerEventInfo, TLShapeId, createShapeId, warnOnce } from '@tldraw/editor'

/**
 * Options for {@link onDragFromToolbarToCreateShape}.
 * @public
 */
export interface OnDragFromToolbarToCreateShapesOpts {
	/**
	 * Create the shape being dragged. You don't need to worry about positioning it, as it'll be
	 * immediately updated with the correct position.
	 */
	createShape(id: TLShapeId): void
	/**
	 * Called once the drag interaction has finished.
	 */
	onDragEnd?(id: TLShapeId): void
	/**
	 * The id of the toolbar tool to keep highlighted while dragging. Defaults to the created shape's
	 * type. Set this when the dragged shape's type differs from the tool it's dragged from — for
	 * example, dragging a `draw` shape out from the select tool.
	 */
	maskedToolId?: string
}

/**
 * A helper method to use in {@link tldraw#TLUiToolItem.onDragStart} to create a shape by dragging it from
 * the toolbar.
 * @public
 */
export function onDragFromToolbarToCreateShape(
	editor: Editor,
	info: TLPointerEventInfo,
	opts: OnDragFromToolbarToCreateShapesOpts
) {
	// Creating shapes is a no-op in read-only mode, so there's nothing to drag.
	if (editor.getIsReadonly()) return

	const { x, y } = editor.inputs.getCurrentPagePoint()

	const stoppingPoint = editor.markHistoryStoppingPoint('drag shape tool')

	const id = createShapeId()
	opts.createShape(id)
	const shape = editor.getShape(id)
	if (!shape) {
		// We've already bailed on read-only above, so reaching here means an
		// editable context where createShape didn't take effect (for example it was
		// blocked by a side effect). Nothing has changed yet, so there's nothing to
		// roll back—warn for visibility and return to idle instead of entering a
		// translate session with no shape.
		warnOnce('onDragFromToolbarToCreateShape: createShape did not create a shape, ignoring drag.')
		editor.setCurrentTool('select.idle')
		return
	}

	const { w, h } = editor.getShapePageBounds(id)!
	editor.updateShape({ id, type: shape.type, x: x - w / 2, y: y - h / 2 })
	editor.select(id)

	editor.setCurrentTool('select.translating', {
		...info,
		target: 'shape',
		shape: editor.getShape(id),
		isCreating: true,
		creatingMarkId: stoppingPoint,
		onCreate() {
			editor.setCurrentTool('select.idle')
			editor.select(id)
			opts.onDragEnd?.(id)
		},
	})

	editor.getCurrentTool().setCurrentToolIdMask(opts.maskedToolId ?? shape.type)
}
