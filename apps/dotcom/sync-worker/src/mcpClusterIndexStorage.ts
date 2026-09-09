import { McpClusterIndexKey, ThumbnailBoardKind } from './types'

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
 * snapshot, which cluster differently once they have drifted apart. Unpublishing leaves the
 * `published` rows behind — bounded by the page count, and replaced by version on a republish.
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

/**
 * Drops the rows for pages this board no longer has.
 *
 * Without this the table is bounded by the page ids a board has *ever* had rather than by the pages
 * it has now: a page deleted after it was indexed leaves a row nothing reads, replaces, or expires.
 * Run on every write, which is the only moment the current page list is in hand anyway.
 */
export function pruneMcpClusterIndexRows(
	sql: McpClusterIndexSql,
	kind: ThumbnailBoardKind,
	pageIds: string[]
) {
	// A board always has at least the page being written, so the list is never empty and the generated
	// `NOT IN ()` is never the syntax error an empty one would be.
	const placeholders = pageIds.map(() => '?').join(', ')
	sql.exec(
		`DELETE FROM mcp_cluster_index WHERE kind = ? AND pageId NOT IN (${placeholders})`,
		kind,
		...pageIds
	)
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
