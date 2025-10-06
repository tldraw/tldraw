import {
	BaseRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
} from '@tldraw/store'
import { IndexKey, JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'

/**
 * A page within a tldraw document. Pages are containers for shapes and provide
 * a way to organize content into separate canvases. Each document can have multiple
 * pages, and users can navigate between them.
 *
 * Pages have a name for identification, an index for ordering, and can store
 * custom metadata.
 *
 * @example
 * ```ts
 * const page: TLPage = {
 *   id: 'page:page1',
 *   typeName: 'page',
 *   name: 'Page 1',
 *   index: 'a1',
 *   meta: { description: 'Main design page' }
 * }
 * ```
 *
 * @public
 */
export interface TLPage extends BaseRecord<'page', TLPageId> {
	name: string
	index: IndexKey
	meta: JsonObject
}

/**
 * A unique identifier for TLPage records.
 *
 * Page IDs follow the format 'page:' followed by a unique string identifier.
 *
 * @example
 * ```ts
 * const pageId: TLPageId = 'page:main'
 * const pageId2: TLPageId = createShapeId() // generates 'page:abc123'
 * ```
 *
 * @public
 */
export type TLPageId = RecordId<TLPage>

/**
 * Validator for TLPageId values. Ensures the ID follows the correct
 * format for page records ('page:' prefix).
 *
 * @example
 * ```ts
 * const isValid = pageIdValidator.isValid('page:main') // true
 * const isValid2 = pageIdValidator.isValid('shape:abc') // false
 * ```
 *
 * @public
 */
export const pageIdValidator = idValidator<TLPageId>('page')

/**
 * Runtime validator for TLPage records. Validates the structure and types
 * of all page properties to ensure data integrity.
 *
 * @example
 * ```ts
 * const page = { id: 'page:1', typeName: 'page', name: 'My Page', index: 'a1', meta: {} }
 * const isValid = pageValidator.isValid(page) // true
 * ```
 *
 * @public
 */
export const pageValidator: T.Validator<TLPage> = T.model(
	'page',
	T.object({
		typeName: T.literal('page'),
		id: pageIdValidator,
		name: T.string,
		index: T.indexKey,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/**
 * Migration version identifiers for TLPage records. Each version represents
 * a schema change that requires data transformation when loading older documents.
 *
 * @public
 */
export const pageVersions = createMigrationIds('com.tldraw.page', {
	AddMeta: 1,
})

/**
 * Migration sequence for TLPage records. Defines how to transform page
 * records between different schema versions, ensuring data compatibility.
 *
 * @example
 * ```ts
 * // Migrations are applied automatically when loading documents
 * const migratedPage = pageMigrations.migrate(oldPage, targetVersion)
 * ```
 *
 * @public
 */
export const pageMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.page',
	recordType: 'page',
	sequence: [
		{
			id: pageVersions.AddMeta,
			up: (record: any) => {
				record.meta = {}
			},
		},
	],
})

/**
 * The RecordType definition for TLPage records. Defines validation, scope,
 * and default properties for page records in the tldraw store.
 *
 * Pages are scoped to the document level, meaning they persist across sessions
 * and are shared in collaborative environments.
 *
 * @example
 * ```ts
 * const page = PageRecordType.create({
 *   id: 'page:main',
 *   name: 'Main Page',
 *   index: 'a1'
 * })
 * ```
 *
 * @public
 */
export const PageRecordType = createRecordType<TLPage>('page', {
	validator: pageValidator,
	scope: 'document',
}).withDefaultProperties(() => ({
	meta: {},
}))

/**
 * Type guard to check if a string is a valid TLPageId.
 *
 * @param id - The string to check
 * @returns True if the ID is a valid page ID, false otherwise
 *
 * @example
 * ```ts
 * if (isPageId('page:main')) {
 *   // TypeScript knows this is a TLPageId
 *   console.log('Valid page ID')
 * }
 * ```
 *
 * @public
 */
export function isPageId(id: string): id is TLPageId {
	return PageRecordType.isId(id)
}
