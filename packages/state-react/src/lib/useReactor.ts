import { EffectScheduler } from '@tldraw/state'
import { throttleToNextFrame } from '@tldraw/utils'
import { useEffect } from 'react'

/** @public */
export function useReactor(name: string, reactFn: () => void, deps: undefined | any[] = []) {
	useEffect(() => {
		let callback: () => void | undefined
		const scheduler = new EffectScheduler(name, reactFn, {
			scheduleEffect: (cb) => {
				callback = throttleToNextFrame(cb)
			},
		})
		scheduler.attach()
		scheduler.execute()
		return () => {
			scheduler.detach()
			callback?.()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [deps])
}
