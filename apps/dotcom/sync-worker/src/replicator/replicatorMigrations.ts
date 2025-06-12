import { Logger } from '../Logger'
import { buildTopicsString, getTopics } from './ChangeCollator'
import { getSubscriptionChanges, serializeSubscriptions } from './Subscription'
import { ChangeV1, ChangeV2 } from './replicatorTypes'

type Migration =
	| {
			id: string
			sql: string
	  }
	| {
			id: string
			fn(sqlite: SqlStorage): void
	  }

const migrations: Migration[] = [
	{
		id: '000_seed',
		sql: `
			CREATE TABLE IF NOT EXISTS active_user (
				id TEXT PRIMARY KEY
			);
			CREATE TABLE IF NOT EXISTS user_file_subscriptions (
				userId TEXT,
				fileId TEXT,
				PRIMARY KEY (userId, fileId),
				FOREIGN KEY (userId) REFERENCES active_user(id) ON DELETE CASCADE
			);
			CREATE TABLE migrations (
				id TEXT PRIMARY KEY,
				code TEXT NOT NULL
			);
		`,
	},
	{
		id: '001_add_sequence_number',
		sql: `
			ALTER TABLE active_user ADD COLUMN sequenceNumber INTEGER NOT NULL DEFAULT 0;
			ALTER TABLE active_user ADD COLUMN sequenceIdSuffix TEXT NOT NULL DEFAULT '';
		`,
	},
	{
		id: '002_add_last_updated_at',
		sql: `
			ALTER TABLE active_user ADD COLUMN lastUpdatedAt INTEGER NOT NULL DEFAULT 0;
		`,
	},
	{
		id: '003_add_lsn_tracking',
		sql: `
			CREATE TABLE IF NOT EXISTS meta (
				lsn TEXT PRIMARY KEY,
				slotName TEXT NOT NULL
			);
			-- The slot name references the replication slot in postgres.
			-- If something ever gets messed up beyond mortal comprehension and we need to force all
			-- clients to reboot, we can just change the slot name by altering the slotNamePrefix in the constructor.
			INSERT INTO meta (lsn, slotName) VALUES ('0/0', 'init');
		`,
	},
	{
		id: '004_keep_event_log',
		sql: `
		  CREATE TABLE history (
				lsn TEXT NOT NULL,
				userId TEXT NOT NULL,
				fileId TEXT,
				json TEXT NOT NULL
			);
			CREATE INDEX history_lsn_userId ON history (lsn, userId);
			CREATE INDEX history_lsn_fileId ON history (lsn, fileId);
			PRAGMA optimize;
		`,
	},
	{
		id: '005_add_history_timestamp',
		sql: `
			ALTER TABLE history ADD COLUMN timestamp INTEGER NOT NULL DEFAULT 0;
		`,
	},
	{
		id: '006_graph_subscriptions',
		fn(sqlite: SqlStorage) {
			// We're doing two things here:
			// 1. Replacing file subscriptions with a graph-based topic subscription system
			// 2. Grouping history entries by transaction (using lsn to group) and storing topic subscription ops
			//    separately to allow for efficient catch-up operations.
			sqlite.exec(`
				CREATE TABLE history_new (
					lsn TEXT NOT NULL,
					changesJson TEXT NOT NULL,
					newSubscriptions TEXT,
					removedSubscriptions TEXT,
					topics TEXT NOT NULL,
					timestamp INTEGER NOT NULL
				);
				CREATE INDEX history_lsn ON history_new (lsn);
				CREATE INDEX history_topics ON history_new (topics);
				CREATE INDEX history_timestamp ON history_new (timestamp);

				-- Create graph-based subscription system
				CREATE TABLE topic_subscription (
					fromTopic TEXT NOT NULL,
					toTopic TEXT NOT NULL,
					PRIMARY KEY (fromTopic, toTopic)
				);
				CREATE INDEX topic_subscription_toTopic_fromTopic ON topic_subscription (toTopic, fromTopic);
				CREATE INDEX topic_subscription_fromTopic_toTopic ON topic_subscription (fromTopic, toTopic);

				-- Migrate existing data: user -> file subscriptions become direct edges
				INSERT INTO topic_subscription (fromTopic, toTopic)
				SELECT 'user:' || userId, 'file:' || fileId FROM user_file_subscriptions;

				DROP TABLE user_file_subscriptions;
			`)
			// migrate old history to new history
			let lsn = '0/0'
			let timestamp = 0
			let changes: ChangeV2[] = []
			const stash = () => {
				// don't write on the first iteration
				if (changes.length === 0) return
				// Map ChangeV2 to the format expected by getSubscriptionChanges
				const mappedChanges = changes.map((change) => ({
					row: change.row || change.previous, // For deletes, row is null so use previous
					event: change.event,
				}))
				const { newSubscriptions, removedSubscriptions } = getSubscriptionChanges(mappedChanges)
				sqlite.exec(
					'insert into history_new (lsn, changesJson, newSubscriptions, removedSubscriptions, topics, timestamp) values (?, ?, ?, ?, ?, ?)',
					lsn,
					JSON.stringify(changes),
					newSubscriptions && serializeSubscriptions(newSubscriptions),
					removedSubscriptions && serializeSubscriptions(removedSubscriptions),
					buildTopicsString(changes),
					timestamp
				)
				changes = []
			}
			for (const row of sqlite.exec<{
				lsn: string
				userId: string
				fileId: string
				json: string
				timestamp: number
			}>('select * from history')) {
				if (lsn !== row.lsn) {
					stash()
					lsn = row.lsn
				}
				const changeV1 = JSON.parse(row.json) as ChangeV1
				const changeV2: ChangeV2 = {
					event: changeV1.event,
					row: changeV1.row,
					previous: changeV1.previous,
					topics: getTopics(changeV1.row, changeV1.event),
				}
				changes.push(changeV2)
				timestamp = row.timestamp
			}
			stash()
			sqlite.exec('DROP TABLE history')
			sqlite.exec('ALTER TABLE history_new RENAME TO history')
		},
	},
]

function _applyMigration(sqlite: SqlStorage, log: Logger, index: number) {
	log.debug('running migration', migrations[index].id)
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
	log.debug('ran migration', migrations[index].id)
}

/**
 * Apply database migrations to the given SqlStorage instance.
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
		if (appliedMigrations[i].id !== migrations[i].id) {
			throw new Error(
				'TLPostgresReplicator migrations have changed!! this is an append-only array!!'
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
