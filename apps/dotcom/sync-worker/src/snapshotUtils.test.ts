import { DatabaseSync } from 'node:sqlite'
import { SerializedSchema } from '@tldraw/store'
import {
	DEFAULT_INITIAL_SNAPSHOT,
	NodeSqliteWrapper,
	RoomSnapshot,
	SQLiteSyncStorage,
} from '@tldraw/sync-core'
import { createTLSchema, TLRecord } from '@tldraw/tlschema'
import {
	generateSnapshotChunks,
	getDocumentVersion,
	getSnapshotVersion,
	getSnapshotVersionMetadata,
	isSameSnapshotVersion,
	readPersistedSnapshotVersion,
	resolvePersistedSnapshotVersion,
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

describe('getDocumentVersion', () => {
	test('is 0 for an empty snapshot', () => {
		expect(getDocumentVersion(makeSnapshot({}))).toBe(0)
	})

	test('is the max lastChangedClock across documents', () => {
		const snapshot = makeSnapshot({
			documents: [doc('a', 3), doc('b', 11), doc('c', 7)],
		})
		expect(getDocumentVersion(snapshot)).toBe(11)
	})

	test('includes tombstone clocks, so a delete is a new version', () => {
		const snapshot = makeSnapshot({
			documents: [doc('a', 3)],
			tombstones: { b: 12 },
		})
		expect(getDocumentVersion(snapshot)).toBe(12)
	})

	test('includes tombstoneHistoryStartsAtClock, so pruning is a new version', () => {
		const snapshot = makeSnapshot({
			documents: [doc('a', 3)],
			tombstones: {},
			tombstoneHistoryStartsAtClock: 15,
		})
		expect(getDocumentVersion(snapshot)).toBe(15)
	})

	test('ignores the shared clock counter that object-lane (comment) writes bump', () => {
		// A comment write advances documentClock without touching any document, so two
		// snapshots that differ only in documentClock must report the same version.
		const before = makeSnapshot({ documents: [doc('a', 10)], documentClock: 10 })
		const after = makeSnapshot({ documents: [doc('a', 10)], documentClock: 21, clock: 21 })
		expect(getDocumentVersion(after)).toBe(getDocumentVersion(before))
		expect(getDocumentVersion(after)).toBe(10)
	})
})

function schemaWithSequences(sequences: Record<string, number>): SerializedSchema {
	return { schemaVersion: 2, sequences }
}

describe('getSnapshotVersion', () => {
	test('changes when a migration advances the schema but touches no record', () => {
		// migrateStorage always writes the migrated schema, but only calls storage.set for records
		// whose content actually changed — so a migration that applies to no record on this board
		// leaves every clock untouched. The document version alone reads that as a no-op, which
		// would leave the migrated schema unpersisted forever.
		const documents = [doc('a', 10)]
		const before = makeSnapshot({ documents, schema: schemaWithSequences({ store: 4 }) })
		const after = makeSnapshot({ documents, schema: schemaWithSequences({ store: 5 }) })

		expect(getDocumentVersion(after)).toBe(getDocumentVersion(before))
		expect(isSameSnapshotVersion(getSnapshotVersion(after), getSnapshotVersion(before))).toBe(false)
	})

	test('is unchanged for a snapshot that differs only in the shared clock counter', () => {
		const documents = [doc('a', 10)]
		const before = makeSnapshot({ documents, documentClock: 10 })
		const after = makeSnapshot({ documents, documentClock: 21, clock: 21 })
		expect(isSameSnapshotVersion(getSnapshotVersion(after), getSnapshotVersion(before))).toBe(true)
	})

	test('ignores key order in the serialized schema', () => {
		// Key order carries no meaning, and treating it as a change would re-upload every board.
		const a = makeSnapshot({ schema: schemaWithSequences({ x: 1, y: 2 }) })
		const b = makeSnapshot({ schema: { sequences: { y: 2, x: 1 }, schemaVersion: 2 } })
		expect(getSnapshotVersion(a).schemaVersion).toBe(getSnapshotVersion(b).schemaVersion)
	})

	test('distinguishes a missing schema from any present one', () => {
		const missing = getSnapshotVersion(makeSnapshot({ schema: undefined }))
		const present = getSnapshotVersion(makeSnapshot({}))
		expect(missing.schemaVersion).not.toBe(present.schemaVersion)
	})
})

describe('isSameSnapshotVersion', () => {
	test('never matches an unknown (null) version on either side', () => {
		const version = getSnapshotVersion(makeSnapshot({}))
		expect(isSameSnapshotVersion(null, version)).toBe(false)
		expect(isSameSnapshotVersion(version, null)).toBe(false)
		expect(isSameSnapshotVersion(null, null)).toBe(false)
	})

	test('does not match when only the document version differs', () => {
		const a = getSnapshotVersion(makeSnapshot({ documents: [doc('a', 1)] }))
		const b = getSnapshotVersion(makeSnapshot({ documents: [doc('a', 2)] }))
		expect(isSameSnapshotVersion(a, b)).toBe(false)
	})
})

describe('resolvePersistedSnapshotVersion', () => {
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
		// back its own fresh stamp, match the current version, take the skip path, and drop the
		// history entry it still owes.
		const snapshot = makeSnapshot({ documents: [doc('shape:a', 7)] })
		const stampedByTheFailedAttempt = getSnapshotVersion(snapshot)
		const { bucket, state } = countingBucket([
			null,
			{ customMetadata: getSnapshotVersionMetadata(stampedByTheFailedAttempt) },
		])

		const firstAttempt = await resolvePersistedSnapshotVersion(undefined, bucket, 'key')
		expect(firstAttempt).toBe(null)

		const retry = await resolvePersistedSnapshotVersion(firstAttempt, bucket, 'key')

		expect(retry).toBe(null)
		expect(isSameSnapshotVersion(retry, stampedByTheFailedAttempt)).toBe(false)
		expect(state.calls).toBe(1)
	})

	test('reads R2 when nothing has been looked up yet', async () => {
		const snapshot = makeSnapshot({ documents: [doc('shape:a', 9)] })
		const version = getSnapshotVersion(snapshot)
		const { bucket, state } = countingBucket([
			{ customMetadata: getSnapshotVersionMetadata(version) },
		])

		expect(await resolvePersistedSnapshotVersion(undefined, bucket, 'key')).toEqual(version)
		expect(state.calls).toBe(1)
	})

	test('returns an already-known version without reading R2', async () => {
		const version = getSnapshotVersion(makeSnapshot({ documents: [doc('shape:a', 3)] }))
		const { bucket, state } = countingBucket([null])

		expect(await resolvePersistedSnapshotVersion(version, bucket, 'key')).toEqual(version)
		expect(state.calls).toBe(0)
	})
})

describe('stamping a snapshot at creation', () => {
	// The creation paths (createFiles, handleFileCreateFromSource, __admin__createLegacyRoom)
	// stamp the version of the bytes they write, and the room DO then loads exactly those bytes.
	// If a load changed the version, the first persist would re-upload identical content — the
	// re-render and etag rotation the stamp exists to prevent.
	function versionAfterLoad(snapshot: RoomSnapshot) {
		const storage = new SQLiteSyncStorage<TLRecord>({
			sql: new NodeSqliteWrapper(new DatabaseSync(':memory:')),
			snapshot,
		})
		return getSnapshotVersion(storage.getSnapshot())
	}

	test('survives the load for a snapshot shaped like createFiles writes', () => {
		const created: RoomSnapshot = {
			schema: createTLSchema().serialize(),
			clock: 0,
			documents: [doc('shape:a', 0), doc('shape:b', 0)],
			tombstones: {},
		}
		expect(isSameSnapshotVersion(versionAfterLoad(created), getSnapshotVersion(created))).toBe(true)
	})

	test('survives the load for DEFAULT_INITIAL_SNAPSHOT', () => {
		expect(
			isSameSnapshotVersion(
				versionAfterLoad(DEFAULT_INITIAL_SNAPSHOT),
				getSnapshotVersion(DEFAULT_INITIAL_SNAPSHOT)
			)
		).toBe(true)
	})

	test('survives the load for a copied board carrying edits and deletions', () => {
		const source: RoomSnapshot = {
			schema: createTLSchema().serialize(),
			documentClock: 40,
			tombstoneHistoryStartsAtClock: 12,
			documents: [doc('shape:a', 31), doc('shape:b', 17)],
			tombstones: { 'shape:gone': 28 },
		}
		expect(isSameSnapshotVersion(versionAfterLoad(source), getSnapshotVersion(source))).toBe(true)
	})
})

describe('readPersistedSnapshotVersion', () => {
	function bucketWithHead(result: { customMetadata?: Record<string, string> } | null) {
		return { head: async (_key: string) => result } as any
	}

	test('round-trips the version written by getSnapshotVersionMetadata', async () => {
		const snapshot = makeSnapshot({ documents: [doc('a', 42)] })
		const written = getSnapshotVersion(snapshot)
		const customMetadata = getSnapshotVersionMetadata(written)

		const read = await readPersistedSnapshotVersion(bucketWithHead({ customMetadata }), 'key')

		expect(read).toEqual(written)
		expect(read?.documentVersion).toBe(42)
	})

	test('is null when the object does not exist', async () => {
		expect(await readPersistedSnapshotVersion(bucketWithHead(null), 'key')).toBe(null)
	})

	test('is null for a legacy object with no metadata', async () => {
		expect(await readPersistedSnapshotVersion(bucketWithHead({}), 'key')).toBe(null)
	})

	test('is null for malformed metadata', async () => {
		expect(
			await readPersistedSnapshotVersion(
				bucketWithHead({ customMetadata: { documentVersion: 'not-a-number', schemaVersion: 'a' } }),
				'key'
			)
		).toBe(null)
	})

	test('is null when the schema version is absent, so the object is re-uploaded', async () => {
		expect(
			await readPersistedSnapshotVersion(
				bucketWithHead({ customMetadata: { documentVersion: '42' } }),
				'key'
			)
		).toBe(null)
	})
})
