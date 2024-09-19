import { EffectScheduler } from '@tldraw/state'
import { useEffect, useMemo, useRef } from 'react'

/** @public */
export function useReactor(name: string, reactFn: () => void, deps: undefined | any[] = []) {
	const raf = useRef(-1)
	const scheduler = useMemo(
		() =>
			new EffectScheduler(name, reactFn, {
				scheduleEffect: (cb) => {
					const rafId = requestAnimationFrame(cb)
					raf.current = rafId
					return rafId
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
			cancelAnimationFrame(raf.current)
		}
	}, [scheduler])
}
