import { useEffect } from 'react'
import { preventDefault } from '../utils/dom'
import { useContainer } from './useContainer'

/** @public */
export function usePassThroughMouseOverEvents(elm: HTMLElement | null) {
	const container = useContainer()

	useEffect(() => {
		function onMouse(e: MouseEvent) {
			if ((e as any).isSpecialRedispatchedEvent) return
			preventDefault(e)
			const cvs = container.querySelector('.tl-canvas')
			if (!cvs) return
			const newEvent = new PointerEvent(e.type, e as any)
			;(newEvent as any).isSpecialRedispatchedEvent = true
			cvs.dispatchEvent(newEvent)
		}

		if (!elm) return

		elm.addEventListener('mouseover', onMouse, { passive: false })
		return () => {
			elm.removeEventListener('mouseover', onMouse)
		}
	}, [container, elm])
}
