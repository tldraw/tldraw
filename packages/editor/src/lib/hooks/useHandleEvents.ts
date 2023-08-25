import { TLArrowShape, TLLineShape, TLShapeId } from '@tldraw/tlschema'
import * as React from 'react'
import { Editor } from '../editor/Editor'
import { loopToHtmlElement, releasePointerCapture, setPointerCapture } from '../utils/dom'
import { getPointerInfo } from '../utils/getPointerInfo'
import { useEditor } from './useEditor'

function getHandle(editor: Editor, id: TLShapeId, handleId: string) {
	const shape = editor.getShape<TLArrowShape | TLLineShape>(id)!
	const handles = editor.getShapeHandles(shape)!
	return { shape, handle: handles.find((h) => h.id === handleId) }
}

export function useHandleEvents(id: TLShapeId, handleId: string) {
	const editor = useEditor()

	return React.useMemo(() => {
		const onPointerDown = (e: React.PointerEvent) => {
			if ((e as any).isKilled) return

			// Must set pointer capture on an HTML element!
			const target = loopToHtmlElement(e.currentTarget)
			setPointerCapture(target, e)

			const { shape, handle } = getHandle(editor, id, handleId)

			if (!handle) return

			editor.dispatch({
				type: 'pointer',
				target: 'handle',
				handle,
				shape,
				name: 'pointer_down',
				...getPointerInfo(e),
			})
		}

		// Track the last screen point
		let lastX: number, lastY: number

		const onPointerMove = (e: React.PointerEvent) => {
			if ((e as any).isKilled) return
			if (e.clientX === lastX && e.clientY === lastY) return
			lastX = e.clientX
			lastY = e.clientY

			const { shape, handle } = getHandle(editor, id, handleId)

			if (!handle) return

			editor.dispatch({
				type: 'pointer',
				target: 'handle',
				handle,
				shape,
				name: 'pointer_move',
				...getPointerInfo(e),
			})
		}

		const onPointerUp = (e: React.PointerEvent) => {
			if ((e as any).isKilled) return

			const target = loopToHtmlElement(e.currentTarget)
			releasePointerCapture(target, e)

			const { shape, handle } = getHandle(editor, id, handleId)

			if (!handle) return

			editor.dispatch({
				type: 'pointer',
				target: 'handle',
				handle,
				shape,
				name: 'pointer_up',
				...getPointerInfo(e),
			})
		}

		return {
			onPointerDown,
			onPointerMove,
			onPointerUp,
		}
	}, [editor, id, handleId])
}
