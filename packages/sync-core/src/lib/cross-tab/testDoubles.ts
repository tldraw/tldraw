// Shared test doubles for the cross-tab module tests. Not part of the
// production code path — kept alongside the modules so test files can
// import directly without reaching into a sibling test file.

import { TLRecord } from '@tldraw/tlschema'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from '../protocol'
import {
	TLPersistentClientSocket,
	TLPersistentClientSocketStatus,
	TLSocketStatusChangeEvent,
	TLSocketStatusListener,
} from '../TLSyncClient'
import { createCrossTabSocket } from './createCrossTabSocket'
import { BroadcastChannelLike, BrowserContext, CrossTabLockManager } from './types'

/**
 * In-process BroadcastChannel mock. All channels constructed via
 * `create(name)` with the same name receive each other's messages (and
 * not their own).
 */
export function createMockChannelFactory() {
	const channelsByName = new Map<string, Set<MockChannel>>()

	class MockChannel implements BroadcastChannelLike {
		listeners = new Set<(ev: MessageEvent) => void>()
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
export function createMockLockManager(): CrossTabLockManager & {
	holders: Map<string, { resolve: () => void } | null>
} {
	const queues = new Map<string, Array<() => void>>()
	const holders = new Map<string, { resolve: () => void } | null>()

	function run(name: string) {
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
				function start() {
					function release() {
						holders.set(name, null)
						outerResolve(undefined)
						run(name)
					}
					holders.set(name, { resolve: release })
					// Per the Web Locks spec, the lock is held until the callback's
					// promise resolves. We rely on createCrossTabSocket to resolve
					// the promise via its own release mechanism (close()).
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
export class FakeSocket
	implements
		TLPersistentClientSocket<TLSocketClientSentEvent<TLRecord>, TLSocketServerSentEvent<TLRecord>>
{
	connectionStatus: TLPersistentClientSocketStatus = 'offline'
	sent: TLSocketClientSentEvent<TLRecord>[] = []
	closed = false
	messageListeners = new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>()
	statusListeners = new Set<TLSocketStatusListener>()

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

/**
 * Build a CrossTabSocket with the given mocks. Pushes the underlying
 * FakeSocket(s) the factory creates into `opts.sockets` so the test can
 * drive them.
 */
export function buildTab(opts: {
	channels: ReturnType<typeof createMockChannelFactory>
	locks: CrossTabLockManager
	channelKey: string
	tabId: string
	sockets: FakeSocket[]
	browserContext?: BrowserContext | null
}) {
	return createCrossTabSocket(() => 'ws://test', {
		channelKey: opts.channelKey,
		channel: opts.channels.create(`tldraw-room-${opts.channelKey}`),
		locks: opts.locks,
		tabId: opts.tabId,
		browserContext: opts.browserContext,
		createSocket: () => {
			const s = new FakeSocket()
			opts.sockets.push(s)
			return s
		},
	})
}

/**
 * Mock browser context that lets the test push focus and visibility
 * changes deterministically. Starts unfocused and hidden by default so
 * tests can opt in to whatever initial state they want.
 */
export function createMockBrowserContext(initial?: { focused?: boolean; visible?: boolean }) {
	let focused = initial?.focused ?? false
	let visible = initial?.visible ?? false
	const focusListeners = new Set<() => void>()
	const visibilityListeners = new Set<() => void>()

	const ctx: BrowserContext = {
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
		ctx,
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

/**
 * Wait for queued microtasks. The lock manager and broadcast channel
 * deliver synchronously, but lock callbacks (which return promises) need
 * a turn of the microtask queue to settle.
 */
export function flushMicrotasks() {
	return new Promise<void>((resolve) => setImmediate(resolve))
}
