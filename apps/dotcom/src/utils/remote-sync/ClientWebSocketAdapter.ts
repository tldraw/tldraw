import { atom, Atom, TLRecord } from '@tldraw/tldraw'
import {
	chunk,
	serializeMessage,
	TLPersistentClientSocket,
	TLPersistentClientSocketStatus,
	TLSocketClientSentEvent,
	TLSocketServerSentEvent,
} from '@tldraw/tlsync'
import { assert } from '@tldraw/utils'

function listenTo<T extends EventTarget>(target: T, event: string, handler: () => void) {
	target.addEventListener(event, handler)
	return () => {
		target.removeEventListener(event, handler)
	}
}

function debug(...args: any[]) {
	// @ts-ignore
	if (typeof window !== 'undefined' && window.__tldraw_socket_debug) {
		// eslint-disable-next-line no-console
		console.log(...args, new Error().stack)
	}
}

export class ClientWebSocketAdapter implements TLPersistentClientSocket<TLRecord> {
	_ws: WebSocket | null = null

	isDisposed = false

	readonly _reconnectManager: ReconnectManager

	// TODO: .close should be a project-wide interface with a common contract (.close()d thing
	//       can only be garbage collected, and can't be used anymore)
	close() {
		this.isDisposed = true
		this._reconnectManager.close()
		//  WebSocket.close() is idempotent
		this._ws?.close()
	}

	// TODO: this constructor is an adhoc interface; maybe it should be in TLPersistentClientSocket?)
	constructor(getUri: () => Promise<string> | string) {
		this._reconnectManager = new ReconnectManager(this, getUri)
	}

	private handleConnect() {
		debug('handleConnect')
		this._connectionStatus.set('online')
		this.statusListeners.forEach((cb) => cb('online'))

		this._reconnectManager.connected()
	}

	private handleDisconnect(status: 'offline' | 'error') {
		debug('handleDisconnect', status, this.connectionStatus)

		if (
			// it the status changed
			this.connectionStatus !== status &&
			// ignore errors if we're already in the offline state
			!(status === 'error' && this.connectionStatus === 'offline')
		) {
			this._connectionStatus.set(status)
			this.statusListeners.forEach((cb) => cb(status))
		}

		this._reconnectManager.disconnected()
	}

	setNewSocket(ws: WebSocket) {
		assert(!this.isDisposed, 'Tried to set a new websocket on a disposed socket')
		assert(
			this._ws === null ||
				this._ws.readyState === WebSocket.CLOSED ||
				this._ws.readyState === WebSocket.CLOSING,
			`Tried to set a new websocket in when the existing one was ${this._ws?.readyState}`
		)

		ws.onopen = () => {
			debug('ws.onopen')
			this.handleConnect()
		}
		ws.onclose = () => {
			debug('ws.onclose')
			this.handleDisconnect('offline')
		}
		ws.onerror = () => {
			debug('ws.onerror')
			this.handleDisconnect('error')
		}
		ws.onmessage = (ev) => {
			const parsed = JSON.parse(ev.data.toString())
			this.messageListeners.forEach((cb) => cb(parsed))
		}

		this._ws = ws
	}

	// TLPersistentClientSocket stuff

	_connectionStatus: Atom<TLPersistentClientSocketStatus | 'initial'> = atom(
		'websocket connection status',
		'initial'
	)

	// eslint-disable-next-line no-restricted-syntax
	get connectionStatus(): TLPersistentClientSocketStatus {
		const status = this._connectionStatus.get()
		return status === 'initial' ? 'offline' : status
	}

	sendMessage(msg: TLSocketClientSentEvent<TLRecord>) {
		assert(!this.isDisposed, 'Tried to send message on a disposed socket')

		if (!this._ws) return
		if (this.connectionStatus === 'online') {
			const chunks = chunk(serializeMessage(msg))
			for (const part of chunks) {
				this._ws.send(part)
			}
		} else {
			console.warn('Tried to send message while ' + this.connectionStatus)
		}
	}

	private messageListeners = new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>()
	onReceiveMessage(cb: (val: TLSocketServerSentEvent<TLRecord>) => void) {
		assert(!this.isDisposed, 'Tried to add message listener on a disposed socket')

		this.messageListeners.add(cb)
		return () => {
			this.messageListeners.delete(cb)
		}
	}

	private statusListeners = new Set<(status: TLPersistentClientSocketStatus) => void>()
	onStatusChange(cb: (val: TLPersistentClientSocketStatus) => void) {
		assert(!this.isDisposed, 'Tried to add status listener on a disposed socket')

		this.statusListeners.add(cb)
		return () => {
			this.statusListeners.delete(cb)
		}
	}

	restart() {
		assert(!this.isDisposed, 'Tried to restart a disposed socket')
		debug('restarting')

		this._ws?.close()
		// reconnection will be handled by the ReconnectManager
	}
}

class ReconnectManager {
	// todo: use CONST_VALUES
	private readonly activeMinDelay = 500
	private readonly activeMaxDelay = 2000
	readonly inactiveMinDelay = 1000
	private readonly inactiveMaxDelay = 1000 * 60 * 5
	private readonly delayExp = 1.5
	private readonly attemptTimeout = 1000

	private isDisposed = false
	private disposables: (() => void)[] = [
		() => {
			if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
			if (this.recheckConnectingTimeout) clearTimeout(this.recheckConnectingTimeout)
		},
	]
	private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
	private recheckConnectingTimeout: ReturnType<typeof setTimeout> | null = null

	private lastAttemptStart: number | null = null
	intendedDelay: number = this.activeMinDelay
	private state: 'pendingAttempt' | 'pendingAttemptResult' | 'delay' | 'connected'

	constructor(
		private socketAdapter: ClientWebSocketAdapter,
		private getUri: () => Promise<string> | string
	) {
		this.disposables.push(
			listenTo(window, 'online', () => {
				debug('window went online')
				this.maybeReconnected()
			}),
			listenTo(document, 'visibilitychange', () => {
				if (!document.hidden) {
					debug('document became visible')

					this.maybeReconnected()
				}
			})
		)

		if (Object.prototype.hasOwnProperty.call(navigator, 'connection')) {
			const connection = (navigator as any)['connection'] as EventTarget
			this.disposables.push(
				listenTo(connection, 'change', () => {
					debug('navigator.connection change')
					this.maybeReconnected()
				})
			)
		}

		this.state = 'pendingAttempt'
		this.intendedDelay = this.activeMinDelay
		this.scheduleAttempt()
	}

	private scheduleAttempt() {
		assert(this.state === 'pendingAttempt')
		Promise.resolve(this.getUri()).then((uri) => {
			// this can happen if the promise gets resolved too late
			if (this.state !== 'pendingAttempt' || this.isDisposed) return

			this.lastAttemptStart = Date.now()
			this.socketAdapter.setNewSocket(new WebSocket(uri))
			this.state = 'pendingAttemptResult'
		})
	}

	private getMaxDelay() {
		return document.hidden ? this.inactiveMaxDelay : this.activeMaxDelay
	}

	private getMinDelay() {
		return document.hidden ? this.inactiveMinDelay : this.activeMinDelay
	}

	private clearReconnectTimeout() {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout)
			this.reconnectTimeout = null
		}
	}

	private clearRecheckConnectingTimeout() {
		if (this.recheckConnectingTimeout) {
			clearTimeout(this.recheckConnectingTimeout)
			this.recheckConnectingTimeout = null
		}
	}

	private maybeReconnected() {
		// It doesn't make sense to have another check scheduled if we're already checking it now.
		// If we have a CONNECTING check scheduled and relevant, it'll be recreated below anyway
		this.clearRecheckConnectingTimeout()

		// readyState can be CONNECTING, OPEN, CLOSING, CLOSED, or null (if getUri() is still pending)
		if (this.socketAdapter._ws?.readyState === WebSocket.OPEN) {
			// nothing to do, we're already OK
			return
		}

		if (this.socketAdapter._ws?.readyState === WebSocket.CONNECTING) {
			// We might be waiting for a TCP connection that sent SYN out and will never get it back,
			// while a new connection appeared. On the other hand, we might have just started connecting
			// and will succeed in a bit. Thus, we're checking how old the attempt is and retry anew
			// if it's old enough. This by itself can delay the connection a bit, but shouldn't prevent
			// new connections as long as `maybeReconnected` is not looped itself
			assert(
				this.lastAttemptStart,
				'ReadyState=CONNECTING without lastAttemptStart should be impossible'
			)
			const sinceLastStart = Date.now() - this.lastAttemptStart
			if (sinceLastStart < this.attemptTimeout) {
				this.recheckConnectingTimeout = setTimeout(
					() => this.maybeReconnected(),
					this.attemptTimeout - sinceLastStart
				)
			} else {
				// Last connection attempt was started a while ago, it's possible that network conditions
				// changed, and it's worth retrying to connect. `disconnected` will handle reconnection
				//
				// NOTE: The danger here is looping in connection attemps if connections are slow.
				//       Make sure that `maybeReconnected` is not called in the `disconnected` codepath!
				this.clearRecheckConnectingTimeout()
				this.socketAdapter._ws?.close()
			}

			return
		}

		// readyState is CLOSING or CLOSED, or the websocket is null
		// Restart the backoff and retry ASAP (honouring the min delay)
		// this.state doesn't really matter, because disconnected() will handle any state correctly
		this.intendedDelay = this.activeMinDelay
		this.disconnected()
	}

	disconnected() {
		// This either means we're freshly disconnected, or the last connection attempt failed;
		// either way, time to try again.

		// Guard against delayed notifications and recheck synchronously
		if (
			this.socketAdapter._ws?.readyState !== WebSocket.OPEN &&
			this.socketAdapter._ws?.readyState !== WebSocket.CONNECTING
		) {
			this.clearReconnectTimeout()

			let delayLeft
			if (this.state === 'connected') {
				// it's the first sign that we got disconnected; the state will be updated below,
				// just set the appropriate delay for now
				this.intendedDelay = this.getMinDelay()
				delayLeft = this.intendedDelay
			} else {
				delayLeft =
					this.lastAttemptStart !== null
						? this.lastAttemptStart + this.intendedDelay - Date.now()
						: 0
			}

			if (delayLeft > 0) {
				// try again later
				this.state = 'delay'

				this.reconnectTimeout = setTimeout(() => this.disconnected(), delayLeft)
			} else {
				// not connected and not delayed, time to retry
				this.state = 'pendingAttempt'

				this.intendedDelay = Math.min(
					this.getMaxDelay(),
					Math.max(this.getMinDelay(), this.intendedDelay) * this.delayExp
				)
				this.scheduleAttempt()
			}
		}
	}

	connected() {
		// this notification cold've been delayed, recheck synchronously
		if (this.socketAdapter._ws?.readyState === WebSocket.OPEN) {
			this.state = 'connected'
			this.clearReconnectTimeout()
			this.intendedDelay = this.activeMinDelay
		}
	}

	close() {
		this.clearReconnectTimeout()
		this.clearRecheckConnectingTimeout()
		this.disposables.forEach((d) => d())
		this.isDisposed = true
	}
}
