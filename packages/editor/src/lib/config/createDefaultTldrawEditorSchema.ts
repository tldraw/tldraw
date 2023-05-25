import { TLInstancePresence, TLStore, defaultMigrators, defaultValidator } from '@tldraw/tlschema'
import { Signal } from 'signia'
import { createTldrawEditorSchema } from './createTldrawEditorSchema'

/** @public */
export function createDefaultTldrawEditorSchema(
	opts = {} as {
		derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
	}
) {
	return createTldrawEditorSchema({
		validator: defaultValidator,
		migrators: defaultMigrators,
		...opts,
	})
}
