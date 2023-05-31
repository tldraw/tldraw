import { TLInstancePresence, TLStore } from '@tldraw/tlschema'
import { Signal, computed } from 'signia'
import { TLUserPreferences, getUserPreferences, setUserPreferences } from './TLUserPreferences'

/** @public */
export interface TLUser {
	readonly derivePresenceState: (store: TLStore) => Signal<TLInstancePresence | null>
	readonly userPreferences: Signal<TLUserPreferences>
	readonly setUserPreferences: (userPreferences: TLUserPreferences) => void
}

/** @public */
export function createTLUser(
	opts = {} as {
		/** @internal */
		derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
		userPreferences?: Signal<TLUserPreferences>
		setUserPreferences?: (userPreferences: TLUserPreferences) => void
	}
): TLUser {
	return {
		derivePresenceState: opts.derivePresenceState ?? (() => computed('presence', () => null)),
		userPreferences:
			opts.userPreferences ?? computed('userPreferences', () => getUserPreferences()),
		setUserPreferences: opts.setUserPreferences ?? setUserPreferences,
	}
}
