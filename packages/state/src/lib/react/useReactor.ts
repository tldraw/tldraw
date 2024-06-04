import { useEffect, useMemo, useState } from 'react'
import { EffectScheduler } from '../core'

/** @public */
export function useReactor(name: string, reactFn: () => void, deps: undefined | any[] = []) {
	const [raf, setRaf] = useState(-1)
	const scheduler = useMemo(
		() =>
			new EffectScheduler(name, reactFn, {
				scheduleEffect: (cb) => {
					const raf = requestAnimationFrame(cb)
					setRaf(raf)
					return raf
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
			cancelAnimationFrame(raf)
		}
	}, [scheduler, raf])
}
