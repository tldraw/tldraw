import { UnknownRecord } from './BaseRecord'
import { SerializedStore } from './Store'
import { parseMigrations } from './parseMigrations'

/**
 * A migration ID is a string that uniquely identifies a migration.
 * It should include a namespace followed by a slash and then a unique identifier within than namespace.
 * e.g. `com.tldraw/023_add_arrow_label_position`
 * By convention we use an incrementing integer and a semantic description of the migration as the unique name part, but
 * this is not enforced.
 * @public
 */
export type MigrationId = `${string}/${string}`
/**
 * @public
 */
export type Migration = StoreMigration | RecordMigration

interface BaseMigration {
	id: MigrationId
	// if this migration needs to run after another migration from a different sequence, specify it here
	dependsOn?: readonly MigrationId[]
}

/**
 * Store migrations operate on the entire store at once.
 * It does not support 'down' migrations because that would be prohibitively expensive
 * (and probably not even very useful) for the main use case i.e. allowing sync
 * server backwards compatibility
 * @public
 */
export interface StoreMigration extends BaseMigration {
	scope: 'store'
	up(store: SerializedStore<UnknownRecord>): SerializedStore<UnknownRecord>
	down?(store: SerializedStore<UnknownRecord>): SerializedStore<UnknownRecord>
}

/**
 * Record migrations operate on a single record at a time
 * They cannot create or delete records.
 * They are not scoped to a particular type or subtype, but are rather run for every record in the store.
 * It's up to them to check the record type/subtype and decide whether to do anything.
 * @public
 */
export interface RecordMigration extends BaseMigration {
	scope: 'record'
	up(record: UnknownRecord): UnknownRecord
	down?(record: UnknownRecord): UnknownRecord
}

/**
 * @public
 */
export type MigrationSequence = {
	// the sequence ID uniquely identifies a sequence of migrations. it should
	// be human readable and ideally namespaced e.g. `com.tldraw/TLArrowShape`
	id: string
	migrations: readonly Migration[]
}

/**
 * @public
 */
export type MigrationsConfig = {
	sequences: Array<{
		sequence: MigrationSequence
		versionAtInstallation: MigrationId | 'root'
	}>
	order: MigrationId[]
}

type ExtractValidMigrationIds<Sequence extends MigrationSequence> =
	Sequence['migrations'][number]['id']

/**
 * @public
 */
export class MigrationsConfigBuilder<ValidMigrationIds extends MigrationId = never> {
	sequences: MigrationsConfig['sequences'] = []
	addSequence<S extends MigrationSequence>(
		sequence: S,
		versionAtInstallation?: ExtractValidMigrationIds<S>
	): MigrationsConfigBuilder<ValidMigrationIds | ExtractValidMigrationIds<S>> {
		this.sequences.push({
			sequence,
			versionAtInstallation: versionAtInstallation ?? 'root',
		})
		return this
	}
	setOrder(order: ValidMigrationIds[]): MigrationsConfig {
		const result: MigrationsConfig = {
			sequences: this.sequences,
			order,
		}
		// validate early to provide more useful stack traces
		parseMigrations(result)
		return result
	}
}
