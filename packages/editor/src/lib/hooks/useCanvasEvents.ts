import { RefObject, useEffect } from 'react'
import {
	preventDefault,
	releasePointerCapture,
	setPointerCapture,
	stopEventPropagation,
} from '../utils/dom'
import { getPointerInfo } from '../utils/getPointerInfo'
import { useEditor } from './useEditor'

export function useCanvasEvents(ref: RefObject<HTMLElement>) {
	const editor = useEditor()

	useEffect(() => {
		const elm = ref.current
		if (!elm) return

		// Track the last screen point
		let lastX: number, lastY: number

		function onPointerDown(e: PointerEvent) {
			if ((e as any).isKilled) return

			if (e.button === 2) {
				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'right_click',
					...getPointerInfo(e),
				})
				return
			}

			if (e.button !== 0 && e.button !== 1 && e.button !== 5) return

			setPointerCapture(e.currentTarget as HTMLDivElement, e)

			editor.dispatch({
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_down',
				...getPointerInfo(e),
			})

			if (editor.getOpenMenus().length > 0) {
				editor.updateInstanceState({
					openMenus: [],
				})

				document.body.click()
				editor.getContainer().focus()
			}
		}

		function onPointerMove(e: PointerEvent) {
			if ((e as any).isKilled) return

			if (e.clientX === lastX && e.clientY === lastY) return
			lastX = e.clientX
			lastY = e.clientY

			editor.dispatch({
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_move',
				...getPointerInfo(e),
			})
		}

		function onPointerUp(e: PointerEvent) {
			if ((e as any).isKilled) return
			if (e.button !== 0 && e.button !== 1 && e.button !== 2 && e.button !== 5) return
			lastX = e.clientX
			lastY = e.clientY

			releasePointerCapture(e.currentTarget as HTMLDivElement, e)

			editor.dispatch({
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_up',
				...getPointerInfo(e),
			})
		}

		function onPointerEnter(e: PointerEvent) {
			if ((e as any).isKilled) return
			if (editor.getInstanceState().isPenMode && e.pointerType !== 'pen') return
			const canHover = e.pointerType === 'mouse' || e.pointerType === 'pen'
			editor.updateInstanceState({ isHoveringCanvas: canHover ? true : null })
		}

		function onPointerLeave(e: PointerEvent) {
			if ((e as any).isKilled) return
			if (editor.getInstanceState().isPenMode && e.pointerType !== 'pen') return
			const canHover = e.pointerType === 'mouse' || e.pointerType === 'pen'
			editor.updateInstanceState({ isHoveringCanvas: canHover ? false : null })
		}

		function onTouchStart(e: TouchEvent) {
			;(e as any).isKilled = true
			// todo: investigate whether this effects keyboard shortcuts
			// god damn it, but necessary for long presses to open the context menu
			document.body.click()
			preventDefault(e)
		}

		function onTouchEnd(e: TouchEvent) {
			;(e as any).isKilled = true
			if (
				(e.target as HTMLElement).tagName !== 'A' &&
				(e.target as HTMLElement).tagName !== 'TEXTAREA'
			) {
				preventDefault(e)
			}
		}

		function onDragOver(e: DragEvent) {
			preventDefault(e)
		}

		async function onDrop(e: DragEvent) {
			preventDefault(e)
			if (!e.dataTransfer?.files?.length) return

			const files = Array.from(e.dataTransfer.files)

			await editor.putExternalContent({
				type: 'files',
				files,
				point: editor.screenToPage({ x: e.clientX, y: e.clientY }),
				ignoreParent: false,
			})
		}

		function onClick(e: MouseEvent) {
			stopEventPropagation(e)
		}

		elm.addEventListener('pointerdown', onPointerDown)
		elm.addEventListener('pointermove', onPointerMove)
		elm.addEventListener('pointerup', onPointerUp)
		elm.addEventListener('pointerenter', onPointerEnter)
		elm.addEventListener('pointerleave', onPointerLeave)
		elm.addEventListener('touchstart', onTouchStart)
		elm.addEventListener('touchend', onTouchEnd)
		elm.addEventListener('dragover', onDragOver)
		elm.addEventListener('drop', onDrop)
		elm.addEventListener('click', onClick)

		return () => {
			elm.removeEventListener('pointerdown', onPointerDown)
			elm.removeEventListener('pointermove', onPointerMove)
			elm.removeEventListener('pointerup', onPointerUp)
			elm.removeEventListener('pointerenter', onPointerEnter)
			elm.removeEventListener('pointerleave', onPointerLeave)
			elm.removeEventListener('touchstart', onTouchStart)
			elm.removeEventListener('touchend', onTouchEnd)
			elm.removeEventListener('dragover', onDragOver)
			elm.removeEventListener('drop', onDrop)
			elm.removeEventListener('click', onClick)
		}
	}, [ref, editor])
}
