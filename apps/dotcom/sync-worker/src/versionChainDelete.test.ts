import { describe, expect, it } from 'vitest'
import { createFakeR2 } from './test/fakeR2'
import { deleteAllVersions } from './versionChainRead'

describe('deleteAllVersions', () => {
	it('clears both buckets for the room', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const roomKey = 'app_rooms/slug'

		await chainBucket.put(`${roomKey}/2026-09-01T00:00:00.000Z.k`, '{}')
		await chainBucket.put(`${roomKey}/2026-09-01T00:00:08.000Z.s`, '{}')
		await legacyBucket.put(`${roomKey}/2026-08-01T00:00:00.000Z`, '{}')
		await chainBucket.put('app_rooms/other/2026-09-01T00:00:00.000Z.k', '{}')
		// A sibling room whose slug starts with ours must survive the sweep.
		await chainBucket.put(`${roomKey}2/2026-09-01T00:00:00.000Z.k`, '{}')

		await deleteAllVersions({ chainBucket, legacyBucket, roomKey })

		expect((await chainBucket.list({ prefix: `${roomKey}/` })).objects).toHaveLength(0)
		expect((await legacyBucket.list({ prefix: `${roomKey}/` })).objects).toHaveLength(0)
		expect((await chainBucket.list({ prefix: 'app_rooms/other' })).objects).toHaveLength(1)
		expect((await chainBucket.list({ prefix: `${roomKey}2` })).objects).toHaveLength(1)
	})
})
