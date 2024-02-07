/* eslint-disable deprecation/deprecation */
import { Result, getOwnProperty, objectMapValues, tldrawError } from '@tldraw/utils'
import { UnknownRecord } from './BaseRecord'
import { LegacyMigrator } from './LegacyMigrator'
import { RecordType } from './RecordType'
import { SerializedStore, Store, StoreSnapshot } from './Store'
import { MigrationFailureReason, MigrationResult } from './legacy-migrate'
import { Migration, MigrationId, MigrationsConfig } from './migrate'
import { parseMigrations } from './parseMigrations'

export const CURRENT_SCHEMA_VERSION = 2
const LEGACY_SCHEMA_VERSION = 1

const str = JSON.stringify

/**
 * @public
 */
export type SerializedSchemaV2 = {
	/** Schema version is the version for this type you're looking at right now */
	schemaVersion: 2
	versionHistory: MigrationId[]
}

// TODO: link to docs
/**
 * @deprecated Don't use this unless you know what you're doing!
 * @public
 */
export type SerializedSchemaV1 = {
	/**
	 * Schema version is the version for this type you're looking at right now
	 */
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
 * @public
 */
export type SerializedSchema =
	| SerializedSchemaV1
	// Deprecated previous schema version
	| SerializedSchemaV2

/** @public */
export type StoreSchemaOptions<R extends UnknownRecord, P> = {
	/**
	 * @public
	 * Any migrations for the store's data.
	 */
	migrations?: MigrationsConfig
	__legacyMigrator?: LegacyMigrator
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

	/** @internal */
	readonly __legacyMigrator: LegacyMigrator | null

	private readonly sortedMigrationIds: MigrationId[]
	private readonly migrations: ReadonlyMap<string, Migration>
	private readonly includedSequenceIds: ReadonlySet<string>

	private constructor(
		public readonly types: {
			[Record in R as Record['typeName']]: RecordType<R, any>
		},
		private readonly options: StoreSchemaOptions<R, P>
	) {
		// TODO: test that everything is fine with empty migrations
		this.__legacyMigrator = options.__legacyMigrator ?? null

		const { sortedMigrationIds, migrations, includedSequenceIds } = parseMigrations(
			options.migrations
		)
		this.sortedMigrationIds = sortedMigrationIds
		this.migrations = migrations
		this.includedSequenceIds = includedSequenceIds
	}

	ensureMigrationSequenceIncluded(id: string): void {
		if (!this.includedSequenceIds.has(id)) {
			// TODO: link to migration docs
			throw tldrawError(
				`Missing migration sequence ${str(id)}. Did you forget to add it to the migrations option?`
			)
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
				throw tldrawError(`Missing definition for record type ${record.typeName}`)
			}
			return recordType.validate(record)
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

	public getMigrationsSince(schema: SerializedSchema): Result<Migration[], string> {
		if (schema.schemaVersion === LEGACY_SCHEMA_VERSION) {
			if (!this.__legacyMigrator) {
				return Result.err(
					`Cannot migrate legacy schema because no legacy migrations were provided.`
				)
			}
			return Result.ok<Migration[]>([
				{
					scope: 'store',
					id: 'com.tldraw/__legacy__',
					up: (store) => {
						const res = this.__legacyMigrator!.migrateStoreSnapshot({
							schema: schema as any,
							store,
						})
						if (res.type === 'error') {
							throw tldrawError(res.reason)
						}
						return res.value
					},
				},
				...this.sortedMigrationIds.map((id) => this.migrations.get(id)!),
			])
		}

		// TODO: support bi-directional fixup to relax the following restriction (need to do record vs snapshot)
		// first make sure that all applied migrations exist in our list of migrations
		// in exactly the same order
		for (let i = 0; i < schema.versionHistory.length; i++) {
			const theirs = schema.versionHistory[i]
			const ours = this.sortedMigrationIds[i]
			if (theirs !== ours) {
				return Result.err(
					`Schema migration histories are divergent. 

Theirs: ${str(schema.versionHistory)}
Ours:   ${str(this.sortedMigrationIds)}
`
				)
			}
		}

		return Result.ok(
			this.sortedMigrationIds
				.slice(schema.versionHistory.length)
				.map((id) => this.migrations.get(id)!)
		)
	}

	/**
	 * Migrates an individual record between two schema versions.
	 * This is not always possible, e.g. if there is a store-scoped migration in the migrations to be applied between the two schemas.
	 * @public
	 * @param record - The record to migrate
	 * @param persistedSchema - The persistence target schema. If you are migrating up, this is the schema of the persisted record. If you are migrating down, the record should have the latest schema and this schema is the one you are migrating down to.
	 * @param direction - Whether to migrate 'up' or 'down'
	 * @returns A migration result. This will return a 'success' type if the migration was successful, and an 'error' type if the migration failed. If the migration failed, the reason will be provided in the 'reason' field.
	 */
	migratePersistedRecord(
		record: R,
		persistedSchema: SerializedSchema,
		direction: 'up' | 'down' = 'up'
	): MigrationResult<R> {
		const migrationsToApply = this.getMigrationsSince(persistedSchema)
		if (!migrationsToApply.ok) {
			return { type: 'error', reason: MigrationFailureReason.TargetVersionTooOld }
		}
		if (migrationsToApply.value.length === 0) {
			return { type: 'success', value: record }
		}
		const migrations = [...migrationsToApply.value]
		if (!migrations.every((m) => m[direction] && m.scope === 'record')) {
			return { type: 'error', reason: MigrationFailureReason.TargetVersionTooOld }
		}
		if (direction === 'down') {
			migrations.reverse()
		}

		try {
			for (const migration of migrations) {
				record = migration[direction]!(record as any) as any
			}
		} catch (e) {
			console.error('Failed to apply migration', e)
			return { type: 'error', reason: MigrationFailureReason.MigrationError }
		}

		return { type: 'success', value: record }
	}

	migrateStoreSnapshot(snapshot: StoreSnapshot<R>): MigrationResult<SerializedStore<R>> {
		const migrationsToApply = this.getMigrationsSince(snapshot.schema)
		if (!migrationsToApply.ok) {
			return { type: 'error', reason: MigrationFailureReason.TargetVersionTooOld }
		}
		if (migrationsToApply.value.length === 0) {
			return { type: 'success', value: snapshot.store }
		}

		let store = snapshot.store
		try {
			for (const migration of migrationsToApply.value) {
				if (migration.scope === 'store') {
					store = migration.up(store) as any
				} else {
					const nextStore = { ...store }
					for (const record of objectMapValues(store)) {
						nextStore[record.id as keyof typeof nextStore] = migration.up(record) as any
					}
					store = nextStore
				}
			}
		} catch (e) {
			console.error('Failed to apply migration', e)
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
			versionHistory: [...this.sortedMigrationIds],
		}
	}

	serializeEarliestVersion(): SerializedSchema {
		if (this.__legacyMigrator) {
			return this.__legacyMigrator.serializeEarliestVersion()
		}
		return {
			schemaVersion: 2,
			versionHistory: [],
		}
	}
}
