import { UnknownRecord } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeR2 } from '../test/fakeR2'
import { Environment } from '../types'
import { segmentCustomMetadata, versionKey } from '../versionChain'
import { encodeVersionBody } from '../versionChainCodec'
import { buildSnapshotDelta } from '../versionDelta'
import { getRoomHistorySnapshot } from './getRoomHistorySnapshot'

vi.mock('../utils/tla/getAuth', () => ({ requireAdminAccessToRequest: vi.fn() }))

const captureException = vi.fn()
vi.mock('@tldraw/worker-shared', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tldraw/worker-shared')>()),
	createSentry: vi.fn(() => ({ captureException })),
}))

const roomKey = 'app_rooms/board'

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

function isoAt(i: number) {
	return `2026-09-01T00:00:${String(i).padStart(2, '0')}.000Z`
}

async function fetchSnapshot(env: Environment, timestamp: string, ctx?: ExecutionContext) {
	return await getRoomHistorySnapshot(
		{ params: { roomId: 'board', timestamp } } as unknown as IRequest,
		env,
		true,
		ctx
	)
}

describe('getRoomHistorySnapshot', () => {
	beforeEach(() => captureException.mockClear())

	it('counts the chain listing in x-version-chain-ops on both serve paths', async () => {
		const chainBucket = createFakeR2()
		const legacyBucket = createFakeR2()
		const env = {
			ROOMS_HISTORY: chainBucket,
			ROOMS_HISTORY_EPHEMERAL: legacyBucket,
		} as unknown as Environment

		// A keyframe at iso 0 and one segment holding deltas for isos 1 and 2.
		const versions = [snapshot(1, ['shape:a']), snapshot(2, ['shape:a', 'shape:b'])]
		const keyframeKey = versionKey(roomKey, isoAt(0), 'keyframe')
		const encodedKeyframe = await encodeVersionBody(versions[0])
		await chainBucket.put(keyframeKey, encodedKeyframe.body, {
			customMetadata: encodedKeyframe.metadata,
		})
		const encodedSegment = await encodeVersionBody({
			v: 1,
			deltas: [{ t: isoAt(1), delta: buildSnapshotDelta(versions[0], versions[1]) }],
		})
		await chainBucket.put(versionKey(roomKey, isoAt(1), 'segment'), encodedSegment.body, {
			customMetadata: {
				...encodedSegment.metadata,
				...segmentCustomMetadata({ keyframeKey, firstSeq: 1, timestamps: [isoAt(1)] }),
			},
		})

		// Whole-object path: one listing page plus the keyframe get.
		const whole = await fetchSnapshot(env, isoAt(0))
		expect({
			status: whole.status,
			ops: whole.headers.get('x-version-chain-ops'),
			depth: whole.headers.get('x-version-chain-depth'),
		}).toEqual({ status: 200, ops: '2', depth: '0' })
		expect(await whole.json()).toEqual(versions[0])

		// Replay path: the listing page, the keyframe and one segment.
		const replayed = await fetchSnapshot(env, isoAt(1))
		expect({
			status: replayed.status,
			ops: replayed.headers.get('x-version-chain-ops'),
			depth: replayed.headers.get('x-version-chain-depth'),
		}).toEqual({ status: 200, ops: '3', depth: '1' })
		expect(await replayed.json()).toEqual(versions[1])
	})

	it('serves the legacy copy and reports when the chain read throws', async () => {
		const legacyBucket = createFakeR2()
		const timestamp = isoAt(3)
		await legacyBucket.put(`${roomKey}/${timestamp}`, JSON.stringify(snapshot(3, ['shape:a'])))
		const boom = new Error('chain listing failed')
		const env = {
			ROOMS_HISTORY: {
				list: vi.fn(async () => {
					throw boom
				}),
			},
			ROOMS_HISTORY_EPHEMERAL: legacyBucket,
		} as unknown as Environment

		const response = await fetchSnapshot(env, timestamp, {} as ExecutionContext)

		expect({
			status: response.status,
			ops: response.headers.get('x-version-chain-ops'),
			body: await response.json(),
		}).toEqual({ status: 200, ops: null, body: snapshot(3, ['shape:a']) })
		expect(captureException).toHaveBeenCalledWith(boom)
	})

	it('rethrows without reporting when there is no legacy copy to serve', async () => {
		const boom = new Error('chain listing failed')
		const env = {
			ROOMS_HISTORY: {
				list: vi.fn(async () => {
					throw boom
				}),
			},
			ROOMS_HISTORY_EPHEMERAL: createFakeR2(),
		} as unknown as Environment

		// The worker's catch-all reports what escapes, so a capture here would file it twice.
		await expect(fetchSnapshot(env, isoAt(4), {} as ExecutionContext)).rejects.toBe(boom)
		expect(captureException).not.toHaveBeenCalled()
	})
})
