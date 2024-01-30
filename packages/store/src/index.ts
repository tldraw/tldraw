/* eslint-disable deprecation/deprecation */
export type { BaseRecord, IdOf, RecordId, UnknownRecord } from './lib/BaseRecord'
export { IncrementalSetConstructor } from './lib/IncrementalSetConstructor'
export { LegacyMigrator } from './lib/LegacyMigrator'
export { RecordType, assertIdType, createRecordType } from './lib/RecordType'
export { Store, reverseRecordsDiff, squashRecordDiffs } from './lib/Store'
export type {
	CollectionDiff,
	ComputedCache,
	HistoryEntry,
	RecordsDiff,
	SerializedStore,
	StoreError,
	StoreListener,
	StoreSnapshot,
	StoreValidator,
	StoreValidators,
} from './lib/Store'
export { StoreSchema } from './lib/StoreSchema'
export type { SerializedSchema, StoreSchemaOptions } from './lib/StoreSchema'
export { compareSchemas } from './lib/compareSchemas'
export { devFreeze } from './lib/devFreeze'
export {
	MigrationFailureReason,
	compareRecordVersions,
	defineMigrations,
	getRecordVersion,
	migrate,
	migrateRecord,
	type LegacyMigration as LegacyMigration,
	type MigrationResult,
	type Migrations,
	type RecordVersion,
} from './lib/legacy_migrate'
export type {
	Migration,
	MigrationId,
	MigrationOptions,
	MigrationSequence,
	RecordMigration,
	StoreMigration,
} from './lib/migrate'
export type { AllRecords } from './lib/type-utils'
