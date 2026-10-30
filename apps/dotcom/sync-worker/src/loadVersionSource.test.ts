import { UnknownRecord } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import { loadFileVersionSnapshot } from './loadVersionSource'
import { createFakeR2 } from './test/fakeR2'
import { versionKey } from './versionChain'
import { encodeVersionBody } from './versionChainCodec'

const snap: RoomSnapshot = {
	clock: 3,
	documentClock: 3,
	documents: [
		{ state: { id: 'shape:a', typeName: 'shape' } as UnknownRecord, lastChangedClock: 3 },
	],
	tombstones: {},
	tombstoneHistoryStartsAtClock: 0,
	schema: { schemaVersion: 2, sequences: {} } as any,
}

describe('loadFileVersionSnapshot', () => {
	it('rebuilds the version from the source file chain', async () => {
		const bucket = createFakeR2()
		const ts = '2026-10-01T00:00:00.000Z'
		const encoded = await encodeVersionBody(snap)
		await bucket.put(versionKey('app_rooms/file_src', ts, 'keyframe'), encoded.body, {
			customMetadata: encoded.metadata,
		})
		expect(await loadFileVersionSnapshot(bucket, 'file_src', ts)).toEqual(snap)
	})

	it('returns null for a missing version', async () => {
		expect(await loadFileVersionSnapshot(createFakeR2(), 'file_src', 'nope')).toBeNull()
	})
})
