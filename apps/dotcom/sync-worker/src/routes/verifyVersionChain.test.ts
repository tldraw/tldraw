import { UnknownRecord } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import { createFakeR2 } from '../test/fakeR2'
import { ChainState, PendingDelta } from '../versionChain'
import { writeVersionChainEntry } from '../versionChainWrite'
import { verifyRoomVersions } from './verifyVersionChain'

const roomKey = 'app_rooms/slug'

function snapshot(clock: number, ids: string[]): RoomSnapshot {
	return {
		clock,
		documentClock: clock,
		documents: ids.map((id) => ({
			state: { id, typeName: 'shape' } as UnknownRecord,
			lastChangedClock: clock,
		})),
		tombstones: {},
		tombstoneHistoryStartsAtClock: 0,
		schema: { schemaVersion: 2, sequences: {} } as any,
	}
}

/** Mirrors what dual-write produces: a chain in one bucket, full copies in the other. */
async function seedDualWrite(
	chainBucket: R2Bucket,
	legacyBucket: R2Bucket,
	versions: RoomSnapshot[]
) {
	let chain: ChainState | null = null
	let pending: PendingDelta[] = []

	for (let i = 0; i < versions.length; i++) {
		const iso = `2026-09-01T00:00:0${i}.000Z`
		const result = await writeVersionChainEntry({
			bucket: chainBucket,
			roomKey,
			iso,
			chain,
			pending,
			previous: i === 0 ? null : versions[i - 1],
			next: versions[i],
			now: i * 1000,
		})
		chain = result.chain
		pending = result.pending
		await legacyBucket.put(`${roomKey}/${iso}`, JSON.stringify(versions[i]))
	}
}

describe('verifyRoomVersions', () => {
	it('reports no mismatches when reconstruction matches the full copies', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		await seedDualWrite(chainBucket, legacyBucket, [
			snapshot(1, ['shape:a']),
			snapshot(2, ['shape:a', 'shape:b']),
		])

		expect(await verifyRoomVersions({ chainBucket, legacyBucket, roomKey, limit: 10 })).toEqual({
			checked: 2,
			mismatches: [],
			errors: [],
		})
	})

	it('names the timestamp when a reconstruction disagrees', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		await seedDualWrite(chainBucket, legacyBucket, [
			snapshot(1, ['shape:a']),
			snapshot(2, ['shape:a', 'shape:b']),
		])
		await legacyBucket.put(
			`${roomKey}/2026-09-01T00:00:01.000Z`,
			JSON.stringify(snapshot(2, ['shape:wrong']))
		)

		const result = await verifyRoomVersions({ chainBucket, legacyBucket, roomKey, limit: 10 })

		expect(result.mismatches).toEqual(['2026-09-01T00:00:01.000Z'])
	})
})
