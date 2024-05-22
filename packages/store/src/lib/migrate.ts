import { assert, objectMapEntries } from '@tldraw/utils'
import { UnknownRecord } from './BaseRecord'
import { SerializedStore } from './Store'

let didWarn = false

/**
 * @public
 * @deprecated use `createShapePropsMigrationSequence` instead. See [the docs](https://tldraw.dev/docs/persistence#Updating-legacy-shape-migrations-defineMigrations) for how to migrate.
 */
export function defineMigrations(opts: {
	firstVersion?: number
	currentVersion?: number
	migrators?: Record<number, LegacyMigration>
	subTypeKey?: string
	subTypeMigrations?: Record<string, LegacyBaseMigrationsInfo>
}): LegacyMigrations {
	const { currentVersion, firstVersion, migrators = {}, subTypeKey, subTypeMigrations } = opts
	if (!didWarn) {
		console.warn(
			`The 'defineMigrations' function is deprecated and will be removed in a future release. Use the new migrations API instead. See the migration guide for more info: https://tldraw.dev/docs/persistence#Updating-legacy-shape-migrations-defineMigrations`
		)
		didWarn = true
	}

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

function squashDependsOn(sequence: Array<Migration | StandaloneDependsOn>): Migration[] {
	const result: Migration[] = []
	for (let i = sequence.length - 1; i >= 0; i--) {
		const elem = sequence[i]
		if (!('id' in elem)) {
			const dependsOn = elem.dependsOn
			const prev = result[0]
			if (prev) {
				result[0] = {
					...prev,
					dependsOn: dependsOn.concat(prev.dependsOn ?? []),
				}
			}
		} else {
			result.unshift(elem)
		}
	}
	return result
}

/**
 * Creates a migration sequence.
 * See the [migration guide](https://tldraw.dev/docs/persistence#Migrations) for more info on how to use this API.
 * @public
 */
export function createMigrationSequence({
	sequence,
	sequenceId,
	retroactive = true,
}: {
	sequenceId: string
	retroactive?: boolean
	sequence: Array<Migration | StandaloneDependsOn>
}): MigrationSequence {
	const migrations: MigrationSequence = {
		sequenceId,
		retroactive,
		sequence: squashDependsOn(sequence),
	}
	validateMigrations(migrations)
	return migrations
}

/**
 * Creates a named set of migration ids given a named set of version numbers and a sequence id.
 *
 * See the [migration guide](https://tldraw.dev/docs/persistence#Migrations) for more info on how to use this API.
 * @public
 * @public
 */
export function createMigrationIds<
	const ID extends string,
	const Versions extends Record<string, number>,
>(sequenceId: ID, versions: Versions): { [K in keyof Versions]: `${ID}/${Versions[K]}` } {
	return Object.fromEntries(
		objectMapEntries(versions).map(([key, version]) => [key, `${sequenceId}/${version}`] as const)
	) as any
}

/** @internal */
export function createRecordMigrationSequence(opts: {
	recordType: string
	filter?: (record: UnknownRecord) => boolean
	retroactive?: boolean
	sequenceId: string
	sequence: Omit<Extract<Migration, { scope: 'record' }>, 'scope'>[]
}): MigrationSequence {
	const sequenceId = opts.sequenceId
	return createMigrationSequence({
		sequenceId,
		retroactive: opts.retroactive ?? true,
		sequence: opts.sequence.map((m) =>
			'id' in m
				? {
						...m,
						scope: 'record',
						filter: (r: UnknownRecord) =>
							r.typeName === opts.recordType &&
							(m.filter?.(r) ?? true) &&
							(opts.filter?.(r) ?? true),
					}
				: m
		),
	})
}

/** @public */
export interface LegacyMigration<Before = any, After = any> {
	up: (oldState: Before) => After
	down: (newState: After) => Before
}

/** @public */
export type MigrationId = `${string}/${number}`

/** @public */
export interface StandaloneDependsOn {
	readonly dependsOn: readonly MigrationId[]
}

/** @public */
export type Migration = {
	readonly id: MigrationId
	readonly dependsOn?: readonly MigrationId[] | undefined
} & (
	| {
			readonly scope: 'record'
			readonly filter?: (record: UnknownRecord) => boolean
			readonly up: (oldState: UnknownRecord) => void | UnknownRecord
			readonly down?: (newState: UnknownRecord) => void | UnknownRecord
	  }
	| {
			readonly scope: 'store'
			readonly up: (
				oldState: SerializedStore<UnknownRecord>
			) => void | SerializedStore<UnknownRecord>
			readonly down?: (
				newState: SerializedStore<UnknownRecord>
			) => void | SerializedStore<UnknownRecord>
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

/** @public */
export interface MigrationSequence {
	sequenceId: string
	/**
	 * retroactive should be true if the migrations should be applied to snapshots that were created before
	 * this migration sequence was added to the schema.
	 *
	 * In general:
	 *
	 * - retroactive should be true when app developers create their own new migration sequences.
	 * - retroactive should be false when library developers ship a migration sequence. When you install a library for the first time, any migrations that were added in the library before that point should generally _not_ be applied to your existing data.
	 */
	retroactive: boolean
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

/** @internal */
export function parseMigrationId(id: MigrationId): { sequenceId: string; version: number } {
	const [sequenceId, version] = id.split('/')
	return { sequenceId, version: parseInt(version) }
}

function validateMigrationId(id: string, expectedSequenceId?: string) {
	if (expectedSequenceId) {
		assert(
			id.startsWith(expectedSequenceId + '/'),
			`Every migration in sequence '${expectedSequenceId}' must have an id starting with '${expectedSequenceId}/'. Got invalid id: '${id}'`
		)
	}

	assert(id.match(/^(.*?)\/(0|[1-9]\d*)$/), `Invalid migration id: '${id}'`)
}

export function validateMigrations(migrations: MigrationSequence) {
	assert(
		!migrations.sequenceId.includes('/'),
		`sequenceId cannot contain a '/', got ${migrations.sequenceId}`
	)
	assert(migrations.sequenceId.length, 'sequenceId must be a non-empty string')

	if (migrations.sequence.length === 0) {
		return
	}

	validateMigrationId(migrations.sequence[0].id, migrations.sequenceId)
	let n = parseMigrationId(migrations.sequence[0].id).version
	assert(
		n === 1,
		`Expected the first migrationId to be '${migrations.sequenceId}/1' but got '${migrations.sequence[0].id}'`
	)
	for (let i = 1; i < migrations.sequence.length; i++) {
		const id = migrations.sequence[i].id
		validateMigrationId(id, migrations.sequenceId)
		const m = parseMigrationId(id).version
		assert(
			m === n + 1,
			`Migration id numbers must increase in increments of 1, expected ${migrations.sequenceId}/${n + 1} but got '${migrations.sequence[i].id}'`
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
