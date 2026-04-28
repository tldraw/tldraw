import { Editor, TLArrowShape, TLTextShape, createShapeId, toRichText } from '@tldraw/editor'
import { startEditingShapeWithRichText } from '../../tools/SelectTool/selectHelpers'
import { createOrUpdateArrowBinding, getArrowTerminalsInPageSpace } from './shared'

/**
 * Drop a new text shape at the dragged arrow terminal and bind the terminal of the
 * in-flight arrow to its center. Ends the arrow drag and enters editing mode
 * on the new text shape so the user can type immediately.
 */
export function dropBoundTextShapeAtArrowTerminal(
	editor: Editor,
	arrow: TLArrowShape,
	terminal: 'start' | 'end'
) {
	const scale = editor.getResizeScaleFactor()
	const center = getArrowTerminalsInPageSpace(editor, arrow)[terminal]
	const id = createShapeId()

	editor.run(() => {
		editor.createShape<TLTextShape>({
			id,
			type: 'text',
			x: center.x,
			y: center.y,
			props: {
				richText: toRichText(''),
				autoSize: true,
				scale,
			},
		})

		// Center the text on the arrow terminal; autoSize means we have to read the
		// resulting bounds to compute the offset, matching the text tool's placement logic.
		const shape = editor.getShape<TLTextShape>(id)
		if (shape) {
			const bounds = editor.getShapePageBounds(shape)
			if (bounds) {
				editor.updateShape({
					id,
					type: 'text',
					x: shape.x - bounds.width / 2,
					y: shape.y - bounds.height / 2,
				})
			}
		}

		createOrUpdateArrowBinding(editor, arrow.id, id, {
			terminal,
			normalizedAnchor: { x: 0.5, y: 0.5 },
			isPrecise: true,
			isExact: false,
			snap: 'center',
		})

		const textAlign = getTextAlignFromArrowAngle(editor, arrow)
		editor.updateShape({
			id,
			type: 'text',
			props: { textAlign },
		})
	})

	editor.complete()
	editor.select(id)
	startEditingShapeWithRichText(editor, id, { selectAll: true })
}

function getTextAlignFromArrowAngle(
	editor: Editor,
	arrow: TLArrowShape
): TLTextShape['props']['textAlign'] {
	const { start, end } = getArrowTerminalsInPageSpace(editor, arrow)

	const angle = Math.atan2(end.y - start.y, end.x - start.x)

	if (angle >= -Math.PI / 3 && angle <= Math.PI / 3) {
		return 'start'
	} else if (angle > (2 * Math.PI) / 3 || angle < (-2 * Math.PI) / 3) {
		return 'end'
	} else {
		return 'middle'
	}
}
