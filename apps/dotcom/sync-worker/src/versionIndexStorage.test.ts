import { beforeEach, describe, expect, it } from 'vitest'
import { makeTestSql } from './test/testSql'
import {
	DoSql,
	VersionIndexRow,
	ensureVersionIndexTables,
	getVersionIndexMeta,
	insertVersionIndexRow,
	readVersionIndexRange,
	readVersionIndexRows,
	readVersionName,
	setVersionIndexMeta,
	setVersionName,
	tagLatestAsPreRestore,
} from './versionIndexStorage'

function row(ts: string, overrides: Partial<VersionIndexRow> = {}): VersionIndexRow {
	return {
		ts,
		documentClock: 1,
		kind: 'edit',
		authors: [],
		added: 0,
		updated: 0,
		removed: 0,
		restoreId: null,
		restoredFrom: null,
		restoredFromName: null,
		name: null,
		...overrides,
	}
}

describe('versionIndexStorage', () => {
	let sql: DoSql
	beforeEach(() => {
		sql = makeTestSql()
		ensureVersionIndexTables(sql)
	})

	it('insert then read newest first', () => {
		insertVersionIndexRow(sql, row('2026-01-01T00:00:00.000Z'))
		insertVersionIndexRow(sql, row('2026-01-02T00:00:00.000Z'))
		expect(readVersionIndexRows(sql, { limit: 10, includeSystem: true }).map((r) => r.ts)).toEqual([
			'2026-01-02T00:00:00.000Z',
			'2026-01-01T00:00:00.000Z',
		])
	})

	it('insert is idempotent on ts', () => {
		insertVersionIndexRow(sql, row('2026-01-01T00:00:00.000Z', { added: 1 }))
		insertVersionIndexRow(sql, row('2026-01-01T00:00:00.000Z', { added: 5 }))
		const rows = readVersionIndexRows(sql, { limit: 10, includeSystem: true })
		expect(rows).toHaveLength(1)
		expect(rows[0].added).toBe(1)
	})

	it('before excludes the cursor row', () => {
		insertVersionIndexRow(sql, row('a1'))
		insertVersionIndexRow(sql, row('a2'))
		insertVersionIndexRow(sql, row('a3'))
		expect(
			readVersionIndexRows(sql, { before: 'a3', limit: 10, includeSystem: true }).map((r) => r.ts)
		).toEqual(['a2', 'a1'])
	})

	it('includeSystem false hides system rows', () => {
		insertVersionIndexRow(sql, row('a1'))
		insertVersionIndexRow(sql, row('a2', { kind: 'system' }))
		expect(readVersionIndexRows(sql, { limit: 10, includeSystem: false }).map((r) => r.ts)).toEqual(
			['a1']
		)
	})

	it('range is inclusive and oldest first', () => {
		for (const ts of ['a1', 'a2', 'a3', 'a4']) insertVersionIndexRow(sql, row(ts))
		insertVersionIndexRow(sql, row('a25', { kind: 'system' }))
		expect(readVersionIndexRange(sql, 'a2', 'a3').map((r) => r.ts)).toEqual(['a2', 'a3'])
	})

	it('tagLatestAsPreRestore tags only the newest row', () => {
		insertVersionIndexRow(sql, row('a1'))
		insertVersionIndexRow(sql, row('a2'))
		expect(tagLatestAsPreRestore(sql, 'r1')).toBe('a2')
		const [newest, older] = readVersionIndexRows(sql, { limit: 10, includeSystem: true })
		expect(newest).toMatchObject({ kind: 'pre_restore', restoreId: 'r1' })
		expect(older).toMatchObject({ kind: 'edit', restoreId: null })
	})

	it('tagLatestAsPreRestore keeps a restore row and returns it as the undo target', () => {
		insertVersionIndexRow(sql, row('a1'))
		insertVersionIndexRow(sql, row('a2', { kind: 'restore', restoreId: 'r0', restoredFrom: 'a0' }))
		expect(tagLatestAsPreRestore(sql, 'r1')).toBe('a2')
		expect(readVersionIndexRows(sql, { limit: 1, includeSystem: true })[0]).toMatchObject({
			kind: 'restore',
			restoreId: 'r0',
		})
	})

	it('tagLatestAsPreRestore on an empty index returns null', () => {
		expect(tagLatestAsPreRestore(sql, 'r1')).toBeNull()
	})

	it('authors round-trip as JSON', () => {
		const authors = [{ userId: 'u1' }, { userId: 'u2', agent: 'mcp' as const }, { userId: null }]
		insertVersionIndexRow(sql, row('a1', { authors }))
		expect(readVersionIndexRows(sql, { limit: 1, includeSystem: true })[0].authors).toEqual(authors)
	})

	it('setVersionName names and clears a version', () => {
		insertVersionIndexRow(sql, row('a1'))
		expect(setVersionName(sql, 'a1', 'Before review')).toBe(true)
		expect(readVersionIndexRows(sql, { limit: 1, includeSystem: true })[0].name).toBe(
			'Before review'
		)
		setVersionName(sql, 'a1', null)
		expect(readVersionIndexRows(sql, { limit: 1, includeSystem: true })[0].name).toBeNull()
		expect(setVersionName(sql, 'missing', 'x')).toBe(false)
	})

	it('readVersionName returns the name, or null for unnamed and missing versions', () => {
		insertVersionIndexRow(sql, row('a1', { name: 'v3' }))
		insertVersionIndexRow(sql, row('a2'))
		expect(readVersionName(sql, 'a1')).toBe('v3')
		expect(readVersionName(sql, 'a2')).toBeNull()
		expect(readVersionName(sql, 'missing')).toBeNull()
	})

	it('restoredFromName round-trips', () => {
		insertVersionIndexRow(
			sql,
			row('a2', { kind: 'restore', restoreId: 'r1', restoredFrom: 'a1', restoredFromName: 'v3' })
		)
		expect(readVersionIndexRows(sql, { limit: 1, includeSystem: true })[0].restoredFromName).toBe(
			'v3'
		)
	})

	it('adds restored_from_name to a table created before it existed', () => {
		const old = makeTestSql()
		old.exec(
			`CREATE TABLE version_index (ts TEXT PRIMARY KEY, document_clock INTEGER NOT NULL, kind TEXT NOT NULL,
				authors TEXT NOT NULL, shapes_added INTEGER NOT NULL, shapes_updated INTEGER NOT NULL,
				shapes_removed INTEGER NOT NULL, restore_id TEXT, restored_from TEXT, name TEXT)`
		)
		ensureVersionIndexTables(old)
		insertVersionIndexRow(old, row('a1', { restoredFromName: 'v3' }))
		expect(readVersionIndexRows(old, { limit: 1, includeSystem: true })[0].restoredFromName).toBe(
			'v3'
		)
	})

	it('meta get and set', () => {
		expect(getVersionIndexMeta(sql, 'backfilled')).toBeNull()
		setVersionIndexMeta(sql, 'backfilled', '1')
		setVersionIndexMeta(sql, 'backfilled', '2')
		expect(getVersionIndexMeta(sql, 'backfilled')).toBe('2')
	})
})
