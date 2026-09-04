import { UnknownRecord } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import { applySnapshotDelta, buildSnapshotDelta, snapshotContentHash } from './versionDelta'

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

		expect(snapshotContentHash(a)).toBe(snapshotContentHash(b))
	})

	it('hash distinguishes changed content', () => {
		const a = snapshot({ documents: [{ state: rec('shape:a', { x: 1 }), lastChangedClock: 1 }] })
		const b = snapshot({ documents: [{ state: rec('shape:a', { x: 2 }), lastChangedClock: 1 }] })

		expect(snapshotContentHash(a)).not.toBe(snapshotContentHash(b))
	})

	it('refuses an unknown delta version', () => {
		const prev = snapshot()
		const delta = { ...buildSnapshotDelta(prev, snapshot({ clock: 2 })), v: 2 }

		expect(() => applySnapshotDelta(prev, delta as any)).toThrow(/version/)
	})
})
