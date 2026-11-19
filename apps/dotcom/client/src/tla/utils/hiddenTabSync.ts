import { ClientWebSocketAdapter, TLSocketServerSentEvent } from '@tldraw/sync-core'
import { TLRecord } from 'tldraw'

// A hidden tab gets no animation frames, and the sync client sends local changes and applies the
// server's only on one, so an agent's edits in a hidden tab never leave it. These drive the client's
// internals rather than its public API, to keep this out of the SDK. hiddenTabSync.test.ts runs them
// against the real client, so a rename there fails a test instead of silently declining hidden tabs.

interface SyncClientInternals {
	socket: unknown
	isConnectedToRoom: boolean
	store: { _flushHistory(): void }
	fpsScheduler: { flush(): void }
	pendingPushRequests: Array<{ clientClock: number }>
}

/**
 * The sync client driving `socket`, or null if it can't be reached. TLSyncClient puts itself on
 * `window.tlsync`; the socket check makes sure that's this file's client and not a later one.
 */
export function findSyncClient(socket: unknown): SyncClientInternals | null {
	const client = (window as any).tlsync
	if (!client || client.socket !== socket) return null
	if (
		typeof client.isConnectedToRoom !== 'boolean' ||
		typeof client.store?._flushHistory !== 'function' ||
		typeof client.fpsScheduler?.flush !== 'function' ||
		!Array.isArray(client.pendingPushRequests)
	) {
		return null
	}
	return client
}

/**
 * Sends local changes now and resolves once the server has answered them, having applied whatever it
 * sent first. Resolves `true` when committed or when there was nothing to send, and `false` when
 * offline, discarded, or the connection dropped first. Unanswered changes are sent again on reconnect.
 */
export function createFlushChanges(
	socket: Pick<ClientWebSocketAdapter, 'onReceiveMessage' | 'onStatusChange'>,
	client: SyncClientInternals
) {
	return function flushChanges(): Promise<boolean> {
		if (!client.isConnectedToRoom) return Promise.resolve(false)
		// The history flush hands the client every local change; the scheduler flush runs the rebase
		// and send it has queued for a frame.
		client.store._flushHistory()
		client.fpsScheduler.flush()
		if (!client.isConnectedToRoom) return Promise.resolve(false)
		const lastPush = client.pendingPushRequests.at(-1)
		if (!lastPush) return Promise.resolve(true)
		return new Promise((resolve) => {
			const settle = (committed: boolean) => {
				stopMessages()
				stopStatus()
				// The client buffered the answer for a frame too; apply it so the store is current.
				if (committed) client.fpsScheduler.flush()
				resolve(committed)
			}
			const stopMessages = socket.onReceiveMessage((message) => {
				const action = findPushResult(message, lastPush.clientClock)
				if (action) settle(action !== 'discard')
			})
			const stopStatus = socket.onStatusChange((event) => {
				if (event.status !== 'online') settle(false)
			})
		})
	}
}

function findPushResult(message: TLSocketServerSentEvent<TLRecord>, clientClock: number) {
	const events = message.type === 'data' ? message.data : [message]
	for (const event of events) {
		if (event.type === 'push_result' && event.clientClock === clientClock) return event.action
	}
	return null
}

/**
 * Caps the wait between reconnection attempts while the tab is hidden, which is five minutes by
 * default. Returns false if the reconnect manager has changed shape and the cap couldn't be applied.
 */
export function capHiddenReconnectDelay(socket: ClientWebSocketAdapter, maxMs: number) {
	const manager = socket._reconnectManager as unknown as { getMaxDelay?(): number }
	const getMaxDelay = manager.getMaxDelay
	if (typeof getMaxDelay !== 'function') return false
	manager.getMaxDelay = () => Math.min(getMaxDelay.call(manager), maxMs)
	return true
}

/**
 * Closes the socket with `code`, which `_closeSocket` can't pass on. The adapter reconnects as after
 * any manual close.
 */
export function closeSocketWithCode(socket: ClientWebSocketAdapter, code: number, reason: string) {
	socket._ws?.close(code, reason)
	socket._closeSocket()
}
