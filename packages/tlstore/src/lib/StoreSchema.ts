import { getOwnProperty, objectMapValues } from '@tldraw/utils'
import { Signal } from 'signia'
import { IdOf, UnknownRecord } from './BaseRecord'
import { Migrator } from './Migrator'
import { RecordType } from './RecordType'
import { Store, StoreSnapshot } from './Store'
import { MigrationFailureReason, MigrationResult } from './migrate'

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
	snapshotMigrator?: Migrator
	/** @public */
	onValidationFailure?: (data: {
		error: unknown
		store: Store<R>
		record: R
		phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests'
		recordBefore: R | null
	}) => R
	migrators?: { [TypeName in R['typeName']]?: Migrator }
	validateRecord?: (record: any) => R
	/** @internal */
	createIntegrityChecker?: (store: Store<R, P>) => void
	/** @internal */
	derivePresenceState?: (store: Store<R, P>) => Signal<R | null>
}

/** @public */
export class StoreSchema<R extends UnknownRecord, P = unknown> {
	validateRecord: (record: any) => R
	migrators: { [TypeName in R['typeName']]: Migrator }

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
	) {
		const { migrators, validateRecord = (r: R) => r } = this.options
		this.validateRecord = validateRecord
		this.migrators = migrators
			? (Object.fromEntries(
					Object.keys(types).map((t) => [t, migrators[t as R['typeName']] ?? new Migrator({})])
			  ) as {
					[TypeName in R['typeName']]: Migrator
			  })
			: (Object.fromEntries(Object.keys(types).map((t) => [t, new Migrator({})])) as {
					[TypeName in R['typeName']]: Migrator
			  })
	}

	get currentStoreVersion(): number {
		return this.options.snapshotMigrator?.currentVersion ?? 0
	}

	validateRecordOnCreateOrUpdate(
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
			this.validateRecord(record)
			return record
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

	migratePersistedRecord(
		record: R,
		persistedSchema: SerializedSchema,
		direction: 'up' | 'down' = 'up'
	): MigrationResult<R> {
		const ourMigrator = getOwnProperty(this.migrators, record.typeName)
		const persistedType = persistedSchema.recordVersions[record.typeName]
		if (!persistedType || !ourMigrator) {
			return { type: 'error', reason: MigrationFailureReason.UnknownType }
		}
		const ourVersion = ourMigrator.currentVersion
		const persistedVersion = persistedType.version
		if (ourVersion !== persistedVersion) {
			const result = ourMigrator.migrateRecord(record, direction, persistedVersion)
			if (result.type === 'error') {
				return result
			}
			record = result.value
		}

		if (!ourMigrator.subTypeKey) {
			return { type: 'success', value: record }
		}

		// we've handled the main version migration, now we need to handle subtypes
		// subtypes are used by shape and asset types to migrate the props shape, which is configurable
		// by library consumers.

		const ourSubTypeMigrator =
			ourMigrator.subTypeMigrators?.[record[ourMigrator.subTypeKey as keyof R] as string]

		const persistedSubTypeVersion =
			'subTypeVersions' in persistedType
				? persistedType.subTypeVersions[record[ourMigrator.subTypeKey as keyof R] as string]
				: undefined

		// if ourSubTypeMigrator is undefined then we don't have access to the migrations for this subtype
		// that is almost certainly because we are running on the server and this type was supplied by a 3rd party.
		// It could also be that we are running in a client that is outdated. Either way, we can't migrate this record
		// and we need to let the consumer know so they can handle it.
		if (ourSubTypeMigrator === undefined) {
			return { type: 'error', reason: MigrationFailureReason.UnrecognizedSubtype }
		}

		// if the persistedSubTypeVersion is undefined then the record was either created after the schema
		// was persisted, or it was created in a different place to where the schema was persisted.
		// either way we don't know what to do with it safely, so let's return failure.
		if (persistedSubTypeVersion === undefined) {
			return { type: 'error', reason: MigrationFailureReason.IncompatibleSubtype }
		}

		const result = ourSubTypeMigrator.migrateRecord<R>(record, direction, persistedSubTypeVersion)

		if (result.type === 'error') {
			return result
		}

		return { type: 'success', value: result.value }
	}

	migrateStoreSnapshot(
		storeSnapshot: StoreSnapshot<R>,
		persistedSchema: SerializedSchema
	): MigrationResult<StoreSnapshot<R>> {
		const migrator = this.options.snapshotMigrator
		if (!migrator) {
			return { type: 'success', value: storeSnapshot }
		}
		// apply store migrations first
		const ourStoreVersion = migrator.currentVersion
		const persistedStoreVersion = persistedSchema.storeVersion ?? 0

		if (ourStoreVersion < persistedStoreVersion) {
			return { type: 'error', reason: MigrationFailureReason.TargetVersionTooOld }
		}

		if (ourStoreVersion > persistedStoreVersion) {
			const result = migrator.migrateSnapshot<StoreSnapshot<R>>(
				storeSnapshot,
				'up',
				persistedStoreVersion
			)

			if (result.type === 'error') {
				return result
			}
			storeSnapshot = result.value
		}

		const updated: R[] = []
		for (const r of objectMapValues(storeSnapshot)) {
			const result = this.migratePersistedRecord(r, persistedSchema)
			if (result.type === 'error') {
				return result
			} else if (result.value && result.value !== r) {
				updated.push(result.value)
			}
		}
		if (updated.length) {
			storeSnapshot = { ...storeSnapshot }
			for (const r of updated) {
				storeSnapshot[r.id as IdOf<R>] = r
			}
		}
		return { type: 'success', value: storeSnapshot }
	}

	/** @internal */
	createIntegrityChecker(store: Store<R, P>): (() => void) | undefined {
		return this.options.createIntegrityChecker?.(store) ?? undefined
	}

	/** @internal */
	derivePresenceState(store: Store<R, P>): Signal<R | null> | undefined {
		return this.options.derivePresenceState?.(store)
	}

	serialize(): SerializedSchema {
		return {
			schemaVersion: 1,
			storeVersion: this.options.snapshotMigrator?.currentVersion ?? 0,
			recordVersions: Object.fromEntries(
				objectMapValues(this.types).map((type) => {
					const migrator = getOwnProperty(this.migrators, type.typeName)
					if (!migrator) {
						throw Error(`Missing migrator for type ${type.typeName}`)
					}

					return [type.typeName, migrator.serialize()]
				})
			),
		}
	}

	serializeEarliestVersion(): SerializedSchema {
		return {
			schemaVersion: 1,
			storeVersion: this.options.snapshotMigrator?.firstVersion ?? 0,
			recordVersions: Object.fromEntries(
				objectMapValues(this.types).map((type) => {
					const migrator = getOwnProperty(this.migrators, type.typeName)
					if (!migrator) {
						throw Error(`Missing migrator for type ${type.typeName}`)
					}

					return [type.typeName, migrator.serializeEarliestVersion()]
				})
			),
		}
	}
}
