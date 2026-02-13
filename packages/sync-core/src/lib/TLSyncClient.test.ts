import { Atom, atom } from '@tldraw/state'
import { Store } from '@tldraw/store'
import {
	DocumentRecordType,
	PageRecordType,
	TLDOCUMENT_ID,
	TLRecord,
	createTLSchema,
} from '@tldraw/tlschema'
/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordOpType } from './diff'
import {
	TLPushRequest,
	TLSocketClientSentEvent,
	TLSocketServerSentDataEvent,
	TLSocketServerSentEvent,
	getTlsyncProtocolVersion,
} from './protocol'
import {
	TLPersistentClientSocket,
	TLPresenceMode,
	TLSocketStatusChangeEvent,
	TLSyncClient,
} from './TLSyncClient'

// Mock store and schema setup
const schema = createTLSchema()
const protocolVersion = getTlsyncProtocolVersion()
type TestRecord = TLRecord

// Mock socket implementation for testing
class MockSocket
	implements
		TLPersistentClientSocket<
			TLSocketClientSentEvent<TestRecord>,
			TLSocketServerSentEvent<TestRecord>
		>
{
	connectionStatus: 'online' | 'offline' | 'error' = 'offline'
	private messageListeners: Array<(msg: TLSocketServerSentEvent<TestRecord>) => void> = []
	private statusListeners: Array<(event: TLSocketStatusChangeEvent) => void> = []
	private sentMessages: TLSocketClientSentEvent<TestRecord>[] = []

	sendMessage(msg: TLSocketClientSentEvent<TestRecord>) {
		if (this.connectionStatus !== 'online') {
			throw new Error('Cannot send message when not online')
		}
		this.sentMessages.push(msg)
	}

	onReceiveMessage(callback: (val: TLSocketServerSentEvent<TestRecord>) => void) {
		this.messageListeners.push(callback)
		return () => {
			const index = this.messageListeners.indexOf(callback)
			if (index >= 0) this.messageListeners.splice(index, 1)
		}
	}

	onStatusChange(callback: (event: TLSocketStatusChangeEvent) => void) {
		this.statusListeners.push(callback)
		return () => {
			const index = this.statusListeners.indexOf(callback)
			if (index >= 0) this.statusListeners.splice(index, 1)
		}
	}

	restart(): void {
		this.connectionStatus = 'offline'
		this._notifyStatus({ status: 'offline' })
		// Simulate reconnection
		setTimeout(() => {
			this.connectionStatus = 'online'
			this._notifyStatus({ status: 'online' })
		}, 0)
	}

	close(): void {
		this.connectionStatus = 'offline'
		this._notifyStatus({ status: 'offline' })
	}

	// Test helpers
	mockServerMessage(message: TLSocketServerSentEvent<TestRecord>) {
		this.messageListeners.forEach((listener) => listener(message))
	}

	mockConnectionStatus(status: 'online' | 'offline' | 'error', reason?: string) {
		this.connectionStatus = status
		if (status === 'error') {
			this._notifyStatus({ status: 'error', reason: reason || 'Unknown error' })
		} else {
			this._notifyStatus({ status: status as 'online' | 'offline' })
		}
	}

	getSentMessages() {
		return [...this.sentMessages]
	}

	getLastSentMessage() {
		return this.sentMessages[this.sentMessages.length - 1]
	}

	clearSentMessages() {
		this.sentMessages = []
	}

	private _notifyStatus(event: TLSocketStatusChangeEvent) {
		this.statusListeners.forEach((listener) => listener(event))
	}
}

describe('TLSyncClient', () => {
	let store: Store<TestRecord, any>
	let socket: MockSocket
	let presence: Atom<TestRecord | null>
	let presenceMode: Atom<TLPresenceMode>
	let onLoad: (client: TLSyncClient<TestRecord, Store<TestRecord, any>>) => void
	let onSyncError: (reason: string) => void
	let onCustomMessageReceived: (data: any) => void
	let onAfterConnect: (
		client: TLSyncClient<TestRecord, Store<TestRecord, any>>,
		details: { isReadonly: boolean }
	) => void
	let client: TLSyncClient<TestRecord, Store<TestRecord, any>>

	beforeEach(() => {
		vi.useFakeTimers()

		// Create fresh store for each test
		store = new Store<TestRecord, any>({
			schema,
			props: {
				defaultName: 'test',
				assets: {
					upload: async () => ({ src: 'mock://test' }),
					resolve: (asset: any) => asset.src || 'mock://resolved',
					remove: async () => {},
				},
				onMount: () => {},
			},
		})

		// Add basic document record
		store.put([
			DocumentRecordType.create({
				id: TLDOCUMENT_ID,
				gridSize: 10,
			}),
		])

		socket = new MockSocket() as MockSocket & TLPersistentClientSocket<TestRecord>
		presence = atom<TestRecord | null>('presence', null)
		presenceMode = atom<TLPresenceMode>('presenceMode', 'full')

		onLoad = vi.fn()
		onSyncError = vi.fn()
		onCustomMessageReceived = vi.fn()
		onAfterConnect = vi.fn()

		// Start socket as online by default
		socket.connectionStatus = 'online'
	})

	afterEach(() => {
		client?.close()
		vi.useRealTimers()
		vi.clearAllMocks()
	})

	function createConnectMessage(
		overrides: Partial<Extract<TLSocketServerSentEvent<TestRecord>, { type: 'connect' }>> = {}
	): Extract<TLSocketServerSentEvent<TestRecord>, { type: 'connect' }> {
		return {
			type: 'connect',
			connectRequestId: client.latestConnectRequestId!,
			hydrationType: 'wipe_all',
			protocolVersion,
			schema: schema.serialize(),
			isReadonly: false,
			serverClock: 1,
			diff: {},
			...overrides,
		}
	}

	function createClient(
		overrides: Partial<{
			store: Store<TestRecord, any>
			socket: TLPersistentClientSocket<TestRecord>
			presence: Atom<TestRecord | null>
			presenceMode?: Atom<TLPresenceMode>
			onLoad(self: TLSyncClient<TestRecord, Store<TestRecord, any>>): void
			onSyncError(reason: string): void
			onCustomMessageReceived?(data: any): void
			onAfterConnect?(
				self: TLSyncClient<TestRecord, Store<TestRecord, any>>,
				details: { isReadonly: boolean }
			): void
			didCancel?(): boolean
		}> = {}
	): TLSyncClient<TestRecord, Store<TestRecord, any>> {
		return new TLSyncClient<TestRecord, Store<TestRecord, any>>({
			store,
			socket,
			presence,
			presenceMode,
			onLoad,
			onSyncError,
			onCustomMessageReceived,
			onAfterConnect,
			...overrides,
		})
	}

	describe('Construction and Initialization', () => {
		it('creates a client with required configuration', () => {
			client = createClient()
			expect(client).toBeInstanceOf(TLSyncClient)
			expect(client.store).toBe(store)
			expect(client.socket).toBe(socket)
			expect(client.presenceState).toBe(presence)
			expect(client.presenceMode).toBe(presenceMode)
		})

		it('initializes with correct default state', () => {
			client = createClient()
			expect(client.isConnectedToRoom).toBe(false)
		})

		it('sends connect message when socket is already online', () => {
			client = createClient()
			expect(socket.getSentMessages()).toHaveLength(1)
			expect(socket.getLastSentMessage().type).toBe('connect')
		})

		it('waits for socket to come online before sending connect message', () => {
			socket.connectionStatus = 'offline'
			client = createClient()
			expect(socket.getSentMessages()).toHaveLength(0)

			socket.mockConnectionStatus('online')
			expect(socket.getSentMessages()).toHaveLength(1)
			expect(socket.getLastSentMessage().type).toBe('connect')
		})

		it('sets up window.tlsync for debugging', () => {
			client = createClient()
			expect((globalThis as any).tlsync).toBe(client)
		})

		it('handles optional callbacks', () => {
			client = createClient({
				onCustomMessageReceived: undefined,
				onAfterConnect: undefined,
			})
			expect(client).toBeInstanceOf(TLSyncClient)
		})

		it('handles optional presence mode', () => {
			client = createClient({
				presenceMode: undefined,
			})
			expect(client.presenceMode).toBeUndefined()
		})
	})

	describe('Connection Lifecycle', () => {
		beforeEach(() => {
			client = createClient()
			socket.clearSentMessages()
		})

		it('handles successful connection', () => {
			const connectMessage = createConnectMessage()

			socket.mockServerMessage(connectMessage)

			expect(client.isConnectedToRoom).toBe(true)
			expect(onLoad).toHaveBeenCalledWith(client)
			expect(onAfterConnect).toHaveBeenCalledWith(client, { isReadonly: false })
		})

		it('handles connection with readonly mode', () => {
			const connectMessage = createConnectMessage({ isReadonly: true })

			socket.mockServerMessage(connectMessage)

			expect(onAfterConnect).toHaveBeenCalledWith(client, { isReadonly: true })
		})

		it('handles socket going offline', () => {
			// First connect
			socket.mockServerMessage(createConnectMessage())
			expect(client.isConnectedToRoom).toBe(true)

			// Then go offline
			socket.mockConnectionStatus('offline')
			expect(client.isConnectedToRoom).toBe(false)
		})

		it('handles socket errors', () => {
			socket.mockConnectionStatus('error', 'Connection failed')
			expect(onSyncError).toHaveBeenCalledWith('Connection failed')
		})

		it('sends ping messages periodically', () => {
			// Connect first
			socket.mockServerMessage(createConnectMessage())

			socket.clearSentMessages()

			// Advance time to trigger ping
			vi.advanceTimersByTime(5000)
			expect(socket.getSentMessages()).toHaveLength(1)
			expect(socket.getLastSentMessage().type).toBe('ping')
		})

		it('resets connection if no server interaction for too long', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			// Connect first
			socket.mockServerMessage(createConnectMessage())

			// Advance time beyond health check threshold
			vi.advanceTimersByTime(15000) // Greater than MAX_TIME_TO_WAIT_FOR_SERVER_INTERACTION

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Haven't heard from the server in a while")
			)
			expect(client.isConnectedToRoom).toBe(false)

			consoleSpy.mockRestore()
		})
	})

	describe('Message Handling', () => {
		beforeEach(() => {
			client = createClient()
			// Connect first
			socket.mockServerMessage(createConnectMessage())
			socket.clearSentMessages()
		})

		it('handles pong messages', () => {
			const pongMessage: Extract<TLSocketServerSentEvent<TestRecord>, { type: 'pong' }> = {
				type: 'pong',
			}

			socket.mockServerMessage(pongMessage)
			// Pong messages are just used to update lastServerInteractionTimestamp
			// No specific assertion needed beyond not throwing
		})

		it('handles custom messages', () => {
			const customData = { type: 'chat', message: 'Hello world' }
			const customMessage: Extract<TLSocketServerSentEvent<TestRecord>, { type: 'custom' }> = {
				type: 'custom',
				data: customData,
			}

			socket.mockServerMessage(customMessage)

			expect(onCustomMessageReceived).toHaveBeenCalledWith(customData)
		})

		it('handles data messages and triggers rebase', () => {
			const dataMessage: Extract<TLSocketServerSentEvent<TestRecord>, { type: 'data' }> = {
				type: 'data',
				data: [
					{
						type: 'patch',
						serverClock: 2,
						diff: {},
					},
				],
			}

			socket.mockServerMessage(dataMessage)
			// Rebase is throttled, so advance timers
			vi.advanceTimersByTime(100)
		})

		it('handles legacy patch messages', () => {
			const patchMessage: Extract<TLSocketServerSentEvent<TestRecord>, { type: 'patch' }> = {
				type: 'patch',
				serverClock: 2,
				diff: {},
			}

			socket.mockServerMessage(patchMessage)
			vi.advanceTimersByTime(100)
		})

		it('ignores messages when not connected to room', () => {
			// Reset connection
			client.isConnectedToRoom = false

			const dataMessage: Extract<TLSocketServerSentEvent<TestRecord>, { type: 'data' }> = {
				type: 'data',
				data: [],
			}

			socket.mockServerMessage(dataMessage)
			// Should not process the message or throw
		})

		it('handles incompatibility_error messages', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			const errorMessage: Extract<
				TLSocketServerSentEvent<TestRecord>,
				{ type: 'incompatibility_error' }
			> = {
				type: 'incompatibility_error',
				reason: 'clientTooOld',
			}

			socket.mockServerMessage(errorMessage)

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('incompatibility error is legacy')
			)

			consoleSpy.mockRestore()
		})
	})

	describe('Store Synchronization', () => {
		beforeEach(() => {
			client = createClient()
			// Connect first
			socket.mockServerMessage(createConnectMessage())
			socket.clearSentMessages()
		})

		it('sends push requests for local changes', () => {
			const pageId = PageRecordType.createId()
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test Page',
					index: 'a1' as any,
				}),
			])

			vi.advanceTimersByTime(100)

			expect(socket.getSentMessages()).toHaveLength(1)
			const message = socket.getLastSentMessage() as TLPushRequest<TestRecord>
			expect(message.type).toBe('push')
			expect(message.diff).toBeDefined()
		})

		it('does not send push requests when offline', () => {
			socket.mockConnectionStatus('offline')

			const pageId = PageRecordType.createId()
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test Page',
					index: 'a1' as any,
				}),
			])

			vi.advanceTimersByTime(100)

			expect(socket.getSentMessages()).toHaveLength(0)
		})

		it('throttles push request sending', () => {
			// Make multiple rapid changes without waiting for timers
			for (let i = 0; i < 5; i++) {
				const pageId = PageRecordType.createId()
				store.put([
					PageRecordType.create({
						id: pageId,
						name: `Test Page ${i}`,
						index: `a${i}` as any,
					}),
				])
			}

			// After throttle resolves
			vi.advanceTimersByTime(100)
			// Should have sent at least one message but possibly consolidated multiple changes
			const messages = socket.getSentMessages()
			expect(messages.length).toBeGreaterThan(0)
			expect(messages.length).toBeLessThanOrEqual(5)
		})
	})

	describe('Presence Management', () => {
		let presenceRecord: TestRecord

		beforeEach(() => {
			// Mock a presence record type
			presenceRecord = {
				id: 'presence:user1' as any,
				typeName: 'instance_presence',
				cursor: { x: 100, y: 200 },
				userName: 'Test User',
			} as any

			client = createClient()

			// Connect first
			socket.mockServerMessage(createConnectMessage())
			socket.clearSentMessages()
		})

		it('sends presence updates when presence changes', () => {
			presence.set(presenceRecord)
			vi.advanceTimersByTime(100)

			const messages = socket.getSentMessages()
			const pushMessages = messages.filter(
				(msg) => msg.type === 'push'
			) as TLPushRequest<TestRecord>[]
			expect(pushMessages.length).toBeGreaterThan(0)

			const messageWithPresence = pushMessages.find((msg) => msg.presence)
			expect(messageWithPresence).toBeDefined()
			expect(messageWithPresence!.presence).toBeDefined()
		})

		it('does not send presence when mode is solo', () => {
			presenceMode.set('solo')
			presence.set(presenceRecord)
			vi.advanceTimersByTime(100)

			expect(socket.getSentMessages()).toHaveLength(0)
		})

		it('sends full presence on first update', () => {
			presence.set(presenceRecord)
			vi.advanceTimersByTime(100)

			const messages = socket.getSentMessages()
			const pushMessages = messages.filter(
				(msg) => msg.type === 'push'
			) as TLPushRequest<TestRecord>[]
			const messageWithPresence = pushMessages.find((msg) => msg.presence)

			expect(messageWithPresence).toBeDefined()
			expect(messageWithPresence!.presence![0]).toBe(RecordOpType.Put)
			expect(messageWithPresence!.presence![1]).toBe(presenceRecord)
		})

		it('sends presence diffs for subsequent updates', () => {
			// Set initial presence
			presence.set(presenceRecord)
			vi.advanceTimersByTime(100)
			socket.clearSentMessages()

			// Update presence
			const updatedPresence = { ...presenceRecord, cursor: { x: 150, y: 250 } }
			presence.set(updatedPresence as TestRecord)
			vi.advanceTimersByTime(100)

			const messages = socket.getSentMessages()
			const pushMessages = messages.filter(
				(msg) => msg.type === 'push'
			) as TLPushRequest<TestRecord>[]
			const messageWithPresence = pushMessages.find((msg) => msg.presence)

			expect(messageWithPresence).toBeDefined()
			expect(messageWithPresence!.presence![0]).toBe(RecordOpType.Patch)
		})

		it('does not send presence when offline', () => {
			socket.mockConnectionStatus('offline')

			presence.set(presenceRecord)
			vi.advanceTimersByTime(100)

			expect(socket.getSentMessages()).toHaveLength(0)
		})
	})

	describe('Error Handling', () => {
		beforeEach(() => {
			client = createClient()
		})

		it('handles rebase errors gracefully', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			// Connect first
			socket.mockServerMessage(createConnectMessage())

			// Simulate a corrupted message that causes rebase to fail
			const malformedMessage: TLSocketServerSentDataEvent<TestRecord> = {
				type: 'push_result',
				action: 'commit',
				serverClock: 2,
				clientClock: 999999, // Non-existent client clock
			}

			socket.mockServerMessage({
				type: 'data',
				data: [malformedMessage],
			})

			vi.advanceTimersByTime(100)

			expect(consoleSpy).toHaveBeenCalled()
			consoleSpy.mockRestore()
		})

		it('handles store corruption recovery', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			// Connect first
			socket.mockServerMessage(createConnectMessage())

			// Clear initial messages
			socket.clearSentMessages()

			// Mock store as corrupted
			vi.spyOn(store, 'isPossiblyCorrupted').mockReturnValue(true)

			// Try to make a change
			const pageId = PageRecordType.createId()
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test',
					index: 'a1' as any,
				}),
			])

			vi.advanceTimersByTime(100)

			// Should not send new messages when store is corrupted
			expect(socket.getSentMessages()).toHaveLength(0)

			consoleSpy.mockRestore()
		})

		it('handles didCancel function', () => {
			const didCancel = vi.fn(() => true)
			client = createClient({ didCancel })

			// Make a change that would trigger cancellation
			const pageId = PageRecordType.createId()
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test',
					index: 'a1' as any,
				}),
			])

			expect(didCancel).toHaveBeenCalled()
		})
	})

	describe('Cleanup and Disposal', () => {
		beforeEach(() => {
			client = createClient()
		})

		it('properly cleans up resources on close', () => {
			client.close()

			// Should not throw errors after close
			expect(() => {
				const pageId = PageRecordType.createId()
				store.put([
					PageRecordType.create({
						id: pageId,
						name: 'Test',
						index: 'a1' as any,
					}),
				])
				vi.advanceTimersByTime(100)
			}).not.toThrow()
		})

		it('cancels throttled functions on close', () => {
			// Reset and ensure we're connected
			socket.clearSentMessages()

			const pageId = PageRecordType.createId()
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test',
					index: 'a1' as any,
				}),
			])

			// Close before throttle resolves
			client.close()

			// Should not send new messages after close (except the connect message that was already sent)
			const messagesBefore = socket.getSentMessages().length
			vi.advanceTimersByTime(100)
			expect(socket.getSentMessages().length).toBe(messagesBefore)
		})
	})

	describe('Connection Recovery', () => {
		beforeEach(() => {
			client = createClient()
		})

		it('handles reconnection with speculative changes', () => {
			// Connect initially
			socket.mockServerMessage(createConnectMessage())

			// Make local changes while online
			const pageId = PageRecordType.createId()
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test',
					index: 'a1' as any,
				}),
			])

			// Go offline
			socket.mockConnectionStatus('offline')

			// Make more changes while offline
			store.update(pageId, (p) => ({ ...p, name: 'Updated Offline' }))

			// Reconnect
			socket.mockConnectionStatus('online')

			// Should send a new connect message
			expect(socket.getSentMessages().some((msg) => msg.type === 'connect')).toBe(true)
		})

		it('handles wipe_all reconnection', () => {
			// Connect initially with some data
			const pageId = PageRecordType.createId()
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test',
					index: 'a1' as any,
				}),
			])

			socket.mockServerMessage(
				createConnectMessage({
					diff: {
						[TLDOCUMENT_ID]: [
							RecordOpType.Put,
							DocumentRecordType.create({
								id: TLDOCUMENT_ID,
								gridSize: 20,
							}),
						],
					},
				})
			)

			// Should apply server data
			const doc = store.get(TLDOCUMENT_ID)
			expect(doc?.gridSize).toBe(20)
		})
	})

	describe('Complex Scenarios', () => {
		beforeEach(() => {
			client = createClient()
			// Connect first
			socket.mockServerMessage(createConnectMessage())
			socket.clearSentMessages()
		})

		it('handles rapid connection state changes', () => {
			// Rapidly change connection states
			socket.mockConnectionStatus('offline')
			socket.mockConnectionStatus('online')
			socket.mockConnectionStatus('error', 'Test error')

			expect(onSyncError).toHaveBeenCalledWith('Test error')
		})

		it('handles multiple simultaneous presence and document changes', () => {
			// Set presence
			const presenceRecord = {
				id: 'presence:user1' as any,
				typeName: 'instance_presence',
				cursor: { x: 100, y: 200 },
			} as TestRecord

			presence.set(presenceRecord)

			// Make document changes
			const pageId = PageRecordType.createId()
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test',
					index: 'a1' as any,
				}),
			])

			vi.advanceTimersByTime(100)

			// Should send messages
			const messages = socket.getSentMessages()
			expect(messages.length).toBeGreaterThan(0)

			// Check if any push messages contain presence or document data
			const pushMessages = messages.filter(
				(msg) => msg.type === 'push'
			) as TLPushRequest<TestRecord>[]
			const hasPresenceOrDocument = pushMessages.some((msg) => msg.presence || msg.diff)
			expect(hasPresenceOrDocument).toBe(true)
		})

		it('handles server clock advancement correctly', () => {
			// Send multiple server messages with advancing clocks
			for (let i = 1; i <= 5; i++) {
				socket.mockServerMessage({
					type: 'data',
					data: [
						{
							type: 'patch',
							serverClock: i + 1,
							diff: {},
						},
					],
				})
			}

			vi.advanceTimersByTime(100)
			// Should track the latest server clock internally
		})
	})

	describe('Offline and Reconnection Behavior', () => {
		beforeEach(() => {
			client = createClient()
			socket.mockServerMessage(createConnectMessage())
			socket.clearSentMessages()
		})

		it('does not send changes made while offline', () => {
			// Go offline
			socket.mockConnectionStatus('offline')
			socket.clearSentMessages()

			// Make changes while offline
			const pageId = PageRecordType.createId()
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Offline Page',
					index: 'a1' as any,
				}),
			])

			vi.advanceTimersByTime(100)

			// Should not have sent any messages
			expect(socket.getSentMessages()).toHaveLength(0)

			// But the page should exist locally
			expect(store.has(pageId)).toBe(true)
		})

		it('re-applies offline changes after reconnection and pushes them to server', () => {
			// Make a change while offline - this is a truly speculative change
			socket.mockConnectionStatus('offline')
			socket.clearSentMessages()

			const pageId = PageRecordType.createId()
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Offline Page',
					index: 'a1' as any,
				}),
			])
			vi.advanceTimersByTime(100)

			// Page exists locally, no messages sent (offline)
			expect(store.has(pageId)).toBe(true)
			expect(socket.getSentMessages()).toHaveLength(0)

			// Come back online
			socket.mockConnectionStatus('online')

			// Get the connect message
			const connectMsg = socket.getSentMessages().find((m) => m.type === 'connect')
			expect(connectMsg).toBeDefined()

			// Clear messages before server response
			socket.clearSentMessages()

			// Server responds with wipe_all (simulating fresh sync)
			socket.mockServerMessage(
				createConnectMessage({
					connectRequestId: (connectMsg as any).connectRequestId,
					hydrationType: 'wipe_all',
					diff: {}, // Server has no pages
				})
			)
			vi.advanceTimersByTime(100)

			// The page should still exist locally
			expect(store.has(pageId)).toBe(true)
			expect(store.get(pageId)?.name).toBe('Offline Page')

			// The speculative change should have been pushed to the server
			const messages = socket.getSentMessages() as TLPushRequest<TestRecord>[]
			const pushWithPage = messages.find(
				(msg) => msg.type === 'push' && msg.diff && msg.diff[pageId]
			)
			expect(pushWithPage).toBeDefined()
			expect(pushWithPage!.diff![pageId][0]).toBe(RecordOpType.Put)
			expect((pushWithPage!.diff![pageId][1] as any).name).toBe('Offline Page')
		})
	})

	describe('Push Coalescing (Multiple push() calls → single network message)', () => {
		/**
		 * These tests verify that multiple store changes (each triggering push())
		 * get coalesced into a single TLPushRequest when the throttle fires.
		 *
		 * We enable RAF mode so the throttle actually delays execution,
		 * allowing changes to accumulate before sending.
		 */

		let rafCallbacks: Array<FrameRequestCallback>
		let rafId: number

		function flushOneRaf() {
			if (rafCallbacks.length > 0) {
				const callbacks = rafCallbacks.splice(0, rafCallbacks.length)
				const now = performance.now()
				for (const callback of callbacks) {
					callback(now)
				}
			}
		}

		function flushThrottle() {
			// FpsScheduler needs: advance time + flush RAF (potentially twice for tick + flush)
			// Also need to clear any stale callbacks and keep flushing until stable
			for (let i = 0; i < 10 && rafCallbacks.length > 0; i++) {
				vi.advanceTimersByTime(100)
				flushOneRaf()
			}
		}

		beforeEach(() => {
			// Reset timer to a known state to avoid pollution from previous tests
			vi.setSystemTime(0)

			// Force RAF behavior so throttle actually delays
			// @ts-expect-error - testing flag
			globalThis.__FORCE_RAF_IN_TESTS__ = true

			rafCallbacks = []
			rafId = 0

			vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
				const id = ++rafId
				rafCallbacks.push(callback)
				return id
			})

			vi.stubGlobal('cancelAnimationFrame', (_id: number) => {})

			// Create client with RAF mode enabled
			client = createClient()
			socket.mockServerMessage(createConnectMessage())

			// Flush initial setup and clear
			flushThrottle()
			socket.clearSentMessages()
		})

		afterEach(() => {
			// @ts-expect-error - testing flag
			delete globalThis.__FORCE_RAF_IN_TESTS__
			vi.unstubAllGlobals()
		})

		it('coalesces 5 store.put() calls into 1 push request', () => {
			expect((client as any).isConnectedToRoom).toBe(true)

			// Make 5 separate store changes synchronously
			const pageIds: string[] = []
			for (let i = 0; i < 5; i++) {
				const pageId = PageRecordType.createId()
				pageIds.push(pageId)
				store.put([
					PageRecordType.create({
						id: pageId,
						name: `Page ${i}`,
						index: `a${i}` as any,
					}),
				])
			}

			// Before throttle fires: no messages should be sent yet
			expect(socket.getSentMessages()).toHaveLength(0)

			// Flush the throttle
			flushThrottle()

			// Should have sent exactly ONE push request containing all 5 pages
			const messages = socket.getSentMessages() as TLPushRequest<TestRecord>[]
			expect(messages).toHaveLength(1)
			expect(messages[0].type).toBe('push')

			// The single message should contain all 5 page IDs
			const diff = messages[0].diff || {}
			expect(Object.keys(diff)).toHaveLength(5)
			for (const pageId of pageIds) {
				expect(diff[pageId]).toBeDefined()
			}
		})

		it('coalesces create + multiple updates into 1 push with final state', () => {
			expect((client as any).isConnectedToRoom).toBe(true)

			const pageId = PageRecordType.createId()

			// Create and update the same record multiple times synchronously
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Version 1',
					index: 'a1' as any,
				}),
			])
			store.update(pageId, (p) => ({ ...p, name: 'Version 2' }))
			store.update(pageId, (p) => ({ ...p, name: 'Version 3' }))
			store.update(pageId, (p) => ({ ...p, name: 'Final Version' }))

			// Before throttle fires: no messages
			expect(socket.getSentMessages()).toHaveLength(0)

			// Flush the throttle
			flushThrottle()

			// Should have exactly ONE push request
			const messages = socket.getSentMessages() as TLPushRequest<TestRecord>[]
			expect(messages).toHaveLength(1)

			// The diff should have the final state
			const diff = messages[0].diff!
			expect(diff[pageId]).toBeDefined()
			expect(diff[pageId][0]).toBe(RecordOpType.Put)
			expect((diff[pageId][1] as any).name).toBe('Final Version')
		})

		it('coalesces create + delete into no diff (cancels out)', () => {
			const pageId = PageRecordType.createId()

			// Create then immediately delete
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Ephemeral',
					index: 'a1' as any,
				}),
			])
			store.remove([pageId])

			// Before throttle fires: no messages
			expect(socket.getSentMessages()).toHaveLength(0)

			// Flush the throttle
			flushThrottle()

			// Either no message, or message with empty/no diff for this page
			const messages = socket.getSentMessages() as TLPushRequest<TestRecord>[]
			if (messages.length > 0) {
				const diff = messages[0].diff || {}
				// The page should NOT be in the diff (add + remove = no-op)
				expect(diff[pageId]).toBeUndefined()
			}
		})

		it('coalesces multiple presence updates into 1 push with final presence (first is Put)', () => {
			// Multiple presence updates synchronously - first presence ever sent
			presence.set({
				id: 'presence:u1' as any,
				typeName: 'instance_presence',
				cursor: { x: 0, y: 0 },
			} as any)
			presence.set({
				id: 'presence:u1' as any,
				typeName: 'instance_presence',
				cursor: { x: 50, y: 50 },
			} as any)
			presence.set({
				id: 'presence:u1' as any,
				typeName: 'instance_presence',
				cursor: { x: 100, y: 100 },
			} as any)

			// Before throttle fires: no messages
			expect(socket.getSentMessages()).toHaveLength(0)

			// Flush the throttle
			flushThrottle()

			// Should have exactly ONE push with final presence
			const messages = socket.getSentMessages() as TLPushRequest<TestRecord>[]
			expect(messages).toHaveLength(1)
			expect(messages[0].presence).toBeDefined()
			// First presence is always a Put (full record)
			expect(messages[0].presence![0]).toBe(RecordOpType.Put)
			expect((messages[0].presence![1] as any).cursor).toEqual({ x: 100, y: 100 })
		})

		it('sends subsequent presence updates as Patch after initial Put', () => {
			// Send initial presence
			presence.set({
				id: 'presence:u1' as any,
				typeName: 'instance_presence',
				cursor: { x: 0, y: 0 },
			} as any)
			flushThrottle()

			// Verify first presence was a Put
			const firstMessages = socket.getSentMessages() as TLPushRequest<TestRecord>[]
			expect(firstMessages).toHaveLength(1)
			expect(firstMessages[0].presence![0]).toBe(RecordOpType.Put)

			socket.clearSentMessages()

			// Now send multiple presence updates
			presence.set({
				id: 'presence:u1' as any,
				typeName: 'instance_presence',
				cursor: { x: 50, y: 50 },
			} as any)
			presence.set({
				id: 'presence:u1' as any,
				typeName: 'instance_presence',
				cursor: { x: 100, y: 100 },
			} as any)

			// Before throttle fires: no messages
			expect(socket.getSentMessages()).toHaveLength(0)

			// Flush the throttle
			flushThrottle()

			// Should have exactly ONE push with final presence as a Patch
			const messages = socket.getSentMessages() as TLPushRequest<TestRecord>[]
			expect(messages).toHaveLength(1)
			expect(messages[0].presence).toBeDefined()
			// Subsequent presence updates should be Patches (only changed fields)
			expect(messages[0].presence![0]).toBe(RecordOpType.Patch)
			// The patch should contain the cursor update
			expect((messages[0].presence![1] as any).cursor).toBeDefined()
		})

		it('coalesces document changes + presence into 1 push request', () => {
			const pageId = PageRecordType.createId()

			// Document change
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Test Page',
					index: 'a1' as any,
				}),
			])

			// Presence change
			presence.set({
				id: 'presence:u1' as any,
				typeName: 'instance_presence',
				cursor: { x: 42, y: 42 },
			} as any)

			// Before throttle fires: no messages
			expect(socket.getSentMessages()).toHaveLength(0)

			// Flush the throttle
			flushThrottle()

			// Should have exactly ONE push with both document and presence
			const messages = socket.getSentMessages() as TLPushRequest<TestRecord>[]
			expect(messages).toHaveLength(1)

			// Has document diff
			expect(messages[0].diff).toBeDefined()
			expect(messages[0].diff![pageId]).toBeDefined()

			// Has presence
			expect(messages[0].presence).toBeDefined()
		})
	})

	describe('Rebase Behavior', () => {
		beforeEach(() => {
			client = createClient()
			socket.mockServerMessage(createConnectMessage())
			socket.clearSentMessages()
		})

		it('preserves local changes when receiving server patches for other records', () => {
			// Make a local change
			const pageId = PageRecordType.createId()
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Local Page',
					index: 'a1' as any,
				}),
			])
			vi.advanceTimersByTime(100)

			// Receive a server patch for a different record
			const serverPageId = PageRecordType.createId()
			socket.mockServerMessage({
				type: 'data',
				data: [
					{
						type: 'patch',
						serverClock: 2,
						diff: {
							[serverPageId]: [
								RecordOpType.Put,
								PageRecordType.create({
									id: serverPageId,
									name: 'Server Page',
									index: 'a2' as any,
								}),
							],
						},
					},
				],
			})
			vi.advanceTimersByTime(100)

			// Both local and server pages should coexist
			expect(store.has(pageId)).toBe(true)
			expect(store.get(pageId)?.name).toBe('Local Page')
			expect(store.has(serverPageId)).toBe(true)
			expect(store.get(serverPageId)?.name).toBe('Server Page')
		})
	})

	describe('Solo Mode FPS Optimization', () => {
		it('does not send presence in solo mode', () => {
			presenceMode.set('solo')
			client = createClient()
			socket.mockServerMessage(createConnectMessage())
			socket.clearSentMessages()

			const presenceRecord = {
				id: 'presence:user1' as any,
				typeName: 'instance_presence',
				cursor: { x: 100, y: 200 },
			} as TestRecord
			presence.set(presenceRecord)

			vi.advanceTimersByTime(2000)

			// Should not have sent any presence updates
			const messages = socket.getSentMessages() as TLPushRequest<TestRecord>[]
			const presenceMessages = messages.filter((msg) => msg.presence)
			expect(presenceMessages).toHaveLength(0)
		})

		it('still sends document changes in solo mode', () => {
			presenceMode.set('solo')
			client = createClient()
			socket.mockServerMessage(createConnectMessage())
			socket.clearSentMessages()

			const pageId = PageRecordType.createId()
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Solo Page',
					index: 'a1' as any,
				}),
			])

			vi.advanceTimersByTime(2000)

			// Should have sent the document change
			const messages = socket.getSentMessages() as TLPushRequest<TestRecord>[]
			const docMessages = messages.filter((msg) => msg.diff && Object.keys(msg.diff).length > 0)
			expect(docMessages.length).toBeGreaterThan(0)
		})
	})

	describe('Edge Cases', () => {
		beforeEach(() => {
			client = createClient()
			socket.mockServerMessage(createConnectMessage())
			socket.clearSentMessages()
		})

		it('handles update-then-delete of server record correctly', () => {
			// Create a page via server
			const pageId = PageRecordType.createId()
			socket.mockServerMessage({
				type: 'data',
				data: [
					{
						type: 'patch',
						serverClock: 2,
						diff: {
							[pageId]: [
								RecordOpType.Put,
								PageRecordType.create({
									id: pageId,
									name: 'Server Page',
									index: 'a1' as any,
								}),
							],
						},
					},
				],
			})
			vi.advanceTimersByTime(100)
			socket.clearSentMessages()

			// Update then delete
			store.update(pageId, (p) => ({ ...p, name: 'Updated' }))
			vi.advanceTimersByTime(100)
			socket.clearSentMessages()

			store.remove([pageId])
			vi.advanceTimersByTime(100)

			// Page should not exist locally
			expect(store.has(pageId)).toBe(false)

			// Should have sent a remove operation
			const messages = socket.getSentMessages() as TLPushRequest<TestRecord>[]
			const removeMsg = messages.find(
				(msg) => msg.diff && msg.diff[pageId] && msg.diff[pageId][0] === RecordOpType.Remove
			)
			expect(removeMsg).toBeDefined()
		})

		it('handles delete-then-recreate of server record with same ID', () => {
			// Create a page via server
			const pageId = PageRecordType.createId()
			socket.mockServerMessage({
				type: 'data',
				data: [
					{
						type: 'patch',
						serverClock: 2,
						diff: {
							[pageId]: [
								RecordOpType.Put,
								PageRecordType.create({
									id: pageId,
									name: 'Original',
									index: 'a1' as any,
								}),
							],
						},
					},
				],
			})
			vi.advanceTimersByTime(100)
			socket.clearSentMessages()

			// Delete then recreate with same ID
			store.remove([pageId])
			store.put([
				PageRecordType.create({
					id: pageId,
					name: 'Recreated',
					index: 'a1' as any,
				}),
			])
			vi.advanceTimersByTime(100)

			// Page should exist with new name
			expect(store.has(pageId)).toBe(true)
			expect(store.get(pageId)?.name).toBe('Recreated')
		})

		it('sends patches (not full puts) for updates to server records', () => {
			// Create a page via server
			const pageId = PageRecordType.createId()
			socket.mockServerMessage({
				type: 'data',
				data: [
					{
						type: 'patch',
						serverClock: 2,
						diff: {
							[pageId]: [
								RecordOpType.Put,
								PageRecordType.create({
									id: pageId,
									name: 'Server Name',
									index: 'a1' as any,
								}),
							],
						},
					},
				],
			})
			vi.advanceTimersByTime(100)
			socket.clearSentMessages()

			// Local user updates only the name
			store.update(pageId, (p) => ({ ...p, name: 'Local Name' }))
			vi.advanceTimersByTime(100)

			// Should send a Patch operation (not Put)
			const messages = socket.getSentMessages() as TLPushRequest<TestRecord>[]
			const pushWithPage = messages.find((msg) => msg.diff && msg.diff[pageId])
			expect(pushWithPage).toBeDefined()

			const op = pushWithPage!.diff![pageId]
			expect(op[0]).toBe(RecordOpType.Patch)
			expect((op[1] as any).name).toBeDefined()
		})
	})
})
