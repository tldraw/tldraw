import { EffectScheduler } from '@tldraw/state'
import { throttleToNextFrame } from '@tldraw/utils'
import { useEffect } from 'react'

/** @public */
export function useReactor(name: string, reactFn: () => void, deps: undefined | any[] = []) {
	useEffect(() => {
		let cancelFn: () => void | undefined
		const scheduler = new EffectScheduler(name, reactFn, {
			scheduleEffect: (cb) => {
				cancelFn = throttleToNextFrame(cb)
			},
		})
		scheduler.attach()
		scheduler.execute()
		return () => {
			scheduler.detach()
			cancelFn?.()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)
}
