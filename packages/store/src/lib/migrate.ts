import { assert, objectMapEntries } from '@tldraw/utils'
import { UnknownRecord } from './BaseRecord'
import { SerializedStore } from './Store'

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
	filter?(record: UnknownRecord): boolean
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
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	up: (oldState: Before) => After
	// eslint-disable-next-line @typescript-eslint/method-signature-style
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
			// eslint-disable-next-line @typescript-eslint/method-signature-style
			readonly filter?: (record: UnknownRecord) => boolean
			// eslint-disable-next-line @typescript-eslint/method-signature-style
			readonly up: (oldState: UnknownRecord) => void | UnknownRecord
			// eslint-disable-next-line @typescript-eslint/method-signature-style
			readonly down?: (newState: UnknownRecord) => void | UnknownRecord
	  }
	| {
			readonly scope: 'store'
			// eslint-disable-next-line @typescript-eslint/method-signature-style
			readonly up: (
				oldState: SerializedStore<UnknownRecord>
			) => void | SerializedStore<UnknownRecord>
			// eslint-disable-next-line @typescript-eslint/method-signature-style
			readonly down?: (
				newState: SerializedStore<UnknownRecord>
			) => void | SerializedStore<UnknownRecord>
	  }
)

/** @public */
export interface LegacyBaseMigrationsInfo {
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

/**
 * Sorts migrations using a distance-minimizing topological sort.
 *
 * This function respects two types of dependencies:
 * 1. Implicit sequence dependencies (foo/1 must come before foo/2)
 * 2. Explicit dependencies via `dependsOn` property
 *
 * The algorithm minimizes the total distance between migrations and their explicit
 * dependencies in the final ordering, while maintaining topological correctness.
 * This means when migration A depends on migration B, A will be scheduled as close
 * as possible to B (while respecting all constraints).
 *
 * Implementation uses Kahn's algorithm with priority scoring:
 * - Builds dependency graph and calculates in-degrees
 * - Uses priority queue that prioritizes migrations which unblock explicit dependencies
 * - Processes migrations in urgency order while maintaining topological constraints
 * - Detects cycles by ensuring all migrations are processed
 *
 * @param migrations - Array of migrations to sort
 * @returns Sorted array of migrations in execution order
 */
export function sortMigrations(migrations: Migration[]): Migration[] {
	if (migrations.length === 0) return []

	// Build dependency graph and calculate in-degrees
	const byId = new Map(migrations.map((m) => [m.id, m]))
	const dependents = new Map<MigrationId, Set<MigrationId>>() // who depends on this
	const inDegree = new Map<MigrationId, number>()
	const explicitDeps = new Map<MigrationId, Set<MigrationId>>() // explicit dependsOn relationships

	// Initialize
	for (const m of migrations) {
		inDegree.set(m.id, 0)
		dependents.set(m.id, new Set())
		explicitDeps.set(m.id, new Set())
	}

	// Add implicit sequence dependencies and explicit dependencies
	for (const m of migrations) {
		const { version, sequenceId } = parseMigrationId(m.id)

		// Implicit dependency on previous in sequence
		const prevId = `${sequenceId}/${version - 1}` as MigrationId
		if (byId.has(prevId)) {
			dependents.get(prevId)!.add(m.id)
			inDegree.set(m.id, inDegree.get(m.id)! + 1)
		}

		// Explicit dependencies
		if (m.dependsOn) {
			for (const depId of m.dependsOn) {
				if (byId.has(depId)) {
					dependents.get(depId)!.add(m.id)
					explicitDeps.get(m.id)!.add(depId)
					inDegree.set(m.id, inDegree.get(m.id)! + 1)
				}
			}
		}
	}

	// Priority queue: migrations ready to process (in-degree 0)
	const ready = migrations.filter((m) => inDegree.get(m.id) === 0)
	const result: Migration[] = []
	const processed = new Set<MigrationId>()

	while (ready.length > 0) {
		// Calculate urgency scores for ready migrations and pick the best one
		let bestCandidate: Migration | undefined
		let bestCandidateScore = -Infinity

		for (const m of ready) {
			let urgencyScore = 0

			for (const depId of dependents.get(m.id) || []) {
				if (!processed.has(depId)) {
					// Priority 1: Count all unprocessed dependents (to break ties)
					urgencyScore += 1

					// Priority 2: If this migration is explicitly depended on by others, boost priority
					if (explicitDeps.get(depId)!.has(m.id)) {
						urgencyScore += 100
					}
				}
			}

			if (
				urgencyScore > bestCandidateScore ||
				// Tiebreaker: prefer lower sequence/version
				(urgencyScore === bestCandidateScore && m.id.localeCompare(bestCandidate?.id ?? '') < 0)
			) {
				bestCandidate = m
				bestCandidateScore = urgencyScore
			}
		}

		const nextMigration = bestCandidate!
		ready.splice(ready.indexOf(nextMigration), 1)

		// Cycle detection - if we have processed everything and still have items left, there's a cycle
		// This is handled by Kahn's algorithm naturally - if we finish with items unprocessed, there's a cycle

		// Process this migration
		result.push(nextMigration)
		processed.add(nextMigration.id)

		// Update in-degrees and add newly ready migrations
		for (const depId of dependents.get(nextMigration.id) || []) {
			if (!processed.has(depId)) {
				inDegree.set(depId, inDegree.get(depId)! - 1)
				if (inDegree.get(depId) === 0) {
					ready.push(byId.get(depId)!)
				}
			}
		}
	}

	// Check for cycles - if we didn't process all migrations, there's a cycle
	if (result.length !== migrations.length) {
		const unprocessed = migrations.filter((m) => !processed.has(m.id))
		assert(false, `Circular dependency in migrations: ${unprocessed[0].id}`)
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
