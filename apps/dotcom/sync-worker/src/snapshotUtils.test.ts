import { SerializedSchema } from '@tldraw/store'
import { RoomSnapshot } from '@tldraw/sync-core'
import { createTLSchema } from '@tldraw/tlschema'
import {
	generateSnapshotChunks,
	getLastDocumentChangeClock,
	getSnapshotFingerprint,
	getSnapshotMetadata,
	isSameFingerprint,
	readPersistedFingerprint,
	resolvePersistedFingerprint,
} from './snapshotUtils'

describe('generateSnapshotChunks', () => {
	const decoder = new TextDecoder()

	function chunksToString(chunks: Generator<Uint8Array>): string {
		let result = ''
		for (const chunk of chunks) {
			result += decoder.decode(chunk)
		}
		return result
	}

	test('generates valid JSON for empty snapshot', () => {
		const schema = createTLSchema()
		const snapshot: RoomSnapshot = {
			schema: schema.serialize(),
			clock: 0,
			documents: [],
			tombstones: {},
		}

		const result = chunksToString(generateSnapshotChunks(snapshot))

		const parsed = JSON.parse(result)
		expect(parsed).toEqual(snapshot)
	})

	test('generates valid JSON that can be parsed', () => {
		const schema = createTLSchema()
		const doc1 = schema.types.document.create({ name: 'Test Doc' })
		const doc2 = schema.types.page.create({ name: 'Page 1', index: 'a1' })

		const snapshot: RoomSnapshot = {
			schema: schema.serialize(),
			clock: 10,
			documents: [
				{ state: doc1, lastChangedClock: 5 },
				{ state: doc2, lastChangedClock: 8 },
			],
			tombstones: {
				[doc1.id]: 3,
			},
		}

		const result = chunksToString(generateSnapshotChunks(snapshot))

		const parsed = JSON.parse(result)
		expect(parsed).toEqual(snapshot)
	})

	test('generates chunks correctly', () => {
		const schema = createTLSchema()
		const documentRecord = schema.types.document.create({ name: 'Test' })

		const snapshot: RoomSnapshot = {
			schema: schema.serialize(),
			clock: 1,
			documents: [{ state: documentRecord, lastChangedClock: 1 }],
			tombstones: {},
		}

		const chunks = generateSnapshotChunks(snapshot)
		const chunksArray = Array.from(chunks)

		// Verify we get multiple chunks
		expect(chunksArray.length).toBeGreaterThan(1)

		chunksArray.forEach((chunk) => {
			expect(chunk).toBeInstanceOf(Uint8Array)
		})

		// Verify the combined result is valid JSON
		const result = chunksToString(generateSnapshotChunks(snapshot))
		expect(() => JSON.parse(result)).not.toThrow()
	})
})

function makeSnapshot(partial: Partial<RoomSnapshot>): RoomSnapshot {
	return {
		schema: createTLSchema().serialize(),
		documents: [],
		tombstones: {},
		...partial,
	}
}

function doc(id: string, lastChangedClock: number): RoomSnapshot['documents'][number] {
	return { state: { id: id as any, typeName: 'shape' }, lastChangedClock }
}

describe('getLastDocumentChangeClock', () => {
	test('is 0 for an empty snapshot', () => {
		expect(getLastDocumentChangeClock(makeSnapshot({}))).toBe(0)
	})

	test('is the max lastChangedClock across documents', () => {
		const snapshot = makeSnapshot({
			documents: [doc('a', 3), doc('b', 11), doc('c', 7)],
		})
		expect(getLastDocumentChangeClock(snapshot)).toBe(11)
	})

	test('includes tombstone clocks, so a delete moves the clock', () => {
		const snapshot = makeSnapshot({
			documents: [doc('a', 3)],
			tombstones: { b: 12 },
		})
		expect(getLastDocumentChangeClock(snapshot)).toBe(12)
	})

	test('includes tombstoneHistoryStartsAtClock, so pruning moves the clock', () => {
		const snapshot = makeSnapshot({
			documents: [doc('a', 3)],
			tombstones: {},
			tombstoneHistoryStartsAtClock: 15,
		})
		expect(getLastDocumentChangeClock(snapshot)).toBe(15)
	})

	test('ignores the shared clock counter that object-lane (comment) writes bump', () => {
		// A comment write advances documentClock without touching any document, so two
		// snapshots that differ only in documentClock must report the same clock.
		const before = makeSnapshot({ documents: [doc('a', 10)], documentClock: 10 })
		const after = makeSnapshot({ documents: [doc('a', 10)], documentClock: 21, clock: 21 })
		expect(getLastDocumentChangeClock(after)).toBe(getLastDocumentChangeClock(before))
		expect(getLastDocumentChangeClock(after)).toBe(10)
	})
})

function schemaWithSequences(sequences: Record<string, number>): SerializedSchema {
	return { schemaVersion: 2, sequences }
}

describe('getSnapshotFingerprint', () => {
	test('changes when a migration advances the schema but touches no record', () => {
		// migrateStorage always writes the migrated schema, but only calls storage.set for records
		// whose content actually changed — so a migration that applies to no record on this board
		// leaves every clock untouched. The clock alone reads that as a no-op, which
		// would leave the migrated schema unpersisted forever.
		const documents = [doc('a', 10)]
		const before = makeSnapshot({ documents, schema: schemaWithSequences({ store: 4 }) })
		const after = makeSnapshot({ documents, schema: schemaWithSequences({ store: 5 }) })

		expect(getLastDocumentChangeClock(after)).toBe(getLastDocumentChangeClock(before))
		expect(isSameFingerprint(getSnapshotFingerprint(after), getSnapshotFingerprint(before))).toBe(
			false
		)
	})

	test('is unchanged for a snapshot that differs only in the shared clock counter', () => {
		const documents = [doc('a', 10)]
		const before = makeSnapshot({ documents, documentClock: 10 })
		const after = makeSnapshot({ documents, documentClock: 21, clock: 21 })
		expect(isSameFingerprint(getSnapshotFingerprint(after), getSnapshotFingerprint(before))).toBe(
			true
		)
	})

	test('ignores key order in the serialized schema', () => {
		// Key order carries no meaning, and treating it as a change would re-upload every board.
		const a = makeSnapshot({ schema: schemaWithSequences({ x: 1, y: 2 }) })
		const b = makeSnapshot({ schema: { sequences: { y: 2, x: 1 }, schemaVersion: 2 } })
		expect(getSnapshotFingerprint(a).schemaHash).toBe(getSnapshotFingerprint(b).schemaHash)
	})

	test('distinguishes a missing schema from any present one', () => {
		const missing = getSnapshotFingerprint(makeSnapshot({ schema: undefined }))
		const present = getSnapshotFingerprint(makeSnapshot({}))
		expect(missing.schemaHash).not.toBe(present.schemaHash)
	})
})

describe('isSameFingerprint', () => {
	test('never matches an unknown (null) fingerprint on either side', () => {
		const fingerprint = getSnapshotFingerprint(makeSnapshot({}))
		expect(isSameFingerprint(null, fingerprint)).toBe(false)
		expect(isSameFingerprint(fingerprint, null)).toBe(false)
		expect(isSameFingerprint(null, null)).toBe(false)
	})

	test('does not match when only the document clock differs', () => {
		const a = getSnapshotFingerprint(makeSnapshot({ documents: [doc('a', 1)] }))
		const b = getSnapshotFingerprint(makeSnapshot({ documents: [doc('a', 2)] }))
		expect(isSameFingerprint(a, b)).toBe(false)
	})
})

describe('getSnapshotMetadata', () => {
	test('stamps documentClock but keeps it out of the fingerprint', () => {
		// documentClock is the counter shared with the object lane, so a comment write moves it
		// without changing a byte of the document. It is recorded for diagnostics only — comparing
		// on it would force an upload for every comment and defeat the dedupe entirely.
		const documents = [doc('shape:a', 10)]
		const beforeComment = makeSnapshot({ documents, documentClock: 10 })
		const afterComment = makeSnapshot({ documents, documentClock: 21, clock: 21 })

		expect(getSnapshotMetadata(beforeComment).documentClock).toBe('10')
		expect(getSnapshotMetadata(afterComment).documentClock).toBe('21')
		expect(
			isSameFingerprint(getSnapshotFingerprint(afterComment), getSnapshotFingerprint(beforeComment))
		).toBe(true)
	})

	test('a stamp still matches after comments have moved the clock past it', async () => {
		// The rooms object keeps the clock of the last document write, so its stamp goes stale as
		// comments accumulate. Reading it back must still dedupe against the live snapshot.
		const documents = [doc('shape:a', 10)]
		const atUpload = makeSnapshot({ documents, documentClock: 10 })
		const afterComments = makeSnapshot({ documents, documentClock: 99, clock: 99 })

		const read = await readPersistedFingerprint(
			{ head: async () => ({ customMetadata: getSnapshotMetadata(atUpload) }) } as any,
			'key'
		)

		expect(isSameFingerprint(read, getSnapshotFingerprint(afterComments))).toBe(true)
	})

	test('omits documentClock when the snapshot has no clock at all', () => {
		expect(getSnapshotMetadata(makeSnapshot({})).documentClock).toBeUndefined()
	})
})

describe('resolvePersistedFingerprint', () => {
	// Each head() call returns the next entry, then repeats the last one.
	function countingBucket(results: Array<{ customMetadata?: Record<string, string> } | null>) {
		const state = { calls: 0 }
		const bucket = {
			head: async (_key: string) => results[Math.min(state.calls++, results.length - 1)],
		} as any
		return { bucket, state }
	}

	test('does not re-read a stamp the failing persist itself just wrote', async () => {
		// The reported failure: a persist finds no stamp, writes the rooms object (stamping it),
		// then fails on the history upload. Its retry re-resolves. If that re-read R2 it would get
		// back its own fresh stamp, match the current fingerprint, take the skip path, and drop the
		// history entry it still owes.
		const snapshot = makeSnapshot({ documents: [doc('shape:a', 7)] })
		const stampedByTheFailedAttempt = getSnapshotFingerprint(snapshot)
		const { bucket, state } = countingBucket([
			null,
			{ customMetadata: getSnapshotMetadata(snapshot) },
		])

		const firstAttempt = await resolvePersistedFingerprint(undefined, bucket, 'key')
		expect(firstAttempt).toBe(null)

		const retry = await resolvePersistedFingerprint(firstAttempt, bucket, 'key')

		expect(retry).toBe(null)
		expect(isSameFingerprint(retry, stampedByTheFailedAttempt)).toBe(false)
		expect(state.calls).toBe(1)
	})

	test('reads R2 when nothing has been looked up yet', async () => {
		const snapshot = makeSnapshot({ documents: [doc('shape:a', 9)] })
		const fingerprint = getSnapshotFingerprint(snapshot)
		const { bucket, state } = countingBucket([{ customMetadata: getSnapshotMetadata(snapshot) }])

		expect(await resolvePersistedFingerprint(undefined, bucket, 'key')).toEqual(fingerprint)
		expect(state.calls).toBe(1)
	})

	test('returns an already-known fingerprint without reading R2', async () => {
		const fingerprint = getSnapshotFingerprint(makeSnapshot({ documents: [doc('shape:a', 3)] }))
		const { bucket, state } = countingBucket([null])

		expect(await resolvePersistedFingerprint(fingerprint, bucket, 'key')).toEqual(fingerprint)
		expect(state.calls).toBe(0)
	})
})

describe('readPersistedFingerprint', () => {
	function bucketWithHead(result: { customMetadata?: Record<string, string> } | null) {
		return { head: async (_key: string) => result } as any
	}

	test('round-trips the fingerprint written by getSnapshotMetadata', async () => {
		const snapshot = makeSnapshot({ documents: [doc('a', 42)] })
		const written = getSnapshotFingerprint(snapshot)
		const customMetadata = getSnapshotMetadata(snapshot)

		const read = await readPersistedFingerprint(bucketWithHead({ customMetadata }), 'key')

		expect(read).toEqual(written)
		expect(read?.lastDocumentChangeClock).toBe(42)
	})

	test('is null when the object does not exist', async () => {
		expect(await readPersistedFingerprint(bucketWithHead(null), 'key')).toBe(null)
	})

	test('is null for a legacy object with no metadata', async () => {
		expect(await readPersistedFingerprint(bucketWithHead({}), 'key')).toBe(null)
	})

	test('is null for malformed metadata', async () => {
		expect(
			await readPersistedFingerprint(
				bucketWithHead({
					customMetadata: { lastDocumentChangeClock: 'not-a-number', schemaHash: 'a' },
				}),
				'key'
			)
		).toBe(null)
	})

	test('is null when the schema hash is absent, so the object is re-uploaded', async () => {
		expect(
			await readPersistedFingerprint(
				bucketWithHead({ customMetadata: { lastDocumentChangeClock: '42' } }),
				'key'
			)
		).toBe(null)
	})
})
