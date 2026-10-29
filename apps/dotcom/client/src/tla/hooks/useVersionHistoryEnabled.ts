import { useEffect, useState } from 'react'
import { fetchFeatureFlags, getCurrentFlags, wasAuthenticated } from '../utils/featureFlags'
import { useTldrawCurrentUser } from './useUser'

/** Undefined while an unauthenticated (pre-cookie) flag fetch is all we have. */
export function resolveHistoryEnabled(args: {
	signedIn: boolean
	isStaff: boolean
	flag: boolean | undefined
}): boolean | undefined {
	if (!args.signedIn) return false
	if (args.isStaff) return true
	return args.flag
}

export function useVersionHistoryEnabled(): boolean | undefined {
	const user = useTldrawCurrentUser()
	const authed = () =>
		wasAuthenticated() ? !!getCurrentFlags().version_history?.enabled : undefined
	const [flag, setFlag] = useState<boolean | undefined>(authed)
	useEffect(() => {
		if (!user || flag !== undefined) return
		let cancelled = false
		fetchFeatureFlags().then(() => !cancelled && setFlag(authed() ?? false))
		return () => {
			cancelled = true
		}
	}, [user, flag])
	return resolveHistoryEnabled({ signedIn: !!user, isStaff: !!user?.isTldraw, flag })
}
