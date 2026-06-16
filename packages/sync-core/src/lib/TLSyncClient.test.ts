import { Atom, Signal, atom, computed } from '@tldraw/state'
import { BaseRecord, RecordId, Store, StoreSchema, createRecordType } from '@tldraw/store'
import {
	CameraRecordType,
	DocumentRecordType,
	InstancePresenceRecordType,
	PageRecordType,
	TLDOCUMENT_ID,
	TLRecord,
	createTLSchema,
} from '@tldraw/tlschema'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TestServer } from '../test/TestServer'
import { TestSocketPair } from '../test/TestSocketPair'
import { NetworkDiff, RecordOpType, ValueOpType } from './diff'
import {
	TLConnectRequest,
	TLPushRequest,
	TLSocketClientSentEvent,
	TLSocketServerSentEvent,
	getTlsyncProtocolVersion,
} from './protocol'
import {
	TLPersistentClientSocket,
	TLPresenceMode,
	TLSocketStatusChangeEvent,
	TLSyncClient,
} from './TLSyncClient'

// These tests express the rules in SPEC.md sections 19 (CL), 20 (CP), and 21 (CR).
// Each test name cites the rule(s) it expresses.

const schema = createTLSchema()
const protocolVersion = getTlsyncProtocolVersion()
type TestRecord = TLRecord

// Mock socket implementation for testing
class MockSocket implements TLPersistentClientSocket<
	TLSocketClientSentEvent<TestRecord>,
	TLSocketServerSentEvent<TestRecord>
> {
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

function makePage(name = 'Test Page', index = 'a1') {
	return PageRecordType.create({
		id: PageRecordType.createId(),
		name,
		index: index as any,
	})
}

function makePeerPresence() {
	return InstancePresenceRecordType.create({
		id: InstancePresenceRecordType.createId('peer'),
		userId: 'user:peer' as any,
		userName: 'Peer',
		currentPageId: 'page:main' as any,
	})
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

		// Add basic document and page records so the tldraw schema's integrity checker
		// has nothing to create on its own
		store.put([
			DocumentRecordType.create({
				id: TLDOCUMENT_ID,
				gridSize: 10,
			}),
			PageRecordType.create({
				id: PageRecordType.createId('page'),
				name: 'Page 1',
				index: 'a1' as any,
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
		client = undefined as any
		vi.useRealTimers()
		vi.clearAllMocks()
	})

	/**
	 * A server diff that mirrors the store's current document records. Using this as the default
	 * connect diff means a wipe_all hydration round-trips to no change, keeping the tldraw schema's
	 * integrity checker quiet (it would otherwise recreate the document/page records as new local
	 * changes).
	 */
	function documentScopeDiff(): NetworkDiff<TestRecord> {
		const diff: NetworkDiff<TestRecord> = {}
		for (const [id, record] of Object.entries(store.serialize('document'))) {
			diff[id] = [RecordOpType.Put, record as TestRecord]
		}
		return diff
	}

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
			diff: documentScopeDiff(),
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

	/** Create a client, complete the connect handshake, and clear the sent messages. */
	function connectClient(
		overrides: Partial<Extract<TLSocketServerSentEvent<TestRecord>, { type: 'connect' }>> = {}
	) {
		client = createClient()
		socket.mockServerMessage(createConnectMessage(overrides))
		socket.clearSentMessages()
	}

	function getSentPushes() {
		return socket.getSentMessages().filter((m): m is TLPushRequest<TestRecord> => m.type === 'push')
	}

	describe('19. connection lifecycle (CL)', () => {
		it('[CL1] sends a connect message immediately when the socket is already online at construction', () => {
			client = createClient()
			expect(socket.getSentMessages()).toHaveLength(1)
			expect(socket.getLastSentMessage().type).toBe('connect')
		})

		it('[CL1] sends the connect message when the socket first reports online', () => {
			socket.connectionStatus = 'offline'
			client = createClient()
			expect(socket.getSentMessages()).toHaveLength(0)

			socket.mockConnectionStatus('online')
			expect(socket.getSentMessages()).toHaveLength(1)
			expect(socket.getLastSentMessage().type).toBe('connect')
		})

		it('[CL2] connect message carries a fresh request id, the serialized schema, protocol version 8, and lastServerClock -1', () => {
			client = createClient()
			const msg = socket.getLastSentMessage() as TLConnectRequest
			expect(msg.type).toBe('connect')
			expect(msg.connectRequestId).toBe(client.latestConnectRequestId)
			expect(msg.schema).toEqual(schema.serialize())
			expect(msg.protocolVersion).toBe(8)
			expect(msg.protocolVersion).toBe(getTlsyncProtocolVersion())
			expect(msg.lastServerClock).toBe(-1)
		})

		it('[CL2] generates a new unique connectRequestId for each connection attempt', () => {
			client = createClient()
			const first = (socket.getLastSentMessage() as TLConnectRequest).connectRequestId

			socket.mockConnectionStatus('offline')
			socket.mockConnectionStatus('online')

			const second = (socket.getLastSentMessage() as TLConnectRequest).connectRequestId
			expect(second).toBeDefined()
			expect(second).not.toBe(first)
			expect(second).toBe(client.latestConnectRequestId)
		})

		it('[CL3] fires onLoad on the first message received from the server, of any type', () => {
			client = createClient()
			expect(onLoad).not.toHaveBeenCalled()

			// even a pong counts as the first server message
			socket.mockServerMessage({ type: 'pong' })
			expect(onLoad).toHaveBeenCalledTimes(1)
			expect(onLoad).toHaveBeenCalledWith(client)

			// it only fires once
			socket.mockServerMessage(createConnectMessage())
			expect(onLoad).toHaveBeenCalledTimes(1)
		})

		it('[CL4] ignores a connect response with a stale connectRequestId', () => {
			client = createClient()

			socket.mockServerMessage(createConnectMessage({ connectRequestId: 'stale-request-id' }))
			expect(client.isConnectedToRoom).toBe(false)
			expect(onAfterConnect).not.toHaveBeenCalled()

			// the matching response still works afterwards
			socket.mockServerMessage(createConnectMessage())
			expect(client.isConnectedToRoom).toBe(true)
			expect(onAfterConnect).toHaveBeenCalledTimes(1)
		})

		it('[CL5][CP3] wipe_presence reconnect keeps confirmed documents and re-pushes speculative changes', () => {
			connectClient()

			// a server-confirmed document record
			const serverPage = makePage('Server Page', 'a2')
			socket.mockServerMessage({
				type: 'data',
				data: [
					{
						type: 'patch',
						serverClock: 2,
						diff: { [serverPage.id]: [RecordOpType.Put, serverPage] },
					},
				],
			})
			vi.advanceTimersByTime(100)

			// speculative change made while offline
			socket.mockConnectionStatus('offline')
			const localPage = makePage('Offline Page')
			store.put([localPage])
			vi.advanceTimersByTime(100)

			socket.mockConnectionStatus('online')
			socket.clearSentMessages()
			socket.mockServerMessage(
				createConnectMessage({ hydrationType: 'wipe_presence', serverClock: 2, diff: {} })
			)
			vi.advanceTimersByTime(100)

			// confirmed server data is kept (not wiped, unlike wipe_all)
			expect(store.get(serverPage.id)).toEqual(serverPage)
			// the speculative change is re-applied on top
			expect(store.get(localPage.id)?.name).toBe('Offline Page')
			// and pushed as a new push request
			const pushWithPage = getSentPushes().find((msg) => msg.diff?.[localPage.id])
			expect(pushWithPage).toBeDefined()
			expect(pushWithPage!.diff![localPage.id][0]).toBe(RecordOpType.Put)
		})

		it('[CL6] wipe_all reconnect wipes document records before applying the server diff', () => {
			client = createClient()

			const serverDoc = DocumentRecordType.create({ id: TLDOCUMENT_ID, gridSize: 20 })
			const serverPage = makePage('Server Page')
			socket.mockServerMessage(
				createConnectMessage({
					diff: {
						[TLDOCUMENT_ID]: [RecordOpType.Put, serverDoc],
						[serverPage.id]: [RecordOpType.Put, serverPage],
					},
				})
			)
			// the wipe_all hydration replaced the local document state with the server's
			expect((store.get(TLDOCUMENT_ID) as any)?.gridSize).toBe(20)

			// another server-confirmed page arrives
			const extraPage = makePage('Extra Page', 'a2')
			socket.mockServerMessage({
				type: 'data',
				data: [
					{
						type: 'patch',
						serverClock: 2,
						diff: { [extraPage.id]: [RecordOpType.Put, extraPage] },
					},
				],
			})
			vi.advanceTimersByTime(100)
			expect(store.has(extraPage.id)).toBe(true)

			socket.mockConnectionStatus('offline')
			socket.mockConnectionStatus('online')
			socket.clearSentMessages()

			// the server's wipe_all diff no longer contains the extra page
			socket.mockServerMessage(
				createConnectMessage({
					hydrationType: 'wipe_all',
					serverClock: 3,
					diff: {
						[TLDOCUMENT_ID]: [RecordOpType.Put, serverDoc],
						[serverPage.id]: [RecordOpType.Put, serverPage],
					},
				})
			)
			vi.advanceTimersByTime(100)

			expect(store.has(extraPage.id)).toBe(false)
			expect(store.get(TLDOCUMENT_ID)).toEqual(serverDoc)
			expect(store.get(serverPage.id)).toEqual(serverPage)
		})

		it('[CL6][CP3] re-applies offline changes after a wipe_all reconnect and pushes them to the server', () => {
			client = createClient()
			socket.mockServerMessage(createConnectMessage())
			socket.clearSentMessages()

			// make a change while offline - this is a truly speculative change
			socket.mockConnectionStatus('offline')
			socket.clearSentMessages()

			const pageId = PageRecordType.createId()
			store.put([PageRecordType.create({ id: pageId, name: 'Offline Page', index: 'a1' as any })])
			vi.advanceTimersByTime(100)

			// page exists locally, no messages sent (offline)
			expect(store.has(pageId)).toBe(true)
			expect(socket.getSentMessages()).toHaveLength(0)

			// come back online
			socket.mockConnectionStatus('online')
			const connectMsg = socket.getSentMessages().find((m) => m.type === 'connect')
			expect(connectMsg).toBeDefined()
			socket.clearSentMessages()

			// server responds with wipe_all (simulating fresh sync)
			socket.mockServerMessage(
				createConnectMessage({
					connectRequestId: (connectMsg as TLConnectRequest).connectRequestId,
					hydrationType: 'wipe_all',
					diff: {}, // server has no pages
				})
			)
			vi.advanceTimersByTime(100)

			// the page should still exist locally
			expect(store.has(pageId)).toBe(true)
			expect(store.get(pageId)?.name).toBe('Offline Page')

			// the speculative change should have been pushed to the server
			const pushWithPage = getSentPushes().find((msg) => msg.diff?.[pageId])
			expect(pushWithPage).toBeDefined()
			expect(pushWithPage!.diff![pageId][0]).toBe(RecordOpType.Put)
			expect((pushWithPage!.diff![pageId][1] as any).name).toBe('Offline Page')
		})

		it('[CL7] calls onAfterConnect with the isReadonly flag from the connect message', () => {
			client = createClient()
			socket.mockServerMessage(createConnectMessage({ isReadonly: false }))
			expect(client.isConnectedToRoom).toBe(true)
			expect(onAfterConnect).toHaveBeenCalledWith(client, { isReadonly: false })

			// reconnect as readonly
			socket.mockConnectionStatus('offline')
			socket.mockConnectionStatus('online')
			socket.mockServerMessage(createConnectMessage({ isReadonly: true }))
			expect(onAfterConnect).toHaveBeenLastCalledWith(client, { isReadonly: true })
		})

		it('[CL7] pushes the current presence state after connecting', () => {
			client = createClient()
			const presenceRecord = {
				id: 'presence:user1' as any,
				typeName: 'instance_presence',
				cursor: { x: 100, y: 200 },
			} as TestRecord
			presence.set(presenceRecord)
			socket.clearSentMessages()

			socket.mockServerMessage(createConnectMessage())

			const pushWithPresence = getSentPushes().find((msg) => msg.presence)
			expect(pushWithPresence).toBeDefined()
			expect(pushWithPresence!.presence).toEqual([RecordOpType.Put, presenceRecord])
		})

		it('[CL8] removes presence records from the store when the socket goes offline', () => {
			connectClient()

			const peerPresence = makePeerPresence()
			socket.mockServerMessage({
				type: 'data',
				data: [
					{
						type: 'patch',
						serverClock: 2,
						diff: { [peerPresence.id]: [RecordOpType.Put, peerPresence] },
					},
				],
			})
			vi.advanceTimersByTime(100)
			expect(store.has(peerPresence.id)).toBe(true)

			socket.mockConnectionStatus('offline')
			expect(client.isConnectedToRoom).toBe(false)
			expect(store.has(peerPresence.id)).toBe(false)
		})

		it('[CL8] drops pending pushes when going offline and re-pushes the speculative diff after reconnect', () => {
			connectClient()

			// an in-flight (pending, unacknowledged) push
			const page = makePage()
			store.put([page])
			vi.advanceTimersByTime(100)
			expect(getSentPushes()).toHaveLength(1)

			socket.mockConnectionStatus('offline')
			socket.mockConnectionStatus('online')
			socket.clearSentMessages()

			const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
			socket.mockServerMessage(
				createConnectMessage({ hydrationType: 'wipe_presence', serverClock: 2, diff: {} })
			)
			vi.advanceTimersByTime(100)

			// the pending push queue was emptied by the reset (no internal error logged)
			expect(errorSpy).not.toHaveBeenCalled()
			expect(client.isConnectedToRoom).toBe(true)
			// the still-speculative change is pushed again
			const pushWithPage = getSentPushes().find((msg) => msg.diff?.[page.id])
			expect(pushWithPage).toBeDefined()
			errorSpy.mockRestore()
		})

		it('[CL8] fires onSyncError and closes permanently when the socket reports an error', () => {
			client = createClient()
			expect((globalThis as any).tlsync).toBe(client)

			socket.mockConnectionStatus('error', 'Connection failed')

			expect(onSyncError).toHaveBeenCalledWith('Connection failed')
			// the client closed itself
			expect((globalThis as any).tlsync).toBeUndefined()
		})

		it('[CL8] handles rapid connection status changes ending in an error', () => {
			connectClient()
			socket.mockConnectionStatus('offline')
			socket.mockConnectionStatus('online')
			socket.mockConnectionStatus('error', 'Test error')
			expect(onSyncError).toHaveBeenCalledWith('Test error')
		})

		it('[CL9] sends a ping every 5 seconds while connected', () => {
			client = createClient()
			socket.clearSentMessages()

			// no pings before the room connection is established
			vi.advanceTimersByTime(5000)
			expect(socket.getSentMessages()).toHaveLength(0)

			socket.mockServerMessage(createConnectMessage())
			socket.clearSentMessages()

			vi.advanceTimersByTime(5000)
			expect(socket.getSentMessages().filter((m) => m.type === 'ping')).toHaveLength(1)

			// keep the connection healthy and observe the next ping
			socket.mockServerMessage({ type: 'pong' })
			vi.advanceTimersByTime(5000)
			expect(socket.getSentMessages().filter((m) => m.type === 'ping')).toHaveLength(2)
		})

		it('[CL9] warns and resets the connection after 10 seconds without server interaction', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
			client = createClient()
			socket.mockServerMessage(createConnectMessage())

			// advance time beyond the health check threshold
			vi.advanceTimersByTime(15000)

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Haven't heard from the server in a while")
			)
			expect(client.isConnectedToRoom).toBe(false)

			consoleSpy.mockRestore()
		})

		it('[CL10] a pong refreshes the server interaction timestamp and defers the health reset', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
			client = createClient()
			socket.mockServerMessage(createConnectMessage())

			vi.advanceTimersByTime(6000)
			socket.mockServerMessage({ type: 'pong' })

			// at t=10s the health check passes because the pong was only 4s ago
			vi.advanceTimersByTime(4000)
			expect(client.isConnectedToRoom).toBe(true)

			// at t=20s nothing has been heard since the pong, so the connection resets
			vi.advanceTimersByTime(10000)
			expect(client.isConnectedToRoom).toBe(false)

			consoleSpy.mockRestore()
		})

		it('[CL11] closes instead of processing the next event when didCancel returns true', () => {
			let cancelled = false
			client = createClient({ didCancel: () => cancelled })
			socket.mockServerMessage(createConnectMessage())
			expect((globalThis as any).tlsync).toBe(client)

			cancelled = true
			socket.mockServerMessage({ type: 'pong' })

			// the client closed itself instead of processing the event
			expect((globalThis as any).tlsync).toBeUndefined()
		})

		it('[CL12] construction installs window.tlsync and close removes it', () => {
			client = createClient()
			expect((globalThis as any).tlsync).toBe(client)
			client.close()
			expect((globalThis as any).tlsync).toBeUndefined()
		})

		it('[CL12] close disposes store listeners and timers', () => {
			connectClient()
			client.close()

			// no pushes for store changes, and no pings, after close
			expect(() => {
				store.put([makePage()])
				vi.advanceTimersByTime(20000)
			}).not.toThrow()
			expect(socket.getSentMessages()).toHaveLength(0)
		})

		it('[CL13] logs incompatibility_error messages without closing or raising a sync error', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
			connectClient()

			socket.mockServerMessage({ type: 'incompatibility_error', reason: 'clientTooOld' })

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('incompatibility error is legacy')
			)
			expect(onSyncError).not.toHaveBeenCalled()
			expect(client.isConnectedToRoom).toBe(true)

			consoleSpy.mockRestore()
		})
	})

	describe('20. pushing changes (CP)', () => {
		it('[CP1] pushes user changes to document-scope records', () => {
			connectClient()

			const page = makePage()
			store.put([page])
			vi.advanceTimersByTime(100)

			const pushes = getSentPushes()
			expect(pushes).toHaveLength(1)
			expect(pushes[0].diff).toBeDefined()
			expect(pushes[0].diff![page.id]).toBeDefined()
		})

		it('[CP1] does not push changes made with a remote source', () => {
			connectClient()

			const page = makePage()
			store.mergeRemoteChanges(() => {
				store.put([page])
			})
			vi.advanceTimersByTime(100)

			expect(store.has(page.id)).toBe(true)
			expect(socket.getSentMessages()).toHaveLength(0)
		})

		it('[CP1] does not push changes to non-document-scope records', () => {
			connectClient()

			// camera records are session-scoped
			store.put([CameraRecordType.create({ id: CameraRecordType.createId() })])
			vi.advanceTimersByTime(100)

			expect(socket.getSentMessages()).toHaveLength(0)
		})

		it('[CP3] accumulates changes while offline without sending anything', () => {
			connectClient()
			socket.mockConnectionStatus('offline')
			socket.clearSentMessages()

			const page = makePage('Offline Page')
			store.put([page])
			vi.advanceTimersByTime(100)

			expect(socket.getSentMessages()).toHaveLength(0)
			// but the page exists locally
			expect(store.has(page.id)).toBe(true)
		})

		it('[CP4] increments the client clock by exactly one per sent push', () => {
			connectClient()

			store.put([makePage('One', 'a1')])
			vi.advanceTimersByTime(100)
			store.put([makePage('Two', 'a2')])
			vi.advanceTimersByTime(100)
			store.put([makePage('Three', 'a3')])
			vi.advanceTimersByTime(100)

			const pushes = getSentPushes()
			expect(pushes.map((p) => p.clientClock)).toEqual([0, 1, 2])
		})

		it('[CP5] sends the first presence as a put and subsequent presence as patches', () => {
			connectClient()
			const presenceRecord = {
				id: 'presence:user1' as any,
				typeName: 'instance_presence',
				cursor: { x: 100, y: 200 },
				userName: 'Test User',
			} as TestRecord

			presence.set(presenceRecord)
			vi.advanceTimersByTime(100)

			const firstPush = getSentPushes().find((msg) => msg.presence)
			expect(firstPush).toBeDefined()
			expect(firstPush!.presence).toEqual([RecordOpType.Put, presenceRecord])
			socket.clearSentMessages()

			const updatedPresence = { ...presenceRecord, cursor: { x: 150, y: 250 } } as TestRecord
			presence.set(updatedPresence)
			vi.advanceTimersByTime(100)

			const secondPush = getSentPushes().find((msg) => msg.presence)
			expect(secondPush).toBeDefined()
			// the patch is a diff against the last pushed state
			expect(secondPush!.presence![0]).toBe(RecordOpType.Patch)
			expect(secondPush!.presence![1]).toEqual({ cursor: [ValueOpType.Put, { x: 150, y: 250 }] })
		})

		it('[CP5] sends nothing when the presence state is unchanged', () => {
			connectClient()
			const presenceRecord = {
				id: 'presence:user1' as any,
				typeName: 'instance_presence',
				cursor: { x: 100, y: 200 },
			} as TestRecord

			presence.set(presenceRecord)
			vi.advanceTimersByTime(100)
			expect(getSentPushes()).toHaveLength(1)
			socket.clearSentMessages()

			// a deep-equal copy produces no diff and therefore no push
			presence.set({ ...presenceRecord, cursor: { x: 100, y: 200 } } as any)
			vi.advanceTimersByTime(100)
			expect(socket.getSentMessages()).toHaveLength(0)
		})

		it('[CP5] re-puts presence in full after a reconnect', () => {
			connectClient()
			const presenceRecord = {
				id: 'presence:user1' as any,
				typeName: 'instance_presence',
				cursor: { x: 1, y: 1 },
			} as TestRecord

			presence.set(presenceRecord)
			vi.advanceTimersByTime(100)
			const updatedPresence = { ...presenceRecord, cursor: { x: 2, y: 2 } } as TestRecord
			presence.set(updatedPresence)
			vi.advanceTimersByTime(100)
			// sanity: we are in patch mode by now
			expect(getSentPushes().at(-1)!.presence![0]).toBe(RecordOpType.Patch)

			socket.mockConnectionStatus('offline')
			socket.mockConnectionStatus('online')
			socket.clearSentMessages()
			socket.mockServerMessage(
				createConnectMessage({ hydrationType: 'wipe_presence', serverClock: 2, diff: {} })
			)
			vi.advanceTimersByTime(100)

			const pushWithPresence = getSentPushes().find((msg) => msg.presence)
			expect(pushWithPresence).toBeDefined()
			expect(pushWithPresence!.presence).toEqual([RecordOpType.Put, updatedPresence])
		})

		it('[CP6] does not push presence in solo mode', () => {
			presenceMode.set('solo')
			connectClient()

			presence.set({
				id: 'presence:user1' as any,
				typeName: 'instance_presence',
				cursor: { x: 100, y: 200 },
			} as TestRecord)
			vi.advanceTimersByTime(2000)

			expect(getSentPushes().filter((msg) => msg.presence)).toHaveLength(0)
		})

		it('[CP6] still pushes document changes in solo mode', () => {
			presenceMode.set('solo')
			connectClient()

			const page = makePage('Solo Page')
			store.put([page])
			vi.advanceTimersByTime(2000)

			const docPushes = getSentPushes().filter((msg) => msg.diff?.[page.id])
			expect(docPushes.length).toBeGreaterThan(0)
		})

		it('[CP6] drops the network throttle from 30fps to 1fps in solo mode', () => {
			client = createClient()
			expect((client as any).fpsScheduler.targetFps).toBe(30)

			presenceMode.set('solo')
			expect((client as any).fpsScheduler.targetFps).toBe(1)

			presenceMode.set('full')
			expect((client as any).fpsScheduler.targetFps).toBe(30)
		})

		it('[CP7] stops sending pushes when the store reports possible corruption', () => {
			connectClient()
			vi.spyOn(store, 'isPossiblyCorrupted').mockReturnValue(true)

			store.put([makePage()])
			vi.advanceTimersByTime(100)

			expect(socket.getSentMessages()).toHaveLength(0)
		})

		describe('push coalescing (multiple push() calls become a single network message)', () => {
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

			it('[CP2] coalesces 5 store.put() calls into 1 push request', () => {
				expect(client.isConnectedToRoom).toBe(true)

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
				const messages = getSentPushes()
				expect(messages).toHaveLength(1)
				expect(messages[0].type).toBe('push')

				// The single message should contain all 5 page IDs
				const diff = messages[0].diff || {}
				expect(Object.keys(diff)).toHaveLength(5)
				for (const pageId of pageIds) {
					expect(diff[pageId]).toBeDefined()
				}
			})

			it('[CP2] coalesces create + multiple updates into 1 push with the final state', () => {
				expect(client.isConnectedToRoom).toBe(true)

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
				const messages = getSentPushes()
				expect(messages).toHaveLength(1)

				// The diff should have the final state
				const diff = messages[0].diff!
				expect(diff[pageId]).toBeDefined()
				expect(diff[pageId][0]).toBe(RecordOpType.Put)
				expect((diff[pageId][1] as any).name).toBe('Final Version')
			})

			it('[CP2] coalesces create + delete into no push at all (changes cancel out)', () => {
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

				// add + remove = no-op, so nothing is sent
				expect(socket.getSentMessages()).toHaveLength(0)
			})

			it('[CP2][CP5] coalesces multiple presence updates into 1 push with the final presence (first is put)', () => {
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
				const messages = getSentPushes()
				expect(messages).toHaveLength(1)
				expect(messages[0].presence).toBeDefined()
				// First presence is always a Put (full record)
				expect(messages[0].presence![0]).toBe(RecordOpType.Put)
				expect((messages[0].presence![1] as any).cursor).toEqual({ x: 100, y: 100 })
			})

			it('[CP2][CP5] sends subsequent presence updates as patch after the initial put', () => {
				// Send initial presence
				presence.set({
					id: 'presence:u1' as any,
					typeName: 'instance_presence',
					cursor: { x: 0, y: 0 },
				} as any)
				flushThrottle()

				// Verify first presence was a Put
				const firstMessages = getSentPushes()
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
				const messages = getSentPushes()
				expect(messages).toHaveLength(1)
				expect(messages[0].presence).toBeDefined()
				// Subsequent presence updates should be Patches (only changed fields)
				expect(messages[0].presence![0]).toBe(RecordOpType.Patch)
				// The patch should contain the cursor update
				expect((messages[0].presence![1] as any).cursor).toBeDefined()
			})

			it('[CP2][CP5] coalesces document changes + presence into 1 push request', () => {
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
				const messages = getSentPushes()
				expect(messages).toHaveLength(1)

				// Has document diff
				expect(messages[0].diff).toBeDefined()
				expect(messages[0].diff![pageId]).toBeDefined()

				// Has presence
				expect(messages[0].presence).toBeDefined()
			})
		})

		describe('presence mode integration with a real server', () => {
			interface IntegrationUser extends BaseRecord<'user', RecordId<IntegrationUser>> {
				name: string
				age: number
			}

			interface IntegrationPresence extends BaseRecord<'presence', RecordId<IntegrationPresence>> {
				name: string
				age: number
			}

			const IntegrationPresenceType = createRecordType<IntegrationPresence>('presence', {
				scope: 'presence',
				validator: { validate: (value) => value as IntegrationPresence },
			})

			const IntegrationUserType = createRecordType<IntegrationUser>('user', {
				scope: 'document',
				validator: { validate: (value) => value as IntegrationUser },
			})

			type R = IntegrationUser | IntegrationPresence

			const integrationSchema = StoreSchema.create<R>({
				user: IntegrationUserType,
				presence: IntegrationPresenceType,
			})

			const disposables: Array<() => void> = []

			afterEach(() => {
				for (const dispose of disposables) {
					dispose()
				}
				disposables.length = 0
			})

			class TestInstance {
				server: TestServer<R>
				socketPair: TestSocketPair<R>
				client: TLSyncClient<R>

				hasLoaded = false

				constructor(
					presenceSignal: Signal<IntegrationPresence | null>,
					presenceMode?: 'solo' | 'full'
				) {
					this.server = new TestServer(integrationSchema)
					this.socketPair = new TestSocketPair('test_presence_mode', this.server)
					this.socketPair.connect()

					this.client = new TLSyncClient<R>({
						store: new Store({ schema: integrationSchema, props: {} }),
						socket: this.socketPair.clientSocket,
						onLoad: () => {
							this.hasLoaded = true
						},
						onSyncError: vi.fn((reason) => {
							throw new Error('onSyncError: ' + reason)
						}),
						presence: presenceSignal,
						presenceMode: presenceMode ? computed('', () => presenceMode) : undefined,
					})

					disposables.push(() => {
						this.client.close()
					})
				}

				flush() {
					this.server.flushDebouncingMessages()

					while (this.socketPair.getNeedsFlushing()) {
						this.socketPair.flushClientSentEvents()
						this.socketPair.flushServerSentEvents()
					}
				}
			}

			it('[CP5] presence updates reach the server presence store when mode is full', () => {
				const presence = IntegrationPresenceType.create({ name: 'bob', age: 10 })
				const presenceSignal = atom('', presence)

				const t = new TestInstance(presenceSignal, 'full')
				t.socketPair.connect()
				t.flush()

				const session = t.server.room.sessions.values().next().value
				expect(session).toBeDefined()
				expect(session?.presenceId).toBeDefined()
				expect(t.server.room.presenceStore.get(session!.presenceId!)).toMatchObject({
					name: 'bob',
					age: 10,
				})

				presenceSignal.set(IntegrationPresenceType.create({ name: 'bob', age: 11 }))
				t.flush()
				expect(t.server.room.presenceStore.get(session!.presenceId!)).toMatchObject({
					name: 'bob',
					age: 11,
				})

				presenceSignal.set(IntegrationPresenceType.create({ name: 'bob', age: 12 }))
				t.flush()
				expect(t.server.room.presenceStore.get(session!.presenceId!)).toMatchObject({
					name: 'bob',
					age: 12,
				})
			})

			it('[CP6] presence is only pushed once on connect when mode is solo', () => {
				const presence = IntegrationPresenceType.create({ name: 'bob', age: 10 })
				const presenceSignal = atom('', presence)

				const t = new TestInstance(presenceSignal, 'solo')
				t.socketPair.connect()
				t.flush()

				const session = t.server.room.sessions.values().next().value
				expect(session).toBeDefined()
				expect(session?.presenceId).toBeDefined()
				expect(t.server.room.presenceStore.get(session!.presenceId!)).toMatchObject({
					name: 'bob',
					age: 10,
				})

				presenceSignal.set(IntegrationPresenceType.create({ name: 'bob', age: 11 }))
				t.flush()
				expect(t.server.room.presenceStore.get(session!.presenceId!)).not.toMatchObject({
					name: 'bob',
					age: 11,
				})

				presenceSignal.set(IntegrationPresenceType.create({ name: 'bob', age: 12 }))
				t.flush()
				expect(t.server.room.presenceStore.get(session!.presenceId!)).not.toMatchObject({
					name: 'bob',
					age: 12,
				})
			})
		})
	})

	describe('21. receiving and rebasing (CR)', () => {
		it('[CR1] drops data events that arrive before the room connection is established', () => {
			client = createClient()

			const page = makePage('Early Page')
			socket.mockServerMessage({
				type: 'data',
				data: [{ type: 'patch', serverClock: 5, diff: { [page.id]: [RecordOpType.Put, page] } }],
			})
			vi.advanceTimersByTime(100)
			expect(store.has(page.id)).toBe(false)

			// the event was dropped entirely, not buffered until the connect succeeds
			socket.mockServerMessage(createConnectMessage())
			vi.advanceTimersByTime(100)
			expect(client.isConnectedToRoom).toBe(true)
			expect(store.has(page.id)).toBe(false)
		})

		it('[CR1] processes legacy top-level patch events like buffered data events', () => {
			connectClient()

			const page = makePage('Legacy Page')
			socket.mockServerMessage({
				type: 'patch',
				serverClock: 2,
				diff: { [page.id]: [RecordOpType.Put, page] },
			})
			vi.advanceTimersByTime(100)

			expect(store.get(page.id)).toEqual(page)
		})

		it('[CR2] preserves local speculative changes when the server patches other records', () => {
			connectClient()

			// make a local change
			const pageId = PageRecordType.createId()
			store.put([PageRecordType.create({ id: pageId, name: 'Local Page', index: 'a1' as any })])
			vi.advanceTimersByTime(100)

			// receive a server patch for a different record
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

			// both local and server pages should coexist
			expect(store.get(pageId)?.name).toBe('Local Page')
			expect(store.get(serverPageId)?.name).toBe('Server Page')
		})

		it('[CR2] does not generate new push requests for changes applied during a rebase', () => {
			connectClient()

			const serverPage = makePage('Server Page')
			socket.mockServerMessage({
				type: 'data',
				data: [
					{
						type: 'patch',
						serverClock: 2,
						diff: { [serverPage.id]: [RecordOpType.Put, serverPage] },
					},
				],
			})
			vi.advanceTimersByTime(100)

			expect(store.has(serverPage.id)).toBe(true)
			expect(getSentPushes()).toHaveLength(0)
		})

		it('[CR3] a commit push_result confirms the pending push without changing the store', () => {
			connectClient()

			const page = makePage('Local Page')
			store.put([page])
			vi.advanceTimersByTime(100)
			const push = getSentPushes()[0]
			expect(push).toBeDefined()

			socket.mockServerMessage({
				type: 'data',
				data: [
					{ type: 'push_result', clientClock: push.clientClock, serverClock: 2, action: 'commit' },
				],
			})
			vi.advanceTimersByTime(100)
			expect(store.get(page.id)?.name).toBe('Local Page')

			// the change is now confirmed: a reconnect neither reverts nor re-pushes it
			socket.mockConnectionStatus('offline')
			socket.mockConnectionStatus('online')
			socket.clearSentMessages()
			socket.mockServerMessage(
				createConnectMessage({ hydrationType: 'wipe_presence', serverClock: 2, diff: {} })
			)
			vi.advanceTimersByTime(100)

			expect(store.get(page.id)?.name).toBe('Local Page')
			expect(getSentPushes()).toHaveLength(0)
		})

		it('[CR3] a discard push_result drops the pending push and reverts the local change', () => {
			connectClient()

			const page = makePage('Discarded Page')
			store.put([page])
			vi.advanceTimersByTime(100)
			const push = getSentPushes()[0]
			expect(store.has(page.id)).toBe(true)

			socket.mockServerMessage({
				type: 'data',
				data: [
					{ type: 'push_result', clientClock: push.clientClock, serverClock: 2, action: 'discard' },
				],
			})
			vi.advanceTimersByTime(100)

			expect(store.has(page.id)).toBe(false)
		})

		it("[CR3] a rebaseWithDiff push_result applies the server's modified diff instead", () => {
			connectClient()

			const page = makePage('Local Name')
			store.put([page])
			vi.advanceTimersByTime(100)
			const push = getSentPushes()[0]

			const serverVersion = { ...page, name: 'Server Name' }
			socket.mockServerMessage({
				type: 'data',
				data: [
					{
						type: 'push_result',
						clientClock: push.clientClock,
						serverClock: 2,
						action: { rebaseWithDiff: { [page.id]: [RecordOpType.Put, serverVersion] } },
					},
				],
			})
			vi.advanceTimersByTime(100)

			expect(store.get(page.id)?.name).toBe('Server Name')
		})

		it('[CR4] resets the connection on a push_result with no pending pushes', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
			connectClient()

			socket.mockServerMessage({
				type: 'data',
				data: [{ type: 'push_result', clientClock: 0, serverClock: 2, action: 'commit' }],
			})

			expect(consoleSpy).toHaveBeenCalled()
			expect(client.isConnectedToRoom).toBe(false)

			// the reset restarts the socket, leading to a fresh connect attempt
			vi.advanceTimersByTime(100)
			expect(socket.getSentMessages().some((m) => m.type === 'connect')).toBe(true)

			consoleSpy.mockRestore()
		})

		it('[CR4] resets the connection on a push_result with a mismatched clientClock', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
			connectClient()

			// create a pending push with clientClock 0
			store.put([makePage()])
			vi.advanceTimersByTime(100)
			expect(getSentPushes()).toHaveLength(1)

			socket.mockServerMessage({
				type: 'data',
				data: [{ type: 'push_result', clientClock: 999999, serverClock: 2, action: 'commit' }],
			})
			vi.advanceTimersByTime(100)

			expect(consoleSpy).toHaveBeenCalled()
			expect(client.isConnectedToRoom).toBe(false)

			consoleSpy.mockRestore()
		})

		it("[CR5][CL2] advances lastServerClock to the last buffered event's serverClock and reuses it on reconnect", () => {
			connectClient({ serverClock: 1 })

			socket.mockServerMessage({
				type: 'data',
				data: [
					{ type: 'patch', serverClock: 7, diff: {} },
					{ type: 'patch', serverClock: 12, diff: {} },
				],
			})
			vi.advanceTimersByTime(100)

			socket.mockConnectionStatus('offline')
			socket.mockConnectionStatus('online')

			const connectMsg = socket
				.getSentMessages()
				.find((m): m is TLConnectRequest => m.type === 'connect')
			expect(connectMsg).toBeDefined()
			expect(connectMsg!.lastServerClock).toBe(12)
		})

		it('[CR6] a put equal to the stored record does not notify store listeners', () => {
			connectClient()

			const page = makePage('Server Page')
			socket.mockServerMessage({
				type: 'data',
				data: [{ type: 'patch', serverClock: 2, diff: { [page.id]: [RecordOpType.Put, page] } }],
			})
			vi.advanceTimersByTime(100)
			expect(store.get(page.id)).toEqual(page)

			const listener = vi.fn()
			const unsubscribe = store.listen(listener)

			// a deep-equal (but referentially distinct) put is a no-op
			const equalCopy = JSON.parse(JSON.stringify(page))
			socket.mockServerMessage({
				type: 'data',
				data: [
					{ type: 'patch', serverClock: 3, diff: { [page.id]: [RecordOpType.Put, equalCopy] } },
				],
			})
			vi.advanceTimersByTime(100)

			expect(listener).not.toHaveBeenCalled()
			expect(store.get(page.id)).toEqual(page)
			unsubscribe()
		})

		it('[CR6] patch and remove ops for missing records are skipped', () => {
			connectClient()

			const missingPatchId = PageRecordType.createId()
			const missingRemoveId = PageRecordType.createId()
			const listener = vi.fn()
			const unsubscribe = store.listen(listener)

			expect(() => {
				socket.mockServerMessage({
					type: 'data',
					data: [
						{
							type: 'patch',
							serverClock: 2,
							diff: {
								[missingPatchId]: [RecordOpType.Patch, { name: [ValueOpType.Put, 'x'] }],
								[missingRemoveId]: [RecordOpType.Remove],
							},
						},
					],
				})
				vi.advanceTimersByTime(100)
			}).not.toThrow()

			expect(store.has(missingPatchId)).toBe(false)
			expect(store.has(missingRemoveId)).toBe(false)
			expect(listener).not.toHaveBeenCalled()
			unsubscribe()
		})

		it('[CR6] handles update-then-delete of a server record correctly', () => {
			connectClient()

			// create a page via server
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
								PageRecordType.create({ id: pageId, name: 'Server Page', index: 'a1' as any }),
							],
						},
					},
				],
			})
			vi.advanceTimersByTime(100)
			socket.clearSentMessages()

			// update then delete
			store.update(pageId, (p) => ({ ...p, name: 'Updated' }))
			vi.advanceTimersByTime(100)
			socket.clearSentMessages()

			store.remove([pageId])
			vi.advanceTimersByTime(100)

			// page should not exist locally
			expect(store.has(pageId)).toBe(false)

			// should have sent a remove operation
			const removeMsg = getSentPushes().find(
				(msg) => msg.diff?.[pageId] && msg.diff[pageId][0] === RecordOpType.Remove
			)
			expect(removeMsg).toBeDefined()
		})

		it('[CR6] handles delete-then-recreate of a server record with the same id', () => {
			connectClient()

			// create a page via server
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
								PageRecordType.create({ id: pageId, name: 'Original', index: 'a1' as any }),
							],
						},
					},
				],
			})
			vi.advanceTimersByTime(100)
			socket.clearSentMessages()

			// delete then recreate with same ID
			store.remove([pageId])
			store.put([PageRecordType.create({ id: pageId, name: 'Recreated', index: 'a1' as any })])
			vi.advanceTimersByTime(100)

			// page should exist with new name
			expect(store.get(pageId)?.name).toBe('Recreated')
		})

		it('[CR6] sends patches (not full puts) for updates to server records', () => {
			connectClient()

			// create a page via server
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
								PageRecordType.create({ id: pageId, name: 'Server Name', index: 'a1' as any }),
							],
						},
					},
				],
			})
			vi.advanceTimersByTime(100)
			socket.clearSentMessages()

			// local user updates only the name
			store.update(pageId, (p) => ({ ...p, name: 'Local Name' }))
			vi.advanceTimersByTime(100)

			// should send a Patch operation (not Put)
			const pushWithPage = getSentPushes().find((msg) => msg.diff?.[pageId])
			expect(pushWithPage).toBeDefined()

			const op = pushWithPage!.diff![pageId]
			expect(op[0]).toBe(RecordOpType.Patch)
			expect((op[1] as any).name).toBeDefined()
		})

		it('[CR7] invokes onCustomMessageReceived with this bound to null', () => {
			let captured: { thisArg: any; data: any } | undefined
			client = createClient({
				onCustomMessageReceived: function (this: any, data: any) {
					captured = { thisArg: this, data }
				},
			})
			socket.mockServerMessage(createConnectMessage())

			const customData = { type: 'chat', message: 'Hello world' }
			socket.mockServerMessage({ type: 'custom', data: customData })

			expect(captured).toBeDefined()
			expect(captured!.data).toEqual(customData)
			expect(captured!.thisArg).toBeNull()
		})

		it('[CR7][CL7] tolerates omitted optional callbacks', () => {
			client = createClient({
				onCustomMessageReceived: undefined,
				onAfterConnect: undefined,
			})
			socket.mockServerMessage(createConnectMessage())
			expect(client.isConnectedToRoom).toBe(true)

			expect(() => {
				socket.mockServerMessage({ type: 'custom', data: { hello: true } })
			}).not.toThrow()
		})
	})
})
