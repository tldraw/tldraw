import { Signal, computed, isSignal } from '@tldraw/state'
import { useAtom } from '@tldraw/state-react'
import { useEffect, useMemo } from 'react'
import {
	TLCurrentUser,
	createTLCurrentUser,
	defaultLocalStorageUserPrefs,
} from '../config/createTLCurrentUser'
import { TLUserPreferences } from '../config/TLUserPreferences'
import { useShallowObjectIdentity } from './useIdentity'

/**
 * @public
 */
export function useTldrawCurrentUser(opts: {
	userPreferences?: Signal<TLUserPreferences> | TLUserPreferences
	// eslint-disable-next-line tldraw/method-signature-style
	setUserPreferences?: (userPreferences: TLUserPreferences) => void
}): TLCurrentUser {
	const prefs = useShallowObjectIdentity(opts.userPreferences ?? defaultLocalStorageUserPrefs)
	const userAtom = useAtom<TLUserPreferences | Signal<TLUserPreferences>>('userAtom', prefs)
	useEffect(() => {
		userAtom.set(prefs)
	}, [prefs, userAtom])

	return useMemo(
		() =>
			createTLCurrentUser({
				userPreferences: computed('userPreferences', () => {
					const userStuff = userAtom.get()
					return isSignal(userStuff) ? userStuff.get() : userStuff
				}),
				setUserPreferences: opts.setUserPreferences,
			}),
		[userAtom, opts.setUserPreferences]
	)
}
