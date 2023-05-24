import { BaseRecord, isRecord } from './BaseRecord'
import { MigrationFailureReason, MigrationResult } from './migrate'

type EMPTY_SYMBOL = symbol

/** @public */
export type MigratorOptions<
	FirstVersion extends number | EMPTY_SYMBOL = EMPTY_SYMBOL,
	CurrentVersion extends Exclude<number, 0> | EMPTY_SYMBOL = EMPTY_SYMBOL
> = {
	firstVersion?: CurrentVersion extends number ? FirstVersion : never
	currentVersion?: CurrentVersion
	migrators?: CurrentVersion extends number
		? FirstVersion extends number
			? CurrentVersion extends FirstVersion
				? { [version in Exclude<Range<1, CurrentVersion>, 0>]: Migration }
				: { [version in Exclude<Range<FirstVersion, CurrentVersion>, FirstVersion>]: Migration }
			: { [version in Exclude<Range<1, CurrentVersion>, 0>]: Migration }
		: never
	subTypeKey?: string
	subTypeMigrators?: Record<string, Migrator>
}

/** @public */
export class Migrator<
	FirstVersion extends number | EMPTY_SYMBOL = EMPTY_SYMBOL,
	CurrentVersion extends Exclude<number, 0> | EMPTY_SYMBOL = EMPTY_SYMBOL
> {
	firstVersion: number
	currentVersion: number
	migrators: { [version: number]: Migration }

	subTypeKey?: string
	subTypeMigrators?: Record<string, Migrator>

	constructor(opts: MigratorOptions<FirstVersion, CurrentVersion>) {
		const { currentVersion, firstVersion, migrators = {}, subTypeKey, subTypeMigrators } = opts

		// Some basic guards against impossible version combinations, some of which will be caught by TypeScript
		if (typeof currentVersion === 'number' && typeof firstVersion === 'number') {
			if ((currentVersion as number) === (firstVersion as number)) {
				throw Error(`Current version is equal to initial version.`)
			} else if (currentVersion < firstVersion) {
				throw Error(`Current version is lower than initial version.`)
			}
		}

		this.firstVersion = (firstVersion as number) ?? 0 // defaults
		this.currentVersion = (currentVersion as number) ?? 0 // defaults
		this.migrators = migrators
		this.subTypeKey = subTypeKey
		this.subTypeMigrators = subTypeMigrators
	}

	withSubTypeMigrators(subTypeKey: string, subTypeMigrators: Record<string, Migrator>) {
		this.subTypeKey = subTypeKey
		this.subTypeMigrators = subTypeMigrators

		return this
	}

	migrateRecord<R extends BaseRecord<any, any>>(
		record: R,
		direction: 'up' | 'down',
		version: number
	): MigrationResult<R> {
		const fromVersion = direction === 'down' ? version : this.currentVersion
		const toVersion = direction === 'up' ? this.currentVersion : version

		let currentVersion = fromVersion

		if (!isRecord(record)) throw new Error('[migrateRecord] object is not a record')
		const { typeName, id, ...others } = record
		let recordWithoutMeta = others

		while (currentVersion < toVersion) {
			const nextVersion = currentVersion + 1
			const migrator = this.migrators[nextVersion]
			if (!migrator) {
				return {
					type: 'error',
					reason: MigrationFailureReason.TargetVersionTooNew,
				}
			}
			recordWithoutMeta = migrator.up(recordWithoutMeta) as any
			currentVersion = nextVersion
		}

		while (currentVersion > toVersion) {
			const nextVersion = currentVersion - 1
			const migrator = this.migrators[currentVersion]
			if (!migrator) {
				return {
					type: 'error',
					reason: MigrationFailureReason.TargetVersionTooOld,
				}
			}
			recordWithoutMeta = migrator.down(recordWithoutMeta) as any
			currentVersion = nextVersion
		}

		return {
			type: 'success',
			value: { ...recordWithoutMeta, id, typeName } as any,
		}
	}

	migrateSnapshot<T>(
		value: unknown,
		direction: 'up' | 'down',
		version: number
	): MigrationResult<T> {
		const fromVersion = direction === 'down' ? version : this.currentVersion
		const toVersion = direction === 'up' ? this.currentVersion : version

		let currentVersion = fromVersion

		while (currentVersion < toVersion) {
			const nextVersion = currentVersion + 1
			const migrator = this.migrators[nextVersion]
			if (!migrator) {
				return {
					type: 'error',
					reason: MigrationFailureReason.TargetVersionTooNew,
				}
			}
			value = migrator.up(value)
			currentVersion = nextVersion
		}

		while (currentVersion > toVersion) {
			const nextVersion = currentVersion - 1
			const migrator = this.migrators[currentVersion]
			if (!migrator) {
				return {
					type: 'error',
					reason: MigrationFailureReason.TargetVersionTooOld,
				}
			}
			value = migrator.down(value)
			currentVersion = nextVersion
		}

		return {
			type: 'success',
			value: value as T,
		}
	}

	serialize() {
		return this.subTypeKey && this.subTypeMigrators
			? {
					version: this.firstVersion,
					subTypeKey: this.subTypeKey,
					subTypeVersions: this.subTypeMigrators
						? Object.fromEntries(
								Object.entries(this.subTypeMigrators).map(([k, v]) => [k, v.firstVersion])
						  )
						: undefined,
			  }
			: {
					version: this.firstVersion,
			  }
	}

	serializeEarliestVersion() {
		return this.subTypeKey && this.subTypeMigrators
			? {
					version: this.firstVersion,
					subTypeKey: this.subTypeKey,
					subTypeVersions: this.subTypeMigrators
						? Object.fromEntries(
								Object.entries(this.subTypeMigrators).map(([k, v]) => [k, v.firstVersion])
						  )
						: undefined,
			  }
			: {
					version: this.firstVersion,
			  }
	}
}

/** @public */
export type Migration<Before = any, After = any> = {
	up: (oldState: Before) => After
	down: (newState: After) => Before
}

// interface BaseMigrationsInfo {
// 	firstVersion: number
// 	currentVersion: number
// 	migrators: { [version: number]: Migration }
// }

// /** @public */
// export interface Migrations extends BaseMigrationsInfo {
// 	subTypeKey?: string
// 	subTypeMigrator?: Record<string, BaseMigrationsInfo>
// }

type Range<From extends number, To extends number> = To extends From
	? From
	: To | Range<From, Decrement<To>>

type Decrement<n extends number> = n extends 0
	? never
	: n extends 1
	? 0
	: n extends 2
	? 1
	: n extends 3
	? 2
	: n extends 4
	? 3
	: n extends 5
	? 4
	: n extends 6
	? 5
	: n extends 7
	? 6
	: n extends 8
	? 7
	: n extends 9
	? 8
	: n extends 10
	? 9
	: n extends 11
	? 10
	: n extends 12
	? 11
	: n extends 13
	? 12
	: n extends 14
	? 13
	: n extends 15
	? 14
	: n extends 16
	? 15
	: n extends 17
	? 16
	: n extends 18
	? 17
	: n extends 19
	? 18
	: n extends 20
	? 19
	: n extends 21
	? 20
	: n extends 22
	? 21
	: n extends 23
	? 22
	: n extends 24
	? 23
	: n extends 25
	? 24
	: n extends 26
	? 25
	: n extends 27
	? 26
	: n extends 28
	? 27
	: n extends 29
	? 28
	: n extends 30
	? 29
	: n extends 31
	? 30
	: n extends 32
	? 31
	: n extends 33
	? 32
	: n extends 34
	? 33
	: n extends 35
	? 34
	: n extends 36
	? 35
	: n extends 37
	? 36
	: n extends 38
	? 37
	: n extends 39
	? 38
	: n extends 40
	? 39
	: n extends 41
	? 40
	: n extends 42
	? 41
	: n extends 43
	? 42
	: n extends 44
	? 43
	: n extends 45
	? 44
	: n extends 46
	? 45
	: n extends 47
	? 46
	: n extends 48
	? 47
	: n extends 49
	? 48
	: n extends 50
	? 49
	: n extends 51
	? 50
	: never
