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

// /** @public */
// export function migrateRecord<R extends UnknownRecord>({
// 	record,
// 	migrations,
// 	fromVersion,
// 	toVersion,
// }: {
// 	record: unknown
// 	migrations: Migrations
// 	fromVersion: number
// 	toVersion: number
// }): MigrationResult<R> {
// 	let currentVersion = fromVersion
// 	if (!isRecord(record)) throw new Error('[migrateRecord] object is not a record')
// 	const { typeName, id, ...others } = record
// 	let recordWithoutMeta = others

// 	while (currentVersion < toVersion) {
// 		const nextVersion = currentVersion + 1
// 		const migrator = migrations.migrators[nextVersion]
// 		if (!migrator) {
// 			return {
// 				type: 'error',
// 				reason: MigrationFailureReason.TargetVersionTooNew,
// 			}
// 		}
// 		recordWithoutMeta = migrator.up(recordWithoutMeta) as any
// 		currentVersion = nextVersion
// 	}

// 	while (currentVersion > toVersion) {
// 		const nextVersion = currentVersion - 1
// 		const migrator = migrations.migrators[currentVersion]
// 		if (!migrator) {
// 			return {
// 				type: 'error',
// 				reason: MigrationFailureReason.TargetVersionTooOld,
// 			}
// 		}
// 		recordWithoutMeta = migrator.down(recordWithoutMeta) as any
// 		currentVersion = nextVersion
// 	}

// 	return {
// 		type: 'success',
// 		value: { ...recordWithoutMeta, id, typeName } as any,
// 	}
// }

// /** @public */
// export function migrate<T>({
// 	value,
// 	migrator,
// 	fromVersion,
// 	toVersion,
// }: {
// 	value: unknown
// 	migrator: Migrator
// 	fromVersion: number
// 	toVersion: number
// }): MigrationResult<T> {
// 	let currentVersion = fromVersion

// 	while (currentVersion < toVersion) {
// 		const nextVersion = currentVersion + 1
// 		const migrator = migrator.migrators[nextVersion]
// 		if (!migrator) {
// 			return {
// 				type: 'error',
// 				reason: MigrationFailureReason.TargetVersionTooNew,
// 			}
// 		}
// 		value = migrator.up(value)
// 		currentVersion = nextVersion
// 	}

// 	while (currentVersion > toVersion) {
// 		const nextVersion = currentVersion - 1
// 		const migrator = migrations.migrators[currentVersion]
// 		if (!migrator) {
// 			return {
// 				type: 'error',
// 				reason: MigrationFailureReason.TargetVersionTooOld,
// 			}
// 		}
// 		value = migrator.down(value)
// 		currentVersion = nextVersion
// 	}

// 	return {
// 		type: 'success',
// 		value: value as T,
// 	}
// }
