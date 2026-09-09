import { UnknownRecord } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import {
	applySnapshotDelta,
	buildSnapshotDelta,
	SnapshotDelta,
	versionEnvelopeHash,
	chainHeadHash,
} from './versionDelta'

function rec(id: string, props: Record<string, unknown> = {}): UnknownRecord {
	return { id, typeName: 'shape', ...props } as UnknownRecord
}

function snapshot(partial: Partial<RoomSnapshot> = {}): RoomSnapshot {
	return {
		clock: 1,
		documentClock: 1,
		documents: [],
		tombstones: {},
		tombstoneHistoryStartsAtClock: 0,
		schema: { schemaVersion: 2, sequences: {} } as any,
		...partial,
	}
}

describe('buildSnapshotDelta / applySnapshotDelta', () => {
	it('round-trips an added record', () => {
		const prev = snapshot()
		const next = snapshot({
			clock: 2,
			documentClock: 2,
			documents: [{ state: rec('shape:a', { x: 1 }), lastChangedClock: 2 }],
		})

		expect(applySnapshotDelta(prev, buildSnapshotDelta(prev, next))).toEqual(next)
	})

	it('round-trips an updated record', () => {
		const prev = snapshot({
			documents: [{ state: rec('shape:a', { x: 1 }), lastChangedClock: 1 }],
		})
		const next = snapshot({
			clock: 2,
			documentClock: 2,
			documents: [{ state: rec('shape:a', { x: 2 }), lastChangedClock: 2 }],
		})

		expect(applySnapshotDelta(prev, buildSnapshotDelta(prev, next))).toEqual(next)
	})

	it('round-trips a removed record and its tombstone', () => {
		const prev = snapshot({
			documents: [{ state: rec('shape:a'), lastChangedClock: 1 }],
		})
		const next = snapshot({
			clock: 2,
			documentClock: 2,
			documents: [],
			tombstones: { 'shape:a': 2 },
		})

		expect(applySnapshotDelta(prev, buildSnapshotDelta(prev, next))).toEqual(next)
	})

	it('round-trips tombstone pruning', () => {
		const prev = snapshot({ tombstones: { 'shape:a': 2, 'shape:b': 3 } })
		const next = snapshot({
			clock: 4,
			documentClock: 4,
			tombstones: { 'shape:b': 3 },
			tombstoneHistoryStartsAtClock: 3,
		})

		expect(applySnapshotDelta(prev, buildSnapshotDelta(prev, next))).toEqual(next)
	})

	it('omits records whose clock did not move', () => {
		const prev = snapshot({
			documents: [
				{ state: rec('shape:a'), lastChangedClock: 1 },
				{ state: rec('shape:b'), lastChangedClock: 1 },
			],
		})
		const next = snapshot({
			clock: 2,
			documentClock: 2,
			documents: [
				{ state: rec('shape:a'), lastChangedClock: 1 },
				{ state: rec('shape:b', { x: 5 }), lastChangedClock: 2 },
			],
		})

		const delta = buildSnapshotDelta(prev, next)

		expect(Object.keys(delta.diff ?? {})).toEqual(['shape:b'])
		expect(applySnapshotDelta(prev, delta)).toEqual(next)
	})

	it('round-trips a long random edit sequence', () => {
		let current = snapshot()
		const history = [current]
		let clock = 1
		let seed = 42
		const rand = () => {
			seed = (seed * 1103515245 + 12345) % 2147483648
			return seed / 2147483648
		}

		for (let i = 0; i < 200; i++) {
			clock++
			const documents = current.documents.map((d) => ({ ...d }))
			const tombstones = { ...current.tombstones }
			const roll = rand()

			if (roll < 0.4 || documents.length === 0) {
				documents.push({ state: rec(`shape:${i}`, { x: i }), lastChangedClock: clock })
			} else if (roll < 0.8) {
				const target = documents[Math.floor(rand() * documents.length)]
				target.state = { ...target.state, x: i } as any
				target.lastChangedClock = clock
			} else {
				const index = Math.floor(rand() * documents.length)
				tombstones[documents[index].state.id] = clock
				documents.splice(index, 1)
			}

			current = snapshot({ clock, documentClock: clock, documents, tombstones })
			history.push(current)
		}

		for (let i = 1; i < history.length; i++) {
			const delta = buildSnapshotDelta(history[i - 1], history[i])
			expect(applySnapshotDelta(history[i - 1], delta)).toEqual(history[i])
		}
	})

	it('survives JSON serialization of the delta', () => {
		const prev = snapshot({ documents: [{ state: rec('shape:a', { x: 1 }), lastChangedClock: 1 }] })
		const next = snapshot({
			clock: 2,
			documentClock: 2,
			documents: [{ state: rec('shape:a', { x: 2 }), lastChangedClock: 2 }],
		})

		const delta = JSON.parse(JSON.stringify(buildSnapshotDelta(prev, next)))

		expect(applySnapshotDelta(prev, delta)).toEqual(next)
	})

	it('hashes identically regardless of document order', () => {
		const a = snapshot({
			documents: [
				{ state: rec('shape:a', { x: 1 }), lastChangedClock: 1 },
				{ state: rec('shape:b', { x: 2 }), lastChangedClock: 2 },
			],
		})
		const b = snapshot({
			documents: [...a.documents].reverse(),
		})

		expect(versionEnvelopeHash(a)).toBe(versionEnvelopeHash(b))
	})

	it('hash distinguishes changed content', () => {
		const a = snapshot({ documents: [{ state: rec('shape:a', { x: 1 }), lastChangedClock: 1 }] })
		const b = snapshot({ documents: [{ state: rec('shape:a', { x: 2 }), lastChangedClock: 1 }] })

		expect(versionEnvelopeHash(a)).not.toBe(versionEnvelopeHash(b))
	})

	it('round-trips nested records, not just numeric edits', () => {
		// Boards carry free-form JSON in `meta` and rich text `content`; a delta that only survives
		// flat numeric edits would still corrupt those.
		const prev = snapshot({
			documents: [
				{
					state: rec('shape:a', {
						meta: { tags: ['one', 'two'], nested: { keep: true, drop: 1 } },
						props: {
							richText: { type: 'doc', content: [{ type: 'paragraph', attrs: { dir: null } }] },
						},
					}),
					lastChangedClock: 1,
				},
			],
		})
		const next = snapshot({
			clock: 2,
			documentClock: 2,
			documents: [
				{
					state: rec('shape:a', {
						meta: { tags: ['one', 'three', 'four'], nested: { keep: true } },
						props: {
							richText: {
								type: 'doc',
								content: [
									{ type: 'paragraph', attrs: { dir: 'ltr' } },
									{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] },
								],
							},
						},
					}),
					lastChangedClock: 2,
				},
			],
		})

		const delta = JSON.parse(JSON.stringify(buildSnapshotDelta(prev, next)))
		const applied = applySnapshotDelta(prev, delta)

		expect(applied).toEqual(next)
		expect(versionEnvelopeHash(applied)).toBe(delta.hash)
	})

	it('refuses a removal of a record the base does not hold', () => {
		const prev = snapshot({ documents: [{ state: rec('shape:a'), lastChangedClock: 1 }] })
		const next = snapshot({ clock: 2, documentClock: 2, documents: [] })
		const delta = buildSnapshotDelta(prev, next)

		expect(() => applySnapshotDelta(snapshot(), delta)).toThrow(/removes unknown record/)
	})

	it('hash distinguishes the room clocks the documents do not carry', () => {
		const base = snapshot({ documents: [{ state: rec('shape:a'), lastChangedClock: 1 }] })

		expect(versionEnvelopeHash(snapshot({ ...base, clock: 2 }))).not.toBe(versionEnvelopeHash(base))
		expect(versionEnvelopeHash(snapshot({ ...base, documentClock: 2 }))).not.toBe(
			versionEnvelopeHash(base)
		)
		expect(
			versionEnvelopeHash(snapshot({ ...base, tombstoneHistoryStartsAtClock: undefined }))
		).not.toBe(versionEnvelopeHash(base))
	})

	it('head hash ignores documentClock and nothing else', () => {
		const base = snapshot({ documents: [{ state: rec('shape:a'), lastChangedClock: 1 }] })

		expect(chainHeadHash(snapshot({ ...base, documentClock: 2 }))).toBe(chainHeadHash(base))
		expect(chainHeadHash(snapshot({ ...base, tombstones: { 'shape:b': 1 } }))).not.toBe(
			chainHeadHash(base)
		)
		expect(chainHeadHash(snapshot({ ...base, tombstoneHistoryStartsAtClock: 1 }))).not.toBe(
			chainHeadHash(base)
		)
	})

	it('envelope hash catches a corrupted documentClock on replay', () => {
		const prev = snapshot({ documents: [{ state: rec('shape:a'), lastChangedClock: 1 }] })
		const next = snapshot({
			documentClock: 2,
			documents: [{ state: rec('shape:a', { x: 1 }), lastChangedClock: 2 }],
		})
		const delta = buildSnapshotDelta(prev, next)

		const replayed = applySnapshotDelta(prev, { ...delta, documentClock: 0 })
		expect(versionEnvelopeHash(replayed)).not.toBe(delta.hash)
	})

	it('refuses a delta that lost its documentClock', () => {
		const prev = snapshot()
		const delta = buildSnapshotDelta(prev, snapshot({ documentClock: 2 }))

		expect(() => applySnapshotDelta(prev, { ...delta, documentClock: undefined })).toThrow(
			/documentClock/
		)
	})

	it('refuses a delta of any other version, older or newer', () => {
		const prev = snapshot()
		const delta = buildSnapshotDelta(prev, snapshot({ clock: 2 }))

		expect(() => applySnapshotDelta(prev, { ...delta, v: 1 } as any)).toThrow(/version 1/)
		expect(() => applySnapshotDelta(prev, { ...delta, v: 3 } as any)).toThrow(/version 3/)
	})

	it('hashes a live record and its decoded JSON identically', () => {
		// A live record can carry keys set to undefined and sparse arrays; the keyframe and the
		// delta both go through JSON.stringify, which drops them.
		const live = snapshot({
			clock: undefined,
			documents: [
				{
					state: rec('shape:a', {
						meta: { note: undefined, tags: Object.assign([1], { 2: 3 }) },
						opacity: undefined,
					}),
					lastChangedClock: 1,
				},
			],
		})
		const decoded = JSON.parse(JSON.stringify(live))

		expect(versionEnvelopeHash(live)).toBe(versionEnvelopeHash(decoded))
		expect(chainHeadHash(live)).toBe(chainHeadHash(decoded))
	})

	it('verifies a delta built from live records against a replay over decoded JSON', () => {
		const prev = snapshot({
			documents: [{ state: rec('shape:a', { x: 1, ghost: undefined }), lastChangedClock: 1 }],
		})
		const next = snapshot({
			documentClock: 2,
			documents: [
				{ state: rec('shape:a', { x: 2, ghost: undefined }), lastChangedClock: 2 },
				{ state: rec('shape:b', { meta: { draft: undefined } }), lastChangedClock: 2 },
			],
		})
		const delta = JSON.parse(JSON.stringify(buildSnapshotDelta(prev, next)))
		const keyframe = JSON.parse(JSON.stringify(prev))

		const replayed = applySnapshotDelta(keyframe, delta)
		expect(versionEnvelopeHash(replayed)).toBe(delta.hash)
	})
})
/**
 * A v2 delta exactly as chains already in R2 hold one, frozen as a literal rather than built here.
 *
 * Every other test in this file round-trips through the current build, so all of them keep passing
 * when the format moves — which is how the diff codec, the hash inputs, or an `applyObjectDiff`
 * change in `@tldraw/sync-core` can land without anyone bumping `SNAPSHOT_DELTA_VERSION` and every
 * chain in R2 quietly starts replaying under rules it was not written for.
 *
 * When this fails, the format moved. Bump `SNAPSHOT_DELTA_VERSION` and re-pin this fixture at the
 * new version; re-pinning alone, without the bump, is what it exists to prevent.
 */
describe('the v2 format, pinned', () => {
	const schema = { schemaVersion: 2, sequences: { 'com.tldraw.shape': 1 } } as any
	// The brand on `RecordId` is the only reason these literals need a cast at all.
	const record = (state: object) => state as UnknownRecord
	const steady = record({ id: 'shape:d', typeName: 'shape', x: 7 })

	// Written out in full rather than through `snapshot()` and `rec()`: a pin that moves when a
	// test helper moves is not a pin.
	const base: RoomSnapshot = {
		clock: 10,
		documentClock: 10,
		documents: [
			{
				state: record({
					id: 'shape:a',
					typeName: 'shape',
					x: 1,
					props: { text: 'hi', segments: [1, 2] },
					meta: { tags: ['one'], nested: { keep: true, drop: 1 } },
				}),
				lastChangedClock: 4,
			},
			{ state: record({ id: 'shape:b', typeName: 'shape', x: 5 }), lastChangedClock: 6 },
			// Clock moves in `next` while the content stays identical, so the delta carries a clock
			// for it and no diff entry at all — the one path `applySnapshotDelta`'s trailing clocks
			// loop exists for, and dead weight in a fixture without it.
			{ state: steady, lastChangedClock: 7 },
		],
		tombstones: { 'shape:gone': 3, 'shape:older': 2 },
		tombstoneHistoryStartsAtClock: 2,
		schema,
	}

	const next: RoomSnapshot = {
		clock: 12,
		documentClock: 12,
		documents: [
			{
				state: record({
					id: 'shape:a',
					typeName: 'shape',
					x: 2,
					props: { text: 'hi there', segments: [1, 2, 3] },
					meta: { tags: ['one', 'two'], nested: { keep: true } },
				}),
				lastChangedClock: 11,
			},
			{ state: steady, lastChangedClock: 12 },
			{ state: record({ id: 'shape:c', typeName: 'shape', x: 9 }), lastChangedClock: 12 },
		],
		tombstones: { 'shape:gone': 3, 'shape:b': 12 },
		tombstoneHistoryStartsAtClock: 3,
		schema,
	}

	// The append ops are the point of the string and array edits: `applyObjectDiff` has changed
	// what an offset means before (diffRecord's legacyAppendMode), and that change is silent.
	const delta: SnapshotDelta = {
		v: 2,
		diff: {
			'shape:c': ['put', record({ id: 'shape:c', typeName: 'shape', x: 9 })],
			'shape:a': [
				'patch',
				{
					x: ['put', 2],
					props: ['patch', { text: ['append', ' there', 2], segments: ['append', [3], 2] }],
					meta: ['patch', { tags: ['append', ['two'], 1], nested: ['put', { keep: true }] }],
				},
			],
			'shape:b': ['remove'],
		},
		clocks: { 'shape:a': 11, 'shape:d': 12, 'shape:c': 12 },
		tombstones: { set: { 'shape:b': 12 }, removed: ['shape:older'] },
		tombstoneHistoryStartsAtClock: 3,
		clock: 12,
		documentClock: 12,
		hash: '75c37fef0c2b6587',
	}

	// The bytes a segment object holds, as text. `encodeVersionBody` only gzips this, and gzip
	// output is a zlib-version detail rather than part of the format, so the JSON is what is pinned.
	//
	// Not redundant with the object pin below: `toEqual` reads `{ a: undefined }` and `{}` as the
	// same object and the hash sorts keys before digesting, so a field that quietly turns undefined,
	// or moves, changes what R2 stores while both of those stay green.
	const stored =
		'{"v":1,' +
		'"deltas":[{"t":"2026-09-01T00:00:05.000Z","delta":{"v":2,' +
		'"diff":{"shape:c":["put",{"id":"shape:c","typeName":"shape","x":9}],' +
		'"shape:a":["patch",{"x":["put",2],"props":["patch",{"text":["append"," there",2],"segments":["append",[3],2]}],"meta":["patch",{"tags":["append",["two"],1],"nested":["put",{"keep":true}]}]}],' +
		'"shape:b":["remove"]},' +
		'"clocks":{"shape:a":11,"shape:d":12,"shape:c":12},' +
		'"tombstones":{"set":{"shape:b":12},"removed":["shape:older"]},"tombstoneHistoryStartsAtClock":3,' +
		'"clock":12,"documentClock":12,"hash":"75c37fef0c2b6587"}}]}'

	it('serializes to the exact text a v2 segment holds', () => {
		const segment = {
			v: 1,
			deltas: [{ t: '2026-09-01T00:00:05.000Z', delta: buildSnapshotDelta(base, next) }],
		}

		expect(JSON.stringify(segment)).toBe(stored)
	})

	it('replays that text, parsed as R2 hands it back', () => {
		const [{ delta: parsed }] = JSON.parse(stored).deltas

		expect(applySnapshotDelta(base, parsed)).toEqual(next)
		expect(versionEnvelopeHash(applySnapshotDelta(base, parsed))).toBe(parsed.hash)
	})

	it('writes the delta v2 pins', () => {
		expect(buildSnapshotDelta(base, next)).toEqual(delta)
	})

	it('replays the pinned delta, not just one it built itself', () => {
		expect(applySnapshotDelta(base, delta)).toEqual(next)
	})

	it('hashes the pinned snapshots to the pinned digests', () => {
		// A chain verifies against the hash recorded in the delta, so these strings are as much a
		// part of the stored format as the delta body is.
		expect(versionEnvelopeHash(base)).toBe('aab866b16f9ac1e1')
		expect(versionEnvelopeHash(next)).toBe('75c37fef0c2b6587')
		expect(chainHeadHash(base)).toBe('b584c037db4dc24f')
		expect(chainHeadHash(next)).toBe('3d1266a3f7235c23')
	})
})
