import * as React from 'react'
import { preventDefault } from '../utils/dom'
import { useContainer } from './useContainer'

/** @public */
export function usePassThroughWheelEvents() {
	const container = useContainer()
	const onWheel = React.useCallback(
		function onWheel(e: React.WheelEvent) {
			if ((e as any).isSpecialRedispatchedEvent) return
			preventDefault(e)
			const cvs = container.querySelector('.tl-canvas')
			if (!cvs) return
			const newEvent = new WheelEvent('wheel', e as any)
			;(newEvent as any).isSpecialRedispatchedEvent = true
			cvs.dispatchEvent(newEvent)
		},
		[container]
	)

	return { onWheel }
}
