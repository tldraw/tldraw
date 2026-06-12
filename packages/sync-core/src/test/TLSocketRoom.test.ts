/* eslint-disable @typescript-eslint/no-deprecated -- initialSnapshot, onDataChange,
 * updateStore, and getCurrentSnapshot are deprecated but remain part of the public
 * contract under test (see SPEC.md sections 28 and 29). */
import {
	createShapeId,
	createUserId,
	InstancePresenceRecordType,
	PageRecordType,
	TLDocument,
	TLInstancePresence,
	TLPage,
	TLRecord,
	TLScribble,
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
import { TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason } from '../lib/TLSyncClient'
import { TLSyncRoom, type RoomSnapshot } from '../lib/TLSyncRoom'

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

// Connect a session and complete the connect handshake
function connectSession(room: TLSocketRoom<any, any>, sessionId: string, socket: WebSocketMinimal) {
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

async function flushAsync() {
	await new Promise((r) => setTimeout(r, 0))
}

// Helper to create test session metadata
interface TestSessionMeta {
	userId: string
	userName: string
}

describe('28. TLSocketRoom (SR)', () => {
	describe('construction', () => {
		it('[SR1] allows being initialized with a non-empty TLStoreSnapshot', () => {
			const store = getStore()
			// populate with an empty document (document:document and page:page records)
			store.ensureStoreIsUsable()
			const snapshot = store.getStoreSnapshot()
			const room = new TLSocketRoom({
				initialSnapshot: snapshot,
			})
			expect(room.getCurrentSnapshot()).not.toMatchObject({ clock: 0, documents: [] })
			expect(room.getCurrentSnapshot().documentClock).toBe(0)
			expect(
				room.getCurrentSnapshot().documents.sort((a, b) => a.state.id.localeCompare(b.state.id))
			).toMatchInlineSnapshot(`
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

		it('[SR1] throws when both storage and initialSnapshot are provided', () => {
			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: DEFAULT_INITIAL_SNAPSHOT })
			const store = getStore()
			store.ensureStoreIsUsable()
			expect(
				() =>
					new TLSocketRoom<TLRecord, undefined>({
						storage,
						initialSnapshot: store.getStoreSnapshot(),
					})
			).toThrow('Cannot provide both storage and initialSnapshot options')
		})

		it('[SR1] seeds an InMemorySyncStorage from the default snapshot when neither option is given', () => {
			const room = new TLSocketRoom({})
			const snapshot = room.getCurrentSnapshot()
			expect(snapshot.documentClock).toBe(0)
			expect(snapshot.documents.map((d) => d.state.id).sort()).toEqual([
				'document:document',
				'page:page',
			])
		})

		it('[SR1] accepts a room snapshot as initialSnapshot', () => {
			const source = new TLSocketRoom({})
			const roomSnapshot = source.getCurrentSnapshot()
			const room = new TLSocketRoom({ initialSnapshot: roomSnapshot })
			expect(
				room.getCurrentSnapshot().documents.sort((a, b) => sortById(a.state, b.state))
			).toEqual(roomSnapshot.documents.sort((a, b) => sortById(a.state, b.state)))
		})
	})

	describe('onDataChange', () => {
		it('[SR2] passes onDataChange handler through', async () => {
			const addPage = (room: TLSocketRoom) =>
				room.updateStore((store) => {
					store.put(
						PageRecordType.create({
							id: PageRecordType.createId(),
							name: '',
							index: ZERO_INDEX_KEY,
						})
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

	describe('logging', () => {
		it('[SR3] sets up logging with default console.error when log option missing', () => {
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

		it('[SR3] leaves the room without a logger when log is explicitly undefined', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
			const room = new TLSocketRoom({ log: undefined })
			expect(room.log).toBeUndefined()

			// Trigger the same error path as the default-logging test; nothing should be logged
			const socket = createMockSocket()
			room.handleSocketConnect({
				sessionId: 'test-session',
				socket,
			})
			room.handleSocketMessage('test-session', '{invalid json')
			expect(consoleSpy).not.toHaveBeenCalled()
			consoleSpy.mockRestore()
		})

		it('[SR3] uses custom logger when provided', () => {
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
	})

	describe('handleSocketConnect', () => {
		it('[SR4] registers sessions with readonly defaulting to false', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()
			connectSession(room, 'test-session', socket)

			const sessions = room.getSessions()
			expect(sessions).toHaveLength(1)
			expect(sessions[0]).toMatchObject({
				sessionId: 'test-session',
				isConnected: true,
				isReadonly: false,
			})
		})

		it('[SR4][SR7] handles readonly sessions correctly', () => {
			const room = new TLSocketRoom({})
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

		it('[SR4] attaches message, close, and error listeners when the socket supports addEventListener', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()
			room.handleSocketConnect({ sessionId: 'test-session', socket })

			const events = vi.mocked(socket.addEventListener!).mock.calls.map((c) => c[0])
			expect(events.sort()).toEqual(['close', 'error', 'message'])
		})

		it('[SR4] tolerates sockets without addEventListener', () => {
			const room = new TLSocketRoom({})
			const socket: WebSocketMinimal = {
				send: vi.fn(),
				close: vi.fn(),
				readyState: WebSocket.OPEN,
			}
			expect(() => connectSession(room, 'test-session', socket)).not.toThrow()
			expect(room.getSessions()[0].isConnected).toBe(true)
		})

		it('[SR4][SR7] handles sessions with metadata correctly', () => {
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

		it('[SR4] calls onBeforeSendMessage for outgoing messages', () => {
			const onBeforeSendMessage = vi.fn()
			const room = new TLSocketRoom({ onBeforeSendMessage })
			const socket = createMockSocket()
			connectSession(room, 'test-session', socket)

			expect(onBeforeSendMessage).toHaveBeenCalled()
			const call = onBeforeSendMessage.mock.calls[0][0]
			expect(call.sessionId).toBe('test-session')
			expect(call.message).toBeDefined()
			expect(call.stringified).toBeDefined()
		})

		it('[SR4][SR5] calls onAfterReceiveMessage for valid incoming messages', () => {
			const onAfterReceiveMessage = vi.fn()
			const room = new TLSocketRoom({ onAfterReceiveMessage })
			const socket = createMockSocket()
			connectSession(room, 'test-session', socket)

			expect(onAfterReceiveMessage).toHaveBeenCalled()
			const call = onAfterReceiveMessage.mock.calls[0][0]
			expect(call.sessionId).toBe('test-session')
			expect(call.message).toBeDefined()
			expect(call.stringified).toBeDefined()
		})
	})

	describe('handleSocketMessage', () => {
		it('[SR5] closes the socket via the error path on chunk assembly errors', () => {
			const log: TLSyncLog = { warn: vi.fn(), error: vi.fn() }
			const room = new TLSocketRoom({ log })
			const socket = createMockSocket()
			connectSession(room, 'test-session', socket)

			// A non-JSON, non-chunk message produces an assembly error (CH7), which
			// is logged and closes the socket via the error path rather than throwing
			room.handleSocketMessage('test-session', 'not a json message and not a chunk')

			expect(log.error).toHaveBeenCalledWith('Error assembling message', expect.anything())
			expect(socket.close).toHaveBeenCalled()
			// the session enters the disconnect grace period rather than being rejected
			expect(room.getSessions()[0].isConnected).toBe(false)
		})

		it('[SR5] rejects the session with UNKNOWN_ERROR when message handling throws', () => {
			const log: TLSyncLog = { warn: vi.fn(), error: vi.fn() }
			const room = new TLSocketRoom({ log })
			const socket = createMockSocket()
			connectSession(room, 'test-session', socket)

			// Invalid JSON while the assembler is idle throws synchronously (CH4),
			// which lands in the catch path and rejects the session
			room.handleSocketMessage('test-session', '{invalid json')

			expect(log.error).toHaveBeenCalled()
			expect(socket.close).toHaveBeenCalledWith(
				TLSyncErrorCloseEventCode,
				TLSyncErrorCloseEventReason.UNKNOWN_ERROR
			)
			expect(room.getSessions()).toHaveLength(0)
		})

		it('[SR5] warns when receiving a message from an unknown session', () => {
			const log: TLSyncLog = { warn: vi.fn(), error: vi.fn() }
			const room = new TLSocketRoom({ log })

			room.handleSocketMessage('nonexistent-session', JSON.stringify({ type: 'ping' }))

			expect(log.warn).toHaveBeenCalledWith(
				'Received message from unknown session',
				'nonexistent-session'
			)
			expect(log.error).not.toHaveBeenCalled()
		})

		it('[SR5] prunes timed-out sessions during handleSocketMessage', async () => {
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

		it('[SR5] runs prune after handleMessage so the sender is not evicted by their own message', () => {
			// If prune ran before handleMessage, an idle client's message would trigger
			// prune first and cancel them before lastInteractionTime is updated. Verify
			// order: handleMessage must run before pruneSessions.
			const room = new TLSocketRoom({})
			const syncRoom = (room as unknown as { room: TLSyncRoom<TLRecord, void> }).room
			const socket = createMockSocket()
			connectSession(room, 'test', socket)

			const callOrder: string[] = []
			const realHandleMessage = syncRoom.handleMessage.bind(syncRoom)
			vi.spyOn(syncRoom, 'handleMessage').mockImplementation((sessionId, message) => {
				callOrder.push('handleMessage')
				return realHandleMessage(sessionId, message)
			})
			const originalPrune = syncRoom.pruneSessions
			const wrappedPrune = function (this: typeof syncRoom) {
				callOrder.push('prune')
				return originalPrune.call(this)
			}
			wrappedPrune.cancel = originalPrune.cancel?.bind(originalPrune)
			syncRoom.pruneSessions = wrappedPrune as typeof originalPrune

			room.handleSocketMessage('test', JSON.stringify({ type: 'ping' }))

			expect(callOrder).toEqual(['handleMessage', 'prune'])
			vi.restoreAllMocks()
			room.close()
		})

		it('[SR5] fully removes sessions after disconnect even with no further messages', () => {
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

	describe('socket error and close handling', () => {
		let room: TLSocketRoom
		let socket: WebSocketMinimal

		beforeEach(() => {
			room = new TLSocketRoom({})
			socket = createMockSocket()
		})

		it('[SR6] handles socket errors correctly', () => {
			connectSession(room, 'test-session', socket)

			expect(room.getSessions()).toHaveLength(1)

			// Trigger socket error - should not throw
			expect(() => room.handleSocketError('test-session')).not.toThrow()

			// The session is cancelled (grace period) and the socket closed
			expect(room.getSessions()[0].isConnected).toBe(false)
			expect(socket.close).toHaveBeenCalled()
		})

		it('[SR6] handles socket close correctly', () => {
			connectSession(room, 'test-session', socket)

			expect(room.getSessions()).toHaveLength(1)

			// Trigger socket close - should not throw
			expect(() => room.handleSocketClose('test-session')).not.toThrow()

			// The session is cancelled (grace period) and the socket closed
			expect(room.getSessions()[0].isConnected).toBe(false)
			expect(socket.close).toHaveBeenCalled()
		})
	})

	describe('session reporting', () => {
		it('[SR7] handles multiple concurrent sessions', () => {
			const room = new TLSocketRoom({})
			const sessions = ['session1', 'session2', 'session3']
			const sockets = sessions.map(() => createMockSocket())

			sessions.forEach((sessionId, index) => {
				connectSession(room, sessionId, sockets[index])
			})

			expect(room.getNumActiveSessions()).toBe(3)

			const sessionInfo = room.getSessions()
			expect(sessionInfo).toHaveLength(3)
			expect(sessionInfo.every((s) => s.isConnected)).toBe(true)
		})

		it('[SR7] counts sessions that have not completed the connect handshake', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()
			room.handleSocketConnect({ sessionId: 'pending', socket })

			expect(room.getNumActiveSessions()).toBe(1)
			expect(room.getSessions()[0]).toMatchObject({
				sessionId: 'pending',
				isConnected: false,
			})
		})
	})

	describe('getRecord', () => {
		it('[SR8] returns a deep clone that is safe to mutate', () => {
			const room = new TLSocketRoom({})
			const page = room.getRecord('page:page') as TLPage
			expect(page).toMatchObject({ id: 'page:page', name: 'Page 1' })

			// mutating the returned record must not affect the store
			page.name = 'mutated'
			expect((room.getRecord('page:page') as TLPage).name).toBe('Page 1')
		})

		it('[SR8] returns undefined for missing records', () => {
			const room = new TLSocketRoom({})
			expect(room.getRecord('page:does-not-exist')).toBeUndefined()
		})
	})

	describe('clocks and snapshots', () => {
		it('[SR9] increments clock after store updates', async () => {
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

		it('[SR9] getCurrentDocumentClock returns the storage clock', async () => {
			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: DEFAULT_INITIAL_SNAPSHOT })
			const room = new TLSocketRoom<TLRecord, undefined>({ storage })

			expect(room.getCurrentDocumentClock()).toBe(storage.getClock())

			await room.updateStore((store) => {
				store.put(PageRecordType.create({ name: 'page 3', index: 'a3' as IndexKey }) as TLRecord)
			})

			expect(room.getCurrentDocumentClock()).toBe(storage.getClock())
		})

		it('[SR9] getCurrentSnapshot delegates to storage.getSnapshot', () => {
			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: DEFAULT_INITIAL_SNAPSHOT })
			const room = new TLSocketRoom<TLRecord, undefined>({ storage })

			expect(room.getCurrentSnapshot()).toEqual(storage.getSnapshot())
		})

		it('[SR9] getCurrentSnapshot throws when the storage does not support snapshots', () => {
			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: DEFAULT_INITIAL_SNAPSHOT })
			const room = new TLSocketRoom<TLRecord, undefined>({ storage })
			// simulate a storage implementation without optional getSnapshot support
			;(storage as any).getSnapshot = undefined

			expect(() => room.getCurrentSnapshot()).toThrow(
				'getCurrentSnapshot is not supported for this storage type'
			)
		})
	})

	describe('loadSnapshot', () => {
		it('[SR10] allows loading a TLStoreSnapshot at some later time', () => {
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
			expect(
				room.getCurrentSnapshot().documents.sort((a, b) => a.state.id.localeCompare(b.state.id))
			).toMatchInlineSnapshot(`
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

		it('[SR10] increments documentClock when loading snapshot with different data', () => {
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

		it('[SR10] does not increment documentClock when loading identical snapshot', () => {
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

		it('[SR10] preserves existing tombstones with original clock values', async () => {
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

		it('[SR10] preserves schema when resetting room state', () => {
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

		it('[SR10] broadcasts the resulting changes to connected clients', async () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({ initialSnapshot: store.getStoreSnapshot() })
			const socket = createMockSocket()
			connectSession(room, 'observer', socket)
			vi.mocked(socket.send).mockClear()

			store.put([
				PageRecordType.create({
					id: PageRecordType.createId('extra'),
					name: 'Extra page',
					index: 'a3' as IndexKey,
				}),
			])
			room.loadSnapshot(store.getStoreSnapshot())

			// storage onChange notifications are delivered asynchronously
			await flushAsync()

			const sent = vi.mocked(socket.send).mock.calls.map((c) => String(c[0]))
			expect(sent.some((m) => m.includes('Extra page'))).toBe(true)

			room.close()
		})
	})

	describe('closing rooms and sessions', () => {
		it('[SR11] closes room correctly', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()
			connectSession(room, 'test-session', socket)

			expect(room.getSessions()).toHaveLength(1)

			// Close the room
			room.close()

			// Room should be marked as closed
			expect(room.isClosed()).toBe(true)
		})

		it('[SR11][SR12] close clears pending session snapshot timers', () => {
			vi.useFakeTimers()
			try {
				const onSessionSnapshot = vi.fn()
				const room = new TLSocketRoom({ onSessionSnapshot })
				const socket = createMockSocket()
				connectSession(room, 'test', socket)

				// Start a snapshot debounce, then close the room before it fires
				room.handleSocketMessage('test', JSON.stringify({ type: 'ping' }))
				room.close()

				vi.advanceTimersByTime(6000)
				expect(onSessionSnapshot).not.toHaveBeenCalled()
			} finally {
				vi.useRealTimers()
			}
		})

		it('[SR11] closes session without fatal reason', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()
			connectSession(room, 'test-session', socket)

			room.closeSession('test-session')

			// Session should be removed and the socket closed without a fatal close code
			expect(room.getSessions()).toHaveLength(0)
			expect(socket.close).toHaveBeenCalled()
			expect(vi.mocked(socket.close!).mock.calls[0][0]).toBeUndefined()
		})

		it('[SR11] closes session with fatal reason', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()
			connectSession(room, 'test-session', socket)

			room.closeSession('test-session', TLSyncErrorCloseEventReason.FORBIDDEN)

			// Session should be removed and the socket closed with the fatal close code
			expect(room.getSessions()).toHaveLength(0)
			expect(socket.close).toHaveBeenCalledWith(
				TLSyncErrorCloseEventCode,
				TLSyncErrorCloseEventReason.FORBIDDEN
			)
		})

		it('[SR11] sends custom messages', () => {
			const json = JSON.stringify
			const store = getStore()
			const room = new TLSocketRoom({ initialSnapshot: store.getStoreSnapshot() })

			const sessionId = 'test-session-1'
			const send = vi.fn()

			// Add session to the room (socket without addEventListener support)
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

		it('[SR11] sends custom messages to connected sessions', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()
			connectSession(room, 'test-session', socket)

			const customData = { type: 'notification', message: 'Hello World' }
			room.sendCustomMessage('test-session', customData)

			expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'custom', data: customData }))
		})

		it('[SR11] handles custom message to non-existent session gracefully', () => {
			const room = new TLSocketRoom({})
			// Should not throw an error
			expect(() => {
				room.sendCustomMessage('nonexistent-session', { test: 'data' })
			}).not.toThrow()
		})
	})

	describe('onSessionSnapshot', () => {
		it('[SR12] calls onSessionSnapshot after debounce on message receipt', () => {
			vi.useFakeTimers()
			try {
				const onSessionSnapshot = vi.fn()
				const room = new TLSocketRoom({ onSessionSnapshot })
				const socket = createMockSocket()
				connectSession(room, 'test', socket)

				// Send a ping to trigger the debounce
				room.handleSocketMessage('test', JSON.stringify({ type: 'ping' }))

				// Not called immediately
				expect(onSessionSnapshot).not.toHaveBeenCalled()

				// Advance past the 5s debounce
				vi.advanceTimersByTime(5100)

				expect(onSessionSnapshot).toHaveBeenCalledTimes(1)
				expect(onSessionSnapshot).toHaveBeenCalledWith(
					'test',
					expect.objectContaining({
						serializedSchema: expect.anything(),
						isReadonly: false,
					})
				)

				room.close()
			} finally {
				vi.useRealTimers()
			}
		})

		it('[SR12][SR6] does not call onSessionSnapshot after socket close (timer cleared)', () => {
			vi.useFakeTimers()
			try {
				const onSessionSnapshot = vi.fn()
				const room = new TLSocketRoom({ onSessionSnapshot })
				const socket = createMockSocket()
				connectSession(room, 'test', socket)

				// Send a message to start the debounce
				room.handleSocketMessage('test', JSON.stringify({ type: 'ping' }))

				// Close the socket before the debounce fires
				room.handleSocketClose('test')

				// Advance past the 5s debounce
				vi.advanceTimersByTime(5100)

				// Should never have been called - timer was cleared on close
				expect(onSessionSnapshot).not.toHaveBeenCalled()

				room.close()
			} finally {
				vi.useRealTimers()
			}
		})

		it('[SR12] resets the debounce on subsequent messages', () => {
			vi.useFakeTimers()
			try {
				const onSessionSnapshot = vi.fn()
				const room = new TLSocketRoom({ onSessionSnapshot })
				const socket = createMockSocket()
				connectSession(room, 'test', socket)

				// Send first message
				room.handleSocketMessage('test', JSON.stringify({ type: 'ping' }))

				// Advance 3s (within the 5s window)
				vi.advanceTimersByTime(3000)
				expect(onSessionSnapshot).not.toHaveBeenCalled()

				// Send another message, resetting the debounce
				room.handleSocketMessage('test', JSON.stringify({ type: 'ping' }))

				// Advance another 3s (6s total, but only 3s since last message)
				vi.advanceTimersByTime(3000)
				expect(onSessionSnapshot).not.toHaveBeenCalled()

				// Advance past the new debounce window
				vi.advanceTimersByTime(2100)
				expect(onSessionSnapshot).toHaveBeenCalledTimes(1)

				room.close()
			} finally {
				vi.useRealTimers()
			}
		})
	})

	describe('getSessionSnapshot', () => {
		it('[SR13] returns null for unknown session', () => {
			const room = new TLSocketRoom({})
			expect(room.getSessionSnapshot('nonexistent')).toBeNull()
		})

		it('[SR13] returns null for session not yet connected', () => {
			const room = new TLSocketRoom({})
			const socket = createMockSocket()
			room.handleSocketConnect({ sessionId: 'test', socket })
			expect(room.getSessionSnapshot('test')).toBeNull()
		})

		it('[SR13] returns snapshot for connected session', () => {
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

		it('[SR13] includes presence record when present', () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({ initialSnapshot: store.getStoreSnapshot() })
			const socket = createMockSocket()
			connectSession(room, 'test', socket)

			const presence = InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId('p1'),
				userId: createUserId('user1'),
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
			expect((snapshot!.presenceRecord as TLInstancePresence).userId).toBe(createUserId('user1'))
		})

		it('[SR13] strips large presence fields from the snapshot', () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({ initialSnapshot: store.getStoreSnapshot() })
			const socket = createMockSocket()
			connectSession(room, 'test', socket)

			const scribble: TLScribble = {
				id: 'scribble-1',
				points: [{ x: 1, y: 2, z: 0.5 }],
				size: 4,
				color: 'accent',
				opacity: 0.8,
				state: 'active',
				delay: 0,
				shrink: 0.1,
				taper: false,
			}
			const presence = InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId('p1'),
				userId: createUserId('user1'),
				userName: 'User 1',
				currentPageId: PageRecordType.createId('page'),
				chatMessage: 'hello there',
				brush: { x: 0, y: 0, w: 10, h: 10 },
				scribbles: [scribble],
				selectedShapeIds: [createShapeId('a'), createShapeId('b')],
			})
			room.handleSocketMessage(
				'test',
				JSON.stringify({
					type: 'push',
					clientClock: 1,
					presence: [RecordOpType.Put, presence],
				})
			)

			// the snapshot's presence record has the large fields cleared
			const snapshot = room.getSessionSnapshot('test')!
			expect(snapshot.presenceRecord).toMatchObject({
				userId: createUserId('user1'),
				scribbles: [],
				chatMessage: '',
				selectedShapeIds: [],
				brush: null,
			})

			// while the live presence record in the room keeps them
			const live = Object.values(room.getPresenceRecords())[0] as TLInstancePresence
			expect(live.chatMessage).toBe('hello there')
			expect(live.scribbles).toHaveLength(1)
			expect(live.selectedShapeIds).toHaveLength(2)
			expect(live.brush).toEqual({ x: 0, y: 0, w: 10, h: 10 })
		})
	})

	describe('handleSocketResume', () => {
		it('[SR14] creates a connected session that handles pings', () => {
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

		it('[SR14] creates a connected session that handles pushes', () => {
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

		it('[SR14] restores presence into the presence store', () => {
			const store = getStore()
			store.ensureStoreIsUsable()
			const room = new TLSocketRoom({ initialSnapshot: store.getStoreSnapshot() })
			const socket = createMockSocket()
			connectSession(room, 'test', socket)

			// Push presence
			const presence = InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId('p1'),
				userId: createUserId('user1'),
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
			expect((restored as TLInstancePresence).userId).toBe(createUserId('user1'))
		})

		it('[SR14] does not attach event listeners', () => {
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

		it('[SR14] supports session metadata', () => {
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

		it('[SR14] handles readonly sessions', () => {
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

		it('[SR14] removes presence when a resumed session is immediately closed', () => {
			vi.useFakeTimers()
			try {
				const store = getStore()
				store.ensureStoreIsUsable()
				const room = new TLSocketRoom({ initialSnapshot: store.getStoreSnapshot() })
				const socket = createMockSocket()
				connectSession(room, 'test', socket)

				// Push presence
				const presence = InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('p1'),
					userId: createUserId('user1'),
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

				// Simulate hibernation: new room with a second connected client
				const room2 = new TLSocketRoom({ initialSnapshot: store.getStoreSnapshot() })
				const observerSocket = createMockSocket()
				connectSession(room2, 'observer', observerSocket)
				vi.mocked(observerSocket.send).mockClear()

				// Resume the session that's about to disconnect
				const closingSocket = createMockSocket()
				room2.handleSocketResume({
					sessionId: 'test',
					socket: closingSocket,
					snapshot,
				})

				// Presence should be restored (only the resumed session has presence)
				expect(Object.keys(room2.getPresenceRecords())).toHaveLength(1)

				// Clear any messages from resume so we only see what happens after close
				vi.mocked(observerSocket.send).mockClear()

				// Now immediately close it (simulating webSocketClose after hibernation)
				room2.handleSocketClose('test')

				// Advance past SESSION_REMOVAL_WAIT_TIME (5s) + buffer (100ms) + throttle (1s)
				vi.advanceTimersByTime(6200)

				// Presence should be gone
				expect(Object.keys(room2.getPresenceRecords())).toHaveLength(0)

				// The observer should have received a presence removal broadcast.
				// Messages are wrapped in a { type: 'data', data: [...] } envelope.
				const sentMessages = vi.mocked(observerSocket.send).mock.calls.map((c) => JSON.parse(c[0]))
				const hasPresenceRemoval = sentMessages.some(
					(msg: {
						type: string
						data?: Array<{ type: string; diff?: Record<string, [string]> }>
					}) =>
						msg.type === 'data' &&
						msg.data?.some(
							(inner) =>
								inner.type === 'patch' &&
								inner.diff &&
								Object.values(inner.diff).some((op) => op[0] === 'remove')
						)
				)
				expect(hasPresenceRemoval).toBe(true)

				room2.close()
			} finally {
				vi.useRealTimers()
			}
		})
	})

	describe('getPresenceRecords', () => {
		it('[SR15] getPresenceRecords correctly handles presence records', () => {
			const store = getStore()
			store.ensureStoreIsUsable()

			const snapshot = store.getStoreSnapshot()
			const room = new TLSocketRoom({
				initialSnapshot: snapshot,
			})

			// Create two separate sessions, each with their own presence record
			const sessionId1 = 'test-session-1'
			const sessionId2 = 'test-session-2'

			connectSession(room, sessionId1, createMockSocket())
			connectSession(room, sessionId2, createMockSocket())

			// Create presence records for each session
			const presence1 = InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId('presence1'),
				userId: createUserId('user1'),
				userName: 'User 1',
				currentPageId: PageRecordType.createId('page'),
			})

			const presence2 = InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId('presence2'),
				userId: createUserId('user2'),
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
			const user1Presence = Object.values(presenceRecords).find(
				(p) => (p as TLInstancePresence).userId === createUserId('user1')
			)
			const user2Presence = Object.values(presenceRecords).find(
				(p) => (p as TLInstancePresence).userId === createUserId('user2')
			)

			expect(user1Presence).toBeDefined()
			expect(user2Presence).toBeDefined()

			// Verify the records are properly structured
			expect(user1Presence).toMatchObject({
				typeName: 'instance_presence',
				userId: createUserId('user1'),
				userName: 'User 1',
			})

			expect(user2Presence).toMatchObject({
				typeName: 'instance_presence',
				userId: createUserId('user2'),
				userName: 'User 2',
			})

			// Should not include document records
			const documentRecordIds = Object.keys(presenceRecords).filter(
				(id) => presenceRecords[id].typeName === 'document'
			)
			expect(documentRecordIds).toHaveLength(0)
		})
	})
})

describe('29. updateStore (US)', () => {
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

	it('[US1] isolates concurrent transactions from one another', async () => {
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

	it('[US1] does not update unless you call put', async () => {
		const clock = storage.getClock()
		await room.updateStore((store) => {
			const document = store.get('document:document') as TLDocument
			document.name = 'My lovely document'
		})
		const docRecord = storage
			.getSnapshot()
			.documents.find((r) => r.state.id === 'document:document') as any
		expect(docRecord.state.name).toBe('')
		expect(clock).toBe(storage.getClock())
	})

	it('[US1] does not commit mutations to records gotten via get unless you put', async () => {
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

	it('[US1] returns null from get for records deleted in the same transaction', async () => {
		await room.updateStore((store) => {
			expect(store.get('page:page')).toBeTruthy()
			store.delete('page:page')
			expect(store.get('page:page')).toBe(null)
		})
	})

	it('[US1] returns null from get for records that never existed', async () => {
		await room.updateStore((store) => {
			expect(store.get('page:page_3')).toBe(null)
		})
	})

	it('[US2] fails if you try to add bad data', async () => {
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

	it('[US2] fails if you put a record with an unknown type', async () => {
		await expect(
			room.updateStore((store) => {
				store.put({ id: 'whatever:x', typeName: 'whatever' } as any)
			})
		).rejects.toThrow('Missing definition for record type whatever')
	})

	it('[US2] cancels a pending put when a later put is deep-equal to the snapshot state', async () => {
		const clock = storage.getClock()
		const onChange = vi.fn()
		storage.onChange(onChange)

		await room.updateStore((store) => {
			const original = store.get('page:page') as TLPage
			const page = store.get('page:page') as TLPage
			page.name = 'changed'
			store.put(page)
			// putting the original snapshot-equal state cancels the pending put
			store.put(original)
		})
		await flushAsync()

		expect(storage.getClock()).toBe(clock)
		expect(onChange).not.toHaveBeenCalled()
		const pageRecord = storage.getSnapshot().documents.find((r) => r.state.id === 'page:page')
		expect((pageRecord!.state as TLPage).name).toBe('Page 1')
	})

	it('[US2] clears a pending delete when the same id is put again (resurrection)', async () => {
		const clock = storage.getClock()
		const onChange = vi.fn()
		storage.onChange(onChange)

		await room.updateStore((store) => {
			const original = store.get('page:page') as TLPage
			store.delete('page:page')
			expect(store.get('page:page')).toBe(null)
			// a put deep-equal to the snapshot state after a delete of the same id
			// resurrects the record: the pending delete is cleared
			store.put(original)
			expect(store.get('page:page')).toEqual(original)
		})
		await flushAsync()

		// the record survived, and since nothing effectively changed, the clock
		// did not advance and onChange did not fire
		expect(storage.getSnapshot().documents.find((r) => r.state.id === 'page:page')).toBeTruthy()
		expect(storage.getClock()).toBe(clock)
		expect(onChange).not.toHaveBeenCalled()
	})

	it('[US3] allows deleting records by id', async () => {
		await room.updateStore((store) => {
			expect(store.get('page:page')).toBeTruthy()
			store.delete('page:page')
		})

		expect(storage.getSnapshot().documents.find((r) => r.state.id === 'page:page')).toBeFalsy()
	})

	it('[US3] allows deleting records by passing the record itself', async () => {
		await room.updateStore((store) => {
			const page = store.get('page:page') as TLPage
			store.delete(page)
		})

		expect(storage.getSnapshot().documents.find((r) => r.state.id === 'page:page')).toBeFalsy()
	})

	it('[US3] cancels a pending put on delete and only records deletes for snapshot records', async () => {
		const clock = storage.getClock()
		const page3 = PageRecordType.create({ name: 'page 3', index: 'a0' as IndexKey })

		await room.updateStore((store) => {
			store.put(page3)
			// deleting cancels the pending put; since page3 is not in the snapshot,
			// no delete is recorded either
			store.delete(page3.id)
			// deleting something that never existed records nothing
			store.delete('page:never_existed')
		})

		expect(storage.getSnapshot().documents.find((r) => r.state.id === page3.id)).toBeFalsy()
		// nothing was committed, so the clock did not advance
		expect(storage.getClock()).toBe(clock)
	})

	it('[US4] returns all records if you ask for them', async () => {
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

	it('[US5] allows updating records', async () => {
		const clock = storage.getClock()
		await room.updateStore((store) => {
			const document = store.get('document:document') as TLDocument
			document.name = 'My lovely document'
			store.put(document)
		})
		const docRecord = storage
			.getSnapshot()
			.documents.find((r) => r.state.id === 'document:document') as any
		expect(docRecord.state.name).toBe('My lovely document')
		expect(clock).toBeLessThan(storage.getClock())
	})

	it('[US5] allows adding new records', async () => {
		const id = PageRecordType.createId('page_3')
		await room.updateStore((store) => {
			const page = PageRecordType.create({ id, name: 'page 3', index: 'a0' as IndexKey })
			store.put(page)
		})

		expect(storage.getSnapshot().documents.find((r) => r.state.id === id)?.state).toBeTruthy()
	})

	it('[US5] supports async updaters', async () => {
		const initialClock = storage.getClock()

		await room.updateStore(async (store) => {
			await flushAsync()
			const page = PageRecordType.create({
				id: PageRecordType.createId('new-page'),
				name: 'New Page',
				index: ZERO_INDEX_KEY,
			})
			store.put(page)
		})

		expect(storage.getClock()).toBeGreaterThan(initialClock)
	})

	it('[US5] commits all changes in a single transaction, advancing the clock at most once', async () => {
		const clock = storage.getClock()

		await room.updateStore((store) => {
			store.put(PageRecordType.create({ name: 'page 3', index: 'a3' as IndexKey }))
			store.put(PageRecordType.create({ name: 'page 4', index: 'a4' as IndexKey }))
			store.delete('page:page')
		})

		expect(storage.getClock()).toBe(clock + 1)
	})

	it('[US5] triggers onChange events on the storage if something changed', async () => {
		const onChange = vi.fn()
		storage.onChange(onChange)
		await room.updateStore((store) => {
			const document = store.get('document:document') as TLDocument
			document.name = 'My lovely document'
			store.put(document)
		})
		await flushAsync()
		expect(onChange).toHaveBeenCalled()
	})

	it('[US5] does not trigger onChange events if nothing is committed', async () => {
		const onChange = vi.fn()
		storage.onChange(onChange)
		await room.updateStore((store) => {
			const document = store.get('document:document') as TLDocument
			document.name = 'My lovely document'
		})
		await flushAsync()
		expect(onChange).not.toHaveBeenCalled()
	})

	it('[US5] propagates updater errors and commits nothing', async () => {
		const clock = storage.getClock()
		await expect(async () => {
			await room.updateStore(() => {
				throw new Error('Test error')
			})
		}).rejects.toThrow('Test error')
		expect(storage.getClock()).toBe(clock)
	})

	it('[US6] makes all context methods fail after the updater completes', async () => {
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

	it('[US6] rejects if the room is closed', async () => {
		room.close()
		await expect(
			room.updateStore(() => {
				// noop
			})
		).rejects.toMatchInlineSnapshot(`[Error: Cannot update store on a closed room]`)
	})
})
