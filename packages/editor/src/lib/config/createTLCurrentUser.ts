import { Signal, computed, isSignal } from '@tldraw/state'
import { useAtom } from '@tldraw/state-react'
import { useEffect, useMemo } from 'react'
import { useShallowObjectIdentity } from '../hooks/useIdentity'
import { TLUserPreferences, getUserPreferences, setUserPreferences } from './TLUserPreferences'

/** @public */
export interface TLCurrentUser {
	readonly userPreferences: Signal<TLUserPreferences>
	// eslint-disable-next-line tldraw/method-signature-style
	readonly setUserPreferences: (userPreferences: TLUserPreferences) => void
}

const defaultLocalStorageUserPrefs = computed('defaultLocalStorageUserPrefs', () =>
	getUserPreferences()
)

/** @public */
export function createTLCurrentUser(
	opts = {} as {
		userPreferences?: Signal<TLUserPreferences>
		// eslint-disable-next-line tldraw/method-signature-style
		setUserPreferences?: (userPreferences: TLUserPreferences) => void
	}
): TLCurrentUser {
	return {
		userPreferences: opts.userPreferences ?? defaultLocalStorageUserPrefs,
		setUserPreferences: opts.setUserPreferences ?? setUserPreferences,
	}
}

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
