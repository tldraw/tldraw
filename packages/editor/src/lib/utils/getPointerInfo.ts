import { Editor } from '../editor/Editor'
import { isAccelKey } from './keyboard'

/** @public */
export function getPointerInfo(editor: Editor, e: React.PointerEvent | PointerEvent) {
	editor.markEventAsHandled(e)

	return {
		point: {
			x: e.clientX,
			y: e.clientY,
			z: e.pressure,
		},
		shiftKey: e.shiftKey,
		altKey: e.altKey,
		ctrlKey: e.metaKey || e.ctrlKey,
		metaKey: e.metaKey,
		accelKey: isAccelKey(e),
		pointerId: e.pointerId,
		button: e.button,
		isPen: e.pointerType === 'pen',
	}
}
