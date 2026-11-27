import { Signal, computed } from '@tldraw/state'
import { TLUserPreferences, getUserPreferences, setUserPreferences } from './TLUserPreferences'

/** @public */
export interface TLCurrentUser {
	readonly userPreferences: Signal<TLUserPreferences>
	// eslint-disable-next-line tldraw/method-signature-style
	readonly setUserPreferences: (userPreferences: TLUserPreferences) => void
}

/** @internal */
export const defaultLocalStorageUserPrefs = computed('defaultLocalStorageUserPrefs', () =>
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
