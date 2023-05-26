import {
	TLInstancePresence,
	TLStore,
	defaultTldrawEditorMigrators,
	defaultTldrawEditorValidator,
} from '@tldraw/tlschema'
import { Signal } from 'signia'
import { createTldrawEditorSchema } from './createTldrawEditorSchema'

/** @public */
export function createDefaultTldrawEditorSchema(
	opts = {} as {
		derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
	}
) {
	return createTldrawEditorSchema({
		validator: defaultTldrawEditorValidator,
		migrators: defaultTldrawEditorMigrators,
		...opts,
	})
}
