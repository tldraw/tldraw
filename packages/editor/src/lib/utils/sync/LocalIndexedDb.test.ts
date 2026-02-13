import { createTLSchema } from '@tldraw/tlschema'
import { openDB } from 'idb'
import { vi } from 'vitest'
import { hardReset } from './hardReset'
import { getAllIndexDbNames, LocalIndexedDb } from './LocalIndexedDb'

const schema = createTLSchema({ shapes: {}, bindings: {} })
describe('LocalIndexedDb', () => {
	beforeEach(() => {
		vi.useRealTimers()
	})
	afterEach(async () => {
		await hardReset({ shouldReload: false })
	})
	describe('#storeSnapshot', () => {
		it("creates documents if they don't exist", async () => {
			const db = new LocalIndexedDb('test-0')
			await db.storeSnapshot({
				schema,
				snapshot: {},
			})

			expect(getAllIndexDbNames()).toEqual(['TLDRAW_DOCUMENT_v2test-0'])

			const db2 = new LocalIndexedDb('test-1')
			await db2.storeSnapshot({
				schema,
				snapshot: {},
			})

			expect(getAllIndexDbNames()).toEqual(['TLDRAW_DOCUMENT_v2test-0', 'TLDRAW_DOCUMENT_v2test-1'])

			await db2.storeSnapshot({
				schema,
				snapshot: {},
			})

			expect(getAllIndexDbNames()).toEqual(['TLDRAW_DOCUMENT_v2test-0', 'TLDRAW_DOCUMENT_v2test-1'])

			await db2.close()
		})

		it('allows reading back the snapshot', async () => {
			const db = new LocalIndexedDb('test-0')
			await db.storeSnapshot({
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

			expect(getAllIndexDbNames()).toEqual(['TLDRAW_DOCUMENT_v2test-0'])

			const records = (await db.load())?.records
			expect(records).toEqual([
				{ id: 'page:1', name: 'steve' },
				{ id: 'shape:1', type: 'rectangle' },
			])
		})

		it('allows storing a session under a particular ID and reading it back', async () => {
			const db = new LocalIndexedDb('test-0')
			const snapshot = {
				'shape:1': {
					id: 'shape:1',
					type: 'rectangle',
				},
			}

			await db.storeSnapshot({
				sessionId: 'session-0',
				schema,
				snapshot,
				sessionStateSnapshot: {
					foo: 'bar',
				} as any,
			})

			expect((await db.load({ sessionId: 'session-0' }))?.sessionStateSnapshot).toEqual({
				foo: 'bar',
			})

			await db.storeSnapshot({
				sessionId: 'session-1',
				schema,
				snapshot,
				sessionStateSnapshot: {
					hello: 'world',
				} as any,
			})

			expect((await db.load({ sessionId: 'session-0' }))?.sessionStateSnapshot).toEqual({
				foo: 'bar',
			})

			expect((await db.load({ sessionId: 'session-1' }))?.sessionStateSnapshot).toEqual({
				hello: 'world',
			})
		})
	})

	describe('#storeChanges', () => {
		it('allows merging changes into an existing store', async () => {
			const db = new LocalIndexedDb('test-0')
			await db.storeSnapshot({
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

			await db.storeChanges({
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

			expect((await db.load())?.records).toEqual([
				{
					id: 'asset:1',
					version: 0,
				},
				{
					id: 'asset:2',
					version: 0,
				},
				{
					id: 'page:1',
					version: 1,
				},
			])
		})
	})

	it('migrates legacy asset storage into the new format', async () => {
		const legacyAssetsDb = await openDB('TLDRAW_ASSET_STORE_v1test-0', 1, {
			upgrade(database) {
				if (!database.objectStoreNames.contains('assets')) {
					database.createObjectStore('assets')
				}
			},
		})

		const file = { contents: 'hello, world!' } // new File(['Hello, world!'], 'hello.txt', { type: 'text/plain' })
		const fileId = `asset:file`

		{
			const tx = legacyAssetsDb.transaction(['assets'], 'readwrite')
			const store = tx.objectStore('assets')
			await store.put(file, fileId)
			await tx.done
		}

		legacyAssetsDb.close()

		const mainDb = await openDB('TLDRAW_DOCUMENT_v2test-0', 3, {
			upgrade(database) {
				if (!database.objectStoreNames.contains('records')) {
					database.createObjectStore('records')
				}
				if (!database.objectStoreNames.contains('schema')) {
					database.createObjectStore('schema')
				}
				if (!database.objectStoreNames.contains('session_state')) {
					database.createObjectStore('session_state')
				}
			},
		})

		{
			const tx = mainDb.transaction(['records'], 'readwrite')
			const store = tx.objectStore('records')
			await store.put({ id: fileId, props: { src: fileId } }, fileId)
			await tx.done
		}

		mainDb.close()

		// before migration the legacy database should exist:
		expect(
			(await window.indexedDB.databases()).find((db) => db.name === 'TLDRAW_ASSET_STORE_v1test-0')
		).toBeDefined()

		// migration happens transparently:
		const db = new LocalIndexedDb('test-0')
		const snapshot = await db.load()

		// records should be unaffected:
		expect(snapshot?.records).toEqual([{ id: fileId, props: { src: fileId } }])
		// assets should be accessible:
		expect(await db.getAsset(fileId)).toEqual(file)

		await db.close()

		// the old asset DB should have been removed:
		expect(
			(await window.indexedDB.databases()).find((db) => db.name === 'TLDRAW_ASSET_STORE_v1test-0')
		).toBeUndefined()
	})
})
