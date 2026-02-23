/* eslint-disable @typescript-eslint/no-deprecated */
import {
	InstancePresenceRecordType,
	PageRecordType,
	TLDocument,
	TLPage,
	TLRecord,
} from '@tldraw/tlschema'
import {
	createTLSchema,
	createTLStore,
	IndexKey,
	promiseWithResolve,
	sortById,
	ZERO_INDEX_KEY,
} from 'tldraw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordOpType } from '../lib/diff'
import { DEFAULT_INITIAL_SNAPSHOT, InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import { getTlsyncProtocolVersion } from '../lib/protocol'
import { WebSocketMinimal } from '../lib/ServerSocketAdapter'
import { TLSocketRoom, TLSyncLog } from '../lib/TLSocketRoom'
import { TLSyncErrorCloseEventReason } from '../lib/TLSyncClient'
import { RoomSnapshot } from '../lib/TLSyncRoom'

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
		expect(room.getCurrentSnapshot().documentClock).toBe(0)
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

		expect(room.getCurrentSnapshot()).toMatchObject({ documentClock: 0, documents: [] })

		// populate with an empty document (document:document and page:page records)
		store.ensureStoreIsUsable()

		const snapshot = store.getStoreSnapshot()
		room.loadSnapshot(snapshot)

		expect(room.getCurrentSnapshot().documentClock).toBe(1)
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
			protocolVersion: 8,
			schema: store.schema.serialize(),
		}
		room.handleSocketMessage(sessionId1, JSON.stringify(connectRequest1))

		const connectRequest2 = {
			type: 'connect' as const,
			connectRequestId: 'connect-2',
			lastServerClock: 0,
			protocolVersion: 8,
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
		it('increments documentClock when loading snapshot with different data', () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({
				initialSnapshot: store.getStoreSnapshot(),
			})

			const oldClock = room.getCurrentDocumentClock()
			expect(oldClock).toBe(0)

			// Add a new page to make the snapshot different
			store.put([PageRecordType.create({ name: 'New Page', index: 'a2' as IndexKey })])
			const newSnapshot = store.getStoreSnapshot()
			room.loadSnapshot(newSnapshot)

			expect(room.getCurrentDocumentClock()).toBe(oldClock + 1)
		})

		it('does not increment documentClock when loading identical snapshot', () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({
				initialSnapshot: store.getStoreSnapshot(),
			})

			const oldClock = room.getCurrentDocumentClock()

			// Load the same snapshot again
			room.loadSnapshot(store.getStoreSnapshot())

			// Clock should not change since data is identical
			expect(room.getCurrentDocumentClock()).toBe(oldClock)
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

			// Tombstones should be preserved
			expect(room.getCurrentSnapshot().tombstones).toEqual({
				[testPageId]: deletionClock,
			})

			// Clock should not change since we loaded the same snapshot
			expect(room.getCurrentSnapshot().documentClock).toBe(deletionClock)
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

describe('Hibernation support', () => {
	function connectSession(room: TLSocketRoom, sessionId: string, socket: WebSocketMinimal) {
		room.handleSocketConnect({ sessionId, socket })
		const connectRequest = {
			type: 'connect' as const,
			connectRequestId: `connect-${sessionId}`,
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: createTLSchema().serialize(),
		}
		room.handleSocketMessage(sessionId, JSON.stringify(connectRequest))
	}

	describe('getSessionSnapshot', () => {
		it('returns null for unknown session', () => {
			const room = new TLSocketRoom({})
			expect(room.getSessionSnapshot('nonexistent')).toBeNull()
		})

		it('returns null for session not yet connected', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()
			room.handleSocketConnect({ sessionId: 'test', socket })
			expect(room.getSessionSnapshot('test')).toBeNull()
		})

		it('returns snapshot for connected session', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()
			connectSession(room, 'test', socket)

			const snapshot = room.getSessionSnapshot('test')
			expect(snapshot).not.toBeNull()
			expect(snapshot!.serializedSchema).toBeDefined()
			expect(snapshot!.isReadonly).toBe(false)
			expect(snapshot!.presenceId).toBeDefined()
			expect(snapshot!.requiresLegacyRejection).toBe(false)
			expect(snapshot!.supportsStringAppend).toBe(true)
		})

		it('includes presence record when present', () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({ initialSnapshot: store.getStoreSnapshot() })
			const socket = createMockSocket()
			connectSession(room, 'test', socket)

			const presence = InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId('p1'),
				userId: 'user1',
				userName: 'User 1',
				currentPageId: PageRecordType.createId('page'),
			})
			const pushRequest = {
				type: 'push' as const,
				clientClock: 1,
				presence: [RecordOpType.Put, presence] as [typeof RecordOpType.Put, typeof presence],
			}
			room.handleSocketMessage('test', JSON.stringify(pushRequest))

			const snapshot = room.getSessionSnapshot('test')
			expect(snapshot).not.toBeNull()
			expect(snapshot!.presenceRecord).not.toBeNull()
			expect((snapshot!.presenceRecord as any).userId).toBe('user1')
		})
	})

	describe('handleSocketResume', () => {
		it('creates a connected session that handles pings', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()

			connectSession(room, 'original', socket)
			const snapshot = room.getSessionSnapshot('original')!

			// Simulate hibernation: create a new room
			const room2 = new TLSocketRoom({})
			const socket2 = createMockSocket()
			room2.handleSocketResume({
				sessionId: 'original',
				socket: socket2,
				snapshot,
			})

			expect(room2.getNumActiveSessions()).toBe(1)
			expect(room2.getSessions()[0].isConnected).toBe(true)

			// Should handle pings (pong is sent)
			room2.handleSocketMessage('original', JSON.stringify({ type: 'ping' }))
			expect(socket2.send).toHaveBeenCalledWith(JSON.stringify({ type: 'pong' }))
		})

		it('creates a connected session that handles pushes', () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({ initialSnapshot: store.getStoreSnapshot() })
			const socket = createMockSocket()
			connectSession(room, 'original', socket)
			const snapshot = room.getSessionSnapshot('original')!

			// Simulate hibernation: new room with same storage
			const room2 = new TLSocketRoom({ initialSnapshot: store.getStoreSnapshot() })
			const socket2 = createMockSocket()
			room2.handleSocketResume({
				sessionId: 'original',
				socket: socket2,
				snapshot,
			})

			// Send a push with a new page
			const pageId = PageRecordType.createId('new-page')
			const pushRequest = {
				type: 'push' as const,
				clientClock: 1,
				diff: {
					[pageId]: [
						RecordOpType.Put,
						PageRecordType.create({ id: pageId, name: 'New Page', index: 'a2' as any }),
					],
				},
			}
			room2.handleSocketMessage('original', JSON.stringify(pushRequest))

			// Should have processed the push (record exists)
			const record = room2.getRecord(pageId)
			expect(record).toBeDefined()
			expect((record as TLPage).name).toBe('New Page')
		})

		it('restores presence into the presence store', () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({ initialSnapshot: store.getStoreSnapshot() })
			const socket = createMockSocket()
			connectSession(room, 'test', socket)

			// Push presence
			const presence = InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId('p1'),
				userId: 'user1',
				userName: 'User 1',
				currentPageId: PageRecordType.createId('page'),
			})
			room.handleSocketMessage(
				'test',
				JSON.stringify({
					type: 'push',
					clientClock: 1,
					presence: [RecordOpType.Put, presence],
				})
			)

			const snapshot = room.getSessionSnapshot('test')!
			expect(snapshot.presenceRecord).not.toBeNull()

			// Resume in a new room
			const room2 = new TLSocketRoom({ initialSnapshot: store.getStoreSnapshot() })
			const socket2 = createMockSocket()
			room2.handleSocketResume({
				sessionId: 'test',
				socket: socket2,
				snapshot,
			})

			// Presence should be restored
			const presenceRecords = room2.getPresenceRecords()
			expect(Object.keys(presenceRecords)).toHaveLength(1)
			const restored = Object.values(presenceRecords)[0]
			expect((restored as any).userId).toBe('user1')
		})

		it('does not attach event listeners', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()
			connectSession(room, 'test', socket)
			const snapshot = room.getSessionSnapshot('test')!

			const room2 = new TLSocketRoom({})
			const socket2 = createMockSocket()
			room2.handleSocketResume({
				sessionId: 'test',
				socket: socket2,
				snapshot,
			})

			// addEventListener should NOT have been called on the resumed socket
			expect(socket2.addEventListener).not.toHaveBeenCalled()
		})

		it('supports session metadata', () => {
			const room = new TLSocketRoom<TLRecord, TestSessionMeta>({})
			const socket = createMockSocket()
			const snapshot = {
				serializedSchema: createTLSchema().serialize(),
				isReadonly: false,
				presenceId: null,
				presenceRecord: null,
				requiresLegacyRejection: false,
				supportsStringAppend: true,
			}

			room.handleSocketResume({
				sessionId: 'test',
				socket,
				snapshot,
				meta: { userId: 'user1', userName: 'Alice' },
			})

			const sessions = room.getSessions()
			expect(sessions[0].meta).toEqual({ userId: 'user1', userName: 'Alice' })
		})

		it('handles readonly sessions', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()
			const snapshot = {
				serializedSchema: createTLSchema().serialize(),
				isReadonly: true,
				presenceId: null,
				presenceRecord: null,
				requiresLegacyRejection: false,
				supportsStringAppend: true,
			}

			room.handleSocketResume({
				sessionId: 'test',
				socket,
				snapshot,
			})

			expect(room.getSessions()[0].isReadonly).toBe(true)
		})
	})

	describe('clientTimeout', () => {
		it('uses default idle timeout when not specified', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()
			connectSession(room, 'test', socket)

			expect(room.getNumActiveSessions()).toBe(1)
		})

		it('accepts Infinity as clientTimeout', () => {
			const room = new TLSocketRoom({ clientTimeout: Infinity })
			const socket = createMockSocket()
			connectSession(room, 'test', socket)

			expect(room.getNumActiveSessions()).toBe(1)
		})

		it('accepts custom clientTimeout value', () => {
			const room = new TLSocketRoom({ clientTimeout: 60000 })
			expect(room.opts.clientTimeout).toBe(60000)
		})
	})

	describe('on-demand session pruning', () => {
		it('prunes timed-out sessions during handleSocketMessage', async () => {
			const room = new TLSocketRoom({
				clientTimeout: 1,
			})
			const socket = createMockSocket()
			connectSession(room, 'test', socket)
			expect(room.getNumActiveSessions()).toBe(1)

			// Wait for both the client timeout and the prune throttle window (1s) to expire
			await new Promise((r) => setTimeout(r, 1100))

			// Connect a second session and send a message to trigger pruning
			const socket2 = createMockSocket()
			connectSession(room, 'test2', socket2)

			// The timed-out socket should have been closed
			expect(socket.close).toHaveBeenCalled()

			room.close()
		})

		it('fully removes sessions after disconnect even with no further messages', () => {
			vi.useFakeTimers()
			try {
				const onSessionRemoved = vi.fn()
				const room = new TLSocketRoom({ onSessionRemoved })
				const socket = createMockSocket()
				connectSession(room, 'test', socket)
				expect(room.getNumActiveSessions()).toBe(1)

				// Disconnect the only client
				room.handleSocketClose('test')

				// Session should be in AwaitingRemoval, not yet fully removed
				expect(room.getNumActiveSessions()).toBe(1)
				expect(onSessionRemoved).not.toHaveBeenCalled()

				// Advance past SESSION_REMOVAL_WAIT_TIME (5s) + buffer (100ms) + throttle (1s)
				vi.advanceTimersByTime(6200)

				// Session should now be fully removed via the scheduled follow-up prune
				expect(room.getNumActiveSessions()).toBe(0)
				expect(onSessionRemoved).toHaveBeenCalledWith(
					room,
					expect.objectContaining({ sessionId: 'test', numSessionsRemaining: 0 })
				)

				room.close()
			} finally {
				vi.useRealTimers()
			}
		})
	})
})

describe('TLSocketRoom.updateStore', () => {
	let storage = new InMemorySyncStorage<TLRecord>({ snapshot: DEFAULT_INITIAL_SNAPSHOT })

	let room = new TLSocketRoom<TLRecord, undefined>({ storage })
	function init(snapshot?: RoomSnapshot) {
		storage = new InMemorySyncStorage<TLRecord>({ snapshot: snapshot ?? DEFAULT_INITIAL_SNAPSHOT })
		room = new TLSocketRoom<TLRecord, undefined>({
			storage,
		})
	}
	beforeEach(() => {
		init()
	})

	test('it allows updating records', async () => {
		const clock = storage.getClock()
		await room.updateStore((store) => {
			const document = store.get('document:document') as TLDocument
			document.name = 'My lovely document'
			store.put(document)
		})
		expect(
			(
				storage.getSnapshot().documents.find((r) => r.state.id === 'document:document')
					?.state as any
			).name
		).toBe('My lovely document')
		expect(clock).toBeLessThan(storage.getClock())
	})

	test('it does not update unless you call .set', () => {
		const clock = storage.getClock()
		room.updateStore((store) => {
			const document = store.get('document:document') as TLDocument
			document.name = 'My lovely document'
		})
		expect(
			(
				storage.getSnapshot().documents.find((r) => r.state.id === 'document:document')
					?.state as any
			).name
		).toBe('')
		expect(clock).toBe(storage.getClock())
	})

	test('triggers onChange events on the storage if something changed', async () => {
		const onChange = vi.fn()
		storage.onChange(onChange)
		await room.updateStore((store) => {
			const document = store.get('document:document') as TLDocument
			document.name = 'My lovely document'
			store.put(document)
		})
		expect(onChange).toHaveBeenCalled()
	})

	test('does not trigger onChange events if the change is not committed', async () => {
		const onChange = vi.fn()
		storage.onChange(onChange)
		room.updateStore((store) => {
			const document = store.get('document:document') as TLDocument
			document.name = 'My lovely document'
		})
		expect(onChange).not.toHaveBeenCalled()
	})

	test('it allows adding new records', async () => {
		const id = PageRecordType.createId('page_3')
		await room.updateStore((store) => {
			const page = PageRecordType.create({ id, name: 'page 3', index: 'a0' as IndexKey })
			store.put(page)
		})

		expect(storage.getSnapshot().documents.find((r) => r.state.id === id)?.state).toBeTruthy()
	})

	test('it allows deleting records', async () => {
		await room.updateStore((store) => {
			store.delete('page:page_2')
		})

		expect(storage.getSnapshot().documents.find((r) => r.state.id === 'page:page_2')).toBeFalsy()
	})

	test('it returns all records if you ask for them', async () => {
		let allRecords
		await room.updateStore((store) => {
			allRecords = store.getAll()
		})
		expect(allRecords!.sort(sortById)).toEqual(
			storage
				.getSnapshot()
				.documents.map((r) => r.state)
				.sort(sortById)
		)
		await room.updateStore((store) => {
			const page3 = PageRecordType.create({ name: 'page 3', index: 'a0' as IndexKey })
			store.put(page3)
			allRecords = store.getAll()
			expect(allRecords.sort(sortById)).toEqual(
				[...storage.getSnapshot().documents.map((r) => r.state), page3].sort(sortById)
			)
			store.delete(page3)
			allRecords = store.getAll()
		})
		expect(allRecords!.sort(sortById)).toEqual(
			storage
				.getSnapshot()
				.documents.map((r) => r.state)
				.sort(sortById)
		)
	})

	test('all operations fail after the store is closed', async () => {
		let store
		await room.updateStore((s) => {
			store = s
		})
		expect(() => {
			store!.put(PageRecordType.create({ name: 'page 3', index: 'a0' as IndexKey }))
		}).toThrowErrorMatchingInlineSnapshot(`[Error: StoreUpdateContext is closed]`)
		expect(() => {
			store!.delete('page:page_2')
		}).toThrowErrorMatchingInlineSnapshot(`[Error: StoreUpdateContext is closed]`)
		expect(() => {
			store!.getAll()
		}).toThrowErrorMatchingInlineSnapshot(`[Error: StoreUpdateContext is closed]`)
		expect(() => {
			store!.get('page:page_2')
		}).toThrowErrorMatchingInlineSnapshot(`[Error: StoreUpdateContext is closed]`)
	})

	test('it fails if the room is closed', async () => {
		room.close()
		await expect(
			room.updateStore(() => {
				// noop
			})
		).rejects.toMatchInlineSnapshot(`[Error: Cannot update store on a closed room]`)
	})

	test('it fails if you try to add bad data', async () => {
		await expect(
			room.updateStore((store) => {
				const page = store.get('page:page') as TLPage
				page.index = 34 as any
				store.put(page)
			})
		).rejects.toMatchInlineSnapshot(
			`[ValidationError: At page.index: Expected string, got a number]`
		)
	})

	test('changes in multiple transaction are isolated from one another', async () => {
		const page3 = PageRecordType.create({ name: 'page 3', index: 'a0' as IndexKey })
		const didDelete = promiseWithResolve()
		const didPut = promiseWithResolve()
		const doneA = room.updateStore(async (store) => {
			store.put(page3)
			didPut.resolve(null)
			await didDelete
			expect(store.get(page3.id)).toBeTruthy()
		})
		const doneB = room.updateStore(async (store) => {
			await didPut
			expect(store.get(page3.id)).toBeFalsy()
			store.delete(page3.id)
			didDelete.resolve(null)
		})
		await Promise.all([doneA, doneB])
	})

	test('getting something that was deleted in the same transaction returns null', async () => {
		await room.updateStore((store) => {
			expect(store.get('page:page')).toBeTruthy()
			store.delete('page:page')
			expect(store.get('page:page')).toBe(null)
		})
	})

	test('getting something that never existed in the first place returns null', async () => {
		await room.updateStore((store) => {
			expect(store.get('page:page_3')).toBe(null)
		})
	})

	test('mutations to shapes gotten via .get are not committed unless you .put', async () => {
		const page3 = PageRecordType.create({ name: 'page 3', index: 'a0' as IndexKey })
		let page4 = PageRecordType.create({ name: 'page 4', index: 'a1' as IndexKey })
		let page1
		await room.updateStore((store) => {
			page1 = store.get('page:page') as TLPage
			page1.name = 'my lovely page 1'
			store.put(page3)
			page3.name = 'my lovely page 3'
			store.put(page4)
			page4 = store.get(page4.id) as TLPage
			page4.name = 'my lovely page 4'
		})

		const getPageNames = () =>
			room
				.getCurrentSnapshot()
				.documents.filter((r) => r.state.typeName === 'page')
				.map((r) => (r.state as any).name)
				.sort()

		expect(getPageNames()).toEqual(['Page 1', 'page 3', 'page 4'])

		await room.updateStore((store) => {
			store.put(page1!)
			store.put(page3)
			store.put(page4)
		})

		expect(getPageNames()).toEqual(['my lovely page 1', 'my lovely page 3', 'my lovely page 4'])
	})
})
