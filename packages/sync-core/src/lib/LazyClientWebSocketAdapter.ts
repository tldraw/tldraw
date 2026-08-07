import { Atom, atom } from '@tldraw/state'
import { TLRecord } from '@tldraw/tlschema'
import { ClientWebSocketAdapter } from './ClientWebSocketAdapter'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from './protocol'
import {
	TLPersistentClientSocket,
	TLSocketStatusChangeEvent,
	TLSocketStatusListener,
} from './TLSyncClient'

/**
 * A `TLPersistentClientSocket` that stays detached ('offline') until told to dial. Used by the
 * lazy board transport: the sync client is constructed against this adapter at mount so it
 * captures user edits as speculative changes from the first keystroke, but no websocket exists —
 * and no server room boots — until {@link LazyClientWebSocketAdapter.connectNow} is called.
 *
 * `ClientWebSocketAdapter` cannot be used directly because its constructor eagerly schedules a
 * connection attempt; this facade constructs one lazily and forwards listeners registered while
 * detached.
 *
 * @internal
 */
export class LazyClientWebSocketAdapter implements TLPersistentClientSocket<
	TLSocketClientSentEvent<TLRecord>,
	TLSocketServerSentEvent<TLRecord>
> {
	private inner: ClientWebSocketAdapter | null = null
	private isDisposed = false
	private readonly messageListeners = new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>()
	private readonly statusListeners = new Set<TLSocketStatusListener>()
	private readonly innerUnsubscribes: Array<() => void> = []

	/** Reactive flag for presentation code: has a dial been requested yet? */
	readonly didRequestConnect: Atom<boolean> = atom('didRequestConnect', false)

	constructor(private readonly getUri: () => Promise<string> | string) {}

	/**
	 * Construct the real websocket adapter and start connecting. Idempotent; a no-op after
	 * `close()`. Listeners registered while detached are forwarded to the inner adapter.
	 */
	connectNow(): void {
		if (this.isDisposed || this.inner) return
		this.didRequestConnect.set(true)
		const inner = new ClientWebSocketAdapter(this.getUri)
		this.inner = inner
		this.innerUnsubscribes.push(
			inner.onReceiveMessage((msg) => {
				for (const listener of this.messageListeners) listener(msg)
			}),
			inner.onStatusChange((event) => {
				for (const listener of this.statusListeners) listener(event)
			})
		)
	}

	// eslint-disable-next-line tldraw/no-setter-getter
	get connectionStatus(): 'online' | 'offline' | 'error' {
		return this.inner?.connectionStatus ?? 'offline'
	}

	sendMessage(msg: TLSocketClientSentEvent<TLRecord>) {
		if (!this.inner) {
			// Mirrors ClientWebSocketAdapter's behavior when offline: the sync client only sends
			// while it believes the room is connected, so this indicates a bug.
			console.warn('Tried to send message while detached', msg)
			return
		}
		this.inner.sendMessage(msg)
	}

	onReceiveMessage(cb: (msg: TLSocketServerSentEvent<TLRecord>) => void) {
		this.messageListeners.add(cb)
		return () => {
			this.messageListeners.delete(cb)
		}
	}

	onStatusChange(cb: (event: TLSocketStatusChangeEvent) => void) {
		this.statusListeners.add(cb)
		return () => {
			this.statusListeners.delete(cb)
		}
	}

	restart() {
		if (this.inner) {
			this.inner.restart()
		} else {
			this.connectNow()
		}
	}

	close() {
		this.isDisposed = true
		for (const unsubscribe of this.innerUnsubscribes) unsubscribe()
		this.innerUnsubscribes.length = 0
		this.messageListeners.clear()
		this.statusListeners.clear()
		this.inner?.close()
		this.inner = null
	}
}
