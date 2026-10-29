import { describe, expect, it } from 'vitest'
import { saveTombstones, takeTombstones } from './restoreTombstones'
import { makeTestSql } from './test/testSql'

const thread = { id: 'commentThread:a', typeName: 'commentThread' } as any
const comment = { id: 'comment:b', typeName: 'comment' } as any

describe('restoreTombstones', () => {
	it('save then take returns records', () => {
		const sql = makeTestSql()
		saveTombstones(sql, 'r1', [thread, comment])
		expect(takeTombstones(sql, 'r1')).toEqual(expect.arrayContaining([thread, comment]))
	})

	it('take deletes them', () => {
		const sql = makeTestSql()
		saveTombstones(sql, 'r1', [thread])
		takeTombstones(sql, 'r1')
		expect(takeTombstones(sql, 'r1')).toEqual([])
	})

	it('take of unknown id is empty', () => {
		expect(takeTombstones(makeTestSql(), 'nope')).toEqual([])
	})

	it('separate restores are isolated', () => {
		const sql = makeTestSql()
		saveTombstones(sql, 'r1', [thread])
		saveTombstones(sql, 'r2', [comment])
		expect(takeTombstones(sql, 'r2')).toEqual([comment])
		expect(takeTombstones(sql, 'r1')).toEqual([thread])
	})
})
