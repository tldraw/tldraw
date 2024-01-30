import { getOwnProperty, objectMapValues } from '@tldraw/utils'
import { IdOf, UnknownRecord } from './BaseRecord'
import { SerializedStore, StoreSnapshot } from './Store'
import { SerializedSchema } from './StoreSchema'
import {
	MigrationFailureReason,
	MigrationResult,
	Migrations,
	migrate,
	migrateRecord,
} from './legacy_migrate'

/**
 * @internal
 */
export class LegacyMigrator {
	constructor(
		// eslint-disable-next-line deprecation/deprecation
		public readonly types: Record<string, Migrations>,
		// eslint-disable-next-line deprecation/deprecation
		public readonly snapshotMigrations: Migrations
	) {}

	// eslint-disable-next-line no-restricted-syntax
	get currentStoreVersion(): number {
		return this.snapshotMigrations?.currentVersion ?? 0
	}

	migratePersistedRecord(
		record: UnknownRecord,
		persistedSchema: Extract<SerializedSchema, { schemaVersion: 1 }>,
		direction: 'up' | 'down' = 'up'
		// eslint-disable-next-line deprecation/deprecation
	): MigrationResult<UnknownRecord> {
		const ourMigrations = getOwnProperty(this.types, record.typeName)
		const persistedType = persistedSchema.recordVersions[record.typeName]
		if (!persistedType || !ourMigrations) {
			return { type: 'error', reason: MigrationFailureReason.UnknownType }
		}
		const ourVersion = ourMigrations.currentVersion
		const persistedVersion = persistedType.version
		if (ourVersion !== persistedVersion) {
			const result =
				direction === 'up'
					? // eslint-disable-next-line deprecation/deprecation
						migrateRecord({
							record,
							migrations: ourMigrations,
							fromVersion: persistedVersion,
							toVersion: ourVersion,
						})
					: // eslint-disable-next-line deprecation/deprecation
						migrateRecord({
							record,
							migrations: ourMigrations,
							fromVersion: ourVersion,
							toVersion: persistedVersion,
						})
			if (result.type === 'error') {
				return result
			}
			record = result.value
		}

		if (!ourMigrations.subTypeKey) {
			return { type: 'success', value: record }
		}

		// we've handled the main version migration, now we need to handle subtypes
		// subtypes are used by shape and asset types to migrate the props shape, which is configurable
		// by library consumers.

		const ourSubTypeMigrations =
			ourMigrations.subTypeMigrations?.[
				record[ourMigrations.subTypeKey as keyof typeof record] as string
			]

		const persistedSubTypeVersion =
			'subTypeVersions' in persistedType
				? persistedType.subTypeVersions[
						record[ourMigrations.subTypeKey as keyof typeof record] as string
					]
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
				? // eslint-disable-next-line deprecation/deprecation
					migrateRecord({
						record,
						migrations: ourSubTypeMigrations,
						fromVersion: persistedSubTypeVersion,
						toVersion: ourSubTypeMigrations.currentVersion,
					})
				: // eslint-disable-next-line deprecation/deprecation
					migrateRecord({
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

	migrateStoreSnapshot(
		snapshot: StoreSnapshot<UnknownRecord>
		// eslint-disable-next-line deprecation/deprecation
	): MigrationResult<SerializedStore<UnknownRecord>> {
		if (snapshot.schema.schemaVersion !== 1) {
			throw new Error('Invalid legacy schema version')
		}
		let { store } = snapshot

		const migrations = this.snapshotMigrations
		if (!migrations) {
			return { type: 'success', value: store }
		}
		// apply store migrations first
		const ourStoreVersion = migrations.currentVersion
		const persistedStoreVersion = snapshot.schema.storeVersion ?? 0

		if (ourStoreVersion < persistedStoreVersion) {
			return { type: 'error', reason: MigrationFailureReason.TargetVersionTooOld }
		}

		if (ourStoreVersion > persistedStoreVersion) {
			// eslint-disable-next-line deprecation/deprecation
			const result = migrate<StoreSnapshot<UnknownRecord>>({
				value: store,
				migrations,
				fromVersion: persistedStoreVersion,
				toVersion: ourStoreVersion,
			})

			if (result.type === 'error') {
				return result
			}
			store = result.value
		}

		const updated: UnknownRecord[] = []
		for (const r of objectMapValues(store)) {
			const result = this.migratePersistedRecord(r, snapshot.schema)
			if (result.type === 'error') {
				return result
			} else if (result.value && result.value !== r) {
				updated.push(result.value)
			}
		}
		if (updated.length) {
			store = { ...store }
			for (const r of updated) {
				store[r.id as IdOf<UnknownRecord>] = r
			}
		}
		return { type: 'success', value: store }
	}
}
