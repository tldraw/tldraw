import { assert } from '@tldraw/utils'
import { UnknownRecord } from './BaseRecord'
import { SerializedStore } from './Store'

/**
 * @public
 * @deprecated use `createMigrations` instead
 */
export function defineMigrations(opts: {
	firstVersion?: number
	currentVersion?: number
	migrators?: Record<number, LegacyMigration>
	subTypeKey?: string
	subTypeMigrations?: Record<string, LegacyBaseMigrationsInfo>
}): LegacyMigrations {
	// TODO: log warning to upgrade to new migrations API
	const { currentVersion, firstVersion, migrators = {}, subTypeKey, subTypeMigrations } = opts

	// Some basic guards against impossible version combinations, some of which will be caught by TypeScript
	if (typeof currentVersion === 'number' && typeof firstVersion === 'number') {
		if ((currentVersion as number) === (firstVersion as number)) {
			throw Error(`Current version is equal to initial version.`)
		} else if (currentVersion < firstVersion) {
			throw Error(`Current version is lower than initial version.`)
		}
	}

	return {
		firstVersion: (firstVersion as number) ?? 0, // defaults
		currentVersion: (currentVersion as number) ?? 0, // defaults
		migrators,
		subTypeKey,
		subTypeMigrations,
	}
}

export function createMigrations<T extends Migrations>(opts: T): T {
	validateMigrations(opts)
	return opts
}

/** @public */
export type LegacyMigration<Before = any, After = any> = {
	up: (oldState: Before) => After
	down: (newState: After) => Before
}

export type MigrationId = `${string}/${number}`

export type Migration = {
	id: MigrationId
	dependsOn?: MigrationId[]
} & (
	| {
			scope: 'record'
			up: (oldState: UnknownRecord) => void | UnknownRecord
			down?: (newState: UnknownRecord) => void | UnknownRecord
	  }
	| {
			scope: 'store'
			up: (oldState: SerializedStore<UnknownRecord>) => void | SerializedStore<UnknownRecord>
			down?: (newState: SerializedStore<UnknownRecord>) => void | SerializedStore<UnknownRecord>
	  }
)

interface LegacyBaseMigrationsInfo {
	firstVersion: number
	currentVersion: number
	migrators: { [version: number]: LegacyMigration }
}

/** @public */
export interface LegacyMigrations extends LegacyBaseMigrationsInfo {
	subTypeKey?: string
	subTypeMigrations?: Record<string, LegacyBaseMigrationsInfo>
}

export interface Migrations {
	id: string
	sequence: Migration[]
}

export function sortMigrations(migrations: Migration[]): Migration[] {
	// we do a topological sort using dependsOn and implicit dependencies between migrations in the same sequence
	const byId = new Map(migrations.map((m) => [m.id, m]))
	const isProcessing = new Set<MigrationId>()

	const result: Migration[] = []

	function process(m: Migration) {
		assert(!isProcessing.has(m.id), `Circular dependency in migrations: ${m.id}`)
		isProcessing.add(m.id)

		const { version, sequenceId } = parseMigrationId(m.id)
		const parent = byId.get(`${sequenceId}/${version - 1}`)
		if (parent) {
			process(parent)
		}

		if (m.dependsOn) {
			for (const dep of m.dependsOn) {
				const depMigration = byId.get(dep)
				if (depMigration) {
					process(depMigration)
				}
			}
		}

		byId.delete(m.id)
		result.push(m)
	}

	for (const m of byId.values()) {
		process(m)
	}

	return result
}

export function parseMigrationId(id: MigrationId): { sequenceId: string; version: number } {
	const [sequenceId, version] = id.split('/')
	return { sequenceId, version: parseInt(version) }
}

function validateMigrationId(id: string, expectedSequenceId?: string) {
	if (expectedSequenceId) {
		assert(
			id.startsWith(expectedSequenceId + '/'),
			`Migration id must match the expected sequence id: ${expectedSequenceId}`
		)
	}

	assert(id.match(/^(.*?)\/(0|[1-9]\d*)$/), `Invalid migration id: ${id}`)
}

export function validateMigrations(migrations: Migrations) {
	assert(!migrations.id.includes('/'), 'Migration id cannot contain a "/"')
	assert(migrations.id.length, 'Migration id must be a non-empty string')

	if (migrations.sequence.length === 0) {
		return
	}

	validateMigrationId(migrations.sequence[0].id, migrations.id)
	let n = parseMigrationId(migrations.sequence[0].id).version
	for (let i = 1; i < migrations.sequence.length; i++) {
		const id = migrations.sequence[i].id
		validateMigrationId(id, migrations.id)
		const m = parseMigrationId(id).version
		assert(
			m === n + 1,
			`Migration id numbers must increase in increments of 1: ${migrations.sequence[i].id}`
		)
		n = m
	}
}

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
