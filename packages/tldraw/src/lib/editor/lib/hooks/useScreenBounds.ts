import throttle from 'lodash.throttle'
import { useLayoutEffect } from 'react'
import { useContainer } from './useContainer'
import { useEditor } from './useEditor'

export function useScreenBounds() {
	const editor = useEditor()
	const container = useContainer()

	useLayoutEffect(() => {
		const updateBounds = throttle(
			() => {
				editor.updateViewportScreenBounds()
			},
			200,
			{ trailing: true }
		)

		const resizeObserver = new ResizeObserver((entries) => {
			if (entries[0].contentRect) {
				updateBounds()
			}
		})

		if (container) {
			resizeObserver.observe(container)
		}

		updateBounds()

		return () => {
			resizeObserver.disconnect()
		}
	}, [editor, container])
}
