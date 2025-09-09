import { InstancePresenceRecordType, PageRecordType } from '@tldraw/tlschema'
import { createTLSchema, createTLStore, ZERO_INDEX_KEY } from 'tldraw'
import { vi } from 'vitest'
import { WebSocketMinimal } from '../lib/ServerSocketAdapter'
import { TLSocketRoom } from '../lib/TLSocketRoom'
import { RecordOpType } from '../lib/diff'
import { getTlsyncProtocolVersion } from '../lib/protocol'

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

	it('getPresenceRecords returns empty object when no presence records exist', () => {
		const store = getStore()
		// Don't add any presence records, just the default document
		store.ensureStoreIsUsable()

		const snapshot = store.getStoreSnapshot()
		const room = new TLSocketRoom({
			initialSnapshot: snapshot,
		})

		const presenceRecords = room.getPresenceRecords()

		expect(presenceRecords).toEqual({})
		expect(Object.keys(presenceRecords)).toHaveLength(0)
	})

	it('getPresenceRecords correctly handles presence records', () => {
		const store = getStore()
		store.ensureStoreIsUsable()

		const snapshot = store.getStoreSnapshot()
		const room = new TLSocketRoom({
			initialSnapshot: snapshot,
		})

		// Create two separate sessions, each with their own presence record
		const sessionId1 = 'test-session-1'
		const sessionId2 = 'test-session-2'

		// Create mock sockets
		const mockSocket1: WebSocketMinimal = {
			send: vi.fn(),
			close: vi.fn(),
			readyState: 1, // WebSocket.OPEN
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}

		const mockSocket2: WebSocketMinimal = {
			send: vi.fn(),
			close: vi.fn(),
			readyState: 1, // WebSocket.OPEN
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}

		// Add sessions to the room
		room.handleSocketConnect({
			sessionId: sessionId1,
			socket: mockSocket1,
			isReadonly: false,
		})

		room.handleSocketConnect({
			sessionId: sessionId2,
			socket: mockSocket2,
			isReadonly: false,
		})

		// Send connect messages to establish the sessions
		const connectRequest1 = {
			type: 'connect' as const,
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: 7,
			schema: store.schema.serialize(),
		}
		room.handleSocketMessage(sessionId1, JSON.stringify(connectRequest1))

		const connectRequest2 = {
			type: 'connect' as const,
			connectRequestId: 'connect-2',
			lastServerClock: 0,
			protocolVersion: 7,
			schema: store.schema.serialize(),
		}
		room.handleSocketMessage(sessionId2, JSON.stringify(connectRequest2))

		// Create presence records for each session
		const presence1 = InstancePresenceRecordType.create({
			id: InstancePresenceRecordType.createId('presence1'),
			userId: 'user1',
			userName: 'User 1',
			currentPageId: PageRecordType.createId('page'),
		})

		const presence2 = InstancePresenceRecordType.create({
			id: InstancePresenceRecordType.createId('presence2'),
			userId: 'user2',
			userName: 'User 2',
			currentPageId: PageRecordType.createId('page'),
		})

		// Send push messages with presence data for each session
		const pushRequest1 = {
			type: 'push' as const,
			clientClock: 1,
			presence: [RecordOpType.Put, presence1] as [typeof RecordOpType.Put, typeof presence1],
		}
		room.handleSocketMessage(sessionId1, JSON.stringify(pushRequest1))

		const pushRequest2 = {
			type: 'push' as const,
			clientClock: 2,
			presence: [RecordOpType.Put, presence2] as [typeof RecordOpType.Put, typeof presence2],
		}
		room.handleSocketMessage(sessionId2, JSON.stringify(pushRequest2))

		// Get presence records
		const presenceRecords = room.getPresenceRecords()

		// Should return the presence records that were added through the protocol
		expect(Object.keys(presenceRecords)).toHaveLength(2)

		// Find the presence records by their user data since the IDs are generated by the room
		const user1Presence = Object.values(presenceRecords).find((p) => (p as any).userId === 'user1')
		const user2Presence = Object.values(presenceRecords).find((p) => (p as any).userId === 'user2')

		expect(user1Presence).toBeDefined()
		expect(user2Presence).toBeDefined()

		// Verify the records are properly structured
		expect(user1Presence).toMatchObject({
			typeName: 'instance_presence',
			userId: 'user1',
			userName: 'User 1',
		})

		expect(user2Presence).toMatchObject({
			typeName: 'instance_presence',
			userId: 'user2',
			userName: 'User 2',
		})

		// Should not include document records
		const documentRecordIds = Object.keys(presenceRecords).filter(
			(id) => presenceRecords[id].typeName === 'document'
		)
		expect(documentRecordIds).toHaveLength(0)
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

	it('sends custom messages', async () => {
		const json = JSON.stringify
		const store = getStore()
		const room = new TLSocketRoom({ initialSnapshot: store.getStoreSnapshot() })

		const sessionId = 'test-session-1'
		const send = vi.fn()

		// Add session to the room
		const mockSocket: WebSocketMinimal = { send, close: vi.fn(), readyState: WebSocket.OPEN }
		room.handleSocketConnect({ sessionId, socket: mockSocket })

		// Send connect message to establish the session
		const connect = {
			type: 'connect' as const,
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: store.schema.serialize(),
		}
		room.handleSocketMessage(sessionId, json(connect))

		room.sendCustomMessage(sessionId, 'hello world')
		expect(send.mock.lastCall).toEqual([json({ type: 'custom', data: 'hello world' })])
	})

	describe('Room state resetting behavior', () => {
		it('sets documentClock to oldRoom.clock + 1 when resetting room state', () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({
				initialSnapshot: store.getStoreSnapshot(),
			})

			// Load a snapshot to increment the clock
			const snapshot = store.getStoreSnapshot()
			room.loadSnapshot(snapshot)

			const oldClock = room.getCurrentSnapshot().clock
			expect(oldClock).toBe(1)

			// Reset with a new snapshot
			const newSnapshot = store.getStoreSnapshot()
			room.loadSnapshot(newSnapshot)

			const newSnapshotResult = room.getCurrentSnapshot()
			expect(newSnapshotResult.documentClock).toBe(oldClock + 1)
			expect(newSnapshotResult.clock).toBe(oldClock + 1)
		})

		it('updates all documents lastChangedClock when resetting', () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({
				initialSnapshot: store.getStoreSnapshot(),
			})

			// Get initial clock
			const initialClock = room.getCurrentSnapshot().clock

			// Reset with a new snapshot
			const newSnapshot = store.getStoreSnapshot()
			room.loadSnapshot(newSnapshot)

			const result = room.getCurrentSnapshot()
			expect(result.clock).toBe(initialClock + 1)

			// All documents should have updated lastChangedClock
			for (const doc of result.documents) {
				expect(doc.lastChangedClock).toBe(initialClock + 1)
			}
		})

		it('preserves existing tombstones with original clock values', async () => {
			// Create a room with initial state
			const store = getStore()
			store.ensureStoreIsUsable()
			const testPageId = PageRecordType.createId('test_page')
			store.put([
				PageRecordType.create({ id: testPageId, name: 'Test Page', index: ZERO_INDEX_KEY }),
			])
			const room = new TLSocketRoom({
				initialSnapshot: store.getStoreSnapshot(),
			})

			await room.updateStore((store) => {
				store.delete(testPageId)
			})

			const deletionClock = room.getCurrentDocumentClock()
			expect(room.getCurrentSnapshot().tombstones).toEqual({
				[testPageId]: deletionClock,
			})

			room.loadSnapshot(room.getCurrentSnapshot())

			expect(room.getCurrentSnapshot().tombstones).toEqual({
				[testPageId]: deletionClock,
			})

			expect(room.getCurrentSnapshot().documentClock).toBe(deletionClock + 1)
		})

		it('handles empty snapshot reset correctly', () => {
			const store = getStore()
			// Don't call ensureStoreIsUsable to get an empty snapshot
			const room = new TLSocketRoom({
				initialSnapshot: store.getStoreSnapshot(),
			})

			const oldClock = room.getCurrentSnapshot().clock

			// Reset with empty snapshot
			const emptySnapshot = store.getStoreSnapshot()
			room.loadSnapshot(emptySnapshot)

			const result = room.getCurrentSnapshot()
			expect(result.documentClock).toBe(oldClock + 1)
			expect(result.clock).toBe(oldClock + 1)
			expect(result.documents).toHaveLength(0)
		})

		it('preserves schema when resetting room state', () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({
				initialSnapshot: store.getStoreSnapshot(),
			})

			const originalSchema = room.getCurrentSnapshot().schema

			// Reset with a new snapshot
			const newSnapshot = store.getStoreSnapshot()
			room.loadSnapshot(newSnapshot)

			const result = room.getCurrentSnapshot()
			expect(result.schema).toEqual(originalSchema)
		})
	})
})
