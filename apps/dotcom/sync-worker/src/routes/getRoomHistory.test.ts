import { describe, expect, it } from 'vitest'
import { createFakeR2 } from '../test/fakeR2'
import { segmentCustomMetadata } from '../versionChain'
import { listVersionTimestamps } from '../versionChainRead'

describe('history listing during the transition', () => {
	it('shows legacy versions, keyframes and every version inside a segment as one list', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const roomKey = 'app_rooms/slug'

		await legacyBucket.put(`${roomKey}/2026-08-01T00:00:00.000Z`, '{}')
		await chainBucket.put(`${roomKey}/2026-09-01T00:00:00.000Z.k`, '{}')
		// One segment object standing for two versions — the listing must expand it, not report
		// the segment's own key as a version.
		await chainBucket.put(`${roomKey}/2026-09-01T00:00:08.000Z.s`, '{}', {
			customMetadata: segmentCustomMetadata({
				keyframeKey: `${roomKey}/2026-09-01T00:00:00.000Z.k`,
				firstSeq: 1,
				timestamps: ['2026-09-01T00:00:08.000Z', '2026-09-01T00:00:16.000Z'],
			}),
		})

		expect(
			await listVersionTimestamps({ chainBucket, legacyBucket, roomKey, prefix: '2026-0' })
		).toEqual([
			'2026-09-01T00:00:16.000Z',
			'2026-09-01T00:00:08.000Z',
			'2026-09-01T00:00:00.000Z',
			'2026-08-01T00:00:00.000Z',
		])
	})
})
