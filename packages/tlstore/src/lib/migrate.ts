import { UnknownRecord } from './BaseRecord'
import { SerializedSchema } from './StoreSchema'

/** @public */
export type MigrationResult<T> =
	| { type: 'success'; value: T }
	| { type: 'error'; reason: MigrationFailureReason }

/** @public */
export enum MigrationFailureReason {
	IncompatibleSubtype = 'incompatible-subtype',
	UnknownType = 'unknown-type',
	TargetVersionTooNew = 'target-version-too-new',
	TargetVersionTooOld = 'target-version-too-old',
	MigrationError = 'migration-error',
	UnrecognizedSubtype = 'unrecognized-subtype',
}

/** @public */
export type RecordVersion = { rootVersion: number; subTypeVersion?: number }
/** @public */
export function getRecordVersion(
	record: UnknownRecord,
	serializedSchema: SerializedSchema
): RecordVersion {
	const persistedType = serializedSchema.recordVersions[record.typeName]
	if (!persistedType) {
		return { rootVersion: 0 }
	}
	if ('subTypeKey' in persistedType) {
		const subType = record[persistedType.subTypeKey as keyof typeof record]
		const subTypeVersion = persistedType.subTypeVersions[subType]
		return { rootVersion: persistedType.version, subTypeVersion }
	}
	return { rootVersion: persistedType.version }
}

/** @public */
export function compareRecordVersions(a: RecordVersion, b: RecordVersion) {
	if (a.rootVersion > b.rootVersion) {
		return 1
	}
	if (a.rootVersion < b.rootVersion) {
		return -1
	}
	if (a.subTypeVersion != null && b.subTypeVersion != null) {
		if (a.subTypeVersion > b.subTypeVersion) {
			return 1
		}
		if (a.subTypeVersion < b.subTypeVersion) {
			return -1
		}
	}
	return 0
}
