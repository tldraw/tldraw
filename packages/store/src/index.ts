import { registerTldrawLibraryVersion } from '@tldraw/utils'
export type { BaseRecord, IdOf, RecordId, UnknownRecord } from './lib/BaseRecord'
export { IncrementalSetConstructor } from './lib/IncrementalSetConstructor'
export { RecordType, assertIdType, createRecordType, type RecordScope } from './lib/RecordType'
export {
	createEmptyRecordsDiff,
	isRecordsDiffEmpty,
	reverseRecordsDiff,
	squashRecordDiffs,
	squashRecordDiffsMutable,
	type RecordsDiff,
} from './lib/RecordsDiff'
export {
	Store,
	createComputedCache,
	type ChangeSource,
	type RecordFromId,
	type StoreListenerFilters,
	type StoreObject,
	type StoreObjectRecordType,
} from './lib/Store'
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
export { StoreQueries, type RSIndex, type RSIndexDiff, type RSIndexMap } from './lib/StoreQueries'
export { StoreSchema, type StoreValidationFailure } from './lib/StoreSchema'
export type {
	SerializedSchema,
	SerializedSchemaV1,
	SerializedSchemaV2,
	StoreSchemaOptions,
} from './lib/StoreSchema'
export {
	StoreSideEffects,
	type StoreAfterChangeHandler,
	type StoreAfterCreateHandler,
	type StoreAfterDeleteHandler,
	type StoreBeforeChangeHandler,
	type StoreBeforeCreateHandler,
	type StoreBeforeDeleteHandler,
	type StoreOperationCompleteHandler,
} from './lib/StoreSideEffects'
export { devFreeze } from './lib/devFreeze'
export { type QueryExpression, type QueryValueMatcher } from './lib/executeQuery'
export {
	MigrationFailureReason,
	createMigrationIds,
	createMigrationSequence,
	createRecordMigrationSequence,
	defineMigrations,
	parseMigrationId,
	type LegacyBaseMigrationsInfo,
	type LegacyMigration,
	type LegacyMigrations,
	type Migration,
	type MigrationId,
	type MigrationResult,
	type MigrationSequence,
	type StandaloneDependsOn,
} from './lib/migrate'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
