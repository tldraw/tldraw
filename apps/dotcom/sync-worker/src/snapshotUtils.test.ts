import { RoomSnapshot } from '@tldraw/sync-core'
import { createTLSchema } from '@tldraw/tlschema'
import { generateSnapshotChunks } from './snapshotUtils'

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
