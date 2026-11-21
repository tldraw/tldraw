import { throttle } from '@tldraw/utils'
import { useLayoutEffect } from 'react'
import { getOwnerWindow } from '../exports/domUtils'
import { useEditor } from './useEditor'

export function useScreenBounds(ref: React.RefObject<HTMLElement | null>) {
	const editor = useEditor()

	useLayoutEffect(() => {
		// Everything else uses a debounced update...
		const updateBounds = throttle(
			() => {
				if (!ref.current) return
				// If the container's document has been torn down (e.g. an iframe
				// being removed), there's nothing to measure — bail.
				if (!ref.current.ownerDocument.body) return
				editor.updateViewportScreenBounds(ref.current)
			},
			200,
			{
				trailing: true,
			}
		)

		// Rather than running getClientRects on every frame, we'll
		// run it once a second or when the window resizes.
		const interval = editor.timers.setInterval(updateBounds, 1000)
		const win = editor.getContainerWindow()
		win.addEventListener('resize', updateBounds)

		const resizeObserver = new ResizeObserver((entries) => {
			if (!entries[0].contentRect) return
			updateBounds()
		})

		const container = ref.current
		let scrollingAncestors: Array<HTMLElement | Document> = []

		if (container) {
			// When the container's size changes, update the bounds
			resizeObserver.observe(container)

			scrollingAncestors = getScrollableAncestors(container)
			for (const ancestor of scrollingAncestors) {
				ancestor.addEventListener('scroll', updateBounds)
			}
		}

		return () => {
			clearInterval(interval)
			win.removeEventListener('resize', updateBounds)
			resizeObserver.disconnect()
			for (const ancestor of scrollingAncestors) {
				ancestor.removeEventListener('scroll', updateBounds)
			}
			updateBounds.cancel()
		}
	}, [editor, ref])
}

/*!
 * Author: excalidraw
 * MIT License: https://github.com/excalidraw/excalidraw/blob/master/LICENSE
 * https://github.com/excalidraw/excalidraw/blob/48c3465b19f10ec755b3eb84e21a01a468e96e43/packages/excalidraw/utils.ts#L600
 */
export function getScrollableAncestors(element: HTMLElement): Array<HTMLElement | Document> {
	const doc = element.ownerDocument
	const win = getOwnerWindow(element)
	const ancestors: Array<HTMLElement | Document> = []
	let parent = element.parentElement
	while (parent && parent !== doc.body) {
		const { overflowX, overflowY } = win.getComputedStyle(parent)
		const hasScrollableContent =
			(parent.scrollWidth > parent.clientWidth && isScrollableOverflow(overflowX)) ||
			(parent.scrollHeight > parent.clientHeight && isScrollableOverflow(overflowY))
		if (hasScrollableContent) {
			ancestors.push(parent)
		}
		parent = parent.parentElement
	}
	ancestors.push(doc)
	return ancestors
}

function isScrollableOverflow(overflow: string) {
	return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay'
}
