import {
	ClientWebSocketAdapter,
	RecordOpType,
	TLPersistentClientSocket,
	TLPushRequest,
	TLSocketClientSentEvent,
	TLSocketServerSentEvent,
	TLSocketStatusChangeEvent,
	TLSyncClient,
	getTlsyncProtocolVersion,
} from '@tldraw/sync-core'
import { IndexKey, PageRecordType, TLRecord, TLStore, atom, createTLStore } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { capHiddenReconnectDelay, createFlushChanges, findSyncClient } from './hiddenTabSync'

// These run against the real sync client, so they fail if the internals hiddenTabSync drives change.

class MockSocket implements TLPersistentClientSocket<
	TLSocketClientSentEvent<TLRecord>,
	TLSocketServerSentEvent<TLRecord>
> {
	connectionStatus: 'online' | 'offline' | 'error' = 'online'
	sent: TLSocketClientSentEvent<TLRecord>[] = []
	private messageListeners = new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>()
	private statusListeners = new Set<(event: TLSocketStatusChangeEvent) => void>()

	sendMessage(msg: TLSocketClientSentEvent<TLRecord>) {
		this.sent.push(msg)
	}
	onReceiveMessage(cb: (msg: TLSocketServerSentEvent<TLRecord>) => void) {
		this.messageListeners.add(cb)
		return () => void this.messageListeners.delete(cb)
	}
	onStatusChange(cb: (event: TLSocketStatusChangeEvent) => void) {
		this.statusListeners.add(cb)
		return () => void this.statusListeners.delete(cb)
	}
	restart() {}
	close() {}

	receive(msg: TLSocketServerSentEvent<TLRecord>) {
		this.messageListeners.forEach((cb) => cb(msg))
	}
	goOffline() {
		this.connectionStatus = 'offline'
		this.statusListeners.forEach((cb) => cb({ status: 'offline' }))
	}
	pushes() {
		return this.sent.filter((m): m is TLPushRequest<TLRecord> => m.type === 'push')
	}
}

const makePage = (name: string) =>
	PageRecordType.create({ id: PageRecordType.createId(), name, index: 'a2' as IndexKey })

// A hidden tab gets no animation frames, so nothing scheduled on one ever runs.
describe('createFlushChanges, with no animation frames', () => {
	let store: TLStore
	let socket: MockSocket
	let client: TLSyncClient<TLRecord, TLStore>
	let flushChanges: () => Promise<boolean>

	beforeEach(() => {
		// @ts-expect-error - testing flag
		globalThis.__FORCE_RAF_IN_TESTS__ = true
		vi.stubGlobal('requestAnimationFrame', () => 1)
		vi.stubGlobal('cancelAnimationFrame', () => {})

		store = createTLStore()
		store.ensureStoreIsUsable()
		socket = new MockSocket()
		client = new TLSyncClient<TLRecord, TLStore>({
			store,
			socket,
			presence: atom('presence', null),
			onLoad: () => {},
			onSyncError: () => {},
		})
		const diff: Record<string, [typeof RecordOpType.Put, TLRecord]> = {}
		for (const [id, record] of Object.entries(store.serialize('document'))) {
			diff[id] = [RecordOpType.Put, record as TLRecord]
		}
		socket.receive({
			type: 'connect',
			connectRequestId: client.latestConnectRequestId!,
			hydrationType: 'wipe_all',
			protocolVersion: getTlsyncProtocolVersion(),
			schema: store.schema.serialize(),
			isReadonly: false,
			serverClock: 1,
			diff,
		})
		socket.sent = []

		const found = findSyncClient(socket)
		expect(found).toBe(client)
		flushChanges = createFlushChanges(socket, found!)
	})

	afterEach(() => {
		client.close()
		// @ts-expect-error - testing flag
		delete globalThis.__FORCE_RAF_IN_TESTS__
		vi.unstubAllGlobals()
	})

	const confirm = (clientClock: number, action: 'commit' | 'discard' = 'commit') =>
		socket.receive({
			type: 'data',
			data: [{ type: 'push_result', clientClock, serverClock: 2, action }],
		})

	it('sends local changes without waiting for a frame, and resolves once they are committed', async () => {
		const page = makePage('Hidden page')
		store.put([page])
		expect(socket.pushes()).toHaveLength(0)

		let committed: boolean | undefined
		const flushed = flushChanges().then((result) => (committed = result))
		const [push] = socket.pushes()
		expect(push.diff).toEqual({ [page.id]: [RecordOpType.Put, page] })

		await Promise.resolve()
		expect(committed).toBeUndefined()

		confirm(push.clientClock)
		await flushed
		expect(committed).toBe(true)
		expect(store.get(page.id)).toEqual(page)
		expect((client as any).pendingPushRequests).toEqual([])
	})

	it('applies changes from the server before sending', async () => {
		const serverPage = makePage('Server page')
		socket.receive({
			type: 'data',
			data: [
				{
					type: 'patch',
					serverClock: 2,
					diff: { [serverPage.id]: [RecordOpType.Put, serverPage] },
				},
			],
		})
		expect(store.has(serverPage.id)).toBe(false)

		expect(await flushChanges()).toBe(true)
		expect(store.get(serverPage.id)).toEqual(serverPage)
		expect(socket.pushes()).toHaveLength(0)
	})

	it('resolves false when the server discards the changes', async () => {
		store.put([makePage('Rejected page')])
		const flushed = flushChanges()
		confirm(socket.pushes()[0].clientClock, 'discard')

		expect(await flushed).toBe(false)
	})

	it('resolves false when the connection drops before the server answers', async () => {
		store.put([makePage('Unanswered page')])
		const flushed = flushChanges()
		socket.goOffline()

		expect(await flushed).toBe(false)
	})

	it('resolves false while offline, without sending anything', async () => {
		socket.goOffline()
		store.put([makePage('Offline page')])

		expect(await flushChanges()).toBe(false)
		expect(socket.pushes()).toHaveLength(0)
	})

	it("doesn't find a client driving a different socket", () => {
		expect(findSyncClient(new MockSocket())).toBeNull()
	})
})

describe('capHiddenReconnectDelay', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('caps the wait between attempts while hidden, and leaves it alone while visible', () => {
		// Never resolves, so no real socket is opened.
		const socket = new ClientWebSocketAdapter(() => new Promise<string>(() => {}))
		const manager = socket._reconnectManager as unknown as { getMaxDelay(): number }
		const hidden = vi.spyOn(document, 'hidden', 'get')

		hidden.mockReturnValue(true)
		const uncapped = manager.getMaxDelay()
		expect(uncapped).toBeGreaterThan(30_000)

		expect(capHiddenReconnectDelay(socket, 30_000)).toBe(true)
		expect(manager.getMaxDelay()).toBe(30_000)

		hidden.mockReturnValue(false)
		expect(manager.getMaxDelay()).toBeLessThan(30_000)
		socket.close()
	})
})
