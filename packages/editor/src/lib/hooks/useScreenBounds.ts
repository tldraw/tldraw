import { throttle } from '@tldraw/utils'
import { useLayoutEffect } from 'react'
import { Box } from '../primitives/Box'
import { useEditor } from './useEditor'

export function useScreenBounds(ref: React.RefObject<HTMLElement>) {
	const editor = useEditor()

	useLayoutEffect(() => {
		let prevBounds = new Box()

		function updateScreenBounds() {
			const container = ref.current
			if (!container) return null

			const rect = container.getBoundingClientRect()

			const next = new Box(
				rect.left || rect.x,
				rect.top || rect.y,
				Math.max(rect.width, 1),
				Math.max(rect.height, 1)
			)

			if (prevBounds.equals(next)) return
			editor.updateViewportScreenBounds(next)
			prevBounds = next
		}

		// Set the initial bounds
		updateScreenBounds()

		// Everything else uses a debounced update...
		const updateBounds = throttle(updateScreenBounds, 200, {
			trailing: true,
		})

		// Rather than running getClientRects on every frame, we'll
		// run it once a second or when the window resizes.
		const interval = editor.timers.setInterval(updateBounds, 1000)
		window.addEventListener('resize', updateBounds)

		const resizeObserver = new ResizeObserver((entries) => {
			if (!entries[0].contentRect) return
			updateBounds()
		})

		const container = ref.current
		let scrollingParent: HTMLElement | Document | null = null

		if (container) {
			// When the container's size changes, update the bounds
			resizeObserver.observe(container)

			// When the container's nearest scrollable parent scrolls, update the bounds
			scrollingParent = getNearestScrollableContainer(container)
			scrollingParent.addEventListener('scroll', updateBounds)
		}

		return () => {
			clearInterval(interval)
			window.removeEventListener('resize', updateBounds)
			resizeObserver.disconnect()
			scrollingParent?.removeEventListener('scroll', updateBounds)
			updateBounds.cancel()
		}
	}, [editor, ref])
}

/*!
 * Author: excalidraw
 * MIT License: https://github.com/excalidraw/excalidraw/blob/master/LICENSE
 * https://github.com/excalidraw/excalidraw/blob/48c3465b19f10ec755b3eb84e21a01a468e96e43/packages/excalidraw/utils.ts#L600
 */
const getNearestScrollableContainer = (element: HTMLElement): HTMLElement | Document => {
	let parent = element.parentElement
	while (parent) {
		if (parent === document.body) {
			return document
		}
		const { overflowY } = window.getComputedStyle(parent)
		const hasScrollableContent = parent.scrollHeight > parent.clientHeight
		if (
			hasScrollableContent &&
			(overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
		) {
			return parent
		}
		parent = parent.parentElement
	}
	return document
}
