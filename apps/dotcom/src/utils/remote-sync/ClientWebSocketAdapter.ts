import {
	chunk,
	TLCloseEventCode,
	TLPersistentClientSocket,
	TLPersistentClientSocketStatus,
	TLSocketClientSentEvent,
	TLSocketServerSentEvent,
} from '@tldraw/tlsync'
import { assert } from '@tldraw/utils'
import { atom, Atom, TLRecord } from 'tldraw'

function listenTo<T extends EventTarget>(target: T, event: string, handler: () => void) {
	target.addEventListener(event, handler)
	return () => {
		target.removeEventListener(event, handler)
	}
}

function debug(...args: any[]) {
	// @ts-ignore
	if (typeof window !== 'undefined' && window.__tldraw_socket_debug) {
		const now = new Date()
		// eslint-disable-next-line no-console
		console.log(
			`${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`,
			...args
			//, new Error().stack
		)
	}
}

// NOTE: ClientWebSocketAdapter requires its users to implement their own connection loss
//       detection, for example by regularly pinging the server and .restart()ing
//       the connection when a number of pings goes unanswered. Without this mechanism,
//       we might not be able to detect the websocket connection going down in a timely manner
//       (it will probably time out on outgoing data packets at some point).
//
//       This is by design. Whilst the Websocket protocol specifies protocol-level pings,
//       they don't seem to be surfaced in browser APIs and can't be relied on. Therefore,
//       pings need to be implemented one level up, on the application API side, which for our
//       codebase means whatever code that uses ClientWebSocketAdapter.

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

	constructor(getUri: () => Promise<string> | string) {
		this._reconnectManager = new ReconnectManager(this, getUri)
	}

	private _handleConnect() {
		debug('handleConnect')

		this._connectionStatus.set('online')
		this.statusListeners.forEach((cb) => cb('online'))

		this._reconnectManager.connected()
	}

	private _handleDisconnect(reason: 'closed' | 'error' | 'manual', closeCode?: number) {
		debug('handleDisconnect', {
			currentStatus: this.connectionStatus,
			closeCode,
			reason,
		})

		let newStatus: 'offline' | 'error'
		switch (reason) {
			case 'closed':
				if (closeCode === TLCloseEventCode.NOT_FOUND) {
					newStatus = 'error'
					break
				}
				newStatus = 'offline'
				break
			case 'error':
				newStatus = 'error'
				break
			case 'manual':
				newStatus = 'offline'
				break
		}

		if (
			// it the status changed
			this.connectionStatus !== newStatus &&
			// ignore errors if we're already in the offline state
			!(newStatus === 'error' && this.connectionStatus === 'offline')
		) {
			this._connectionStatus.set(newStatus)
			this.statusListeners.forEach((cb) => cb(newStatus, closeCode))
		}

		this._reconnectManager.disconnected()
	}

	_setNewSocket(ws: WebSocket) {
		assert(!this.isDisposed, 'Tried to set a new websocket on a disposed socket')
		assert(
			this._ws === null ||
				this._ws.readyState === WebSocket.CLOSED ||
				this._ws.readyState === WebSocket.CLOSING,
			`Tried to set a new websocket in when the existing one was ${this._ws?.readyState}`
		)
		// NOTE: Sockets can stay for quite a while in the CLOSING state. This is because the transition
		//       between CLOSING and CLOSED happens either after the closing handshake, or after a
		//       timeout, but in either case those sockets don't need any special handling, the browser
		//       will close them eventually. We just "orphan" such sockets and ignore their onclose/onerror.
		ws.onopen = () => {
			debug('ws.onopen')
			assert(
				this._ws === ws,
				"sockets must only be orphaned when they are CLOSING or CLOSED, so they can't open"
			)
			this._handleConnect()
		}
		ws.onclose = (event: CloseEvent) => {
			debug('ws.onclose')
			if (this._ws === ws) {
				this._handleDisconnect('closed', event.code)
			} else {
				debug('ignoring onclose for an orphaned socket')
			}
		}
		ws.onerror = () => {
			debug('ws.onerror')
			if (this._ws === ws) {
				this._handleDisconnect('error')
			} else {
				debug('ignoring onerror for an orphaned socket')
			}
		}
		ws.onmessage = (ev) => {
			assert(
				this._ws === ws,
				"sockets must only be orphaned when they are CLOSING or CLOSED, so they can't receive messages"
			)
			const parsed = JSON.parse(ev.data.toString())
			this.messageListeners.forEach((cb) => cb(parsed))
		}

		this._ws = ws
	}

	_closeSocket() {
		if (this._ws === null) return

		this._ws.close()
		// explicitly orphan the socket to ignore its onclose/onerror, because onclose can be delayed
		this._ws = null
		this._handleDisconnect('manual')
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
			const chunks = chunk(JSON.stringify(msg))
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

	private statusListeners = new Set<
		(status: TLPersistentClientSocketStatus, closeCode?: number) => void
	>()
	onStatusChange(cb: (val: TLPersistentClientSocketStatus, closeCode?: number) => void) {
		assert(!this.isDisposed, 'Tried to add status listener on a disposed socket')

		this.statusListeners.add(cb)
		return () => {
			this.statusListeners.delete(cb)
		}
	}

	restart() {
		assert(!this.isDisposed, 'Tried to restart a disposed socket')
		debug('restarting')

		this._closeSocket()
		this._reconnectManager.maybeReconnected()
	}
}

// Those constants are exported primarily for tests
// ACTIVE_ means the tab is active, document.hidden is false
export const ACTIVE_MIN_DELAY = 500
export const ACTIVE_MAX_DELAY = 2000
// Correspondingly, here document.hidden is true. It's intended to reduce the load and battery drain
// on client devices somewhat when they aren't looking at the tab. We don't disconnect completely
// to minimise issues with reconnection/sync when the tab becomes visible again
export const INACTIVE_MIN_DELAY = 1000
export const INACTIVE_MAX_DELAY = 1000 * 60 * 5
export const DELAY_EXPONENT = 1.5
// this is a tradeoff between quickly detecting connections stuck in the CONNECTING state and
// not needlessly reconnecting if the connection is just slow to establish
export const ATTEMPT_TIMEOUT = 1000

class ReconnectManager {
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
	intendedDelay: number = ACTIVE_MIN_DELAY
	private state: 'pendingAttempt' | 'pendingAttemptResult' | 'delay' | 'connected'

	constructor(
		private socketAdapter: ClientWebSocketAdapter,
		private getUri: () => Promise<string> | string
	) {
		this.subscribeToReconnectHints()

		this.disposables.push(
			listenTo(window, 'offline', () => {
				debug('window went offline')
				// On the one hand, 'offline' event is not really reliable; on the other, the only
				// alternative is to wait for pings not being delivered, which takes more than 20 seconds,
				// which means we won't see the ClientWebSocketAdapter status change for more than
				// 20 seconds after the tab goes offline. Our application layer must be resistent to
				// connection restart anyway, so we can just try to reconnect and see if
				// we're truly offline.
				this.socketAdapter._closeSocket()
			})
		)

		this.state = 'pendingAttempt'
		this.intendedDelay = ACTIVE_MIN_DELAY
		this.scheduleAttempt()
	}

	private subscribeToReconnectHints() {
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
	}

	private scheduleAttempt() {
		assert(this.state === 'pendingAttempt')
		debug('scheduling a connection attempt')
		Promise.resolve(this.getUri()).then((uri) => {
			// this can happen if the promise gets resolved too late
			if (this.state !== 'pendingAttempt' || this.isDisposed) return
			assert(
				this.socketAdapter._ws?.readyState !== WebSocket.OPEN,
				'There should be no connection attempts while already connected'
			)

			this.lastAttemptStart = Date.now()
			this.socketAdapter._setNewSocket(new WebSocket(uri))
			this.state = 'pendingAttemptResult'
		})
	}

	private getMaxDelay() {
		return document.hidden ? INACTIVE_MAX_DELAY : ACTIVE_MAX_DELAY
	}

	private getMinDelay() {
		return document.hidden ? INACTIVE_MIN_DELAY : ACTIVE_MIN_DELAY
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

	maybeReconnected() {
		debug('ReconnectManager.maybeReconnected')
		// It doesn't make sense to have another check scheduled if we're already checking it now.
		// If we have a CONNECTING check scheduled and relevant, it'll be recreated below anyway
		this.clearRecheckConnectingTimeout()

		// readyState can be CONNECTING, OPEN, CLOSING, CLOSED, or null (if getUri() is still pending)
		if (this.socketAdapter._ws?.readyState === WebSocket.OPEN) {
			debug('ReconnectManager.maybeReconnected: already connected')
			// nothing to do, we're already OK
			return
		}

		if (this.socketAdapter._ws?.readyState === WebSocket.CONNECTING) {
			debug('ReconnectManager.maybeReconnected: connecting')
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
			if (sinceLastStart < ATTEMPT_TIMEOUT) {
				debug('ReconnectManager.maybeReconnected: connecting, rechecking later')
				this.recheckConnectingTimeout = setTimeout(
					() => this.maybeReconnected(),
					ATTEMPT_TIMEOUT - sinceLastStart
				)
			} else {
				debug('ReconnectManager.maybeReconnected: connecting, but for too long, retry now')
				// Last connection attempt was started a while ago, it's possible that network conditions
				// changed, and it's worth retrying to connect. `disconnected` will handle reconnection
				//
				// NOTE: The danger here is looping in connection attemps if connections are slow.
				//       Make sure that `maybeReconnected` is not called in the `disconnected` codepath!
				this.clearRecheckConnectingTimeout()
				this.socketAdapter._closeSocket()
			}

			return
		}

		debug('ReconnectManager.maybeReconnected: closing/closed/null, retry now')
		// readyState is CLOSING or CLOSED, or the websocket is null
		// Restart the backoff and retry ASAP (honouring the min delay)
		// this.state doesn't really matter, because disconnected() will handle any state correctly
		this.intendedDelay = ACTIVE_MIN_DELAY
		this.disconnected()
	}

	disconnected() {
		debug('ReconnectManager.disconnected')
		// This either means we're freshly disconnected, or the last connection attempt failed;
		// either way, time to try again.

		// Guard against delayed notifications and recheck synchronously
		if (
			this.socketAdapter._ws?.readyState !== WebSocket.OPEN &&
			this.socketAdapter._ws?.readyState !== WebSocket.CONNECTING
		) {
			debug('ReconnectManager.disconnected: websocket is not OPEN or CONNECTING')
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
				debug('ReconnectManager.disconnected: delaying, delayLeft', delayLeft)
				// try again later
				this.state = 'delay'

				this.reconnectTimeout = setTimeout(() => this.disconnected(), delayLeft)
			} else {
				// not connected and not delayed, time to retry
				this.state = 'pendingAttempt'

				this.intendedDelay = Math.min(
					this.getMaxDelay(),
					Math.max(this.getMinDelay(), this.intendedDelay) * DELAY_EXPONENT
				)
				debug(
					'ReconnectManager.disconnected: attempting a connection, next delay',
					this.intendedDelay
				)
				this.scheduleAttempt()
			}
		}
	}

	connected() {
		debug('ReconnectManager.connected')
		// this notification could've been delayed, recheck synchronously
		if (this.socketAdapter._ws?.readyState === WebSocket.OPEN) {
			debug('ReconnectManager.connected: websocket is OPEN')
			this.state = 'connected'
			this.clearReconnectTimeout()
			this.intendedDelay = ACTIVE_MIN_DELAY
		}
	}

	close() {
		this.disposables.forEach((d) => d())
		this.isDisposed = true
	}
}
