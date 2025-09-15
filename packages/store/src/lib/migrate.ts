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
 * Creates a migration sequence that defines how to transform data as your schema evolves.
 *
 * A migration sequence contains a series of migrations that are applied in order to transform
 * data from older versions to newer versions. Each migration is identified by a unique ID
 * and can operate at either the record level (transforming individual records) or store level
 * (transforming the entire store structure).
 *
 * See the [migration guide](https://tldraw.dev/docs/persistence#Migrations) for more info on how to use this API.
 * @param options - Configuration for the migration sequence
 *   - sequenceId - Unique identifier for this migration sequence (e.g., 'com.myapp.book')
 *   - sequence - Array of migrations or dependency declarations to include in the sequence
 *   - retroactive - Whether migrations should apply to snapshots created before this sequence was added (defaults to true)
 * @returns A validated migration sequence that can be included in a store schema
 * @example
 * ```ts
 * const bookMigrations = createMigrationSequence({
 *   sequenceId: 'com.myapp.book',
 *   sequence: [
 *     {
 *       id: 'com.myapp.book/1',
 *       scope: 'record',
 *       up: (record) => ({ ...record, newField: 'default' })
 *     }
 *   ]
 * })
 * ```
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
 * Creates a named set of migration IDs from version numbers and a sequence ID.
 *
 * This utility function helps generate properly formatted migration IDs that follow
 * the required `sequenceId/version` pattern. It takes a sequence ID and a record
 * of named versions, returning migration IDs that can be used in migration definitions.
 *
 * See the [migration guide](https://tldraw.dev/docs/persistence#Migrations) for more info on how to use this API.
 * @param sequenceId - The sequence identifier (e.g., 'com.myapp.book')
 * @param versions - Record mapping version names to numbers
 * @returns Record mapping version names to properly formatted migration IDs
 * @example
 * ```ts
 * const migrationIds = createMigrationIds('com.myapp.book', {
 *   addGenre: 1,
 *   addPublisher: 2,
 *   removeOldField: 3
 * })
 * // Result: {
 * //   addGenre: 'com.myapp.book/1',
 * //   addPublisher: 'com.myapp.book/2',
 * //   removeOldField: 'com.myapp.book/3'
 * // }
 * ```
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

/**
 * Creates a migration sequence specifically for record-level migrations.
 *
 * This is a convenience function that creates a migration sequence where all migrations
 * operate at the record scope and are automatically filtered to apply only to records
 * of a specific type. Each migration in the sequence will be enhanced with the record
 * scope and appropriate filtering logic.
 * @param opts - Configuration for the record migration sequence
 *   - recordType - The record type name these migrations should apply to
 *   - filter - Optional additional filter function to determine which records to migrate
 *   - retroactive - Whether migrations should apply to snapshots created before this sequence was added
 *   - sequenceId - Unique identifier for this migration sequence
 *   - sequence - Array of record migration definitions (scope will be added automatically)
 * @returns A migration sequence configured for record-level operations
 * @internal
 */
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

/**
 * Legacy migration interface for backward compatibility.
 *
 * This interface represents the old migration format that included both `up` and `down`
 * transformation functions. While still supported, new code should use the `Migration`
 * type which provides more flexibility and better integration with the current system.
 * @public
 */
export interface LegacyMigration<Before = any, After = any> {
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	up: (oldState: Before) => After
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	down: (newState: After) => Before
}

/**
 * Unique identifier for a migration in the format `sequenceId/version`.
 *
 * Migration IDs follow a specific pattern where the sequence ID identifies the migration
 * sequence and the version number indicates the order within that sequence. For example:
 * 'com.myapp.book/1', 'com.myapp.book/2', etc.
 * @public
 */
export type MigrationId = `${string}/${number}`

/**
 * Declares dependencies for migrations without being a migration itself.
 *
 * This interface allows you to specify that future migrations in a sequence depend on
 * migrations from other sequences, without defining an actual migration transformation.
 * It's used to establish cross-sequence dependencies in the migration graph.
 * @public
 */
export interface StandaloneDependsOn {
	readonly dependsOn: readonly MigrationId[]
}

/**
 * Defines a single migration that transforms data from one schema version to another.
 *
 * A migration can operate at two different scopes:
 * - `record`: Transforms individual records, with optional filtering to target specific records
 * - `store`: Transforms the entire serialized store structure
 *
 * Each migration has a unique ID and can declare dependencies on other migrations that must
 * be applied first. The `up` function performs the forward transformation, while the optional
 * `down` function can reverse the migration if needed.
 * @public
 */
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

/**
 * Base interface for legacy migration information.
 *
 * Contains the basic structure used by the legacy migration system, including version
 * range information and the migration functions indexed by version number. This is
 * maintained for backward compatibility with older migration definitions.
 * @public
 */
export interface LegacyBaseMigrationsInfo {
	firstVersion: number
	currentVersion: number
	migrators: { [version: number]: LegacyMigration }
}

/**
 * Legacy migration configuration with support for sub-type migrations.
 *
 * This interface extends the base legacy migration info to support migrations that
 * vary based on a sub-type key within records. This allows different migration paths
 * for different variants of the same record type, which was useful in older migration
 * systems but is now handled more elegantly by the current Migration system.
 * @public
 */
export interface LegacyMigrations extends LegacyBaseMigrationsInfo {
	subTypeKey?: string
	subTypeMigrations?: Record<string, LegacyBaseMigrationsInfo>
}

/**
 * A complete sequence of migrations that can be applied to transform data.
 *
 * A migration sequence represents a series of ordered migrations that belong together,
 * typically for a specific part of your schema. The sequence includes metadata about
 * whether it should be applied retroactively to existing data and contains the actual
 * migration definitions in execution order.
 * @public
 */
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
 * @throws Assertion error if circular dependencies are detected
 * @example
 * ```ts
 * const sorted = sortMigrations([
 *   { id: 'app/2', scope: 'record', up: (r) => r },
 *   { id: 'app/1', scope: 'record', up: (r) => r },
 *   { id: 'lib/1', scope: 'record', up: (r) => r, dependsOn: ['app/1'] }
 * ])
 * // Result: [app/1, app/2, lib/1] (respects both sequence and explicit deps)
 * ```
 * @public
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

/**
 * Parses a migration ID to extract the sequence ID and version number.
 *
 * Migration IDs follow the format `sequenceId/version`, and this function splits
 * them into their component parts. This is used internally for sorting migrations
 * and understanding their relationships.
 * @param id - The migration ID to parse
 * @returns Object containing the sequence ID and numeric version
 * @example
 * ```ts
 * const { sequenceId, version } = parseMigrationId('com.myapp.book/5')
 * // sequenceId: 'com.myapp.book', version: 5
 * ```
 * @internal
 */
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

/**
 * Validates that a migration sequence is correctly structured.
 *
 * Performs several validation checks to ensure the migration sequence is valid:
 * - Sequence ID doesn't contain invalid characters
 * - All migration IDs belong to the expected sequence
 * - Migration versions start at 1 and increment by 1
 * - Migration IDs follow the correct format
 * @param migrations - The migration sequence to validate
 * @throws Assertion error if any validation checks fail
 * @example
 * ```ts
 * const sequence = createMigrationSequence({
 *   sequenceId: 'com.myapp.book',
 *   sequence: [{ id: 'com.myapp.book/1', scope: 'record', up: (r) => r }]
 * })
 * validateMigrations(sequence) // Passes validation
 * ```
 * @public
 */
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

/**
 * Result type returned by migration operations.
 *
 * Migration operations can either succeed and return the transformed value,
 * or fail with a specific reason. This discriminated union type allows for
 * safe handling of both success and error cases when applying migrations.
 * @public
 */
export type MigrationResult<T> =
	| { type: 'success'; value: T }
	| { type: 'error'; reason: MigrationFailureReason }

/**
 * Enumeration of possible reasons why a migration might fail.
 *
 * These reasons help identify what went wrong during migration processing,
 * allowing applications to handle different failure scenarios appropriately.
 * Common failures include incompatible data formats, unknown record types,
 * and version mismatches between the data and available migrations.
 * @public
 */
export enum MigrationFailureReason {
	IncompatibleSubtype = 'incompatible-subtype',
	UnknownType = 'unknown-type',
	TargetVersionTooNew = 'target-version-too-new',
	TargetVersionTooOld = 'target-version-too-old',
	MigrationError = 'migration-error',
	UnrecognizedSubtype = 'unrecognized-subtype',
}
