export type { BaseRecord, IdOf, RecordId, UnknownRecord } from './lib/BaseRecord'
export { IncrementalSetConstructor } from './lib/IncrementalSetConstructor'
export { RecordType, assertIdType, createRecordType } from './lib/RecordType'
export {
	createEmptyRecordsDiff,
	isRecordsDiffEmpty,
	reverseRecordsDiff,
	squashRecordDiffs,
	squashRecordDiffsMutable,
	type RecordsDiff,
} from './lib/RecordsDiff'
export { Store } from './lib/Store'
export type {
	CollectionDiff,
	ComputedCache,
	HistoryEntry,
	SerializedStore,
	StoreError,
	StoreListener,
	StoreSnapshot,
	StoreValidator,
	StoreValidators,
} from './lib/Store'
export { StoreSchema } from './lib/StoreSchema'
export type {
	SerializedSchema,
	SerializedSchemaV1,
	SerializedSchemaV2,
	StoreSchemaOptions,
} from './lib/StoreSchema'
export { devFreeze } from './lib/devFreeze'
export {
	MigrationFailureReason,
	createMigrationIds,
	createMigrationSequence,
	createRecordMigrationSequence,
	// eslint-disable-next-line deprecation/deprecation
	defineMigrations,
	parseMigrationId,
	type LegacyMigration,
	type LegacyMigrations,
	type Migration,
	type MigrationId,
	type MigrationResult,
	type MigrationSequence,
} from './lib/migrate'
export type { AllRecords } from './lib/type-utils'
