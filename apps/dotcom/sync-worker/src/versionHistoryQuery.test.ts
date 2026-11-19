import { beforeEach, describe, expect, it } from 'vitest'
import { makeTestSql } from './test/testSql'
import { readRawPage, readSessionsPage } from './versionHistoryQuery'
import {
	DoSql,
	VersionIndexRow,
	ensureVersionIndexTables,
	insertVersionIndexRow,
} from './versionIndexStorage'

const base = Date.parse('2026-10-01T00:00:00.000Z')
const at = (min: number) => new Date(base + min * 60_000).toISOString()
function row(min: number, overrides: Partial<VersionIndexRow> = {}): VersionIndexRow {
	return {
		ts: at(min),
		documentClock: min,
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

describe('readSessionsPage', () => {
	let sql: DoSql
	beforeEach(() => {
		sql = makeTestSql()
		ensureVersionIndexTables(sql)
		// sessions: [0,10] [100,110] [200,210]
		for (const m of [0, 10, 100, 110, 200, 210]) insertVersionIndexRow(sql, row(m))
	})

	it('page of 2 sessions with cursor', () => {
		const page = readSessionsPage(sql, { limit: 2 })
		expect(page.sessions.map((s) => s.end)).toEqual([at(210), at(110)])
		expect(page.nextCursor).toBe(at(100))
	})

	it('last page has null cursor', () => {
		const page = readSessionsPage(sql, { before: at(100), limit: 2 })
		expect(page.sessions.map((s) => s.end)).toEqual([at(10)])
		expect(page.nextCursor).toBeNull()
	})

	it('session spanning a batch boundary is returned whole', () => {
		const page = readSessionsPage(sql, { limit: 1, batchSize: 1 })
		expect(page.sessions).toHaveLength(1)
		expect(page.sessions[0]).toMatchObject({ start: at(200), end: at(210) })
	})

	it('rows inserted after page 1 do not change page 2', () => {
		const first = readSessionsPage(sql, { limit: 1 })
		const expected = readSessionsPage(sql, { before: first.nextCursor!, limit: 1 })
		insertVersionIndexRow(sql, row(215))
		insertVersionIndexRow(sql, row(400))
		expect(readSessionsPage(sql, { before: first.nextCursor!, limit: 1 })).toEqual(expected)
	})

	it('system rows between sessions are skipped across pages', () => {
		insertVersionIndexRow(sql, row(150, { kind: 'system' }))
		const first = readSessionsPage(sql, { limit: 1 })
		const second = readSessionsPage(sql, { before: first.nextCursor!, limit: 1 })
		expect(second.sessions[0]).toMatchObject({ start: at(100), end: at(110) })
	})
})

describe('readRawPage', () => {
	it('raw page includes system rows', () => {
		const sql = makeTestSql()
		ensureVersionIndexTables(sql)
		insertVersionIndexRow(sql, row(0))
		insertVersionIndexRow(sql, row(1, { kind: 'system' }))
		insertVersionIndexRow(sql, row(2))
		const page = readRawPage(sql, { limit: 2 })
		expect(page.versions.map((v) => v.ts)).toEqual([at(2), at(1)])
		expect(page.nextCursor).toBe(at(1))
		expect(readRawPage(sql, { before: at(1), limit: 2 }).nextCursor).toBeNull()
	})
})
