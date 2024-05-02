import { useTrackedScheduler } from './useTrackedScheduler'

/** @internal */
export function useStateTracking<T>(name: string, render: () => T): T {
	return useTrackedScheduler(name, render).execute()
}
