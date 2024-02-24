import { getOwnProperty, objectMapValues } from '@tldraw/utils'
import { IdOf, UnknownRecord } from './BaseRecord'
import { RecordType } from './RecordType'
import { SerializedStore, Store, StoreSnapshot } from './Store'
import { MigrationFailureReason, MigrationResult, Migrations, migrateRecord } from './migrate'

/** @public */
export interface SerializedSchema {
	/** Schema version is the version for this type you're looking at right now */
	schemaVersion: number
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
	/** @public */
	defaultSnapshotMigrationVersion?: number
	/** @public */
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

	private constructor(
		public readonly types: {
			[Record in R as Record['typeName']]: RecordType<R, any>
		},
		private readonly options: StoreSchemaOptions<R, P>
	) {}

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

	migrateRecordInIsolation(record: R, schema: SerializedSchema): R {
		const result = this.migrateStoreSnapshot({
			store: {
				[record.id]: record,
			} as Record<IdOf<R>, R>,
			schema: schema,
		})
		if (result.type === 'error') {
			throw Error('Could migrate record: ' + result.reason)
		}
		return result.value[record.id as IdOf<R>]
	}

	migratePersistedRecord(
		record: R,
		persistedSchema: SerializedSchema,
		direction: 'up' | 'down',
		storeVersion?: number,
		defaultStoreVersion?: number
	): MigrationResult<R> {
		const ourType = getOwnProperty(this.types, record.typeName)
		const persistedType = persistedSchema.recordVersions[record.typeName]
		if (!persistedType || !ourType) {
			return { type: 'error', reason: MigrationFailureReason.UnknownType }
		}
		const ourVersion = ourType.migrations.currentVersion
		const persistedVersion = persistedType.version
		if (ourVersion !== persistedVersion) {
			const result =
				direction === 'up'
					? migrateRecord<R>({
							record,
							migrations: ourType.migrations,
							fromVersion: persistedVersion,
							toVersion: ourVersion,
							storeVersion,
							defaultStoreVersion,
						})
					: migrateRecord<R>({
							record,
							migrations: ourType.migrations,
							fromVersion: ourVersion,
							toVersion: persistedVersion,
							storeVersion,
							defaultStoreVersion,
						})
			if (result.type === 'error') {
				return result
			}
			record = result.value
		}

		if (!ourType.migrations.subTypeKey) {
			return { type: 'success', value: record }
		}

		// we've handled the main version migration, now we need to handle subtypes
		// subtypes are used by shape and asset types to migrate the props shape, which is configurable
		// by library consumers.

		const ourSubTypeMigrations =
			ourType.migrations.subTypeMigrations?.[
				record[ourType.migrations.subTypeKey as keyof R] as string
			]

		const persistedSubTypeVersion =
			'subTypeVersions' in persistedType
				? persistedType.subTypeVersions[record[ourType.migrations.subTypeKey as keyof R] as string]
				: undefined

		// if ourSubTypeMigrations is undefined then we don't have access to the migrations for this subtype
		// that is almost certainly because we are running on the server and this type was supplied by a 3rd party.
		// It could also be that we are running in a client that is outdated. Either way, we can't migrate this record
		// and we need to let the consumer know so they can handle it.
		if (ourSubTypeMigrations === undefined) {
			return { type: 'error', reason: MigrationFailureReason.UnrecognizedSubtype }
		}

		// if the persistedSubTypeVersion is undefined then the record was either created after the schema
		// was persisted, or it was created in a different place to where the schema was persisted.
		// either way we don't know what to do with it safely, so let's return failure.
		if (persistedSubTypeVersion === undefined) {
			return { type: 'error', reason: MigrationFailureReason.IncompatibleSubtype }
		}

		const result =
			direction === 'up'
				? migrateRecord<R>({
						record,
						migrations: ourSubTypeMigrations,
						fromVersion: persistedSubTypeVersion,
						toVersion: ourSubTypeMigrations.currentVersion,
						storeVersion,
						defaultStoreVersion: this.options.defaultSnapshotMigrationVersion ?? 1,
					})
				: migrateRecord<R>({
						record,
						migrations: ourSubTypeMigrations,
						fromVersion: ourSubTypeMigrations.currentVersion,
						toVersion: persistedSubTypeVersion,
						storeVersion,
						defaultStoreVersion: this.options.defaultSnapshotMigrationVersion ?? 1,
					})

		if (result.type === 'error') {
			return result
		}

		return { type: 'success', value: result.value }
	}

	migrateStoreSnapshot(snapshot: StoreSnapshot<R>): MigrationResult<SerializedStore<R>> {
		let { store } = snapshot
		const { snapshotMigrations } = this.options

		if (snapshotMigrations) {
			// apply store migrations first
			const ourStoreVersion = snapshotMigrations.currentVersion
			const persistedStoreVersion = snapshot.schema.storeVersion ?? 0

			if (ourStoreVersion < persistedStoreVersion) {
				return { type: 'error', reason: MigrationFailureReason.TargetVersionTooOld }
			}

			// We want to migrate to a point where the store version is our store version
			let currentVersion = ourStoreVersion

			if (ourStoreVersion > persistedStoreVersion) {
				const fromVersion = persistedStoreVersion
				const toVersion = ourStoreVersion

				currentVersion = fromVersion

				// For each version of the store...
				while (currentVersion < toVersion) {
					// Get the snapshot migrator for the next version
					const nextVersion = currentVersion + 1

					const snapshotMigrator = snapshotMigrations.migrators[nextVersion]
					if (!snapshotMigrator) {
						return {
							type: 'error',
							reason: MigrationFailureReason.TargetVersionTooNew,
						}
					}

					// Migrate the store to the next version
					store = snapshotMigrator.up(store)

					// Migrate all records in the store for the next version
					// Only the migrtations that have `storeVersion` equal to `nextVersion` will be applied;
					// If the migrations don't have a `storeVersion`, then they'll be applied at the end.
					const updated: R[] = []
					for (const r of objectMapValues(store)) {
						const result = this.migratePersistedRecord(
							r,
							snapshot.schema,
							'up',
							nextVersion,
							// Previously, ALL the store migrations would run, and then ALL the record migrations would run.
							// We've now added the ability to mark a migration as running AFTER a certain store version.
							// If we encounter a migration with a store version, then we need to make sure that all lower version
							// migrations have run first for that record. If we never encounter a store migration for a record,
							// then we can run all of its migrations at the end.
							this.options.defaultSnapshotMigrationVersion ?? ourStoreVersion
						)
						if (result.type === 'error') {
							return result
						} else if (result.value && result.value !== r) {
							updated.push(result.value)
						}
					}
					if (updated.length) {
						store = { ...store }
						for (const r of updated) {
							store[r.id as IdOf<R>] = r
						}
					}

					currentVersion = nextVersion
				}
			}
		} else {
			// There are no store migrations
			// Migrate all records in the store
			const updated: R[] = []
			for (const r of objectMapValues(store)) {
				const result = this.migratePersistedRecord(
					r,
					snapshot.schema,
					'up',
					this.currentStoreVersion,
					this.currentStoreVersion
				)
				if (result.type === 'error') {
					return result
				} else if (result.value && result.value !== r) {
					updated.push(result.value)
				}
			}
			if (updated.length) {
				store = { ...store }
				for (const r of updated) {
					store[r.id as IdOf<R>] = r
				}
			}
		}

		return { type: 'success', value: store }
	}

	/** @internal */
	createIntegrityChecker(store: Store<R, P>): (() => void) | undefined {
		return this.options.createIntegrityChecker?.(store) ?? undefined
	}

	serialize(): SerializedSchema {
		return {
			schemaVersion: 1,
			storeVersion: this.options.snapshotMigrations?.currentVersion ?? 0,
			recordVersions: Object.fromEntries(
				objectMapValues(this.types).map((type) => [
					type.typeName,
					type.migrations.subTypeKey && type.migrations.subTypeMigrations
						? {
								version: type.migrations.currentVersion,
								subTypeKey: type.migrations.subTypeKey,
								subTypeVersions: type.migrations.subTypeMigrations
									? Object.fromEntries(
											Object.entries(type.migrations.subTypeMigrations).map(([k, v]) => [
												k,
												v.currentVersion,
											])
										)
									: undefined,
							}
						: {
								version: type.migrations.currentVersion,
							},
				])
			),
		}
	}

	serializeEarliestVersion(): SerializedSchema {
		return {
			schemaVersion: 1,
			storeVersion: this.options.snapshotMigrations?.firstVersion ?? 0,
			recordVersions: Object.fromEntries(
				objectMapValues(this.types).map((type) => [
					type.typeName,
					type.migrations.subTypeKey && type.migrations.subTypeMigrations
						? {
								version: type.migrations.firstVersion,
								subTypeKey: type.migrations.subTypeKey,
								subTypeVersions: type.migrations.subTypeMigrations
									? Object.fromEntries(
											Object.entries(type.migrations.subTypeMigrations).map(([k, v]) => [
												k,
												v.firstVersion,
											])
										)
									: undefined,
							}
						: {
								version: type.migrations.firstVersion,
							},
				])
			),
		}
	}
}
