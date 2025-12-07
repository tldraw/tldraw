import { registerTldrawLibraryVersion } from '@tldraw/utils'
export { AtomMap } from './lib/AtomMap'
export type { BaseRecord, IdOf, RecordId, UnknownRecord } from './lib/BaseRecord'
export { devFreeze } from './lib/devFreeze'
export { type QueryExpression, type QueryValueMatcher } from './lib/executeQuery'
export { IncrementalSetConstructor } from './lib/IncrementalSetConstructor'
export {
	createMigrationIds,
	createMigrationSequence,
	createRecordMigrationSequence,
	MigrationFailureReason,
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
export {
	createEmptyRecordsDiff,
	isRecordsDiffEmpty,
	reverseRecordsDiff,
	squashRecordDiffs,
	squashRecordDiffsMutable,
	type RecordsDiff,
} from './lib/RecordsDiff'
export { assertIdType, createRecordType, RecordType, type RecordScope } from './lib/RecordType'
export {
	createComputedCache,
	Store,
	type ChangeSource,
	type CollectionDiff,
	type ComputedCache,
	type CreateComputedCacheOpts,
	type HistoryEntry,
	type RecordFromId,
	type SerializedStore,
	type StoreError,
	type StoreListener,
	type StoreListenerFilters,
	type StoreObject,
	type StoreObjectRecordType,
	type StoreRecord,
	type StoreSnapshot,
	type StoreValidator,
	type StoreValidators,
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

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
