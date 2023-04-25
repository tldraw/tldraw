import { useEffect } from 'react'
import { EffectScheduler, EMPTY_ARRAY } from 'signia'

/** @public */
export function useQuickReactor(name: string, reactFn: () => void, deps: any[] = EMPTY_ARRAY) {
	useEffect(() => {
		const scheduler = new EffectScheduler(name, reactFn)
		scheduler.attach()
		scheduler.execute()
		return () => {
			scheduler.detach()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)
}
