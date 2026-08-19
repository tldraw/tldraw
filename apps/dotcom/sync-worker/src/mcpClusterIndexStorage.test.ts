import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import {
	McpClusterIndexSql,
	ensureMcpClusterIndexTable,
	readMcpClusterIndexRow,
	writeMcpClusterIndexRow,
} from './mcpClusterIndexStorage'
import { McpClusterIndexKey } from './types'

// Run against a real SQLite database, because the statements are the point: everything else about
// this cache is checked with a fake durable object, which would accept a table definition or a
// primary key that SQLite would not.

// A stand-in for Cloudflare's `SqlStorage`, which is what the durable object passes in. Same shape:
// a positional-binding exec returning a cursor.
function makeSql(): McpClusterIndexSql {
	const db = new DatabaseSync(':memory:')
	return {
		exec(query: string, ...bindings: unknown[]) {
			const statement = db.prepare(query)
			if (/^\s*select/i.test(query)) {
				return { toArray: () => statement.all(...(bindings as any[])) }
			}
			statement.run(...(bindings as any[]))
			return { toArray: () => [] }
		},
	}
}

const KEY: McpClusterIndexKey = {
	kind: 'shared_file',
	slug: 'file-1',
	pageId: 'page:a',
	version: 'etag-1',
}

describe('the cluster index table', () => {
	it('reads back what it wrote, for that content version only', () => {
		const sql = makeSql()
		ensureMcpClusterIndexTable(sql)
		writeMcpClusterIndexRow(sql, KEY, '{"v":1}', 1)

		expect(readMcpClusterIndexRow(sql, KEY)).toBe('{"v":1}')
		expect(readMcpClusterIndexRow(sql, { ...KEY, version: 'etag-2' })).toBeNull()
		expect(readMcpClusterIndexRow(sql, { ...KEY, pageId: 'page:b' })).toBeNull()
	})

	it('keeps one row per page, whatever the version', () => {
		const sql = makeSql()
		ensureMcpClusterIndexTable(sql)
		writeMcpClusterIndexRow(sql, KEY, '{"v":1,"n":1}', 1)
		writeMcpClusterIndexRow(sql, { ...KEY, version: 'etag-2' }, '{"v":1,"n":2}', 2)
		writeMcpClusterIndexRow(sql, { ...KEY, pageId: 'page:b' }, '{"v":1,"n":3}', 3)

		// An edited board replaces its page's row rather than adding one, so a file that is edited
		// hourly for a year still holds one row per page.
		expect(countRows(sql)).toBe(2)
		expect(readMcpClusterIndexRow(sql, { ...KEY, version: 'etag-2' })).toBe('{"v":1,"n":2}')
		expect(readMcpClusterIndexRow(sql, KEY)).toBeNull()
	})

	it('keeps a file and the board published from it apart', () => {
		const sql = makeSql()
		ensureMcpClusterIndexTable(sql)
		// A published slug and its parent file are two boards that cluster differently as soon as the
		// live document moves past the frozen snapshot, so they must not share a row.
		writeMcpClusterIndexRow(sql, KEY, '{"v":1,"n":"live"}', 1)
		writeMcpClusterIndexRow(sql, { ...KEY, kind: 'published' }, '{"v":1,"n":"frozen"}', 1)

		expect(countRows(sql)).toBe(2)
		expect(readMcpClusterIndexRow(sql, KEY)).toBe('{"v":1,"n":"live"}')
	})

	it('is safe to ensure repeatedly, which every call does', () => {
		const sql = makeSql()
		ensureMcpClusterIndexTable(sql)
		writeMcpClusterIndexRow(sql, KEY, '{"v":1}', 1)
		ensureMcpClusterIndexTable(sql)

		expect(readMcpClusterIndexRow(sql, KEY)).toBe('{"v":1}')
	})
})

function countRows(sql: McpClusterIndexSql) {
	const rows = sql.exec('SELECT COUNT(*) AS count FROM mcp_cluster_index').toArray() as {
		count: number
	}[]
	return rows[0].count
}
