import React from 'react'
import { useTrackedScheduler } from './useTrackedScheduler'

/** @internal */
export function useLayoutReaction(name: string, effect: () => void): void {
	const scheduler = useTrackedScheduler(name, effect)

	// eslint-disable-next-line react-hooks/exhaustive-deps
	React.useLayoutEffect(scheduler.maybeExecute)
}
