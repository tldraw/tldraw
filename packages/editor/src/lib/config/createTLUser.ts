import { Signal, computed, isSignal } from '@tldraw/state'
import { useAtom } from '@tldraw/state-react'
import { useEffect, useMemo } from 'react'
import { useShallowObjectIdentity } from '../hooks/useIdentity'
import { TLUserPreferences, getUserPreferences, setUserPreferences } from './TLUserPreferences'

/** @public */
export interface TLUser {
	readonly userPreferences: Signal<TLUserPreferences>
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	readonly setUserPreferences: (userPreferences: TLUserPreferences) => void
}

const defaultLocalStorageUserPrefs = computed('defaultLocalStorageUserPrefs', () =>
	getUserPreferences()
)

/** @public */
export function createTLUser(
	opts = {} as {
		userPreferences?: Signal<TLUserPreferences>
		// eslint-disable-next-line @typescript-eslint/method-signature-style
		setUserPreferences?: (userPreferences: TLUserPreferences) => void
	}
): TLUser {
	return {
		userPreferences: opts.userPreferences ?? defaultLocalStorageUserPrefs,
		setUserPreferences: opts.setUserPreferences ?? setUserPreferences,
	}
}

/**
 * @public
 */
export function useTldrawUser(opts: {
	userPreferences?: Signal<TLUserPreferences> | TLUserPreferences
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	setUserPreferences?: (userPreferences: TLUserPreferences) => void
}): TLUser {
	const prefs = useShallowObjectIdentity(opts.userPreferences ?? defaultLocalStorageUserPrefs)
	const userAtom = useAtom<TLUserPreferences | Signal<TLUserPreferences>>('userAtom', prefs)
	useEffect(() => {
		userAtom.set(prefs)
	}, [prefs, userAtom])

	return useMemo(
		() =>
			createTLUser({
				userPreferences: computed('userPreferences', () => {
					const userStuff = userAtom.get()
					return isSignal(userStuff) ? userStuff.get() : userStuff
				}),
				setUserPreferences: opts.setUserPreferences,
			}),
		[userAtom, opts.setUserPreferences]
	)
}
