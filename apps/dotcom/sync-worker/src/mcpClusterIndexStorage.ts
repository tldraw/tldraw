import { McpClusterIndexKey } from './types'

// The SQL behind the MCP cluster index cache, kept apart from TLFileDurableObject so it can be run
// against a real SQLite database in a test. Nothing else in this file's neighbourhood can be: the
// object's other storage is reached through a live room, and a statement that only ever executes in
// production is a statement nothing has checked.
//
// See TLFileDurableObject.getMcpClusterIndex for what this cache is and why it lives on the file's
// own durable object.

/** The subset of Cloudflare's `SqlStorage` these statements need. */
export interface McpClusterIndexSql {
	exec(query: string, ...bindings: unknown[]): { toArray(): unknown[] }
}

/**
 * The table.
 *
 * The primary key deliberately excludes `version`: a page holds one row, and new content replaces
 * the row for the old content rather than adding to it. That is what keeps a file's cache bounded by
 * its page count instead of by its edit history, with no expiry policy to run.
 */
export function ensureMcpClusterIndexTable(sql: McpClusterIndexSql) {
	sql.exec(
		`CREATE TABLE IF NOT EXISTS mcp_cluster_index (
			kind TEXT NOT NULL,
			slug TEXT NOT NULL,
			pageId TEXT NOT NULL,
			version TEXT NOT NULL,
			payload TEXT NOT NULL,
			updatedAt INTEGER NOT NULL,
			PRIMARY KEY (kind, slug, pageId)
		)`
	)
}

/**
 * One page's stored index, or null when the row is missing *or* is for content that has since moved
 * on. The version is matched here rather than returned for the caller to check, so a stale payload
 * cannot leave this object at all.
 */
export function readMcpClusterIndexRow(
	sql: McpClusterIndexSql,
	key: McpClusterIndexKey
): string | null {
	const rows = sql
		.exec(
			'SELECT payload FROM mcp_cluster_index WHERE kind = ? AND slug = ? AND pageId = ? AND version = ?',
			key.kind,
			key.slug,
			key.pageId,
			key.version
		)
		.toArray() as { payload: string }[]
	return rows[0]?.payload ?? null
}

export function writeMcpClusterIndexRow(
	sql: McpClusterIndexSql,
	key: McpClusterIndexKey,
	payload: string,
	now: number
) {
	sql.exec(
		'INSERT OR REPLACE INTO mcp_cluster_index (kind, slug, pageId, version, payload, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
		key.kind,
		key.slug,
		key.pageId,
		key.version,
		payload,
		now
	)
}
