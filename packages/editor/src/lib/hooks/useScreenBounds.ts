import throttle from 'lodash.throttle'
import { useLayoutEffect } from 'react'
import { useApp } from './useApp'
import { useContainer } from './useContainer'

export function useScreenBounds() {
	const app = useApp()
	const container = useContainer()

	useLayoutEffect(() => {
		const updateBounds = throttle(
			() => {
				app.updateViewportScreenBounds()
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
	}, [app, container])
}
