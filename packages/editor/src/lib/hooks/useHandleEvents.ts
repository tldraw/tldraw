import { TLArrowShape, TLLineShape, TLShapeId } from '@tldraw/tlschema'
import * as React from 'react'
import { App } from '../app/Editor'
import { loopToHtmlElement, releasePointerCapture, setPointerCapture } from '../utils/dom'
import { getPointerInfo } from '../utils/svg'
import { useEditor } from './useEditor'

function getHandle(app: App, id: TLShapeId, handleId: string) {
	const shape = app.getShapeById<TLArrowShape | TLLineShape>(id)!
	const util = app.getShapeUtil(shape)
	const handles = util.handles(shape)
	return { shape, handle: handles.find((h) => h.id === handleId) }
}

export function useHandleEvents(id: TLShapeId, handleId: string) {
	const app = useEditor()

	return React.useMemo(() => {
		const onPointerDown = (e: React.PointerEvent) => {
			if ((e as any).isKilled) return

			// Must set pointer capture on an HTML element!
			const target = loopToHtmlElement(e.currentTarget)
			setPointerCapture(target, e)

			const { shape, handle } = getHandle(app, id, handleId)

			if (!handle) return

			app.dispatch({
				type: 'pointer',
				target: 'handle',
				handle,
				shape,
				name: 'pointer_down',
				...getPointerInfo(e, app.getContainer()),
			})
		}

		// Track the last screen point
		let lastX: number, lastY: number

		const onPointerMove = (e: React.PointerEvent) => {
			if ((e as any).isKilled) return
			if (e.clientX === lastX && e.clientY === lastY) return
			lastX = e.clientX
			lastY = e.clientY

			const { shape, handle } = getHandle(app, id, handleId)

			if (!handle) return

			app.dispatch({
				type: 'pointer',
				target: 'handle',
				handle,
				shape,
				name: 'pointer_move',
				...getPointerInfo(e, app.getContainer()),
			})
		}

		const onPointerUp = (e: React.PointerEvent) => {
			if ((e as any).isKilled) return

			const target = loopToHtmlElement(e.currentTarget)
			releasePointerCapture(target, e)

			const { shape, handle } = getHandle(app, id, handleId)

			if (!handle) return

			app.dispatch({
				type: 'pointer',
				target: 'handle',
				handle,
				shape,
				name: 'pointer_up',
				...getPointerInfo(e, app.getContainer()),
			})
		}

		const onPointerEnter = (e: React.PointerEvent) => {
			if ((e as any).isKilled) return

			const { shape, handle } = getHandle(app, id, handleId)

			if (!handle) return

			app.dispatch({
				type: 'pointer',
				target: 'handle',
				handle,
				shape,
				name: 'pointer_enter',
				...getPointerInfo(e, app.getContainer()),
			})
		}

		const onPointerLeave = (e: React.PointerEvent) => {
			if ((e as any).isKilled) return

			const { shape, handle } = getHandle(app, id, handleId)

			if (!handle) return

			app.dispatch({
				type: 'pointer',
				target: 'handle',
				handle,
				shape,
				name: 'pointer_leave',
				...getPointerInfo(e, app.getContainer()),
			})
		}

		return {
			onPointerDown,
			onPointerMove,
			onPointerUp,
			onPointerEnter,
			onPointerLeave,
		}
	}, [app, id, handleId])
}
