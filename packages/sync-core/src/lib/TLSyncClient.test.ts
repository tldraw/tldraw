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
	TLSyncClient,
	TlSocketStatusChangeEvent,
} from './TLSyncClient'

// Mock store and schema setup
const schema = createTLSchema()
const protocolVersion = getTlsyncProtocolVersion()
type TestRecord = TLRecord

// Mock socket implementation for testing
class MockSocket implements TLPersistentClientSocket<TestRecord> {
	connectionStatus: 'online' | 'offline' | 'error' = 'offline'
	private messageListeners: Array<(msg: TLSocketServerSentEvent<TestRecord>) => void> = []
	private statusListeners: Array<(event: TlSocketStatusChangeEvent) => void> = []
	private sentMessages: TLSocketClientSentEvent<TestRecord>[] = []

	sendMessage(msg: TLSocketClientSentEvent<TestRecord>): void {
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

	onStatusChange(callback: (params: TlSocketStatusChangeEvent) => void) {
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

	private _notifyStatus(event: TlSocketStatusChangeEvent) {
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
})
