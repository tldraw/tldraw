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

/** @public */
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

/** @public */
export interface SerializedSchemaV2 {
	schemaVersion: 2
	sequences: {
		[sequenceId: string]: number
	}
}

/** @public */
export type SerializedSchema = SerializedSchemaV1 | SerializedSchemaV2

export function upgradeSchema(schema: SerializedSchema): Result<SerializedSchemaV2, string> {
	if (schema.schemaVersion > 2 || schema.schemaVersion < 1) return Result.err('Bad schema version')
	if (schema.schemaVersion === 2) return Result.ok(schema as SerializedSchemaV2)
	const result: SerializedSchemaV2 = {
		schemaVersion: 2,
		sequences: {},
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

/** @public */
export interface StoreSchemaOptions<R extends UnknownRecord, P> {
	migrations?: MigrationSequence[]
	/** @public */
	onValidationFailure?: (data: {
		error: unknown
		store: Store<R>
		record: R
		phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests'
		recordBefore: R | null
	}) => R
	/** @internal */
	createIntegrityChecker?: (store: Store<R, P>) => void
}

/** @public */
export class StoreSchema<R extends UnknownRecord, P = unknown> {
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

	// TODO: use a weakmap to store the result of this function
	public getMigrationsSince(persistedSchema: SerializedSchema): Result<Migration[], string> {
		const upgradeResult = upgradeSchema(persistedSchema)
		if (!upgradeResult.ok) {
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
			return Result.ok([])
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
				return Result.err('Incompatible schema?')
			}
			for (const migration of this.migrations[sequenceId].sequence.slice(idx + 1)) {
				allMigrationsToInclude.add(migration.id)
			}
		}

		// collect any migrations
		return Result.ok(this.sortedMigrations.filter(({ id }) => allMigrationsToInclude.has(id)))
	}

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

	migrateStoreSnapshot(snapshot: StoreSnapshot<R>): MigrationResult<SerializedStore<R>> {
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

		store = structuredClone(store)

		try {
			for (const migration of migrationsToApply) {
				if (migration.scope === 'record') {
					for (const [id, record] of Object.entries(store)) {
						const shouldApply = migration.filter ? migration.filter(record as UnknownRecord) : true
						if (!shouldApply) continue
						const result = migration.up!(record as any)
						if (result) {
							store[id as keyof typeof store] = structuredClone(result) as any
						}
					}
				} else if (migration.scope === 'store') {
					const result = migration.up!(store)
					if (result) {
						store = structuredClone(result) as any
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

	/** @internal */
	createIntegrityChecker(store: Store<R, P>): (() => void) | undefined {
		return this.options.createIntegrityChecker?.(store) ?? undefined
	}

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
	 * @deprecated This is only here for legacy reasons, don't use it unless you have david's blessing!
	 */
	serializeEarliestVersion(): SerializedSchema {
		return {
			schemaVersion: 2,
			sequences: Object.fromEntries(
				Object.values(this.migrations).map(({ sequenceId }) => [sequenceId, 0])
			),
		}
	}

	/** @internal */
	getType(typeName: string) {
		const type = getOwnProperty(this.types, typeName)
		assert(type, 'record type does not exists')
		return type
	}
}
