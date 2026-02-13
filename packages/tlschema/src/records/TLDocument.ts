import {
	BaseRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
	UnknownRecord,
} from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'

/**
 * Document record containing global settings and metadata for a tldraw document.
 * There is exactly one document record per tldraw instance with a fixed ID.
 *
 * @example
 * ```ts
 * const document: TLDocument = {
 *   id: 'document:document',
 *   typeName: 'document',
 *   gridSize: 20,        // Grid snap size in pixels
 *   name: 'My Drawing',  // Document name
 *   meta: {
 *     createdAt: Date.now(),
 *     author: 'user123',
 *     version: '1.0.0'
 *   }
 * }
 *
 * // Update document settings
 * editor.updateDocumentSettings({
 *   name: 'Updated Drawing',
 *   gridSize: 25
 * })
 * ```
 *
 * @public
 */
export interface TLDocument extends BaseRecord<'document', RecordId<TLDocument>> {
	/** Grid snap size in pixels. Used for shape positioning and alignment */
	gridSize: number
	/** Human-readable name of the document */
	name: string
	/** User-defined metadata for the document */
	meta: JsonObject
}

/**
 * Validator for TLDocument records that ensures runtime type safety.
 * Enforces the fixed document ID and validates all document properties.
 *
 * @example
 * ```ts
 * // Validation happens automatically when document is stored
 * try {
 *   const validatedDocument = documentValidator.validate(documentData)
 *   store.put([validatedDocument])
 * } catch (error) {
 *   console.error('Document validation failed:', error.message)
 * }
 * ```
 *
 * @public
 */
export const documentValidator: T.Validator<TLDocument> = T.model(
	'document',
	T.object({
		typeName: T.literal('document'),
		id: T.literal('document:document' as RecordId<TLDocument>),
		gridSize: T.number,
		name: T.string,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/**
 * Type guard to check if a record is a TLDocument.
 * Useful for filtering or type narrowing when working with mixed record types.
 *
 * @param record - The record to check
 * @returns True if the record is a document, false otherwise
 *
 * @example
 * ```ts
 * // Type guard usage
 * function processRecord(record: UnknownRecord) {
 *   if (isDocument(record)) {
 *     // record is now typed as TLDocument
 *     console.log(`Document: ${record.name}, Grid: ${record.gridSize}px`)
 *   }
 * }
 *
 * // Filter documents from mixed records
 * const allRecords = store.allRecords()
 * const documents = allRecords.filter(isDocument) // Should be exactly one
 * ```
 *
 * @public
 */
export function isDocument(record?: UnknownRecord): record is TLDocument {
	if (!record) return false
	return record.typeName === 'document'
}

/**
 * Migration version identifiers for document record schema evolution.
 * Each version represents a breaking change that requires data migration.
 *
 * @example
 * ```ts
 * // Check if document needs migration
 * const needsNameMigration = currentVersion < documentVersions.AddName
 * const needsMetaMigration = currentVersion < documentVersions.AddMeta
 * ```
 *
 * @public
 */
export const documentVersions = createMigrationIds('com.tldraw.document', {
	AddName: 1,
	AddMeta: 2,
} as const)

/**
 * Migration sequence for evolving document record structure over time.
 * Handles converting document records from older schema versions to current format.
 *
 * @example
 * ```ts
 * // Migration is applied automatically when loading old documents
 * const migratedStore = migrator.migrateStoreSnapshot({
 *   schema: oldSchema,
 *   store: oldStoreSnapshot
 * })
 *
 * // The migrations:
 * // v1: Added 'name' property with empty string default
 * // v2: Added 'meta' property with empty object default
 * ```
 *
 * @public
 */
export const documentMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.document',
	recordType: 'document',
	sequence: [
		{
			id: documentVersions.AddName,
			up: (document) => {
				;(document as any).name = ''
			},
			down: (document) => {
				delete (document as any).name
			},
		},
		{
			id: documentVersions.AddMeta,
			up: (record) => {
				;(record as any).meta = {}
			},
		},
	],
})

/**
 * Record type definition for TLDocument with validation and default properties.
 * Configures the document as a document-scoped record that persists across sessions.
 *
 * @example
 * ```ts
 * // Create a document record (usually done automatically)
 * const documentRecord = DocumentRecordType.create({
 *   id: TLDOCUMENT_ID,
 *   name: 'My Drawing',
 *   gridSize: 20,
 *   meta: { createdAt: Date.now() }
 * })
 *
 * // Create with defaults
 * const defaultDocument = DocumentRecordType.create({
 *   id: TLDOCUMENT_ID
 *   // gridSize: 10, name: '', meta: {} are applied as defaults
 * })
 *
 * // Store the document
 * store.put([documentRecord])
 * ```
 *
 * @public
 */
export const DocumentRecordType = createRecordType<TLDocument>('document', {
	validator: documentValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TLDocument, 'id' | 'typeName'> => ({
		gridSize: 10,
		name: '',
		meta: {},
	})
)

/**
 * The fixed ID for the singleton document record in every tldraw store.
 * All document records use this same ID: 'document:document'
 *
 * @example
 * ```ts
 * // Get the document from store
 * const document = store.get(TLDOCUMENT_ID)
 *
 * // Update document settings
 * store.put([{
 *   ...document,
 *   name: 'Updated Name',
 *   gridSize: 25
 * }])
 *
 * // Access via editor
 * const documentSettings = editor.getDocumentSettings()
 * editor.updateDocumentSettings({ name: 'New Name' })
 * ```
 *
 * @public
 */
export const TLDOCUMENT_ID: RecordId<TLDocument> = DocumentRecordType.createId('document')
