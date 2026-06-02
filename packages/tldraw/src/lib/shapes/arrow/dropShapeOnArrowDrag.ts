import {
	Editor,
	TLArrowShape,
	TLTextShape,
	VecLike,
	createShapeId,
	toRichText,
} from '@tldraw/editor'
import { startEditingShapeWithRichText } from '../../tools/SelectTool/selectHelpers'
import { createOrUpdateArrowBinding, getArrowTerminalsInPageSpace } from './shared'

/**
 * Drop a new text shape at the dragged arrow terminal and bind that terminal of the
 * in-flight arrow to the text's center. The text is centered on the terminal point and
 * its alignment is chosen from the arrow's direction (see {@link getTextAlignFromVecAngle}).
 * Ends the arrow drag and enters editing mode on the new text shape so the user can type
 * immediately.
 *
 * @param editor - The editor instance.
 * @param arrow - The arrow shape whose terminal is being dragged.
 * @param terminal - Which arrow terminal (`start` or `end`) to drop the text at and bind to.
 */
export function dropBoundTextShapeAtArrowTerminal(
	editor: Editor,
	arrow: TLArrowShape,
	terminal: 'start' | 'end'
) {
	const scale = editor.getResizeScaleFactor()
	const terminals = getArrowTerminalsInPageSpace(editor, arrow)
	const terminalPoint = terminals[terminal]
	const id = createShapeId()

	editor.run(() => {
		editor.createShape<TLTextShape>({
			id,
			type: 'text',
			x: terminalPoint.x,
			y: terminalPoint.y,
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

		const textAlign = getTextAlignFromVecAngle(terminals)
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

/**
 * Choose a text alignment for a label dropped on an arrow based on the arrow's direction,
 * so the label reads naturally relative to the way the arrow points. Arrows pointing
 * roughly rightward align to `start`, roughly leftward to `end`, and roughly vertical
 * arrows are centered (`middle`).
 *
 * @param terminals - The arrow's `start` and `end` terminals in page space.
 * @returns The text alignment to use for the dropped label.
 */
function getTextAlignFromVecAngle(terminals: {
	start: VecLike
	end: VecLike
}): TLTextShape['props']['textAlign'] {
	const { start, end } = terminals

	const angle = Math.atan2(end.y - start.y, end.x - start.x)

	if (angle >= -Math.PI / 3 && angle <= Math.PI / 3) {
		return 'start'
	} else if (angle > (2 * Math.PI) / 3 || angle < (-2 * Math.PI) / 3) {
		return 'end'
	} else {
		return 'middle'
	}
}
