import { RefObject, useEffect } from 'react'
import { preventDefault } from '../utils/dom'
import { useContainer } from './useContainer'

/** @public */
export function usePassThroughMouseOverEvents(ref: RefObject<HTMLElement>) {
	if (!ref) throw Error('usePassThroughWheelEvents must be passed a ref')
	const container = useContainer()

	useEffect(() => {
		function onMouseOver(e: MouseEvent) {
			if ((e as any).isSpecialRedispatchedEvent) return
			preventDefault(e)
			const cvs = container.querySelector('.tl-canvas')
			if (!cvs) return
			const newEvent = new PointerEvent(e.type, e as any)
			;(newEvent as any).isSpecialRedispatchedEvent = true
			cvs.dispatchEvent(newEvent)
		}

		const elm = ref.current
		if (!elm) return

		elm.addEventListener('mouseover', onMouseOver, { passive: false })
		return () => {
			elm.removeEventListener('mouseover', onMouseOver)
		}
	}, [container, ref])
}
