import { Editor, TLShapeId, TLShapePartial, exhaustiveSwitchError } from 'tldraw'
import { TLAiChange } from './types'

/**
 * Apply an AI change to the canvas.
 * This is the default apply function for the AI module.
 *
 * @param change - The change to apply
 * @param editor - The editor to apply the change to
 *
 * @public
 */
export function defaultApplyChange({ change, editor }: { change: TLAiChange; editor: Editor }) {
	if (editor.isDisposed) return

	try {
		switch (change.type) {
			case 'createShape': {
				const util = editor.getShapeUtil(change.shape.type)
				const shape = {
					...change.shape,
					opacity: 1,
					props: { ...util?.getDefaultProps(), ...change.shape.props },
				}
				editor.createShape(shape as TLShapePartial)
				break
			}
			case 'updateShape': {
				editor.updateShape(change.shape as TLShapePartial)
				break
			}
			case 'deleteShape': {
				editor.deleteShape(change.shapeId as TLShapeId)
				break
			}
			case 'createBinding': {
				editor.createBinding(change.binding)
				break
			}
			case 'updateBinding': {
				editor.updateBinding(change.binding)
				break
			}
			case 'deleteBinding': {
				editor.deleteBinding(change.bindingId)
				break
			}
			default:
				exhaustiveSwitchError(change)
		}
	} catch (e) {
		console.error('Error handling change:', e)
	}
}
