import { InstancePresenceRecordType, PageRecordType } from '@tldraw/tlschema'
import { createTLSchema, createTLStore, ZERO_INDEX_KEY } from 'tldraw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordOpType } from '../lib/diff'
import { getTlsyncProtocolVersion } from '../lib/protocol'
import { WebSocketMinimal } from '../lib/ServerSocketAdapter'
import { TLSocketRoom, TLSyncLog } from '../lib/TLSocketRoom'
import { TLSyncErrorCloseEventReason } from '../lib/TLSyncClient'

function getStore() {
	const schema = createTLSchema()
	const store = createTLStore({ schema })
	return store
}

// Mock WebSocket implementation for testing
function createMockSocket(overrides: Partial<WebSocketMinimal> = {}): WebSocketMinimal {
	return {
		send: vi.fn(),
		close: vi.fn(),
		readyState: WebSocket.OPEN,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		...overrides,
	}
}

// Helper to create test session metadata
interface TestSessionMeta {
	userId: string
	userName: string
}

describe(TLSocketRoom, () => {
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

	describe('Constructor options', () => {
		it('sets up logging with default console.error when log option missing', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
			const room = new TLSocketRoom({})
			// Create a session first, then send invalid message to trigger JSON parse error
			const socket = createMockSocket()
			room.handleSocketConnect({
				sessionId: 'test-session',
				socket,
			})
			// Send invalid JSON to trigger JSON parse error which should call console.error
			room.handleSocketMessage('test-session', '{invalid json')
			expect(consoleSpy).toHaveBeenCalled()
			consoleSpy.mockRestore()
		})

		it('uses custom logger when provided', () => {
			const mockLog: TLSyncLog = {
				warn: vi.fn(),
				error: vi.fn(),
			}
			const room = new TLSocketRoom({ log: mockLog })
			// Create a session first, then send invalid message
			const socket = createMockSocket()
			room.handleSocketConnect({
				sessionId: 'test-session',
				socket,
			})
			// Send invalid JSON to trigger JSON parse error which should call log.error
			room.handleSocketMessage('test-session', '{invalid json')
			expect(mockLog.error).toHaveBeenCalled()
		})

		it('initializes with custom client timeout', () => {
			const customTimeout = 15000
			const room = new TLSocketRoom({ clientTimeout: customTimeout })
			expect(room.opts.clientTimeout).toBe(customTimeout)
		})
	})

	describe('Session management', () => {
		let room: TLSocketRoom
		let onSessionRemoved: ReturnType<typeof vi.fn>

		beforeEach(() => {
			onSessionRemoved = vi.fn()
			room = new TLSocketRoom({ onSessionRemoved })
		})

		it('handles multiple concurrent sessions', () => {
			const sessions = ['session1', 'session2', 'session3']
			const sockets = sessions.map(() => createMockSocket())

			sessions.forEach((sessionId, index) => {
				room.handleSocketConnect({
					sessionId,
					socket: sockets[index],
				})

				const connectRequest = {
					type: 'connect' as const,
					connectRequestId: `connect-${index}`,
					lastServerClock: 0,
					protocolVersion: getTlsyncProtocolVersion(),
					schema: createTLSchema().serialize(),
				}
				room.handleSocketMessage(sessionId, JSON.stringify(connectRequest))
			})

			expect(room.getNumActiveSessions()).toBe(3)

			const sessionInfo = room.getSessions()
			expect(sessionInfo).toHaveLength(3)
			expect(sessionInfo.every((s) => s.isConnected)).toBe(true)
		})

		it('handles readonly sessions correctly', () => {
			const socket = createMockSocket()
			room.handleSocketConnect({
				sessionId: 'readonly-session',
				socket,
				isReadonly: true,
			})

			const connectRequest = {
				type: 'connect' as const,
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: createTLSchema().serialize(),
			}
			room.handleSocketMessage('readonly-session', JSON.stringify(connectRequest))

			const sessions = room.getSessions()
			expect(sessions[0].isReadonly).toBe(true)
		})
	})

	describe('Message handling', () => {
		let room: TLSocketRoom
		let socket: WebSocketMinimal
		let onBeforeSendMessage: ReturnType<typeof vi.fn>
		let onAfterReceiveMessage: ReturnType<typeof vi.fn>

		beforeEach(() => {
			onBeforeSendMessage = vi.fn()
			onAfterReceiveMessage = vi.fn()
			room = new TLSocketRoom({
				onBeforeSendMessage,
				onAfterReceiveMessage,
			})
			socket = createMockSocket()
		})

		it('calls onBeforeSendMessage for outgoing messages', () => {
			room.handleSocketConnect({
				sessionId: 'test-session',
				socket,
			})

			const connectRequest = {
				type: 'connect' as const,
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: createTLSchema().serialize(),
			}
			room.handleSocketMessage('test-session', JSON.stringify(connectRequest))

			expect(onBeforeSendMessage).toHaveBeenCalled()
			const call = onBeforeSendMessage.mock.calls[0][0]
			expect(call.sessionId).toBe('test-session')
			expect(call.message).toBeDefined()
			expect(call.stringified).toBeDefined()
		})

		it('calls onAfterReceiveMessage for valid incoming messages', () => {
			room.handleSocketConnect({
				sessionId: 'test-session',
				socket,
			})

			const connectRequest = {
				type: 'connect' as const,
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: createTLSchema().serialize(),
			}
			room.handleSocketMessage('test-session', JSON.stringify(connectRequest))

			expect(onAfterReceiveMessage).toHaveBeenCalled()
			const call = onAfterReceiveMessage.mock.calls[0][0]
			expect(call.sessionId).toBe('test-session')
			expect(call.message).toBeDefined()
			expect(call.stringified).toBeDefined()
		})
	})

	describe('WebSocket error handling', () => {
		let room: TLSocketRoom
		let socket: WebSocketMinimal

		beforeEach(() => {
			room = new TLSocketRoom({})
			socket = createMockSocket()
		})

		it('handles socket errors correctly', () => {
			room.handleSocketConnect({
				sessionId: 'test-session',
				socket,
			})

			const connectRequest = {
				type: 'connect' as const,
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: createTLSchema().serialize(),
			}
			room.handleSocketMessage('test-session', JSON.stringify(connectRequest))

			expect(room.getSessions()).toHaveLength(1)

			// Trigger socket error - should not throw
			expect(() => room.handleSocketError('test-session')).not.toThrow()
		})

		it('handles socket close correctly', () => {
			room.handleSocketConnect({
				sessionId: 'test-session',
				socket,
			})

			const connectRequest = {
				type: 'connect' as const,
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: createTLSchema().serialize(),
			}
			room.handleSocketMessage('test-session', JSON.stringify(connectRequest))

			expect(room.getSessions()).toHaveLength(1)

			// Trigger socket close - should not throw
			expect(() => room.handleSocketClose('test-session')).not.toThrow()
		})
	})

	describe('Custom messages', () => {
		let room: TLSocketRoom
		let socket: WebSocketMinimal

		beforeEach(() => {
			room = new TLSocketRoom({})
			socket = createMockSocket()
		})

		it('sends custom messages to connected sessions', () => {
			room.handleSocketConnect({
				sessionId: 'test-session',
				socket,
			})

			const connectRequest = {
				type: 'connect' as const,
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: createTLSchema().serialize(),
			}
			room.handleSocketMessage('test-session', JSON.stringify(connectRequest))

			const customData = { type: 'notification', message: 'Hello World' }
			room.sendCustomMessage('test-session', customData)

			expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'custom', data: customData }))
		})

		it('handles custom message to non-existent session gracefully', () => {
			// Should not throw an error
			expect(() => {
				room.sendCustomMessage('nonexistent-session', { test: 'data' })
			}).not.toThrow()
		})
	})

	describe('Session closing', () => {
		let room: TLSocketRoom
		let socket: WebSocketMinimal

		beforeEach(() => {
			room = new TLSocketRoom({})
			socket = createMockSocket()
		})

		it('closes session without fatal reason', () => {
			room.handleSocketConnect({
				sessionId: 'test-session',
				socket,
			})

			const connectRequest = {
				type: 'connect' as const,
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: createTLSchema().serialize(),
			}
			room.handleSocketMessage('test-session', JSON.stringify(connectRequest))

			room.closeSession('test-session')

			// Session should be removed
			expect(room.getSessions()).toHaveLength(0)
		})

		it('closes session with fatal reason', () => {
			room.handleSocketConnect({
				sessionId: 'test-session',
				socket,
			})

			const connectRequest = {
				type: 'connect' as const,
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: createTLSchema().serialize(),
			}
			room.handleSocketMessage('test-session', JSON.stringify(connectRequest))

			room.closeSession('test-session', TLSyncErrorCloseEventReason.FORBIDDEN)

			// Session should be removed
			expect(room.getSessions()).toHaveLength(0)
		})
	})

	describe('Room lifecycle', () => {
		it('closes room correctly', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()

			room.handleSocketConnect({
				sessionId: 'test-session',
				socket,
			})

			const connectRequest = {
				type: 'connect' as const,
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: createTLSchema().serialize(),
			}
			room.handleSocketMessage('test-session', JSON.stringify(connectRequest))

			expect(room.getSessions()).toHaveLength(1)

			// Close the room
			room.close()

			// Room should be marked as closed
			expect(room.isClosed()).toBe(true)
		})
	})

	describe('Store updates', () => {
		it('executes async store updates', async () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({
				initialSnapshot: store.getStoreSnapshot(),
			})

			const initialClock = room.getCurrentDocumentClock()

			await room.updateStore(async (store) => {
				const page = PageRecordType.create({
					id: PageRecordType.createId('new-page'),
					name: 'New Page',
					index: ZERO_INDEX_KEY,
				})
				store.put(page)
			})

			expect(room.getCurrentDocumentClock()).toBeGreaterThan(initialClock)
		})

		it('handles errors in store updates', async () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({
				initialSnapshot: store.getStoreSnapshot(),
			})

			await expect(async () => {
				await room.updateStore(() => {
					throw new Error('Test error')
				})
			}).rejects.toThrow('Test error')
		})
	})

	describe('Session metadata handling', () => {
		it('handles sessions with metadata correctly', () => {
			const roomWithMeta = new TLSocketRoom<any, TestSessionMeta>({})
			const socket = createMockSocket()
			const meta: TestSessionMeta = { userId: 'user123', userName: 'Alice' }

			roomWithMeta.handleSocketConnect({
				sessionId: 'meta-session',
				socket,
				meta,
			})

			const connectRequest = {
				type: 'connect' as const,
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: createTLSchema().serialize(),
			}
			roomWithMeta.handleSocketMessage('meta-session', JSON.stringify(connectRequest))

			const sessions = roomWithMeta.getSessions()
			expect(sessions[0].meta).toEqual(meta)
		})
	})

	describe('Clock operations', () => {
		it('increments clock after store updates', async () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({
				initialSnapshot: store.getStoreSnapshot(),
			})

			const initialClock = room.getCurrentDocumentClock()

			await room.updateStore((store) => {
				store.put(
					PageRecordType.create({
						id: PageRecordType.createId('test-page'),
						name: 'Test',
						index: ZERO_INDEX_KEY,
					})
				)
			})

			expect(room.getCurrentDocumentClock()).toBeGreaterThan(initialClock)
		})
	})
})
