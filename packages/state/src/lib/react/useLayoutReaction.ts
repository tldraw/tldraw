import React from 'react'
import { useTrackedScheduler } from './useTrackedScheduler'

/** @internal */
export function useLayoutReaction<T>(name: string, effect: () => void): void {
	const scheduler = useTrackedScheduler(name, effect)

	React.useLayoutEffect(() => {
		scheduler.execute()
	})
}
