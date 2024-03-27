import { getOwnProperty, objectMapValues } from '@tldraw/utils'
import { IdOf, UnknownRecord, isRecord } from './BaseRecord'
import { RecordType } from './RecordType'
import { SerializedStore, Store, StoreSnapshot } from './Store'
import {
	Migration,
	MigrationFailureReason,
	MigrationResult,
	Migrations,
	migrateRecord,
} from './migrate'

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
		direction: 'up' | 'down'
	): MigrationResult<R> {
		const ourType = getOwnProperty(this.types, record.typeName)
		const persistedType = persistedSchema.recordVersions[record.typeName]
		if (!persistedType || !ourType) {
			return migrationError(MigrationFailureReason.UnknownType)
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
						})
					: migrateRecord<R>({
							record,
							migrations: ourType.migrations,
							fromVersion: ourVersion,
							toVersion: persistedVersion,
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
			return migrationError(MigrationFailureReason.UnrecognizedSubtype)
		}

		// if the persistedSubTypeVersion is undefined then the record was either created after the schema
		// was persisted, or it was created in a different place to where the schema was persisted.
		// either way we don't know what to do with it safely, so let's return failure.
		if (persistedSubTypeVersion === undefined) {
			return migrationError(MigrationFailureReason.IncompatibleSubtype)
		}

		const result =
			direction === 'up'
				? migrateRecord<R>({
						record,
						migrations: ourSubTypeMigrations,
						fromVersion: persistedSubTypeVersion,
						toVersion: ourSubTypeMigrations.currentVersion,
					})
				: migrateRecord<R>({
						record,
						migrations: ourSubTypeMigrations,
						fromVersion: ourSubTypeMigrations.currentVersion,
						toVersion: persistedSubTypeVersion,
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
				return migrationError(MigrationFailureReason.TargetVersionTooOld)
			}

			// We want to migrate to a point where the store version is our store version
			let currentStoreVersion = ourStoreVersion

			if (ourStoreVersion > persistedStoreVersion) {
				const fromStoreVersion = persistedStoreVersion
				const toStoreVersion = ourStoreVersion

				currentStoreVersion = fromStoreVersion

				// We'll keep track of which migrations we've run so that we don't run them twice
				const visitedMigrators = new Set<Migration | number>()

				// For each version of the store...
				while (currentStoreVersion < toStoreVersion) {
					// Get the snapshot migrator for the next version
					const nextVersion = currentStoreVersion + 1

					const snapshotMigrator = snapshotMigrations.migrators[nextVersion]
					if (!snapshotMigrator) return migrationError(MigrationFailureReason.TargetVersionTooNew)

					if (typeof snapshotMigrator === 'number') {
						// It doesn't make sense for the store to have a dependency marker, those are for records that depend on snapshot migrations
						throw Error(`[migrateStore] snapshot migrators should not include dependency markers`)
					}

					// Migrate the store to the next version
					store = snapshotMigrator.up(store)

					// Now update the records that a) don't depend on higher store migrations and b) haven't already been run
					const updated: R[] = []

					// For every record in the store...
					for (let record of objectMapValues(store)) {
						if (!isRecord(record)) throw new Error('[migrateRecord] object is not a record')

						const ourType = getOwnProperty(this.types, record.typeName)
						const persistedType = snapshot.schema.recordVersions[record.typeName]
						if (!persistedType || !ourType) {
							return migrationError(MigrationFailureReason.UnknownType)
						}

						const ourVersion = ourType.migrations.currentVersion
						const persistedVersion = persistedType.version

						// The persisted version is different from our version, so we need to migrate the record
						if (ourVersion !== persistedVersion) {
							const fromVersion = persistedVersion
							const toVersion = ourVersion
							const migrations = ourType.migrations

							if (!isRecord(record)) throw new Error('[migrateRecord] object is not a record')

							const { typeName, id, ...others } = record

							let recordWithoutMeta = others
							let currentVersion = fromVersion

							// For each version of the record that we need to migrate up to...
							recordMigrationsLoopForStoreVersion: while (currentVersion < toVersion) {
								const nextVersion = currentVersion + 1

								// Get the migrator for the next version
								const migrator = migrations.migrators[nextVersion]
								if (!migrator) return migrationError(MigrationFailureReason.TargetVersionTooNew)

								// Have we already seen this migrator / dependency marker?
								if (visitedMigrators.has(migrator)) {
									// If so, we're done with this record for this store version
									currentVersion = nextVersion
									continue recordMigrationsLoopForStoreVersion
								}

								// Ok, first time seeing this migrator / dependency marker, so mark it as visited
								visitedMigrators.add(migrator)

								// If it's a dependency marker...
								if (typeof migrator === 'number') {
									// Is it a marker for a store version that's higher than the current store version we've just migrated to?
									if (migrator > currentStoreVersion) {
										// If so, we're done with this record for this store version
										break recordMigrationsLoopForStoreVersion
									} else {
										// Otherwise, it's a noop, so move on to the next record migration
										currentVersion = nextVersion
										continue recordMigrationsLoopForStoreVersion
									}
								}

								// If we haven't already broken or continued, then the migrator is a regular migrator that comes after
								// the last dependency marker and before a dependency marker that references a later store version, so we can run it
								recordWithoutMeta = migrator.up(recordWithoutMeta) as any
								currentVersion = nextVersion
							}

							// Do the same again but in reverse for down migrations
							recordMigrationsLoopForStoreVersion: while (currentVersion > toVersion) {
								const nextVersion = currentVersion - 1
								const migrator = migrations.migrators[currentVersion]
								if (!migrator) return migrationError(MigrationFailureReason.TargetVersionTooOld)

								if (visitedMigrators.has(migrator)) {
									currentVersion = nextVersion
									continue recordMigrationsLoopForStoreVersion
								}

								visitedMigrators.add(migrator)

								if (typeof migrator === 'number') {
									if (migrator > currentStoreVersion) {
										break recordMigrationsLoopForStoreVersion
									} else {
										currentVersion = nextVersion
										continue recordMigrationsLoopForStoreVersion
									}
								}

								recordWithoutMeta = migrator.down(recordWithoutMeta) as any
								currentVersion = nextVersion
							}

							record = { ...recordWithoutMeta, id, typeName } as R
						}

						if (!ourType.migrations.subTypeKey) {
							updated.push(record)
							continue
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
								? persistedType.subTypeVersions[
										record[ourType.migrations.subTypeKey as keyof R] as string
									]
								: undefined

						// if ourSubTypeMigrations is undefined then we don't have access to the migrations for this subtype
						// that is almost certainly because we are running on the server and this type was supplied by a 3rd party.
						// It could also be that we are running in a client that is outdated. Either way, we can't migrate this record
						// and we need to let the consumer know so they can handle it.
						if (ourSubTypeMigrations === undefined) {
							return migrationError(MigrationFailureReason.UnrecognizedSubtype)
						}

						// if the persistedSubTypeVersion is undefined then the record was either created after the schema
						// was persisted, or it was created in a different place to where the schema was persisted.
						// either way we don't know what to do with it safely, so let's return failure.
						if (persistedSubTypeVersion === undefined) {
							return migrationError(MigrationFailureReason.IncompatibleSubtype)
						}

						const migrations = ourSubTypeMigrations
						const fromVersion = persistedSubTypeVersion
						const toVersion = ourSubTypeMigrations.currentVersion

						let currentVersion = fromVersion
						if (!isRecord(record)) throw new Error('[migrateRecord] object is not a record')
						const { typeName, id, ...others } = record
						let recordWithoutMeta = others

						recordSubTypeMigrateLoop: while (currentVersion < toVersion) {
							const nextVersion = currentVersion + 1
							const migrator = migrations.migrators[nextVersion]
							if (!migrator) {
								return {
									type: 'error',
									reason: MigrationFailureReason.TargetVersionTooNew,
								}
							}
							if (!visitedMigrators.has(migrator)) {
								visitedMigrators.add(migrator)
								if (typeof migrator === 'number') {
									if (migrator > currentStoreVersion) {
										break recordSubTypeMigrateLoop
									}
								} else {
									recordWithoutMeta = migrator.up(recordWithoutMeta) as any
								}
							}
							currentVersion = nextVersion
						}

						recordSubTypeMigrateLoop: while (currentVersion > toVersion) {
							const nextVersion = currentVersion - 1
							const migrator = migrations.migrators[currentVersion]
							if (!migrator) return migrationError(MigrationFailureReason.TargetVersionTooOld)

							if (!visitedMigrators.has(migrator)) {
								visitedMigrators.add(migrator)
								if (typeof migrator === 'number') {
									if (migrator > currentStoreVersion) {
										break recordSubTypeMigrateLoop
									}
								} else {
									recordWithoutMeta = migrator.down(recordWithoutMeta) as any
								}
							}
							currentVersion = nextVersion
						}

						record = { ...recordWithoutMeta, id, typeName } as R

						updated.push(record)
					}

					if (updated.length) {
						store = { ...store }
						for (const r of updated) {
							store[r.id as IdOf<R>] = r
						}
					}

					currentStoreVersion = nextVersion
				}
			}
		} else {
			// There are no store migrations
			// Migrate all records in the store
			const updated: R[] = []
			for (const r of objectMapValues(store)) {
				const result = this.migratePersistedRecord(r, snapshot.schema, 'up')
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

function migrationError(reason: MigrationFailureReason) {
	return { type: 'error' as const, reason }
}
