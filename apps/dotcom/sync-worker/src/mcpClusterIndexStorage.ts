import { McpClusterIndexKey } from './types'

// The SQL behind the MCP cluster index cache (see mcpClusterIndex.ts for what it is for), kept apart
// from TLFileDurableObject so it can be run against a real SQLite database in a test — otherwise
// these statements would only ever execute in production.

/** The subset of Cloudflare's `SqlStorage` these statements need. */
export interface McpClusterIndexSql {
	exec(query: string, ...bindings: unknown[]): { toArray(): unknown[] }
}

/**
 * The primary key deliberately excludes `version`: a page holds one row, and new content replaces the
 * row for the old content. That is what bounds a file's cache by its page count rather than by its
 * edit history, with no expiry policy to run. There is no slug either — the object is already
 * per-file, and a published slug can be rotated, which would strand a row nothing ever replaces.
 * `kind` stays, because one file is two boards: the live shared file and the frozen published
 * snapshot, which cluster differently once they have drifted apart.
 */
export function ensureMcpClusterIndexTable(sql: McpClusterIndexSql) {
	sql.exec(
		`CREATE TABLE IF NOT EXISTS mcp_cluster_index (
			kind TEXT NOT NULL,
			pageId TEXT NOT NULL,
			version TEXT NOT NULL,
			payload TEXT NOT NULL,
			PRIMARY KEY (kind, pageId)
		)`
	)
}

/**
 * One page's stored index, or null when the row is missing *or* is for content that has since moved
 * on. The version is matched in the statement rather than handed back for the caller to check, so a
 * stale payload cannot leave the object at all.
 */
export function readMcpClusterIndexRow(
	sql: McpClusterIndexSql,
	key: McpClusterIndexKey
): string | null {
	const rows = sql
		.exec(
			'SELECT payload FROM mcp_cluster_index WHERE kind = ? AND pageId = ? AND version = ?',
			key.kind,
			key.pageId,
			key.version
		)
		.toArray() as { payload: string }[]
	return rows[0]?.payload ?? null
}

export function writeMcpClusterIndexRow(
	sql: McpClusterIndexSql,
	key: McpClusterIndexKey,
	payload: string
) {
	sql.exec(
		'INSERT OR REPLACE INTO mcp_cluster_index (kind, pageId, version, payload) VALUES (?, ?, ?, ?)',
		key.kind,
		key.pageId,
		key.version,
		payload
	)
}
