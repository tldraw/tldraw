// One row per version-chain entry, so the history list reads DO SQLite instead of listing R2.
// Kept out of TLFileDurableObject so it runs against real SQLite in tests.

/** The subset of Cloudflare's `SqlStorage` these statements need. */
export interface DoSql {
	exec(query: string, ...bindings: unknown[]): { toArray(): unknown[] }
}

export type VersionKind = 'edit' | 'system' | 'pre_restore' | 'restore'

export interface VersionAuthor {
	userId: string | null
	agent?: 'mcp'
}

export interface VersionIndexRow {
	ts: string
	documentClock: number
	kind: VersionKind
	authors: VersionAuthor[]
	added: number
	updated: number
	removed: number
	restoreId: string | null
	restoredFrom: string | null
	name: string | null
}

interface DbRow {
	ts: string
	document_clock: number
	kind: VersionKind
	authors: string
	shapes_added: number
	shapes_updated: number
	shapes_removed: number
	restore_id: string | null
	restored_from: string | null
	name: string | null
}

export function ensureVersionIndexTables(sql: DoSql) {
	sql.exec(
		`CREATE TABLE IF NOT EXISTS version_index (
			ts TEXT PRIMARY KEY,
			document_clock INTEGER NOT NULL,
			kind TEXT NOT NULL,
			authors TEXT NOT NULL,
			shapes_added INTEGER NOT NULL,
			shapes_updated INTEGER NOT NULL,
			shapes_removed INTEGER NOT NULL,
			restore_id TEXT,
			restored_from TEXT,
			name TEXT
		)`
	)
	sql.exec(
		'CREATE TABLE IF NOT EXISTS version_index_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)'
	)
}

function fromDb(row: DbRow): VersionIndexRow {
	return {
		ts: row.ts,
		documentClock: row.document_clock,
		kind: row.kind,
		authors: JSON.parse(row.authors),
		added: row.shapes_added,
		updated: row.shapes_updated,
		removed: row.shapes_removed,
		restoreId: row.restore_id,
		restoredFrom: row.restored_from,
		name: row.name,
	}
}

export function insertVersionIndexRow(sql: DoSql, row: VersionIndexRow) {
	sql.exec(
		`INSERT OR IGNORE INTO version_index
			(ts, document_clock, kind, authors, shapes_added, shapes_updated, shapes_removed, restore_id, restored_from, name)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		row.ts,
		row.documentClock,
		row.kind,
		JSON.stringify(row.authors),
		row.added,
		row.updated,
		row.removed,
		row.restoreId,
		row.restoredFrom,
		row.name
	)
}

export function readVersionIndexRows(
	sql: DoSql,
	opts: { before?: string; limit: number; includeSystem: boolean }
): VersionIndexRow[] {
	const where: string[] = []
	const bindings: unknown[] = []
	if (opts.before !== undefined) {
		where.push('ts < ?')
		bindings.push(opts.before)
	}
	if (!opts.includeSystem) where.push("kind != 'system'")
	const rows = sql
		.exec(
			`SELECT * FROM version_index ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ts DESC LIMIT ?`,
			...bindings,
			opts.limit
		)
		.toArray() as DbRow[]
	return rows.map(fromDb)
}

export function readVersionIndexRange(sql: DoSql, from: string, to: string): VersionIndexRow[] {
	const rows = sql
		.exec(
			"SELECT * FROM version_index WHERE ts >= ? AND ts <= ? AND kind != 'system' ORDER BY ts ASC",
			from,
			to
		)
		.toArray() as DbRow[]
	return rows.map(fromDb)
}

export function readNewestVersionTs(sql: DoSql): string | null {
	const rows = sql.exec('SELECT MAX(ts) AS ts FROM version_index').toArray() as {
		ts: string | null
	}[]
	return rows[0]?.ts ?? null
}

/**
 * Marks the newest version as the state a restore replaces and returns it as the undo target. An
 * earlier restore's row is left as is: nothing changed since, so it already is that state.
 */
export function tagLatestAsPreRestore(sql: DoSql, restoreId: string): string | null {
	const rows = sql
		.exec('SELECT ts, kind FROM version_index ORDER BY ts DESC LIMIT 1')
		.toArray() as { ts: string; kind: VersionKind }[]
	if (!rows.length) return null
	const { ts, kind } = rows[0]
	if (kind === 'restore' || kind === 'pre_restore') return ts
	sql.exec(
		"UPDATE version_index SET kind = 'pre_restore', restore_id = ? WHERE ts = ?",
		restoreId,
		ts
	)
	return ts
}

/** Names a version (null clears it). False when there's no such version. */
export function setVersionName(sql: DoSql, ts: string, name: string | null): boolean {
	const exists = sql.exec('SELECT 1 FROM version_index WHERE ts = ?', ts).toArray().length > 0
	if (!exists) return false
	sql.exec('UPDATE version_index SET name = ? WHERE ts = ?', name, ts)
	return true
}

export function getVersionIndexMeta(sql: DoSql, key: string): string | null {
	const rows = sql.exec('SELECT value FROM version_index_meta WHERE key = ?', key).toArray() as {
		value: string
	}[]
	return rows[0]?.value ?? null
}

export function setVersionIndexMeta(sql: DoSql, key: string, value: string) {
	sql.exec(
		'INSERT INTO version_index_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
		key,
		value
	)
}
