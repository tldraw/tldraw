import { describe, expect, it } from 'vitest'
import { pruneTombstones, readTombstones, saveTombstones } from './restoreTombstones'
import { makeTestSql } from './test/testSql'

const thread = { id: 'commentThread:a', typeName: 'commentThread' } as any
const comment = { id: 'comment:b', typeName: 'comment' } as any

describe('restoreTombstones', () => {
	it('save then read returns records', () => {
		const sql = makeTestSql()
		saveTombstones(sql, 'r1', [thread, comment])
		expect(readTombstones(sql, 'r1')).toEqual(expect.arrayContaining([thread, comment]))
	})

	it('read leaves them in place, so a failed undo can be retried', () => {
		const sql = makeTestSql()
		saveTombstones(sql, 'r1', [thread])
		readTombstones(sql, 'r1')
		expect(readTombstones(sql, 'r1')).toEqual([thread])
	})

	it('read of unknown id is empty', () => {
		expect(readTombstones(makeTestSql(), 'nope')).toEqual([])
	})

	it('separate restores are isolated', () => {
		const sql = makeTestSql()
		saveTombstones(sql, 'r1', [thread])
		saveTombstones(sql, 'r2', [comment])
		expect(readTombstones(sql, 'r2')).toEqual([comment])
		expect(readTombstones(sql, 'r1')).toEqual([thread])
	})

	it('prune keeps only the given restore', () => {
		const sql = makeTestSql()
		saveTombstones(sql, 'r1', [thread])
		saveTombstones(sql, 'r2', [comment])
		pruneTombstones(sql, 'r2')
		expect(readTombstones(sql, 'r1')).toEqual([])
		expect(readTombstones(sql, 'r2')).toEqual([comment])
	})
})
