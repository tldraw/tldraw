import { createTLSchema } from '@tldraw/tlschema'
import {
	getAllIndexDbNames,
	loadDataFromStore,
	storeChangesInIndexedDb,
	storeSnapshotInIndexedDb,
} from './indexedDb'

const clearAll = async () => {
	const dbs = (indexedDB as any)._databases as Map<any, any>
	dbs.clear()
	localStorage.clear()
}

beforeEach(async () => {
	await clearAll()
})
const schema = createTLSchema({ shapes: {} })
describe('storeSnapshotInIndexedDb', () => {
	it("creates documents if they don't exist", async () => {
		await storeSnapshotInIndexedDb({
			persistenceKey: 'test-0',
			schema,
			snapshot: {},
		})

		expect(getAllIndexDbNames()).toMatchInlineSnapshot(`
		      Array [
		        "TLDRAW_DOCUMENT_v2test-0",
		      ]
	    `)

		await storeSnapshotInIndexedDb({
			persistenceKey: 'test-1',
			schema,
			snapshot: {},
		})

		expect(getAllIndexDbNames()).toMatchInlineSnapshot(`
		      Array [
		        "TLDRAW_DOCUMENT_v2test-0",
		        "TLDRAW_DOCUMENT_v2test-1",
		      ]
	    `)

		await storeSnapshotInIndexedDb({
			persistenceKey: 'test-1',
			schema,
			snapshot: {},
		})

		expect(getAllIndexDbNames()).toMatchInlineSnapshot(`
		      Array [
		        "TLDRAW_DOCUMENT_v2test-0",
		        "TLDRAW_DOCUMENT_v2test-1",
		      ]
	    `)
	})

	it('allows reading back the snapshot', async () => {
		expect(getAllIndexDbNames()).toMatchInlineSnapshot(`Array []`)
		await storeSnapshotInIndexedDb({
			persistenceKey: 'test-0',
			schema,
			snapshot: {
				'shape:1': {
					id: 'shape:1',
					type: 'rectangle',
				},
				'page:1': {
					id: 'page:1',
					name: 'steve',
				},
			},
		})

		expect(getAllIndexDbNames()).toMatchInlineSnapshot(`
		Array [
		  "TLDRAW_DOCUMENT_v2test-0",
		]
	`)

		const records = (await loadDataFromStore({ persistenceKey: 'test-0' }))?.records
		expect(records).toMatchInlineSnapshot(`
		Array [
		  Object {
		    "id": "page:1",
		    "name": "steve",
		  },
		  Object {
		    "id": "shape:1",
		    "type": "rectangle",
		  },
		]
	`)
	})

	it('allows storing a session under a particular ID and reading it back', async () => {
		const snapshot = {
			'shape:1': {
				id: 'shape:1',
				type: 'rectangle',
			},
		}

		await storeSnapshotInIndexedDb({
			persistenceKey: 'test-0',
			sessionId: 'session-0',
			schema,
			snapshot,
			sessionStateSnapshot: {
				foo: 'bar',
			} as any,
		})

		expect(
			(await loadDataFromStore({ persistenceKey: 'test-0', sessionId: 'session-0' }))
				?.sessionStateSnapshot
		).toMatchInlineSnapshot(`
		Object {
		  "foo": "bar",
		}
	`)

		await storeSnapshotInIndexedDb({
			persistenceKey: 'test-0',
			sessionId: 'session-1',
			schema,
			snapshot,
			sessionStateSnapshot: {
				hello: 'world',
			} as any,
		})

		expect(
			(await loadDataFromStore({ persistenceKey: 'test-0', sessionId: 'session-0' }))
				?.sessionStateSnapshot
		).toMatchInlineSnapshot(`
		Object {
		  "foo": "bar",
		}
	`)

		expect(
			(await loadDataFromStore({ persistenceKey: 'test-0', sessionId: 'session-1' }))
				?.sessionStateSnapshot
		).toMatchInlineSnapshot(`
		Object {
		  "hello": "world",
		}
	`)
	})
})

describe(storeChangesInIndexedDb, () => {
	it('allows merging changes into an existing store', async () => {
		await storeSnapshotInIndexedDb({
			persistenceKey: 'test-0',
			schema,
			snapshot: {
				'shape:1': {
					id: 'shape:1',
					version: 0,
				},
				'page:1': {
					id: 'page:1',
					version: 0,
				},
				'asset:1': {
					id: 'asset:1',
					version: 0,
				},
			},
		})

		await storeChangesInIndexedDb({
			persistenceKey: 'test-0',
			schema,
			changes: {
				added: {
					'asset:2': {
						id: 'asset:2',
						version: 0,
					},
				},
				updated: {
					'page:1': [
						{
							id: 'page:1',
							version: 0,
						},
						{
							id: 'page:1',
							version: 1,
						},
					],
				},
				removed: {
					'shape:1': {
						id: 'shape:1',
						version: 0,
					},
				},
			},
		})

		expect((await loadDataFromStore({ persistenceKey: 'test-0' }))?.records).toMatchInlineSnapshot(`
		Array [
		  Object {
		    "id": "asset:1",
		    "version": 0,
		  },
		  Object {
		    "id": "asset:2",
		    "version": 0,
		  },
		  Object {
		    "id": "page:1",
		    "version": 1,
		  },
		]
	`)
	})
})
