import { describe, expect, it } from 'vitest'
import { createFakeR2 } from './test/fakeR2'
import { deleteAllVersions } from './versionChainRead'

describe('deleteAllVersions', () => {
	it('clears the chain, legacy and cold buckets for the room', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const coldBucket = createFakeR2()
		const roomKey = 'app_rooms/slug'

		await chainBucket.put(`${roomKey}/2026-09-01T00:00:00.000Z.k`, '{}')
		await chainBucket.put(`${roomKey}/2026-09-01T00:00:08.000Z.s`, '{}')
		await legacyBucket.put(`${roomKey}/2026-08-01T00:00:00.000Z`, '{}')
		await coldBucket.put(`${roomKey}/manifest.jsonl`, '{}')
		await coldBucket.put(`${roomKey}/snapshots.part01.tar.zst`, 'zst')
		await chainBucket.put('app_rooms/other/2026-09-01T00:00:00.000Z.k', '{}')
		// A sibling room whose slug starts with ours must survive the sweep.
		await chainBucket.put(`${roomKey}2/2026-09-01T00:00:00.000Z.k`, '{}')
		await coldBucket.put(`${roomKey}2/manifest.jsonl`, '{}')

		await deleteAllVersions({ chainBucket, legacyBucket, coldBucket, roomKey })

		expect((await chainBucket.list({ prefix: `${roomKey}/` })).objects).toHaveLength(0)
		expect((await legacyBucket.list({ prefix: `${roomKey}/` })).objects).toHaveLength(0)
		expect((await coldBucket.list({ prefix: `${roomKey}/` })).objects).toHaveLength(0)
		expect((await chainBucket.list({ prefix: 'app_rooms/other' })).objects).toHaveLength(1)
		expect((await chainBucket.list({ prefix: `${roomKey}2` })).objects).toHaveLength(1)
		expect((await coldBucket.list({ prefix: `${roomKey}2` })).objects).toHaveLength(1)
	})

	it("removes the migration's copies and backfill boundary beside the chain", async () => {
		const chainBucket = createFakeR2()
		const roomKey = 'app_rooms/slug'

		await chainBucket.put(`legacy_versions/${roomKey}/2026-09-20T00:00:00.000Z`, '{}')
		await chainBucket.put(`room-history-backfill/${roomKey}.json`, '{}')
		await chainBucket.put(`legacy_versions/${roomKey}2/2026-09-20T00:00:00.000Z`, '{}')
		await chainBucket.put(`room-history-backfill/${roomKey}2.json`, '{}')

		await deleteAllVersions({
			chainBucket,
			legacyBucket: createFakeR2(),
			coldBucket: createFakeR2(),
			roomKey,
		})

		expect(
			(await chainBucket.list({ prefix: `legacy_versions/${roomKey}/` })).objects
		).toHaveLength(0)
		expect(await chainBucket.head(`room-history-backfill/${roomKey}.json`)).toBeNull()
		expect(
			(await chainBucket.list({ prefix: `legacy_versions/${roomKey}2/` })).objects
		).toHaveLength(1)
		expect(await chainBucket.head(`room-history-backfill/${roomKey}2.json`)).not.toBeNull()
	})
})
