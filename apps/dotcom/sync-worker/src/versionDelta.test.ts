import { UnknownRecord } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import {
	applySnapshotDelta,
	buildSnapshotDelta,
	chainHeadHash,
	snapshotHashes,
	versionEnvelopeHash,
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

	it('computes both hashes in one pass, and a delta takes the envelope hash as given', () => {
		const prev = snapshot({ documents: [{ state: rec('shape:a'), lastChangedClock: 1 }] })
		const next = snapshot({
			clock: 2,
			documentClock: 2,
			documents: [{ state: rec('shape:a', { x: 1 }), lastChangedClock: 2 }],
		})

		expect(snapshotHashes(next)).toEqual({
			envelope: versionEnvelopeHash(next),
			head: chainHeadHash(next),
		})
		expect(buildSnapshotDelta(prev, next).hash).toBe(versionEnvelopeHash(next))
		// Trusted, not checked: the caller computed it from the same snapshot in the same pass.
		expect(buildSnapshotDelta(prev, next, { envelopeHash: 'as-given' }).hash).toBe('as-given')
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
