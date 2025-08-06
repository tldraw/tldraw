import { createTLSchema, createTLStore, PageRecordType, ZERO_INDEX_KEY } from 'tldraw'
import { TLSocketRoom } from '../lib/TLSocketRoom'

function getStore() {
	const schema = createTLSchema()
	const store = createTLStore({ schema })
	return store
}

describe(TLSocketRoom, () => {
	it('allows being initialized with an empty TLStoreSnapshot', () => {
		const store = getStore()
		const snapshot = store.getStoreSnapshot()
		const room = new TLSocketRoom({
			initialSnapshot: snapshot,
		})

		expect(room.getCurrentSnapshot()).toMatchObject({ clock: 0, documents: [] })
		expect(room.getCurrentSnapshot().documents.length).toBe(0)
	})

	it('allows being initialized with a non-empty TLStoreSnapshot', () => {
		const store = getStore()
		// populate with an empty document (document:document and page:page records)
		store.ensureStoreIsUsable()
		const snapshot = store.getStoreSnapshot()
		const room = new TLSocketRoom({
			initialSnapshot: snapshot,
		})
		expect(room.getCurrentSnapshot()).not.toMatchObject({ clock: 0, documents: [] })
		expect(room.getCurrentSnapshot().clock).toBe(0)
		expect(room.getCurrentSnapshot().documents.sort((a, b) => a.state.id.localeCompare(b.state.id)))
			.toMatchInlineSnapshot(`
		[
		  {
		    "lastChangedClock": 0,
		    "state": {
		      "gridSize": 10,
		      "id": "document:document",
		      "meta": {},
		      "name": "",
		      "typeName": "document",
		    },
		  },
		  {
		    "lastChangedClock": 0,
		    "state": {
		      "id": "page:page",
		      "index": "a1",
		      "meta": {},
		      "name": "Page 1",
		      "typeName": "page",
		    },
		  },
		]
	`)
	})

	it('allows loading a TLStoreSnapshot at some later time', () => {
		const store = getStore()
		const room = new TLSocketRoom({
			initialSnapshot: store.getStoreSnapshot(),
		})

		expect(room.getCurrentSnapshot()).toMatchObject({ clock: 0, documents: [] })

		// populate with an empty document (document:document and page:page records)
		store.ensureStoreIsUsable()

		const snapshot = store.getStoreSnapshot()
		room.loadSnapshot(snapshot)

		expect(room.getCurrentSnapshot().clock).toBe(1)
		expect(room.getCurrentSnapshot().documents.sort((a, b) => a.state.id.localeCompare(b.state.id)))
			.toMatchInlineSnapshot(`
		[
		  {
		    "lastChangedClock": 1,
		    "state": {
		      "gridSize": 10,
		      "id": "document:document",
		      "meta": {},
		      "name": "",
		      "typeName": "document",
		    },
		  },
		  {
		    "lastChangedClock": 1,
		    "state": {
		      "id": "page:page",
		      "index": "a1",
		      "meta": {},
		      "name": "Page 1",
		      "typeName": "page",
		    },
		  },
		]
	`)
	})

	it('passes onDataChange handler through', async () => {
		const addPage = (room: TLSocketRoom) =>
			room.updateStore((store) => {
				store.put(
					PageRecordType.create({ id: PageRecordType.createId(), name: '', index: ZERO_INDEX_KEY })
				)
			})
		const store = getStore()
		store.ensureStoreIsUsable()
		let called = 0

		const room = new TLSocketRoom({ onDataChange: () => ++called })
		expect(called).toEqual(0)

		await addPage(room)
		expect(called).toEqual(1)

		room.loadSnapshot(room.getCurrentSnapshot())
		expect(called).toEqual(1)

		await addPage(room)
		expect(called).toEqual(2)
	})
})
