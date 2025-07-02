import { EffectScheduler } from '@tldraw/state'
import { throttleToNextFrame } from '@tldraw/utils'
import { useEffect, useMemo } from 'react'

/** @public */
export function useReactor(name: string, reactFn: () => void, deps: undefined | any[] = []) {
	const scheduler = useMemo(
		() =>
			new EffectScheduler(name, reactFn, {
				scheduleEffect: (cb) => {
					throttleToNextFrame(cb)
				},
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		deps
	)

	useEffect(() => {
		scheduler.attach()
		scheduler.execute()
		return () => {
			scheduler.detach()
		}
	}, [scheduler])
}
