import throttle from 'lodash.throttle'
import { useLayoutEffect } from 'react'
import { useEditor } from './useEditor'

export function useScreenBounds() {
	const editor = useEditor()

	useLayoutEffect(() => {
		const updateBounds = throttle(
			() => {
				editor.updateViewportScreenBounds()
			},
			200,
			{
				trailing: true,
			}
		)

		editor.updateViewportScreenBounds()

		// Rather than running getClientRects on every frame, we'll
		// run it once a second or when the window resizes / scrolls.
		const interval = setInterval(updateBounds, 1000)
		window.addEventListener('resize', updateBounds)
		window.addEventListener('scroll', updateBounds)

		return () => {
			clearInterval(interval)
			window.removeEventListener('resize', updateBounds)
			window.removeEventListener('scroll', updateBounds)
		}
	}, [editor])
}
