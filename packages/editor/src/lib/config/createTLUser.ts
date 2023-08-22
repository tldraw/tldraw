import { Signal, computed } from '@tldraw/state'
import { TLInstancePresence, TLStore } from '@tldraw/tlschema'
import { TLUserPreferences, getUserPreferences, setUserPreferences } from './TLUserPreferences'

/** @public */
export interface TLUser {
	readonly derivePresenceState: (store: TLStore) => Signal<TLInstancePresence | null>
	readonly userPreferences: Signal<TLUserPreferences>
	readonly setUserPreferences: (userPreferences: TLUserPreferences) => void
}

/** @public */
export function createTLUser(opts = {} as Partial<TLUser>): TLUser {
	return {
		derivePresenceState: opts.derivePresenceState ?? (() => computed('presence', () => null)),
		userPreferences:
			opts.userPreferences ?? computed('userPreferences', () => getUserPreferences()),
		setUserPreferences: opts.setUserPreferences ?? setUserPreferences,
	}
}
