import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import {
	McpClusterIndexSql,
	ensureMcpClusterIndexTable,
	readMcpClusterIndexRow,
	writeMcpClusterIndexRow,
} from './mcpClusterIndexStorage'
import { McpClusterIndexKey } from './types'

// Run against a real SQLite database, because the primary key is the whole design here and the fake
// durable object the rest of the tests use would accept a key that SQLite would not. It is also what
// keeps that fake honest: if these two disagree, the tool-level tests are proving nothing.

// A stand-in for Cloudflare's `SqlStorage`: same shape, a positional-binding exec returning a cursor.
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

const KEY: McpClusterIndexKey = { kind: 'shared_file', pageId: 'page:a', version: 'etag-1' }

function countRows(sql: McpClusterIndexSql) {
	const rows = sql.exec('SELECT COUNT(*) AS count FROM mcp_cluster_index').toArray() as {
		count: number
	}[]
	return rows[0].count
}

describe('the cluster index table', () => {
	it('reads back what it wrote, for that content version only', () => {
		const sql = makeSql()
		ensureMcpClusterIndexTable(sql)
		writeMcpClusterIndexRow(sql, KEY, '{"v":1}')

		expect(readMcpClusterIndexRow(sql, KEY)).toBe('{"v":1}')
		expect(readMcpClusterIndexRow(sql, { ...KEY, version: 'etag-2' })).toBeNull()
		expect(readMcpClusterIndexRow(sql, { ...KEY, pageId: 'page:b' })).toBeNull()
	})

	it('keeps one row per page, whatever the version', () => {
		const sql = makeSql()
		ensureMcpClusterIndexTable(sql)
		writeMcpClusterIndexRow(sql, KEY, '{"v":1,"n":1}')
		writeMcpClusterIndexRow(sql, { ...KEY, version: 'etag-2' }, '{"v":1,"n":2}')
		writeMcpClusterIndexRow(sql, { ...KEY, pageId: 'page:b' }, '{"v":1,"n":3}')

		// An edited board replaces its page's row rather than adding one, so a file that is edited
		// hourly for a year still holds one row per page.
		expect(countRows(sql)).toBe(2)
		expect(readMcpClusterIndexRow(sql, { ...KEY, version: 'etag-2' })).toBe('{"v":1,"n":2}')
		expect(readMcpClusterIndexRow(sql, KEY)).toBeNull()
	})

	it('keeps a file and the board published from it apart', () => {
		const sql = makeSql()
		ensureMcpClusterIndexTable(sql)
		// One file is two boards, and they cluster differently as soon as the live document moves past
		// the frozen snapshot — so `kind` has to be enough to separate them on its own.
		writeMcpClusterIndexRow(sql, KEY, '{"v":1,"n":"live"}')
		writeMcpClusterIndexRow(sql, { ...KEY, kind: 'published' }, '{"v":1,"n":"frozen"}')

		expect(countRows(sql)).toBe(2)
		expect(readMcpClusterIndexRow(sql, KEY)).toBe('{"v":1,"n":"live"}')
	})

	it('is safe to ensure repeatedly, which every call does', () => {
		const sql = makeSql()
		ensureMcpClusterIndexTable(sql)
		writeMcpClusterIndexRow(sql, KEY, '{"v":1}')
		ensureMcpClusterIndexTable(sql)

		expect(readMcpClusterIndexRow(sql, KEY)).toBe('{"v":1}')
	})
})
