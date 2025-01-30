import { RefObject, useEffect } from 'react'
import { preventDefault } from '../utils/dom'
import { useContainer } from './useContainer'
import { useEvent } from './useEvent'

/** @public */
export function usePassThroughWheelEvents(
	ref: RefObject<HTMLElement>,
	condition?: (e: WheelEvent) => boolean
) {
	if (!ref) throw Error('usePassThroughWheelEvents must be passed a ref')

	const container = useContainer()

	const conditionCallback = useEvent((e: WheelEvent) => condition?.(e) ?? true)

	useEffect(() => {
		function onWheel(e: WheelEvent) {
			if ((e as any).isSpecialRedispatchedEvent) return
			if (!conditionCallback(e)) return
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
	}, [container, ref, conditionCallback])
}
