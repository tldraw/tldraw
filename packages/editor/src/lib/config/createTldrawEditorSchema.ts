import { TldrawEditorMigrators, TldrawEditorValidator, createTLSchema } from '@tldraw/tlschema'

/** @public */
export function createTldrawEditorSchema(
	opts = {} as {
		migrators?: TldrawEditorMigrators | null
		validator?: TldrawEditorValidator | null
	}
) {
	const { migrators = null, validator = null } = opts

	return createTLSchema({
		validator,
		migrators,
	})
}
