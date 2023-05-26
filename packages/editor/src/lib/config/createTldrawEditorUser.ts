import { TLInstancePresence, TLStore } from '@tldraw/tlschema'
import { Signal, computed } from 'signia'
import { TLUserPreferences, getUserPreferences, setUserPreferences } from './TLUserPreferences'

/** @public */
export interface TldrawEditorUser {
	readonly derivePresenceState: (store: TLStore) => Signal<TLInstancePresence | null>
	readonly userPreferences: Signal<TLUserPreferences>
	readonly setUserPreferences: (userPreferences: TLUserPreferences) => void
}

/** @public */
export function createTldrawEditorUser(
	opts = {} as {
		/** @internal */
		derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
		userPreferences?: Signal<TLUserPreferences>
		setUserPreferences?: (userPreferences: TLUserPreferences) => void
	}
): TldrawEditorUser {
	return {
		derivePresenceState: opts.derivePresenceState ?? (() => computed('presence', () => null)),
		userPreferences:
			opts.userPreferences ?? computed('userPreferences', () => getUserPreferences()),
		setUserPreferences: opts.setUserPreferences ?? setUserPreferences,
	}
}
