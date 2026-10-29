import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeR2 } from './test/fakeR2'
import { makeTestSql } from './test/testSql'
import { segmentCustomMetadata, versionKey } from './versionChain'
import { backfillVersionIndex, reconcileVersionIndex } from './versionIndexBackfill'
import {
	DoSql,
	ensureVersionIndexTables,
	getVersionIndexMeta,
	insertVersionIndexRow,
	readVersionIndexRows,
} from './versionIndexStorage'

const roomKey = 'app_rooms/f1'
const t = (s: number) => `2026-09-01T00:00:${String(s).padStart(2, '0')}.000Z`

async function seed(bucket: R2Bucket) {
	const keyframeKey = versionKey(roomKey, t(0), 'keyframe')
	await bucket.put(keyframeKey, 'k')
	await bucket.put(versionKey(roomKey, t(1), 'segment'), 's', {
		customMetadata: segmentCustomMetadata({
			keyframeKey,
			firstSeq: 1,
			timestamps: [t(1), t(2), t(3)],
		}),
	})
}

const allTs = (sql: DoSql) =>
	readVersionIndexRows(sql, { limit: 100, includeSystem: true }).map((r) => r.ts)

describe('backfillVersionIndex', () => {
	let sql: DoSql
	let bucket: R2Bucket
	beforeEach(async () => {
		sql = makeTestSql()
		ensureVersionIndexTables(sql)
		bucket = createFakeR2()
		await seed(bucket)
	})

	it('inserts every keyframe and segment timestamp', async () => {
		expect(await backfillVersionIndex({ sql, chainBucket: bucket, roomKey })).toEqual({
			inserted: 4,
		})
		expect(allTs(sql)).toEqual([t(3), t(2), t(1), t(0)])
	})

	it('keeps existing rows with authors', async () => {
		insertVersionIndexRow(sql, {
			ts: t(2),
			documentClock: 9,
			kind: 'edit',
			authors: [{ userId: 'u1' }],
			added: 1,
			updated: 0,
			removed: 0,
			restoreId: null,
			restoredFrom: null,
			name: null,
		})
		await backfillVersionIndex({ sql, chainBucket: bucket, roomKey })
		const row = readVersionIndexRows(sql, { limit: 100, includeSystem: true }).find(
			(r) => r.ts === t(2)
		)
		expect(row?.authors).toEqual([{ userId: 'u1' }])
	})

	it('second call is a no-op', async () => {
		await backfillVersionIndex({ sql, chainBucket: bucket, roomKey })
		const list = vi.spyOn(bucket, 'list')
		expect(await backfillVersionIndex({ sql, chainBucket: bucket, roomKey })).toEqual({
			inserted: 0,
		})
		expect(list).not.toHaveBeenCalled()
	})

	it('interrupted backfill resumes', async () => {
		const exec = sql.exec.bind(sql)
		let inserts = 0
		const flaky: DoSql = {
			exec(query, ...b) {
				if (/insert or ignore into version_index/i.test(query) && ++inserts === 3) {
					throw new Error('evicted')
				}
				return exec(query, ...b)
			},
		}
		await expect(
			backfillVersionIndex({ sql: flaky, chainBucket: bucket, roomKey })
		).rejects.toThrow()
		expect(getVersionIndexMeta(sql, 'backfilled')).toBeNull()
		await backfillVersionIndex({ sql, chainBucket: bucket, roomKey })
		expect(allTs(sql)).toHaveLength(4)
		expect(getVersionIndexMeta(sql, 'backfilled')).toBe('1')
	})
})

describe('reconcileVersionIndex', () => {
	it('inserts versions newer than the newest row', async () => {
		const sql = makeTestSql()
		ensureVersionIndexTables(sql)
		const bucket = createFakeR2()
		await seed(bucket)
		await backfillVersionIndex({ sql, chainBucket: bucket, roomKey })
		sql.exec('DELETE FROM version_index WHERE ts = ?', t(3))
		expect(
			await reconcileVersionIndex({ sql, chainBucket: bucket, roomKey, chainHeadTs: t(3) })
		).toEqual({ inserted: 1 })
		expect(allTs(sql)[0]).toBe(t(3))
	})

	it('is a no-op when the index is current', async () => {
		const sql = makeTestSql()
		ensureVersionIndexTables(sql)
		const bucket = createFakeR2()
		await seed(bucket)
		await backfillVersionIndex({ sql, chainBucket: bucket, roomKey })
		const list = vi.spyOn(bucket, 'list')
		expect(
			await reconcileVersionIndex({ sql, chainBucket: bucket, roomKey, chainHeadTs: t(3) })
		).toEqual({ inserted: 0 })
		expect(list).not.toHaveBeenCalled()
	})
})
