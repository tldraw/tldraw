import {
	MigrationSequence,
	RecordId,
	RecordScope,
	UnknownRecord,
	createMigrationSequence,
	createRecordType,
} from '@tldraw/store'
import { mapObjectMapValues, uniqueId } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { TLPropsMigrations } from '../recordsWithProps'

/**
 * Configuration for a custom record type in the schema.
 *
 * Custom record types allow you to add entirely new data types to the tldraw store
 * that don't fit into the existing shape, binding, or asset categories. This is useful
 * for storing domain-specific data like comments, annotations, or application state
 * that needs to participate in persistence and synchronization.
 *
 * @example
 * ```ts
 * const commentRecordConfig: CustomRecordInfo = {
 *   scope: 'document',
 *   validator: T.object({
 *     id: T.string,
 *     typeName: T.literal('comment'),
 *     text: T.string,
 *     shapeId: T.string,
 *     authorId: T.string,
 *     createdAt: T.number,
 *   }),
 *   migrations: createRecordMigrationSequence({
 *     sequenceId: 'com.myapp.comment',
 *     recordType: 'comment',
 *     sequence: [],
 *   }),
 * }
 * ```
 *
 * @public
 */
export interface CustomRecordInfo {
	/**
	 * The scope determines how records of this type are persisted and synchronized:
	 * - **document**: Persisted and synced across all clients
	 * - **session**: Local to current session, not synced
	 * - **presence**: Ephemeral presence data, may be synced but not persisted
	 */
	scope: RecordScope

	/**
	 * Validator for the complete record structure.
	 *
	 * Should validate the entire record including `id` and `typeName` fields.
	 * Use validators like T.object, T.string, etc.
	 */
	validator: T.Validatable<any>

	/**
	 * Optional migration sequence for handling schema evolution over time.
	 *
	 * Can be a full MigrationSequence or a simplified TLPropsMigrations format.
	 * If not provided, an empty migration sequence will be created automatically.
	 */
	migrations?: MigrationSequence | TLPropsMigrations

	/**
	 * Optional factory function that returns default property values for new records.
	 *
	 * Called when creating new records to provide initial values for any properties
	 * not explicitly provided during creation.
	 */
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	createDefaultProperties?: () => Record<string, unknown>
}

/**
 * Creates a RecordType for a custom record based on its configuration.
 *
 * @param typeName - The unique type name for this record type
 * @param config - Configuration for the custom record type
 * @returns A RecordType instance that can be used to create and manage records
 *
 * @internal
 */
export function createCustomRecordType(typeName: string, config: CustomRecordInfo) {
	return createRecordType<UnknownRecord>(typeName, {
		scope: config.scope,
		validator: config.validator,
	}).withDefaultProperties(config.createDefaultProperties ?? (() => ({})))
}

/**
 * Processes migrations for custom record types.
 *
 * Converts the migration configuration from CustomRecordInfo into proper
 * MigrationSequence objects that can be used by the store system.
 *
 * @param records - Record of type names to their configuration
 * @returns Array of migration sequences for the custom record types
 *
 * @internal
 */
export function processCustomRecordMigrations(
	records: Record<string, CustomRecordInfo>
): MigrationSequence[] {
	const result: MigrationSequence[] = []

	for (const [typeName, config] of Object.entries(records)) {
		const sequenceId = `com.tldraw.${typeName}`
		const { migrations } = config

		if (!migrations) {
			// Provide empty migration sequence to allow for future migrations
			result.push(
				createMigrationSequence({
					sequenceId,
					retroactive: true,
					sequence: [],
				})
			)
		} else if ('sequenceId' in migrations) {
			// Full MigrationSequence provided
			result.push(migrations)
		} else if ('sequence' in migrations) {
			// TLPropsMigrations format - convert to full MigrationSequence
			result.push(
				createMigrationSequence({
					sequenceId,
					retroactive: true,
					sequence: migrations.sequence.map((m) => {
						if (!('id' in m)) return m
						return {
							id: m.id,
							dependsOn: m.dependsOn,
							scope: 'record' as const,
							filter: (r: UnknownRecord) => r.typeName === typeName,
							up: (record: any) => {
								const result = m.up(record)
								if (result) return result
							},
							down:
								typeof m.down === 'function'
									? (record: any) => {
											const result = (m.down as (r: any) => any)(record)
											if (result) return result
										}
									: undefined,
						}
					}),
				})
			)
		}
	}

	return result
}

/**
 * Creates properly formatted migration IDs for custom record migrations.
 *
 * Generates standardized migration IDs following the convention:
 * `com.tldraw.{recordType}/{version}`
 *
 * @param recordType - The type name of the custom record
 * @param ids - Record mapping migration names to version numbers
 * @returns Record with the same keys but formatted migration ID values
 *
 * @example
 * ```ts
 * const commentVersions = createCustomRecordMigrationIds('comment', {
 *   AddAuthorId: 1,
 *   AddCreatedAt: 2,
 *   RefactorReactions: 3
 * })
 * // Result: {
 * //   AddAuthorId: 'com.tldraw.comment/1',
 * //   AddCreatedAt: 'com.tldraw.comment/2',
 * //   RefactorReactions: 'com.tldraw.comment/3'
 * // }
 * ```
 *
 * @public
 */
export function createCustomRecordMigrationIds<
	const S extends string,
	const T extends Record<string, number>,
>(recordType: S, ids: T): { [k in keyof T]: `com.tldraw.${S}/${T[k]}` } {
	return mapObjectMapValues(ids, (_k, v) => `com.tldraw.${recordType}/${v}`) as any
}

/**
 * Creates a migration sequence for custom record types.
 *
 * This is a pass-through function that maintains the same structure as the input.
 * It's used for consistency and to provide a clear API for defining custom record migrations.
 *
 * @param migrations - The migration sequence to create
 * @returns The same migration sequence (pass-through)
 *
 * @example
 * ```ts
 * const commentMigrations = createCustomRecordMigrationSequence({
 *   sequence: [
 *     {
 *       id: 'com.myapp.comment/1',
 *       up: (record) => ({ ...record, authorId: record.authorId ?? 'unknown' }),
 *       down: ({ authorId, ...record }) => record
 *     }
 *   ]
 * })
 * ```
 *
 * @public
 */
export function createCustomRecordMigrationSequence(
	migrations: TLPropsMigrations
): TLPropsMigrations {
	return migrations
}

/**
 * Creates a unique ID for a custom record type.
 *
 * @param typeName - The type name of the custom record
 * @param id - Optional custom ID suffix. If not provided, a unique ID will be generated
 * @returns A properly formatted record ID
 *
 * @example
 * ```ts
 * // Create with auto-generated ID
 * const commentId = createCustomRecordId('comment') // 'comment:abc123'
 *
 * // Create with custom ID
 * const customId = createCustomRecordId('comment', 'my-comment') // 'comment:my-comment'
 * ```
 *
 * @public
 */
export function createCustomRecordId<T extends string>(
	typeName: T,
	id?: string
): RecordId<UnknownRecord> & `${T}:${string}` {
	return `${typeName}:${id ?? uniqueId()}` as RecordId<UnknownRecord> & `${T}:${string}`
}

/**
 * Type guard to check if a string is a valid ID for a specific custom record type.
 *
 * @param typeName - The type name to check against
 * @param id - The string to check
 * @returns True if the string is a valid ID for the specified record type
 *
 * @example
 * ```ts
 * const id = 'comment:abc123'
 * if (isCustomRecordId('comment', id)) {
 *   // id is now typed as a comment record ID
 *   const comment = store.get(id)
 * }
 * ```
 *
 * @public
 */
export function isCustomRecordId(typeName: string, id?: string): boolean {
	if (!id) return false
	return id.startsWith(`${typeName}:`)
}

/**
 * Type guard to check if a record is of a specific custom type.
 *
 * @param typeName - The type name to check against
 * @param record - The record to check
 * @returns True if the record is of the specified type
 *
 * @example
 * ```ts
 * function handleRecord(record: TLRecord) {
 *   if (isCustomRecord('comment', record)) {
 *     // Handle comment record
 *     console.log(`Comment: ${record.text}`)
 *   }
 * }
 * ```
 *
 * @public
 */
export function isCustomRecord(typeName: string, record?: UnknownRecord): boolean {
	if (!record) return false
	return record.typeName === typeName
}
