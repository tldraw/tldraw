import {
	createTldrawEditorSchema,
	defaultTldrawEditorMigrators,
	defaultTldrawEditorValidator,
} from '@tldraw/tlschema'

/**
 * Create a TldrawEditor schema with the default validator and migrators.
 *
 * ```ts
 * createDefaultTldrawEditorSchema()
 * ```
 * @public */
export function createDefaultTldrawEditorSchema() {
	return createTldrawEditorSchema({
		validator: defaultTldrawEditorValidator,
		migrators: defaultTldrawEditorMigrators,
	})
}
