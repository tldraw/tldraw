import { TLInstancePresence, TLRecord, TLStore, createTLSchema } from '@tldraw/tlschema'
import { Migrator } from '@tldraw/tlstore'
import { Signal } from 'signia'

/** @public */
export function createTldrawEditorSchema(
	opts = {} as {
		migrators?: Record<string, Migrator> | null
		validator?: { validate: (record: TLRecord) => TLRecord } | null
		/** @internal */
		derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
	}
) {
	const { migrators = null, validator = null, derivePresenceState } = opts

	return createTLSchema({
		derivePresenceState,
		validator,
		migrators,
	})
}
