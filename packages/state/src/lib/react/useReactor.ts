import { useEffect, useMemo } from 'react'
import { EffectScheduler } from '../core'

/** @public */
export function useReactor(name: string, reactFn: () => void, deps: undefined | any[] = []) {
	const scheduler = useMemo(
		() => new EffectScheduler(name, reactFn, { scheduleEffect: (cb) => requestAnimationFrame(cb) }),
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
