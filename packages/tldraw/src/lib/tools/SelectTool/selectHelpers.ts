import {
	Editor,
	ExtractShapeByProps,
	richTextValidator,
	TLEventInfo,
	TLOverlay,
	TLRichText,
	TLShape,
	TLShapeId,
} from '@tldraw/editor'
import { TLSelectionForegroundOverlay } from '../../overlays/SelectionForegroundOverlayUtil'

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

const SELECTION_HANDLE_OVERLAY_TYPES = new Set(['resize_handle', 'rotate_handle', 'mobile_rotate'])

/** Whether an overlay is one of the selection-box resize/rotate handles. */
export function isSelectionHandleOverlay(
	overlay: TLOverlay
): overlay is TLSelectionForegroundOverlay {
	return SELECTION_HANDLE_OVERLAY_TYPES.has(overlay.props.overlayType as string)
}

/** The selection-box handle overlay under the pointer, if any. */
export function getHitSelectionHandleOverlay(editor: Editor) {
	const hitOverlay = editor.overlays.getOverlayAtPoint(
		editor.inputs.getCurrentPagePoint(),
		editor.getHitTestMargin()
	)
	return hitOverlay && isSelectionHandleOverlay(hitOverlay) ? hitOverlay : undefined
}

/**
 * Hands control back to whatever started the interaction, if anything did. Returns true when
 * it did so, so the caller skips its own idle transition. With `onlyIfToolLocked`, a string
 * `onInteractionEnd` is only honored while tool lock is on; otherwise the creating tool stays
 * active and the caller falls through to its default exit.
 */
export function returnToInteractionEnd(
	editor: Editor,
	onInteractionEnd: string | (() => void) | undefined,
	info: object = {},
	{ onlyIfToolLocked = false }: { onlyIfToolLocked?: boolean } = {}
): boolean {
	if (!onInteractionEnd) return false
	if (typeof onInteractionEnd === 'string') {
		if (onlyIfToolLocked && !editor.getInstanceState().isToolLocked) return false
		editor.setCurrentTool(onInteractionEnd, info)
	} else {
		onInteractionEnd()
	}
	return true
}
