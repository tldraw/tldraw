import { Logger } from '../Logger'

type Migration =
	| {
			id: string
			sql: string
	  }
	| {
			id: string
			fn(sqlite: SqlStorage): void
	  }

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FileDOMetadataRow = {
	schema: string
	serverClock: number
	documentClock: number
	tombstoneHistoryStartsAtClock: number
	lastModified: string
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FileDORecordRow = {
	id: string
	typeName: string
	data: string
	lastChangedClock: number
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FileDOTombstoneRow = {
	id: string
	deletedAtClock: number
}

const migrations: Migration[] = [
	{
		id: '000_seed',
		sql: `
			CREATE TABLE records (
				id TEXT PRIMARY KEY,
				typeName TEXT NOT NULL,
				data TEXT NOT NULL,
				lastChangedClock INTEGER NOT NULL
			);
			CREATE INDEX idx_typename ON records(typeName);
			CREATE INDEX idx_clock ON records(lastChangedClock);

			CREATE TABLE tombstones (
				id TEXT PRIMARY KEY,
				deletedAtClock INTEGER NOT NULL
			);

			CREATE TABLE metadata (
				schema TEXT NOT NULL,
				serverClock INTEGER NOT NULL,
				documentClock INTEGER NOT NULL,
				tombstoneHistoryStartsAtClock INTEGER NOT NULL,
				lastModified TEXT NOT NULL
			);

			INSERT INTO metadata (schema, clock, documentClock, tombstoneHistoryStartsAtClock, lastModified) VALUES ('', 0, 0, 0, 0);

			CREATE TABLE migrations (
				id TEXT PRIMARY KEY,
				code TEXT NOT NULL
			);
		`,
	},
]

function _applyMigration(sqlite: SqlStorage, log: Logger, index: number) {
	log.debug('running TLFileDurableObject migration', migrations[index].id)
	const migration = migrations[index]
	if ('sql' in migration) {
		sqlite.exec(migration.sql)
	} else {
		migration.fn(sqlite)
	}
	sqlite.exec(
		'insert into migrations (id, code) values (?, ?)',
		migrations[index].id,
		'sql' in migration ? migration.sql : 'fn'
	)
	log.debug('ran TLFileDurableObject migration', migrations[index].id)
}

/**
 * Apply database migrations to the given SqlStorage instance for TLFileDurableObject.
 *
 * @param sqlite - The SqlStorage instance to migrate
 * @param log - Logger instance for debug output
 * @param test__upTo - Optional migration ID to stop at (for testing purposes)
 */
export async function migrate(sqlite: SqlStorage, log: Logger, test__upTo?: string) {
	let appliedMigrations: Migration[]
	try {
		appliedMigrations = sqlite
			.exec('select code, id from migrations order by id asc')
			.toArray() as any
	} catch (_e) {
		// no migrations table, run initial migration
		_applyMigration(sqlite, log, 0)
		appliedMigrations = [migrations[0]]
	}

	for (let i = 0; i < appliedMigrations.length; i++) {
		if (!migrations[i]) {
			throw new Error(
				`TLFileDurableObject has more applied migrations (${appliedMigrations.length}) than defined migrations (${migrations.length}). Migration ID: ${appliedMigrations[i].id}`
			)
		}
		if (appliedMigrations[i].id !== migrations[i].id) {
			throw new Error(
				'TLFileDurableObject migrations have changed!! this is an append-only array!!'
			)
		}
	}

	// Determine the target migration index if test__upTo is specified
	let targetIndex = migrations.length
	if (test__upTo) {
		const upToIndex = migrations.findIndex((m) => m.id === test__upTo)
		if (upToIndex === -1) {
			throw new Error(`Migration with id '${test__upTo}' not found`)
		}
		targetIndex = upToIndex + 1 // +1 because we want to include the target migration
	}

	for (let i = appliedMigrations.length; i < Math.min(targetIndex, migrations.length); i++) {
		_applyMigration(sqlite, log, i)
	}
}
