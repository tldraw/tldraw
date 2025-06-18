import { RefObject, useEffect } from 'react'
import { preventDefault } from '../utils/dom'
import { useContainer } from './useContainer'

/** @public */
export function usePassThroughWheelEvents(ref: RefObject<HTMLElement>) {
	if (!ref) throw Error('usePassThroughWheelEvents must be passed a ref')
	const container = useContainer()

	useEffect(() => {
		function onWheel(e: WheelEvent) {
			if ((e as any).isSpecialRedispatchedEvent) return

			// if the element is scrollable, don't redispatch the event
			const elm = ref.current
			if (elm && elm.scrollHeight > elm.clientHeight) {
				return
			}

			preventDefault(e)
			const cvs = container.querySelector('.tl-canvas')
			if (!cvs) return
			const newEvent = new WheelEvent('wheel', e as any)
			;(newEvent as any).isSpecialRedispatchedEvent = true
			cvs.dispatchEvent(newEvent)
		}

		const elm = ref.current
		if (!elm) return

		elm.addEventListener('wheel', onWheel, { passive: false })
		return () => {
			elm.removeEventListener('wheel', onWheel)
		}
	}, [container, ref])
}
