import { EMPTY_ARRAY, EffectScheduler } from '@tldraw/state'
import { useEffect } from 'react'

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
