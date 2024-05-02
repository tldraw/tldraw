export type { BaseRecord, IdOf, RecordId, UnknownRecord } from './lib/BaseRecord'
export { IncrementalSetConstructor } from './lib/IncrementalSetConstructor'
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
	type Migration,
	type MigrationResult,
	type Migrations,
	type RecordVersion,
} from './lib/migrate'
export type { AllRecords } from './lib/type-utils'
