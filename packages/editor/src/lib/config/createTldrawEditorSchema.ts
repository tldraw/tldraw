import { TLRecord, createTLSchema } from '@tldraw/tlschema'
import { Migrator } from '@tldraw/tlstore'

/** @public */
export function createTldrawEditorSchema(
	opts = {} as {
		migrators?: Record<string, Migrator> | null
		validator?: { validate: (record: TLRecord) => TLRecord } | null
	}
) {
	const { migrators = null, validator = null } = opts

	return createTLSchema({
		validator,
		migrators,
	})
}
