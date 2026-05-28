import { TLRecord } from '@tldraw/tlschema'
import { beforeEach, describe, expect, it } from 'vitest'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from '../protocol'
import {
	TLPersistentClientSocket,
	TLPersistentClientSocketStatus,
	TLSocketStatusChangeEvent,
	TLSocketStatusListener,
} from '../TLSyncClient'
import { CrossTabBrowserEnv } from './browser-env'
import { CrossTabSocket } from './CrossTabSocket'
import { BroadcastChannelLike, CrossTabLockManager } from './protocol'

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
					// Per the Web Locks spec, the lock is held until the callback's
					// promise resolves. We rely on CrossTabSocket to resolve the
					// promise via its own release mechanism (close()).
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
 * A fake socket that records sent messages and lets tests push server messages
 * and status changes.
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
		// Mimic a reset: go offline then online again so that listeners react.
		this._emitStatus({ status: 'offline' })
	}
	close() {
		this.closed = true
		this.messageListeners.clear()
		this.statusListeners.clear()
	}

	// Test helpers
	_emitStatus(ev: TLSocketStatusChangeEvent) {
		this.connectionStatus = ev.status
		this.statusListeners.forEach((cb) => cb(ev))
	}
	_emitServerMessage(msg: TLSocketServerSentEvent<TLRecord>) {
		this.messageListeners.forEach((cb) => cb(msg))
	}
}

// Convenience: build a tab and capture references to the socket factory
// argument so the test can drive the underlying "WS".
function buildTab(opts: {
	channels: ReturnType<typeof createMockChannelFactory>
	locks: CrossTabLockManager
	channelKey: string
	tabId: string
	sockets: FakeSocket[]
	browserEnv?: CrossTabBrowserEnv | null
}) {
	const ct = new CrossTabSocket(() => 'ws://test', {
		channelKey: opts.channelKey,
		channel: opts.channels.create(`tldraw-room-${opts.channelKey}`),
		locks: opts.locks,
		tabId: opts.tabId,
		browserEnv: opts.browserEnv,
		createSocket: () => {
			const s = new FakeSocket()
			opts.sockets.push(s)
			return s
		},
	})
	return ct
}

/**
 * Mock browser env that lets the test push focus and visibility changes
 * deterministically. Starts unfocused and hidden by default so tests can opt
 * in to whatever initial state they want.
 */
function createMockBrowserEnv(initial?: { focused?: boolean; visible?: boolean }) {
	let focused = initial?.focused ?? false
	let visible = initial?.visible ?? false
	const focusListeners = new Set<() => void>()
	const visibilityListeners = new Set<() => void>()

	const env: CrossTabBrowserEnv = {
		hasFocus: () => focused,
		isVisible: () => visible,
		onFocus(cb) {
			focusListeners.add(cb)
			return () => focusListeners.delete(cb)
		},
		onVisibilityChange(cb) {
			visibilityListeners.add(cb)
			return () => visibilityListeners.delete(cb)
		},
	}

	return {
		env,
		focus() {
			focused = true
			focusListeners.forEach((cb) => cb())
		},
		blur() {
			focused = false
			// `blur` doesn't fire any handler — the design is "most recently
			// focused tab stays presenter until another tab claims".
		},
		setVisible(value: boolean) {
			visible = value
			visibilityListeners.forEach((cb) => cb())
		},
	}
}

// Wait for queued microtasks. The lock manager and broadcast channel deliver
// synchronously, but lock callbacks (which return promises) need a turn of the
// microtask queue to settle.
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
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
		})
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

		// Only one underlying socket exists (the leader's).
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
		// A new socket was opened by B.
		expect(sockets).toHaveLength(2)
		b.close()
	})
})

describe('CrossTabSocket: message routing', () => {
	let channels: ReturnType<typeof createMockChannelFactory>
	let locks: CrossTabLockManager
	let sockets: FakeSocket[]

	beforeEach(() => {
		channels = createMockChannelFactory()
		locks = createMockLockManager()
		sockets = []
	})

	it("forwards leader's own sendMessage to its socket", async () => {
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

	it('remaps push clientClocks so concurrent followers do not collide', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()
		const c = buildTab({ channels, locks, channelKey: 'room1', tabId: 'C', sockets })
		await flushMicrotasks()

		// Each tab's own TLSyncClient would start its clientClock at 0.
		a.sendMessage({ type: 'push', clientClock: 0 })
		b.sendMessage({ type: 'push', clientClock: 0 })
		c.sendMessage({ type: 'push', clientClock: 0 })

		const sent = sockets[0].sent.filter(
			(m): m is Extract<TLSocketClientSentEvent<TLRecord>, { type: 'push' }> =>
				m.type === 'push'
		)
		const clocks = sent.map((m) => m.clientClock)
		// All three got distinct remapped clocks.
		expect(new Set(clocks).size).toBe(3)

		a.close()
		b.close()
		c.close()
	})

	it('routes push_result back to the originating tab with its original clientClock', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		// Both push at their own clientClock=0.
		a.sendMessage({ type: 'push', clientClock: 0 })
		b.sendMessage({ type: 'push', clientClock: 0 })

		const pushes = sockets[0].sent.filter(
			(m): m is Extract<TLSocketClientSentEvent<TLRecord>, { type: 'push' }> =>
				m.type === 'push'
		)
		expect(pushes).toHaveLength(2)
		const [aRemapped, bRemapped] = pushes.map((p) => p.clientClock)

		// Server responds out of order, with B's first then A's.
		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: bRemapped,
			serverClock: 1,
			action: 'commit',
		})
		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: aRemapped,
			serverClock: 2,
			action: 'commit',
		})

		// Each tab received exactly its own push_result with its own clientClock.
		expect(aReceived).toEqual([
			{ type: 'push_result', clientClock: 0, serverClock: 2, action: 'commit' },
		])
		expect(bReceived).toEqual([
			{ type: 'push_result', clientClock: 0, serverClock: 1, action: 'commit' },
		])

		a.close()
		b.close()
	})

	it('splits a mixed data batch between routed push_results and broadcast patches', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		a.sendMessage({ type: 'push', clientClock: 0 })
		b.sendMessage({ type: 'push', clientClock: 0 })
		const pushes = sockets[0].sent.filter(
			(m): m is Extract<TLSocketClientSentEvent<TLRecord>, { type: 'push' }> =>
				m.type === 'push'
		)
		const [aRemapped, bRemapped] = pushes.map((p) => p.clientClock)

		sockets[0]._emitServerMessage({
			type: 'data',
			data: [
				{ type: 'push_result', clientClock: aRemapped, serverClock: 3, action: 'commit' },
				{ type: 'push_result', clientClock: bRemapped, serverClock: 4, action: 'commit' },
				{ type: 'patch', diff: {}, serverClock: 5 },
			],
		})

		// The broadcast patch reached both; each push_result only reached its
		// originator (with the original clientClock).
		const flatten = (msgs: TLSocketServerSentEvent<TLRecord>[]) =>
			msgs.flatMap((m) => (m.type === 'data' ? m.data : [m]))

		const aFlat = flatten(aReceived)
		const bFlat = flatten(bReceived)

		expect(aFlat).toEqual(
			expect.arrayContaining([
				{ type: 'push_result', clientClock: 0, serverClock: 3, action: 'commit' },
				{ type: 'patch', diff: {}, serverClock: 5 },
			])
		)
		expect(aFlat).not.toContainEqual(
			expect.objectContaining({ type: 'push_result', serverClock: 4 })
		)
		expect(bFlat).toEqual(
			expect.arrayContaining([
				{ type: 'push_result', clientClock: 0, serverClock: 4, action: 'commit' },
				{ type: 'patch', diff: {}, serverClock: 5 },
			])
		)
		expect(bFlat).not.toContainEqual(
			expect.objectContaining({ type: 'push_result', serverClock: 3 })
		)

		a.close()
		b.close()
	})

	it('routes connect responses back via connectRequestId', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		b.sendMessage({
			type: 'connect',
			connectRequestId: 'cr-B',
			lastServerClock: 0,
			protocolVersion: 1,
			schema: { schemaVersion: 2, sequences: {} } as any,
		})

		sockets[0]._emitServerMessage({
			type: 'connect',
			connectRequestId: 'cr-B',
			hydrationType: 'wipe_all',
			protocolVersion: 1,
			schema: { schemaVersion: 2, sequences: {} } as any,
			diff: {},
			serverClock: 1,
			isReadonly: false,
		})

		expect(aReceived).toHaveLength(0)
		expect(bReceived).toHaveLength(1)
		expect(bReceived[0]).toMatchObject({ type: 'connect', connectRequestId: 'cr-B' })

		a.close()
		b.close()
	})

	it('broadcasts pong / patch messages to every tab', async () => {
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

		expect(aReceived).toEqual([
			{ type: 'pong' },
			{ type: 'patch', diff: {}, serverClock: 1 },
		])
		expect(bReceived).toEqual([
			{ type: 'pong' },
			{ type: 'patch', diff: {}, serverClock: 1 },
		])

		a.close()
		b.close()
	})
})

describe('CrossTabSocket: sibling-patch synthesis', () => {
	let channels: ReturnType<typeof createMockChannelFactory>
	let locks: CrossTabLockManager
	let sockets: FakeSocket[]

	beforeEach(() => {
		channels = createMockChannelFactory()
		locks = createMockLockManager()
		sockets = []
	})

	// A small fake diff shaped like NetworkDiff. The structure isn't validated
	// by CrossTabSocket — it's opaque payload — so any plausible record op
	// suffices for these tests.
	const fakeDiff = {
		'shape:abc': ['put', { id: 'shape:abc', type: 'geo', x: 10, y: 20 }],
	} as any
	const rebasedDiff = {
		'shape:abc': ['put', { id: 'shape:abc', type: 'geo', x: 11, y: 22 }],
	} as any

	function sentPushes(socket: FakeSocket) {
		return socket.sent.filter(
			(m): m is Extract<TLSocketClientSentEvent<TLRecord>, { type: 'push' }> => m.type === 'push'
		)
	}

	it("on commit, other tabs receive a synthesized patch with the originator's diff", async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()
		const c = buildTab({ channels, locks, channelKey: 'room1', tabId: 'C', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const cReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))
		c.onReceiveMessage((m) => cReceived.push(m))

		// B pushes a change.
		b.sendMessage({ type: 'push', clientClock: 0, diff: fakeDiff })
		const [bPush] = sentPushes(sockets[0])

		// Server commits.
		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: bPush.clientClock,
			serverClock: 1,
			action: 'commit',
		})

		// B gets the routed push_result with its own original clientClock.
		expect(bReceived).toEqual([
			{ type: 'push_result', clientClock: 0, serverClock: 1, action: 'commit' },
		])
		// A (leader's local TLSyncClient) and C get a synthesized patch with B's diff.
		expect(aReceived).toEqual([{ type: 'patch', diff: fakeDiff, serverClock: 1 }])
		expect(cReceived).toEqual([{ type: 'patch', diff: fakeDiff, serverClock: 1 }])

		a.close()
		b.close()
		c.close()
	})

	it("on commit, the leader's own push produces a synthesized patch for followers", async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		a.sendMessage({ type: 'push', clientClock: 0, diff: fakeDiff })
		const [aPush] = sentPushes(sockets[0])

		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: aPush.clientClock,
			serverClock: 1,
			action: 'commit',
		})

		// A is the originator: only gets the routed push_result, no patch.
		expect(aReceived).toEqual([
			{ type: 'push_result', clientClock: 0, serverClock: 1, action: 'commit' },
		])
		// B receives the synthesized patch.
		expect(bReceived).toEqual([{ type: 'patch', diff: fakeDiff, serverClock: 1 }])

		a.close()
		b.close()
	})

	it('uses rebaseWithDiff for siblings when the server rebases', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		b.sendMessage({ type: 'push', clientClock: 0, diff: fakeDiff })
		const [bPush] = sentPushes(sockets[0])

		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: bPush.clientClock,
			serverClock: 7,
			action: { rebaseWithDiff: rebasedDiff },
		})

		expect(bReceived).toEqual([
			{
				type: 'push_result',
				clientClock: 0,
				serverClock: 7,
				action: { rebaseWithDiff: rebasedDiff },
			},
		])
		// Siblings get the server's rebased version, not the original.
		expect(aReceived).toEqual([{ type: 'patch', diff: rebasedDiff, serverClock: 7 }])

		a.close()
		b.close()
	})

	it('does not synthesize a patch when the server discards a push', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))

		b.sendMessage({ type: 'push', clientClock: 0, diff: fakeDiff })
		const [bPush] = sentPushes(sockets[0])

		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: bPush.clientClock,
			serverClock: 2,
			action: 'discard',
		})

		// Originator still hears the discard; siblings hear nothing.
		expect(bReceived).toEqual([
			{ type: 'push_result', clientClock: 0, serverClock: 2, action: 'discard' },
		])
		expect(aReceived).toEqual([])

		a.close()
		b.close()
	})

	it('does not synthesize a patch when the original push had no diff (presence-only)', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		b.onReceiveMessage(() => {})
		a.onReceiveMessage((m) => aReceived.push(m))

		// Push with no diff field at all (a presence-only update).
		b.sendMessage({ type: 'push', clientClock: 0 })
		const [bPush] = sentPushes(sockets[0])

		sockets[0]._emitServerMessage({
			type: 'push_result',
			clientClock: bPush.clientClock,
			serverClock: 3,
			action: 'commit',
		})

		expect(aReceived).toEqual([])

		a.close()
		b.close()
	})

	it('synthesizes patches alongside broadcast patches inside a data batch', async () => {
		const a = buildTab({ channels, locks, channelKey: 'room1', tabId: 'A', sockets })
		await flushMicrotasks()
		const b = buildTab({ channels, locks, channelKey: 'room1', tabId: 'B', sockets })
		await flushMicrotasks()
		const c = buildTab({ channels, locks, channelKey: 'room1', tabId: 'C', sockets })
		await flushMicrotasks()

		const aReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const bReceived: TLSocketServerSentEvent<TLRecord>[] = []
		const cReceived: TLSocketServerSentEvent<TLRecord>[] = []
		a.onReceiveMessage((m) => aReceived.push(m))
		b.onReceiveMessage((m) => bReceived.push(m))
		c.onReceiveMessage((m) => cReceived.push(m))

		b.sendMessage({ type: 'push', clientClock: 0, diff: fakeDiff })
		c.sendMessage({ type: 'push', clientClock: 0, diff: rebasedDiff })
		const pushes = sentPushes(sockets[0])
		const [bPush, cPush] = pushes

		// A batch with: a broadcast patch (from another user), B's commit, C's
		// discard. We expect synthesis only for B's push.
		const externalPatch = {
			type: 'patch' as const,
			diff: { 'shape:xyz': ['remove'] } as any,
			serverClock: 9,
		}
		sockets[0]._emitServerMessage({
			type: 'data',
			data: [
				externalPatch,
				{
					type: 'push_result',
					clientClock: bPush.clientClock,
					serverClock: 10,
					action: 'commit',
				},
				{
					type: 'push_result',
					clientClock: cPush.clientClock,
					serverClock: 11,
					action: 'discard',
				},
			],
		})

		const flatten = (msgs: TLSocketServerSentEvent<TLRecord>[]) =>
			msgs.flatMap((m) => (m.type === 'data' ? m.data : [m]))

		const aFlat = flatten(aReceived)
		const bFlat = flatten(bReceived)
		const cFlat = flatten(cReceived)

		// Everyone gets the external patch.
		expect(aFlat).toContainEqual(externalPatch)
		expect(bFlat).toContainEqual(externalPatch)
		expect(cFlat).toContainEqual(externalPatch)

		// B's commit is routed back only to B.
		expect(bFlat).toContainEqual({
			type: 'push_result',
			clientClock: 0,
			serverClock: 10,
			action: 'commit',
		})
		expect(aFlat).not.toContainEqual(
			expect.objectContaining({ type: 'push_result', serverClock: 10 })
		)

		// C's discard is routed back only to C.
		expect(cFlat).toContainEqual({
			type: 'push_result',
			clientClock: 0,
			serverClock: 11,
			action: 'discard',
		})

		// A and C see B's synthesized patch (B's commit produced it). B doesn't.
		const synthPatch = { type: 'patch', diff: fakeDiff, serverClock: 10 }
		expect(aFlat).toContainEqual(synthPatch)
		expect(cFlat).toContainEqual(synthPatch)
		expect(bFlat).not.toContainEqual(synthPatch)

		// No synthesis from C's discard.
		expect(aFlat).not.toContainEqual(
			expect.objectContaining({ type: 'patch', diff: rebasedDiff })
		)

		a.close()
		b.close()
		c.close()
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
		// Followers see the change.
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

		// B joins late.
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
			locks: null as any, // null forces fallback
			channelKey: 'room1',
			tabId: 'A',
			sockets,
		})

		expect((a as any).mode).toBe('fallback')
		expect(sockets).toHaveLength(1)

		// sendMessage goes straight to the underlying socket.
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

describe('CrossTabSocket: presenter election', () => {
	let channels: ReturnType<typeof createMockChannelFactory>
	let locks: CrossTabLockManager
	let sockets: FakeSocket[]

	beforeEach(() => {
		channels = createMockChannelFactory()
		locks = createMockLockManager()
		sockets = []
	})

	it('the tab focused at construction is the initial presenter', async () => {
		const aEnv = createMockBrowserEnv({ focused: true, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserEnv: aEnv.env,
		})
		await flushMicrotasks()

		expect(a.$isPresenter.get()).toBe(true)
		a.close()
	})

	it('a tab without focus at construction is not the presenter', async () => {
		const aEnv = createMockBrowserEnv({ focused: false, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserEnv: aEnv.env,
		})
		await flushMicrotasks()

		expect(a.$isPresenter.get()).toBe(false)
		a.close()
	})

	it('a focus event makes that tab the presenter and demotes the previous one', async () => {
		const aEnv = createMockBrowserEnv({ focused: true, visible: true })
		const bEnv = createMockBrowserEnv({ focused: false, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserEnv: aEnv.env,
		})
		await flushMicrotasks()
		const b = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'B',
			sockets,
			browserEnv: bEnv.env,
		})
		await flushMicrotasks()

		// A focused at construction; B did not.
		expect(a.$isPresenter.get()).toBe(true)
		expect(b.$isPresenter.get()).toBe(false)

		// Now focus B.
		bEnv.focus()

		expect(a.$isPresenter.get()).toBe(false)
		expect(b.$isPresenter.get()).toBe(true)

		a.close()
		b.close()
	})

	it('the last-focused tab wins ties between simultaneous claims', async () => {
		const aEnv = createMockBrowserEnv({ focused: false, visible: true })
		const bEnv = createMockBrowserEnv({ focused: false, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserEnv: aEnv.env,
		})
		await flushMicrotasks()
		const b = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'B',
			sockets,
			browserEnv: bEnv.env,
		})
		await flushMicrotasks()

		// Both start unfocused — neither is presenter.
		expect(a.$isPresenter.get()).toBe(false)
		expect(b.$isPresenter.get()).toBe(false)

		// A focuses first.
		aEnv.focus()
		expect(a.$isPresenter.get()).toBe(true)
		expect(b.$isPresenter.get()).toBe(false)

		// Then B focuses — takes over.
		bEnv.focus()
		expect(a.$isPresenter.get()).toBe(false)
		expect(b.$isPresenter.get()).toBe(true)

		// Then A focuses again — takes back.
		aEnv.focus()
		expect(a.$isPresenter.get()).toBe(true)
		expect(b.$isPresenter.get()).toBe(false)

		a.close()
		b.close()
	})

	it('blur alone does not demote the presenter — it stays until another tab claims', async () => {
		const aEnv = createMockBrowserEnv({ focused: true, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserEnv: aEnv.env,
		})
		await flushMicrotasks()

		expect(a.$isPresenter.get()).toBe(true)

		// Lose focus to something outside our pool (the OS taskbar, another app).
		aEnv.blur()

		// Still presenter — nothing has claimed.
		expect(a.$isPresenter.get()).toBe(true)

		a.close()
	})

	it('fallback-mode tabs are always presenters', async () => {
		const a = buildTab({
			channels,
			locks: null as any,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
		})
		await flushMicrotasks()

		expect(a.$isPresenter.get()).toBe(true)
		a.close()
	})
})

describe('CrossTabSocket: visibility-driven leader handoff', () => {
	let channels: ReturnType<typeof createMockChannelFactory>
	let locks: CrossTabLockManager & { holders: Map<string, { resolve: () => void } | null> }
	let sockets: FakeSocket[]

	beforeEach(() => {
		channels = createMockChannelFactory()
		locks = createMockLockManager()
		sockets = []
	})

	it('the leader releases the lock when it becomes hidden and another tab is visible', async () => {
		const aEnv = createMockBrowserEnv({ focused: true, visible: true })
		const bEnv = createMockBrowserEnv({ focused: false, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserEnv: aEnv.env,
		})
		await flushMicrotasks()
		const b = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'B',
			sockets,
			browserEnv: bEnv.env,
		})
		await flushMicrotasks()

		expect((a as any).mode).toBe('leader')
		expect((b as any).mode).toBe('follower')

		// A becomes hidden. B is still visible.
		aEnv.setVisible(false)
		await flushMicrotasks()

		// Lock should have migrated to B.
		expect((b as any).mode).toBe('leader')
		// Two sockets have been opened over the lifetime of the test.
		expect(sockets).toHaveLength(2)

		a.close()
		b.close()
	})

	it('a hidden tab keeps the lock if no other tab is visible', async () => {
		const aEnv = createMockBrowserEnv({ focused: true, visible: true })
		const bEnv = createMockBrowserEnv({ focused: false, visible: false })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserEnv: aEnv.env,
		})
		await flushMicrotasks()
		const b = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'B',
			sockets,
			browserEnv: bEnv.env,
		})
		await flushMicrotasks()

		expect((a as any).mode).toBe('leader')

		// A becomes hidden — but B is also hidden, so A should hang onto the lock.
		aEnv.setVisible(false)
		await flushMicrotasks()

		expect((a as any).mode).toBe('leader')
		expect(sockets).toHaveLength(1)

		a.close()
		b.close()
	})

	it('a previously-hidden tab re-acquires the lock when it becomes visible again', async () => {
		const aEnv = createMockBrowserEnv({ focused: true, visible: true })
		const bEnv = createMockBrowserEnv({ focused: false, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserEnv: aEnv.env,
		})
		await flushMicrotasks()
		const b = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'B',
			sockets,
			browserEnv: bEnv.env,
		})
		await flushMicrotasks()

		// A is leader. A becomes hidden — hands off to B.
		aEnv.setVisible(false)
		await flushMicrotasks()
		expect((b as any).mode).toBe('leader')

		// A becomes visible again. It should request the lock; B keeps it for
		// now (B is still visible), so A waits in the queue. If B then becomes
		// hidden, A would take over.
		aEnv.setVisible(true)
		await flushMicrotasks()
		expect((b as any).mode).toBe('leader')

		bEnv.setVisible(false)
		await flushMicrotasks()
		expect((a as any).mode).toBe('leader')

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
