export { type RecordId } from './lib/BaseRecord'
export type { BaseRecord, IdOf, UnknownRecord } from './lib/BaseRecord'
export { IncrementalSetConstructor } from './lib/IncrementalSetConstructor'
export { RecordType, createRecordType } from './lib/RecordType'
export { Store, reverseRecordsDiff, squashRecordDiffs, type CollectionDiff } from './lib/Store'
export type {
	ComputedCache,
	HistoryEntry,
	RecordsDiff,
	StoreError,
	StoreListener,
	StoreSnapshot,
	StoreValidator,
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
