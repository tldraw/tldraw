/* eslint-disable deprecation/deprecation */
import {
	Result,
	getOwnProperty,
	objectMapEntries,
	objectMapFromEntries,
	objectMapValues,
} from '@tldraw/utils'
import { UnknownRecord } from './BaseRecord'
import { LegacyMigrator } from './LegacyMigrator'
import { RecordType } from './RecordType'
import { SerializedStore, Store, StoreSnapshot } from './Store'
import { MigrationFailureReason, MigrationResult, Migrations } from './legacy_migrate'
import { Migration, MigrationId, MigrationSequence } from './migrate'

const LEGACY_SCHEMA_VERSION = 1
const CURRENT_SCHEMA_VERSION = 2

export type SerializedSchema =
	| {
			/** Schema version is the version for this type you're looking at right now */
			schemaVersion: typeof CURRENT_SCHEMA_VERSION
			versionHistory: MigrationId[]
	  }
	// Deprecated previous schema version
	| {
			/**
			 * Schema version is the version for this type you're looking at right now
			 */
			schemaVersion: typeof LEGACY_SCHEMA_VERSION
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
export type StoreSchemaOptions<R extends UnknownRecord, P> = {
	/**
	 * @public
	 * Any migrations for the store's data.
	 */
	migrations?: MigrationOptions
	/** @deprecated - Use `migrations` instead. */
	snapshotMigrations?: Migrations
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

	private readonly __legacyMigrator: LegacyMigrator | null

	private readonly sortedMigrationIds: MigrationId[]
	private readonly migrations: ReadonlyMap<string, Migration>

	private constructor(
		public readonly types: {
			[Record in R as Record['typeName']]: RecordType<R, any>
		},
		private readonly options: StoreSchemaOptions<R, P>
	) {
		// TODO: test that everything is fine with empty migrations
		const { order, sequences } = options.migrations ?? { order: [], sequences: [] }
		if (options.snapshotMigrations) {
			const typesWithLegacyMigrations = objectMapEntries(types).filter(([_, t]) => t.migrations)
			this.__legacyMigrator = new LegacyMigrator(
				objectMapFromEntries(
					typesWithLegacyMigrations.map(
						([typeName, recordType]) => [typeName, recordType.migrations!] as const
					)
				),
				options.snapshotMigrations
			)
		} else {
			this.__legacyMigrator = null
		}

		this.sortedMigrationIds = [...order]

		const migrations = new Map<string, Migration>()
		this.migrations = migrations

		const allUnusedMigrationIds = new Set<string>()

		// check that sequences are valid and included in linear order
		for (const { sequence, versionAtInstallation } of sequences) {
			const unusedIdx = sequence.migrations.findIndex((m) => m.id === versionAtInstallation)
			if (unusedIdx === -1) {
				throw new Error(`Missing versionAtInstallation id ${JSON.stringify(versionAtInstallation)}`)
			}
			const unusedMigrationIds = sequence.migrations.slice(0, unusedIdx).map((m) => m.id)

			// if any unused are present in `order` it's an error
			for (const unusedMigrationId of unusedMigrationIds) {
				if (!unusedMigrationId.startsWith(sequence.id) + '/') {
					throw new Error(
						`Migration id ${JSON.stringify(unusedMigrationId)} must start with ${JSON.stringify(
							sequence.id
						)}`
					)
				}
				if (allUnusedMigrationIds.has(unusedMigrationId)) {
					throw new Error(`Duplicate migration id ${JSON.stringify(unusedMigrationId)}`)
				}
				if (order.includes(unusedMigrationId)) {
					throw new Error(
						`Unused migration id ${JSON.stringify(
							unusedMigrationId
						)} is present in your migration order. Did you specify 'versionAtInstallation' correctly?`
					)
				}
				allUnusedMigrationIds.add(unusedMigrationId)
			}

			// now check that the migrations which are supposed to be in `order` are all present
			// and in the right... order
			const usedMigrations = sequence.migrations.slice(unusedIdx)
			const missingMigrations = []
			let lastIdx = -1
			for (const migration of usedMigrations) {
				if (!migration.id.startsWith(sequence.id) + '/') {
					throw new Error(
						`Migration id ${JSON.stringify(migration.id)} must start with ${JSON.stringify(
							sequence.id
						)}`
					)
				}
				if (migrations.has(migration.id)) {
					throw new Error(`Duplicate migration id ${migration.id}`)
				}
				migrations.set(migration.id, migration)
				const orderIdx = order.indexOf(migration.id)
				if (orderIdx === -1) {
					missingMigrations.push(migration.id)
				} else if (orderIdx <= lastIdx) {
					throw new Error(
						`Migration id ${JSON.stringify(
							migration.id
						)} is out of order. It should come after ${JSON.stringify(order[lastIdx])}`
					)
				} else {
					lastIdx = orderIdx
				}
			}

			if (missingMigrations.length) {
				// TODO: add link to migration docs
				throw new Error(
					`Missing migrations from your migration order. Did you just update a tldraw dependency?
Paste these in at the end of your existing migration ordering.
${JSON.stringify(missingMigrations)}
`
				)
			}
		}

		// check that all ids are present and any inter-sequence dependencies are satisfied
		for (let i = 0; i < this.sortedMigrationIds.length; i++) {
			const id = this.sortedMigrationIds[i]
			const migration = migrations.get(id)
			if (!migration) {
				// TODO: Link to migration docs
				throw new Error(
					`Missing migration details for ${JSON.stringify(
						id
					)}. Did you forget to add a migration sequence?`
				)
			}
			if (migration.dependsOn?.length) {
				for (const dependentId of migration.dependsOn) {
					if (allUnusedMigrationIds.has(dependentId)) {
						// if a migration was unused this dependency has implicitly been satisfied
						continue
					}
					const depIdx = this.sortedMigrationIds.indexOf(dependentId)
					if (depIdx === -1) {
						throw new Error(
							`Migration id ${JSON.stringify(id)} depends on missing migration ${JSON.stringify(
								dependentId
							)}`
						)
					}
					if (depIdx === i) {
						throw new Error(
							`Migration id ${JSON.stringify(id)} depends on itself. This is not allowed.`
						)
					}
					if (depIdx > i) {
						throw new Error(
							`Migration id ${JSON.stringify(id)} depends on migration ${JSON.stringify(
								dependentId
							)} which comes after it. This is not allowed.`
						)
					}
				}
			}
		}
	}

	// eslint-disable-next-line no-restricted-syntax
	get currentStoreVersion(): number {
		return this.options.snapshotMigrations?.currentVersion ?? 0
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

	private getMigrationsSince(schema: SerializedSchema): Result<Migration[], string> {
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
							throw new Error(res.reason)
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

Theirs: ${JSON.stringify(schema.versionHistory)}
Ours:   ${JSON.stringify(this.currentStoreVersion)}
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

	serialize(): SerializedSchema {
		return {
			schemaVersion: 2,
			versionHistory: [...this.sortedMigrationIds],
		}
	}

	serializeEarliestVersion(): SerializedSchema {
		return {
			schemaVersion: 2,
			versionHistory: [],
		}
	}
}

type MigrationOptions = {
	sequences: Array<{
		sequence: MigrationSequence
		versionAtInstallation: MigrationId
	}>
	order: MigrationId[]
}
