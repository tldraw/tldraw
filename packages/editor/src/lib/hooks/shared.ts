import { TLShapeId } from '@tldraw/tlschema'
import { Editor } from '../editor/Editor'
import { TLPointerEventInfo, TLPointerEventName } from '../editor/types/event-types'
import { releasePointerCapture, setPointerCapture } from '../utils/dom'
import { getPointerInfo } from '../utils/svg'

// Reasonable defaults
const MAX_ZOOM_STEP = 10
const IS_DARWIN = /Mac|iPod|iPhone|iPad/.test(
	typeof window === 'undefined' ? 'node' : window.navigator.platform
)

// Adapted from https://stackoverflow.com/a/13650579
/** @public */
export function normalizeWheel(event: WheelEvent | React.WheelEvent<HTMLElement>) {
	let { deltaY, deltaX } = event
	let deltaZ = 0

	if (event.ctrlKey || event.altKey || event.metaKey) {
		const signY = Math.sign(event.deltaY)
		const absDeltaY = Math.abs(event.deltaY)

		let dy = deltaY

		if (absDeltaY > MAX_ZOOM_STEP) {
			dy = MAX_ZOOM_STEP * signY
		}

		deltaZ = dy / 100
	} else {
		if (event.shiftKey && !IS_DARWIN) {
			deltaX = deltaY
			deltaY = 0
		}
	}

	return { x: -deltaX, y: -deltaY, z: -deltaZ }
}

export const getShapePointerEventHandler = (
	editor: Editor,
	shapeId: TLShapeId,
	target: 'shape' | 'label',
	name: TLPointerEventName
) => {
	return (e: React.PointerEvent) => {
		if (name !== 'pointer_move' && editor.pageState.editingId === shapeId)
			(e as any).isKilled = true
		if ((e as any).isKilled) return

		switch (name) {
			case 'pointer_down': {
				if (e.button !== 0 && e.button !== 1 && e.button !== 2) return
				setPointerCapture(e.currentTarget, e)
				break
			}
			case 'pointer_up': {
				releasePointerCapture(e.currentTarget, e)
				break
			}
		}

		const shape = editor.getShapeById(shapeId)

		if (!shape) {
			console.error('Shape not found', shapeId)
			return
		}

		const info: TLPointerEventInfo & ({ target: 'shape' } | { target: 'label' }) = {
			type: 'pointer',
			target,
			shape,
			name,
			...getPointerInfo(e, editor.getContainer()),
		}

		editor.dispatch(info)
	}
}
