import { UnknownRecord } from '@tldraw/store'
import { DoSql } from './versionIndexStorage'

// Comment records a restore removed, kept so undoing that restore can put them back.

function ensure(sql: DoSql) {
	sql.exec(
		`CREATE TABLE IF NOT EXISTS restore_tombstone (
			restore_id TEXT NOT NULL,
			record_id TEXT NOT NULL,
			record TEXT NOT NULL,
			PRIMARY KEY (restore_id, record_id)
		)`
	)
}

export function saveTombstones(sql: DoSql, restoreId: string, records: UnknownRecord[]) {
	ensure(sql)
	for (const record of records) {
		sql.exec(
			'INSERT OR REPLACE INTO restore_tombstone (restore_id, record_id, record) VALUES (?, ?, ?)',
			restoreId,
			record.id,
			JSON.stringify(record)
		)
	}
}

export function readTombstones(sql: DoSql, restoreId: string): UnknownRecord[] {
	ensure(sql)
	const rows = sql
		.exec('SELECT record FROM restore_tombstone WHERE restore_id = ?', restoreId)
		.toArray() as { record: string }[]
	return rows.map((r) => JSON.parse(r.record))
}

/**
 * Drops every restore's tombstones except `restoreId`'s. Only the newest restore can be undone, so
 * the rest can never be read again.
 */
export function pruneTombstones(sql: DoSql, keepRestoreId: string) {
	ensure(sql)
	sql.exec('DELETE FROM restore_tombstone WHERE restore_id != ?', keepRestoreId)
}
