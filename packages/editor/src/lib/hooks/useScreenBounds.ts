import { debounce } from '@tldraw/utils'
import throttle from 'lodash.throttle'
import { useLayoutEffect } from 'react'
import { Box } from '../primitives/Box'
import { useEditor } from './useEditor'

export function useScreenBounds(ref: React.RefObject<HTMLElement>) {
	const editor = useEditor()

	useLayoutEffect(() => {
		const updateScreenBounds = () => {
			const container = ref.current
			if (!container) return null

			const rect = container.getBoundingClientRect()

			editor.updateViewportScreenBounds(
				new Box(
					rect.left || rect.x,
					rect.top || rect.y,
					Math.max(rect.width, 1),
					Math.max(rect.height, 1)
				)
			)
		}

		const updateBounds = throttle(updateScreenBounds, 200, {
			trailing: true,
		})

		updateScreenBounds()

		// Rather than running getClientRects on every frame, we'll
		// run it once a second or when the window resizes.
		const interval = setInterval(updateBounds, 1000)
		window.addEventListener('resize', updateBounds)

		const resizeObserver = new ResizeObserver(
			debounce((entries) => {
				if (!entries[0].contentRect) return
				updateScreenBounds()
			}, 250)
		)

		const container = ref.current
		if (container) {
			resizeObserver.observe(container)
		}

		return () => {
			clearInterval(interval)
			window.removeEventListener('resize', updateBounds)
			window.removeEventListener('scroll', updateBounds)
			resizeObserver.disconnect()
		}
	}, [editor, ref])
}
