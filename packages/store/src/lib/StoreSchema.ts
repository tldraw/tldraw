import {
	Result,
	assert,
	exhaustiveSwitchError,
	getOwnProperty,
	structuredClone,
} from '@tldraw/utils'
import { UnknownRecord } from './BaseRecord'
import { RecordType } from './RecordType'
import { SerializedStore, Store, StoreSnapshot } from './Store'
import {
	Migration,
	MigrationFailureReason,
	MigrationId,
	MigrationResult,
	MigrationSequence,
	parseMigrationId,
	sortMigrations,
	validateMigrations,
} from './migrate'

/**
 * Version 1 format for serialized store schema information.
 *
 * This is the legacy format used before schema version 2. Version 1 schemas
 * separate store-level versioning from record-level versioning, and support
 * subtypes for complex record types like shapes.
 *
 * @example
 * ```ts
 * const schemaV1: SerializedSchemaV1 = {
 *   schemaVersion: 1,
 *   storeVersion: 2,
 *   recordVersions: {
 *     book: { version: 3 },
 *     shape: {
 *       version: 2,
 *       subTypeVersions: { rectangle: 1, circle: 2 },
 *       subTypeKey: 'type'
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export interface SerializedSchemaV1 {
	/** Schema version is the version for this type you're looking at right now */
	schemaVersion: 1
	/**
	 * Store version is the version for the structure of the store. e.g. higher level structure like
	 * removing or renaming a record type.
	 */
	storeVersion: number
	/** Record versions are the versions for each record type. e.g. adding a new field to a record */
	recordVersions: Record<
		string,
		| {
				version: number
		  }
		| {
				// subtypes are used for migrating shape and asset props
				version: number
				subTypeVersions: Record<string, number>
				subTypeKey: string
		  }
	>
}

/**
 * Version 2 format for serialized store schema information.
 *
 * This is the current format that uses a unified sequence-based approach
 * for tracking versions across all migration sequences. Each sequence ID
 * maps to the latest version number for that sequence.
 *
 * @example
 * ```ts
 * const schemaV2: SerializedSchemaV2 = {
 *   schemaVersion: 2,
 *   sequences: {
 *     'com.tldraw.store': 3,
 *     'com.tldraw.book': 2,
 *     'com.tldraw.shape': 4,
 *     'com.tldraw.shape.rectangle': 1
 *   }
 * }
 * ```
 *
 * @public
 */
export interface SerializedSchemaV2 {
	schemaVersion: 2
	sequences: {
		[sequenceId: string]: number
	}
}

/**
 * Union type representing all supported serialized schema formats.
 *
 * This type allows the store to handle both legacy (V1) and current (V2)
 * schema formats during deserialization and migration.
 *
 * @example
 * ```ts
 * function handleSchema(schema: SerializedSchema) {
 *   if (schema.schemaVersion === 1) {
 *     // Handle V1 format
 *     console.log('Store version:', schema.storeVersion)
 *   } else {
 *     // Handle V2 format
 *     console.log('Sequences:', schema.sequences)
 *   }
 * }
 * ```
 *
 * @public
 */
export type SerializedSchema = SerializedSchemaV1 | SerializedSchemaV2

/**
 * Upgrades a serialized schema from version 1 to version 2 format.
 *
 * Version 1 schemas use separate `storeVersion` and `recordVersions` fields,
 * while version 2 schemas use a unified `sequences` object with sequence IDs.
 *
 * @param schema - The serialized schema to upgrade
 * @returns A Result containing the upgraded schema or an error message
 *
 * @example
 * ```ts
 * const v1Schema = {
 *   schemaVersion: 1,
 *   storeVersion: 1,
 *   recordVersions: {
 *     book: { version: 2 },
 *     author: { version: 1, subTypeVersions: { fiction: 1 }, subTypeKey: 'genre' }
 *   }
 * }
 *
 * const result = upgradeSchema(v1Schema)
 * if (result.ok) {
 *   console.log(result.value.sequences)
 *   // { 'com.tldraw.store': 1, 'com.tldraw.book': 2, 'com.tldraw.author': 1, 'com.tldraw.author.fiction': 1 }
 * }
 * ```
 *
 * @public
 */
export function upgradeSchema(schema: SerializedSchema): Result<SerializedSchemaV2, string> {
	if (schema.schemaVersion > 2 || schema.schemaVersion < 1) return Result.err('Bad schema version')
	if (schema.schemaVersion === 2) return Result.ok(schema as SerializedSchemaV2)
	const result: SerializedSchemaV2 = {
		schemaVersion: 2,
		sequences: {
			'com.tldraw.store': schema.storeVersion,
		},
	}

	for (const [typeName, recordVersion] of Object.entries(schema.recordVersions)) {
		result.sequences[`com.tldraw.${typeName}`] = recordVersion.version
		if ('subTypeKey' in recordVersion) {
			for (const [subType, version] of Object.entries(recordVersion.subTypeVersions)) {
				result.sequences[`com.tldraw.${typeName}.${subType}`] = version
			}
		}
	}
	return Result.ok(result)
}

/**
 * Information about a record validation failure that occurred in the store.
 *
 * This interface provides context about validation errors, including the failed
 * record, the store state, and the operation phase where the failure occurred.
 * It's used by validation failure handlers to implement recovery strategies.
 *
 * @example
 * ```ts
 * const schema = StoreSchema.create(
 *   { book: Book },
 *   {
 *     onValidationFailure: (failure: StoreValidationFailure<Book>) => {
 *       console.error(`Validation failed during ${failure.phase}:`, failure.error)
 *       console.log('Failed record:', failure.record)
 *       console.log('Previous record:', failure.recordBefore)
 *
 *       // Return a corrected version of the record
 *       return { ...failure.record, title: failure.record.title || 'Untitled' }
 *     }
 *   }
 * )
 * ```
 *
 * @public
 */
export interface StoreValidationFailure<R extends UnknownRecord> {
	error: unknown
	store: Store<R>
	record: R
	phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests'
	recordBefore: R | null
}

/**
 * Configuration options for creating a StoreSchema.
 *
 * These options control migration behavior, validation error handling,
 * and integrity checking for the store schema.
 *
 * @example
 * ```ts
 * const options: StoreSchemaOptions<MyRecord, MyProps> = {
 *   migrations: [bookMigrations, authorMigrations],
 *   onValidationFailure: (failure) => {
 *     // Log the error and return a corrected record
 *     console.error('Validation failed:', failure.error)
 *     return sanitizeRecord(failure.record)
 *   },
 *   createIntegrityChecker: (store) => {
 *     // Set up integrity checking logic
 *     return setupIntegrityChecks(store)
 *   }
 * }
 * ```
 *
 * @public
 */
export interface StoreSchemaOptions<R extends UnknownRecord, P> {
	migrations?: MigrationSequence[]
	/** @public */
	onValidationFailure?(data: StoreValidationFailure<R>): R
	/** @internal */
	createIntegrityChecker?(store: Store<R, P>): void
}

/**
 * Manages the schema definition, validation, and migration system for a Store.
 *
 * StoreSchema coordinates record types, handles data migrations between schema
 * versions, validates records, and provides the foundational structure for
 * reactive stores. It acts as the central authority for data consistency
 * and evolution within the store system.
 *
 * @example
 * ```ts
 * // Define record types
 * const Book = createRecordType<Book>('book', { scope: 'document' })
 * const Author = createRecordType<Author>('author', { scope: 'document' })
 *
 * // Create schema with migrations
 * const schema = StoreSchema.create(
 *   { book: Book, author: Author },
 *   {
 *     migrations: [bookMigrations, authorMigrations],
 *     onValidationFailure: (failure) => {
 *       console.warn('Validation failed, using default:', failure.error)
 *       return failure.record // or return a corrected version
 *     }
 *   }
 * )
 *
 * // Use with store
 * const store = new Store({ schema })
 * ```
 *
 * @public
 */
export class StoreSchema<R extends UnknownRecord, P = unknown> {
	/**
	 * Creates a new StoreSchema with the given record types and options.
	 *
	 * This static factory method is the recommended way to create a StoreSchema.
	 * It ensures type safety while providing a clean API for schema definition.
	 *
	 * @param types - Object mapping type names to their RecordType definitions
	 * @param options - Optional configuration for migrations, validation, and integrity checking
	 * @returns A new StoreSchema instance
	 *
	 * @example
	 * ```ts
	 * const Book = createRecordType<Book>('book', { scope: 'document' })
	 * const Author = createRecordType<Author>('author', { scope: 'document' })
	 *
	 * const schema = StoreSchema.create(
	 *   {
	 *     book: Book,
	 *     author: Author
	 *   },
	 *   {
	 *     migrations: [bookMigrations],
	 *     onValidationFailure: (failure) => failure.record
	 *   }
	 * )
	 * ```
	 *
	 * @public
	 */
	static create<R extends UnknownRecord, P = unknown>(
		// HACK: making this param work with RecordType is an enormous pain
		// let's just settle for making sure each typeName has a corresponding RecordType
		// and accept that this function won't be able to infer the record type from it's arguments
		types: { [TypeName in R['typeName']]: { createId: any } },
		options?: StoreSchemaOptions<R, P>
	): StoreSchema<R, P> {
		return new StoreSchema<R, P>(types as any, options ?? {})
	}

	readonly migrations: Record<string, MigrationSequence> = {}
	readonly sortedMigrations: readonly Migration[]
	private readonly migrationCache = new WeakMap<SerializedSchema, Result<Migration[], string>>()

	private constructor(
		public readonly types: {
			[Record in R as Record['typeName']]: RecordType<R, any>
		},
		private readonly options: StoreSchemaOptions<R, P>
	) {
		for (const m of options.migrations ?? []) {
			assert(!this.migrations[m.sequenceId], `Duplicate migration sequenceId ${m.sequenceId}`)
			validateMigrations(m)
			this.migrations[m.sequenceId] = m
		}
		const allMigrations = Object.values(this.migrations).flatMap((m) => m.sequence)
		this.sortedMigrations = sortMigrations(allMigrations)

		for (const migration of this.sortedMigrations) {
			if (!migration.dependsOn?.length) continue
			for (const dep of migration.dependsOn) {
				const depMigration = allMigrations.find((m) => m.id === dep)
				assert(depMigration, `Migration '${migration.id}' depends on missing migration '${dep}'`)
			}
		}
	}

	/**
	 * Validates a record using its corresponding RecordType validator.
	 *
	 * This method ensures that records conform to their type definitions before
	 * being stored. If validation fails and an onValidationFailure handler is
	 * provided, it will be called to potentially recover from the error.
	 *
	 * @param store - The store instance where validation is occurring
	 * @param record - The record to validate
	 * @param phase - The lifecycle phase where validation is happening
	 * @param recordBefore - The previous version of the record (for updates)
	 * @returns The validated record, potentially modified by validation failure handler
	 *
	 * @example
	 * ```ts
	 * try {
	 *   const validatedBook = schema.validateRecord(
	 *     store,
	 *     { id: 'book:1', typeName: 'book', title: '', author: 'Jane Doe' },
	 *     'createRecord',
	 *     null
	 *   )
	 * } catch (error) {
	 *   console.error('Record validation failed:', error)
	 * }
	 * ```
	 *
	 * @public
	 */
	validateRecord(
		store: Store<R>,
		record: R,
		phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests',
		recordBefore: R | null
	): R {
		try {
			const recordType = getOwnProperty(this.types, record.typeName)
			if (!recordType) {
				throw new Error(`Missing definition for record type ${record.typeName}`)
			}
			return recordType.validate(record, recordBefore ?? undefined)
		} catch (error: unknown) {
			if (this.options.onValidationFailure) {
				return this.options.onValidationFailure({
					store,
					record,
					phase,
					recordBefore,
					error,
				})
			} else {
				throw error
			}
		}
	}

	/**
	 * Gets all migrations that need to be applied to upgrade from a persisted schema
	 * to the current schema version.
	 *
	 * This method compares the persisted schema with the current schema and determines
	 * which migrations need to be applied to bring the data up to date. It handles
	 * both regular migrations and retroactive migrations, and caches results for
	 * performance.
	 *
	 * @param persistedSchema - The schema version that was previously persisted
	 * @returns A Result containing the list of migrations to apply, or an error message
	 *
	 * @example
	 * ```ts
	 * const persistedSchema = {
	 *   schemaVersion: 2,
	 *   sequences: { 'com.tldraw.book': 1, 'com.tldraw.author': 0 }
	 * }
	 *
	 * const migrationsResult = schema.getMigrationsSince(persistedSchema)
	 * if (migrationsResult.ok) {
	 *   console.log('Migrations to apply:', migrationsResult.value.length)
	 *   // Apply each migration to bring data up to date
	 * }
	 * ```
	 *
	 * @public
	 */
	public getMigrationsSince(persistedSchema: SerializedSchema): Result<Migration[], string> {
		// Check cache first
		const cached = this.migrationCache.get(persistedSchema)
		if (cached) {
			return cached
		}

		const upgradeResult = upgradeSchema(persistedSchema)
		if (!upgradeResult.ok) {
			// Cache the error result
			this.migrationCache.set(persistedSchema, upgradeResult)
			return upgradeResult
		}
		const schema = upgradeResult.value
		const sequenceIdsToInclude = new Set(
			// start with any shared sequences
			Object.keys(schema.sequences).filter((sequenceId) => this.migrations[sequenceId])
		)

		// also include any sequences that are not in the persisted schema but are marked as postHoc
		for (const sequenceId in this.migrations) {
			if (schema.sequences[sequenceId] === undefined && this.migrations[sequenceId].retroactive) {
				sequenceIdsToInclude.add(sequenceId)
			}
		}

		if (sequenceIdsToInclude.size === 0) {
			const result = Result.ok([])
			// Cache the empty result
			this.migrationCache.set(persistedSchema, result)
			return result
		}

		const allMigrationsToInclude = new Set<MigrationId>()
		for (const sequenceId of sequenceIdsToInclude) {
			const theirVersion = schema.sequences[sequenceId]
			if (
				(typeof theirVersion !== 'number' && this.migrations[sequenceId].retroactive) ||
				theirVersion === 0
			) {
				for (const migration of this.migrations[sequenceId].sequence) {
					allMigrationsToInclude.add(migration.id)
				}
				continue
			}
			const theirVersionId = `${sequenceId}/${theirVersion}`
			const idx = this.migrations[sequenceId].sequence.findIndex((m) => m.id === theirVersionId)
			// todo: better error handling
			if (idx === -1) {
				const result = Result.err('Incompatible schema?')
				// Cache the error result
				this.migrationCache.set(persistedSchema, result)
				return result
			}
			for (const migration of this.migrations[sequenceId].sequence.slice(idx + 1)) {
				allMigrationsToInclude.add(migration.id)
			}
		}

		// collect any migrations
		const result = Result.ok(
			this.sortedMigrations.filter(({ id }) => allMigrationsToInclude.has(id))
		)
		// Cache the result
		this.migrationCache.set(persistedSchema, result)
		return result
	}

	/**
	 * Migrates a single persisted record to match the current schema version.
	 *
	 * This method applies the necessary migrations to transform a record from an
	 * older (or newer) schema version to the current version. It supports both
	 * forward ('up') and backward ('down') migrations.
	 *
	 * @param record - The record to migrate
	 * @param persistedSchema - The schema version the record was persisted with
	 * @param direction - Direction to migrate ('up' for newer, 'down' for older)
	 * @returns A MigrationResult containing the migrated record or an error
	 *
	 * @example
	 * ```ts
	 * const oldRecord = { id: 'book:1', typeName: 'book', title: 'Old Title', publishDate: '2020-01-01' }
	 * const oldSchema = { schemaVersion: 2, sequences: { 'com.tldraw.book': 1 } }
	 *
	 * const result = schema.migratePersistedRecord(oldRecord, oldSchema, 'up')
	 * if (result.type === 'success') {
	 *   console.log('Migrated record:', result.value)
	 *   // Record now has publishedYear instead of publishDate
	 * } else {
	 *   console.error('Migration failed:', result.reason)
	 * }
	 * ```
	 *
	 * @public
	 */
	migratePersistedRecord(
		record: R,
		persistedSchema: SerializedSchema,
		direction: 'up' | 'down' = 'up'
	): MigrationResult<R> {
		const migrations = this.getMigrationsSince(persistedSchema)
		if (!migrations.ok) {
			// TODO: better error
			console.error('Error migrating record', migrations.error)
			return { type: 'error', reason: MigrationFailureReason.MigrationError }
		}
		let migrationsToApply = migrations.value
		if (migrationsToApply.length === 0) {
			return { type: 'success', value: record }
		}

		if (migrationsToApply.some((m) => m.scope === 'store')) {
			return {
				type: 'error',
				reason:
					direction === 'down'
						? MigrationFailureReason.TargetVersionTooOld
						: MigrationFailureReason.TargetVersionTooNew,
			}
		}

		if (direction === 'down') {
			if (!migrationsToApply.every((m) => m.down)) {
				return {
					type: 'error',
					reason: MigrationFailureReason.TargetVersionTooOld,
				}
			}
			migrationsToApply = migrationsToApply.slice().reverse()
		}

		record = structuredClone(record)
		try {
			for (const migration of migrationsToApply) {
				if (migration.scope === 'store') throw new Error(/* won't happen, just for TS */)
				const shouldApply = migration.filter ? migration.filter(record) : true
				if (!shouldApply) continue
				const result = migration[direction]!(record)
				if (result) {
					record = structuredClone(result) as any
				}
			}
		} catch (e) {
			console.error('Error migrating record', e)
			return { type: 'error', reason: MigrationFailureReason.MigrationError }
		}

		return { type: 'success', value: record }
	}

	/**
	 * Migrates an entire store snapshot to match the current schema version.
	 *
	 * This method applies all necessary migrations to bring a persisted store
	 * snapshot up to the current schema version. It handles both record-level
	 * and store-level migrations, and can optionally mutate the input store
	 * for performance.
	 *
	 * @param snapshot - The store snapshot containing data and schema information
	 * @param opts - Options controlling migration behavior
	 *   - mutateInputStore - Whether to modify the input store directly (default: false)
	 * @returns A MigrationResult containing the migrated store or an error
	 *
	 * @example
	 * ```ts
	 * const snapshot = {
	 *   schema: { schemaVersion: 2, sequences: { 'com.tldraw.book': 1 } },
	 *   store: {
	 *     'book:1': { id: 'book:1', typeName: 'book', title: 'Old Book', publishDate: '2020-01-01' }
	 *   }
	 * }
	 *
	 * const result = schema.migrateStoreSnapshot(snapshot)
	 * if (result.type === 'success') {
	 *   console.log('Migrated store:', result.value)
	 *   // All records are now at current schema version
	 * }
	 * ```
	 *
	 * @public
	 */
	migrateStoreSnapshot(
		snapshot: StoreSnapshot<R>,
		opts?: { mutateInputStore?: boolean }
	): MigrationResult<SerializedStore<R>> {
		let { store } = snapshot
		const migrations = this.getMigrationsSince(snapshot.schema)
		if (!migrations.ok) {
			// TODO: better error
			console.error('Error migrating store', migrations.error)
			return { type: 'error', reason: MigrationFailureReason.MigrationError }
		}
		const migrationsToApply = migrations.value
		if (migrationsToApply.length === 0) {
			return { type: 'success', value: store }
		}

		if (!opts?.mutateInputStore) {
			store = structuredClone(store)
		}

		try {
			for (const migration of migrationsToApply) {
				if (migration.scope === 'record') {
					for (const [id, record] of Object.entries(store)) {
						const shouldApply = migration.filter ? migration.filter(record as UnknownRecord) : true
						if (!shouldApply) continue
						const result = migration.up!(record as any)
						if (result) {
							store[id as keyof typeof store] = result as any
						}
					}
				} else if (migration.scope === 'store') {
					const result = migration.up!(store)
					if (result) {
						store = result as any
					}
				} else {
					exhaustiveSwitchError(migration)
				}
			}
		} catch (e) {
			console.error('Error migrating store', e)
			return { type: 'error', reason: MigrationFailureReason.MigrationError }
		}

		return { type: 'success', value: store }
	}

	/**
	 * Creates an integrity checker function for the given store.
	 *
	 * This method calls the createIntegrityChecker option if provided, allowing
	 * custom integrity checking logic to be set up for the store. The integrity
	 * checker is used to validate store consistency and catch data corruption.
	 *
	 * @param store - The store instance to create an integrity checker for
	 * @returns An integrity checker function, or undefined if none is configured
	 *
	 * @internal
	 */
	createIntegrityChecker(store: Store<R, P>): (() => void) | undefined {
		return this.options.createIntegrityChecker?.(store) ?? undefined
	}

	/**
	 * Serializes the current schema to a SerializedSchemaV2 format.
	 *
	 * This method creates a serialized representation of the current schema,
	 * capturing the latest version number for each migration sequence.
	 * The result can be persisted and later used to determine what migrations
	 * need to be applied when loading data.
	 *
	 * @returns A SerializedSchemaV2 object representing the current schema state
	 *
	 * @example
	 * ```ts
	 * const serialized = schema.serialize()
	 * console.log(serialized)
	 * // {
	 * //   schemaVersion: 2,
	 * //   sequences: {
	 * //     'com.tldraw.book': 3,
	 * //     'com.tldraw.author': 2
	 * //   }
	 * // }
	 *
	 * // Store this with your data for future migrations
	 * localStorage.setItem('schema', JSON.stringify(serialized))
	 * ```
	 *
	 * @public
	 */
	serialize(): SerializedSchemaV2 {
		return {
			schemaVersion: 2,
			sequences: Object.fromEntries(
				Object.values(this.migrations).map(({ sequenceId, sequence }) => [
					sequenceId,
					sequence.length ? parseMigrationId(sequence.at(-1)!.id).version : 0,
				])
			),
		}
	}

	/**
	 * Serializes a schema representing the earliest possible version.
	 *
	 * This method creates a serialized schema where all migration sequences
	 * are set to version 0, representing the state before any migrations
	 * have been applied. This is used in specific legacy scenarios.
	 *
	 * @returns A SerializedSchema with all sequences set to version 0
	 *
	 * @deprecated This is only here for legacy reasons, don't use it unless you have david's blessing!
	 * @internal
	 */
	serializeEarliestVersion(): SerializedSchema {
		return {
			schemaVersion: 2,
			sequences: Object.fromEntries(
				Object.values(this.migrations).map(({ sequenceId }) => [sequenceId, 0])
			),
		}
	}

	/**
	 * Gets the RecordType definition for a given type name.
	 *
	 * This method retrieves the RecordType associated with the specified
	 * type name, which contains the record's validation, creation, and
	 * other behavioral logic.
	 *
	 * @param typeName - The name of the record type to retrieve
	 * @returns The RecordType definition for the specified type
	 *
	 * @throws Will throw an error if the record type does not exist
	 *
	 * @internal
	 */
	getType(typeName: string) {
		const type = getOwnProperty(this.types, typeName)
		assert(type, 'record type does not exists')
		return type
	}
}
