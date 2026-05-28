import {
	TLPersistentClientSocket,
	TLPersistentClientSocketStatus,
	TLSocketClientSentEvent,
	TLSocketServerSentEvent,
	TLSocketStatusChangeEvent,
	TLSocketStatusListener,
} from '@tldraw/sync-core'
import { TLRecord } from '@tldraw/tlschema'
import { beforeEach, describe, expect, it } from 'vitest'
import { BroadcastChannelLike, CrossTabLockManager, CrossTabSocket } from './CrossTabSocket'

// =====================================================================
// Test doubles
// =====================================================================

/**
 * In-process BroadcastChannel mock. All channels constructed via
 * `createMockChannel(name)` with the same name receive each other's messages
 * (and not their own).
 */
function createMockChannelFactory() {
	const channelsByName = new Map<string, Set<MockChannel>>()

	class MockChannel implements BroadcastChannelLike {
		private listeners = new Set<(ev: MessageEvent) => void>()
		closed = false

		constructor(public readonly name: string) {
			const set = channelsByName.get(name) ?? new Set()
			set.add(this)
			channelsByName.set(name, set)
		}

		postMessage(msg: any) {
			if (this.closed) return
			const peers = channelsByName.get(this.name)
			if (!peers) return
			// Deliver synchronously to peers (excluding self), matching the
			// browser's behavior of not echoing to the sender.
			for (const peer of peers) {
				if (peer === this) continue
				if (peer.closed) continue
				peer.listeners.forEach((cb) => cb({ data: msg } as MessageEvent))
			}
		}

		addEventListener(_type: 'message', cb: (ev: MessageEvent) => void) {
			this.listeners.add(cb)
		}

		removeEventListener(_type: 'message', cb: (ev: MessageEvent) => void) {
			this.listeners.delete(cb)
		}

		close() {
			this.closed = true
			const set = channelsByName.get(this.name)
			set?.delete(this)
			this.listeners.clear()
		}
	}

	return {
		create: (name: string) => new MockChannel(name),
	}
}

/**
 * Lock manager mock with FIFO queueing per lock name. Resolves the next
 * waiter's callback only after the current holder releases.
 */
function createMockLockManager(): CrossTabLockManager & {
	holders: Map<string, { resolve: () => void } | null>
} {
	const queues = new Map<string, Array<() => void>>()
	const holders = new Map<string, { resolve: () => void } | null>()

	const run = (name: string) => {
		const q = queues.get(name)
		if (!q || q.length === 0) {
			holders.set(name, null)
			return
		}
		const next = q.shift()!
		next()
	}

	return {
		holders,
		async request(name, _options, callback) {
			return new Promise<unknown>((outerResolve) => {
				const start = () => {
					const release = () => {
						holders.set(name, null)
						outerResolve(undefined)
						run(name)
					}
					holders.set(name, { resolve: release })
					callback().then(release, release)
				}
				if (holders.get(name)) {
					const q = queues.get(name) ?? []
					q.push(start)
					queues.set(name, q)
				} else {
					start()
				}
			})
		},
	}
}

/**
 * A fake socket that records sent messages and lets tests push server
 * messages and status changes.
 */
class FakeSocket
	implements
		TLPersistentClientSocket<TLSocketClientSentEvent<TLRecord>, TLSocketServerSentEvent<TLRecord>>
{
	connectionStatus: TLPersistentClientSocketStatus = 'offline'
	sent: TLSocketClientSentEvent<TLRecord>[] = []
	closed = false
	private messageListeners = new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>()
	private statusListeners = new Set<TLSocketStatusListener>()

	sendMessage(msg: TLSocketClientSentEvent<TLRecord>) {
		this.sent.push(msg)
	}
	onReceiveMessage(cb: (val: TLSocketServerSentEvent<TLRecord>) => void) {
		this.messageListeners.add(cb)
		return () => this.messageListeners.delete(cb)
	}
	onStatusChange(cb: TLSocketStatusListener) {
		this.statusListeners.add(cb)
		return () => this.statusListeners.delete(cb)
	}
	restart() {
		this._emitStatus({ status: 'offline' })
	}
	close() {
		this.closed = true
		this.messageListeners.clear()
		this.statusListeners.clear()
	}

	_emitStatus(ev: TLSocketStatusChangeEvent) {
		this.connectionStatus = ev.status
		this.statusListeners.forEach((cb) => cb(ev))
	}
	_emitServerMessage(msg: TLSocketServerSentEvent<TLRecord>) {
		this.messageListeners.forEach((cb) => cb(msg))
	}
}

// Build a tab and capture references to the FakeSocket(s) the factory
// hands out, so the test can drive the underlying "WS".
function buildTab(opts: {
	channels: ReturnType<typeof createMockChannelFactory>
	locks: CrossTabLockManager
	channelKey: string
	tabId: string
	sockets: FakeSocket[]
}) {
	return new CrossTabSocket(() => 'ws://test', {
		channelKey: opts.channelKey,
		channel: opts.channels.create(`tldraw-room-${opts.channelKey}`),
		locks: opts.locks,
		tabId: opts.tabId,
		createSocket: () => {
			const s = new FakeSocket()
			opts.sockets.push(s)
			return s
		},
	})
}

// Wait for queued microtasks. The lock manager and broadcast channel deliver
// synchronously, but lock callbacks (which return promises) need a turn of
// the microtask queue to settle.
const flushMicrotasks = () => new Promise<void>((resolve) => setImmediate(resolve))

// =====================================================================
// Tests
// =====================================================================

describe('CrossTabSocket: leader election', () => {
	let channels: ReturnType<typeof createMockChannelFactory>
	let locks: CrossTabLockManager

	beforeEach(() => {
		channels = createMockChannelFactory()
		locks = createMockLockManager()
	})

	it('the first tab to request the lock becomes leader', async () => {
		const sockets: FakeSocket[] = []
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()

		expect(sockets).toHaveLength(1)
		expect((a as any).mode).toBe('leader')
		a.close()
	})

	it('subsequent tabs become followers', async () => {
		const sockets: FakeSocket[] = []
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		expect(sockets).toHaveLength(1)
		expect((a as any).mode).toBe('leader')
		expect((b as any).mode).toBe('follower')
		a.close()
		b.close()
	})

	it('different rooms elect leaders independently', async () => {
		const sockets: FakeSocket[] = []
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		const b = buildTab({ channels, locks, channelKey: 'room2', tabId: 'B', sockets })
		await flushMicrotasks()

		expect((a as any).mode).toBe('leader')
		expect((b as any).mode).toBe('leader')
		expect(sockets).toHaveLength(2)
		a.close()
		b.close()
	})

	it('when the leader closes, the next follower takes over', async () => {
		const sockets: FakeSocket[] = []
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		expect((a as any).mode).toBe('leader')
		expect((b as any).mode).toBe('follower')

		a.close()
		await flushMicrotasks()

		expect((b as any).mode).toBe('leader')
		expect(sockets).toHaveLength(2)
		b.close()
	})
})

describe('CrossTabSocket: message forwarding', () => {
	let channels: ReturnType<typeof createMockChannelFactory>
	let locks: CrossTabLockManager
	let sockets: FakeSocket[]

	beforeEach(() => {
		channels = createMockChannelFactory()
		locks = createMockLockManager()
		sockets = []
	})

	it("forwards the leader's own sendMessage to its socket", async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()

		a.sendMessage({ type: 'ping' })
		expect(sockets[0].sent).toEqual([{ type: 'ping' }])
		a.close()
	})

	it("forwards a follower's sendMessage through the leader's socket", async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		b.sendMessage({ type: 'ping' })
		expect(sockets[0].sent).toEqual([{ type: 'ping' }])
		a.close()
		b.close()
	})

	it('broadcasts server messages to every tab', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		sockets[0]._emitServerMessage({ type: 'pong' })
		sockets[0]._emitServerMessage({ type: 'patch', diff: {}, serverClock: 1 })

		expect(aReceived).toEqual([{ type: 'pong' }, { type: 'patch', diff: {}, serverClock: 1 }])
		expect(bReceived).toEqual([{ type: 'pong' }, { type: 'patch', diff: {}, serverClock: 1 }])

		a.close()
		b.close()
	})
})

describe('CrossTabSocket: status propagation', () => {
	let channels: ReturnType<typeof createMockChannelFactory>
	let locks: CrossTabLockManager
	let sockets: FakeSocket[]

	beforeEach(() => {
		channels = createMockChannelFactory()
		locks = createMockLockManager()
		sockets = []
	})

	it("followers mirror the leader's WS status", async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const bStatuses: TLPersistentClientSocketStatus[] = []
		b.onStatusChange((ev) => bStatuses.push(ev.status))

		sockets[0]._emitStatus({ status: 'online' })
		expect(b.connectionStatus).toBe('online')
		expect(bStatuses).toEqual(['online'])

		sockets[0]._emitStatus({ status: 'offline' })
		expect(b.connectionStatus).toBe('offline')
		expect(bStatuses).toEqual(['online', 'offline'])

		a.close()
		b.close()
	})

	it('a follower that joins after the leader is online picks up status promptly', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		sockets[0]._emitStatus({ status: 'online' })

		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		expect(b.connectionStatus).toBe('online')
		a.close()
		b.close()
	})
})

describe('CrossTabSocket: fallback mode', () => {
	it('uses a per-tab socket when locks are unavailable', async () => {
		const channels = createMockChannelFactory()
		const sockets: FakeSocket[] = []
		const a = buildTab({
			channels,
			locks: null as any,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
		})

		expect((a as any).mode).toBe('fallback')
		expect(sockets).toHaveLength(1)

		a.sendMessage({ type: 'ping' })
		expect(sockets[0].sent).toEqual([{ type: 'ping' }])
		a.close()
	})

	it('two fallback tabs each open their own socket', async () => {
		const channels = createMockChannelFactory()
		const sockets: FakeSocket[] = []
		const a = buildTab({
			channels,
			locks: null as any,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
		})
		const b = buildTab({
			channels,
			locks: null as any,
			channelKey: 'room1',
			tabId: 'B',
			sockets,
		})

		expect(sockets).toHaveLength(2)
		expect((a as any).mode).toBe('fallback')
		expect((b as any).mode).toBe('fallback')

		a.close()
		b.close()
	})
})

describe('CrossTabSocket: cleanup', () => {
	it('close() releases the lock', async () => {
		const channels = createMockChannelFactory()
		const locks = createMockLockManager() as any
		const sockets: FakeSocket[] = []

		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()

		expect(locks.holders.get('tldraw-leader-room1')).not.toBeNull()
		a.close()
		await flushMicrotasks()
		expect(locks.holders.get('tldraw-leader-room1')).toBeNull()
	})

	it('after close(), sendMessage throws', async () => {
		const channels = createMockChannelFactory()
		const locks = createMockLockManager()
		const sockets: FakeSocket[] = []

		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		a.close()

		expect(() => a.sendMessage({ type: 'ping' })).toThrow()
	})
})
