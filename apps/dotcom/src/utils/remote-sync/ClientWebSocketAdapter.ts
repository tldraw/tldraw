import { atom, Atom, TLRecord } from '@tldraw/tldraw'
import {
	chunk,
	serializeMessage,
	TLPersistentClientSocket,
	TLPersistentClientSocketStatus,
	TLSocketClientSentEvent,
	TLSocketServerSentEvent,
} from '@tldraw/tlsync'

function windowListen(...args: Parameters<typeof window.addEventListener>) {
	window.addEventListener(...args)
	return () => {
		window.removeEventListener(...args)
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

	wasManuallyClosed = false

	disposables: (() => void)[] = []

	close() {
		this.wasManuallyClosed = true
		this.disposables.forEach((d) => d())
		this._reconnectTimeout.clear()
		if (this._ws?.readyState === WebSocket.OPEN) {
			debug('close d')
			this._ws.close()
		}
	}

	constructor(private getUri: () => Promise<string> | string) {
		this.disposables.push(
			windowListen('online', () => {
				debug('window online')
				if (this.connectionStatus !== 'online') {
					this._reconnectTimeout.clear()
					this._attemptReconnect()
				}
			}),
			windowListen('offline', () => {
				debug('window offline')
				if (this.connectionStatus === 'online') {
					this._ws?.close()
					this._ws?.onclose?.(null as any)
				}
			}),
			windowListen('pointermove', () => {
				// if the pointer moves while we are offline, we should try to reconnect more
				// often than every 5 mins!
				if (this.connectionStatus !== 'online') {
					this._reconnectTimeout.userInteractionOccurred()
				}
			}),
			windowListen('keydown', () => {
				// if the user pressed a key while we are offline, we should try to reconnect more
				// often than every 5 mins!
				if (this.connectionStatus !== 'online') {
					this._reconnectTimeout.userInteractionOccurred()
				}
			})
		)
		this._reconnectTimeout.run()
	}

	private handleDisconnect(status: Exclude<TLPersistentClientSocketStatus, 'online'>) {
		debug('handleDisconnect', status, this.connectionStatus)
		if (
			// if the status is the same as before, don't do anything
			this.connectionStatus === status ||
			// if we receive an error we only care about it while we're in the initial state
			(status === 'error' && this.connectionStatus === 'offline')
		) {
			this._attemptReconnect()
			return
		}
		this._connectionStatus.set(status)
		this.statusListeners.forEach((cb) => cb(status))
		this._reconnectTimeout.clear()
		this._attemptReconnect()
	}

	private configureSocket() {
		const ws = this._ws
		if (!ws) return
		ws.onopen = () => {
			debug('ws.onopen')
			// ws might be opened multiple times so need to check that it wasn't already supplanted
			if (this._ws !== ws || this.wasManuallyClosed) {
				if (ws.readyState === WebSocket.OPEN) {
					debug('close a')
					ws.close()
				}
				return
			}
			this._connectionStatus.set('online')
			this.statusListeners.forEach((cb) => cb(this.connectionStatus))
			this._reconnectTimeout.clear()
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
	}

	readonly _reconnectTimeout = new ExponentialBackoffTimeout(async () => {
		debug('close b')
		this._ws?.close()
		this._ws = new WebSocket(await this.getUri())
		this.configureSocket()
	})

	_attemptReconnect() {
		debug('_attemptReconnect', this.wasManuallyClosed)
		if (this.wasManuallyClosed) {
			return
		}
		this._reconnectTimeout.run()
	}

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
		this.messageListeners.add(cb)
		return () => {
			this.messageListeners.delete(cb)
		}
	}

	private statusListeners = new Set<(status: TLPersistentClientSocketStatus) => void>()
	onStatusChange(cb: (val: TLPersistentClientSocketStatus) => void) {
		this.statusListeners.add(cb)
		return () => {
			this.statusListeners.delete(cb)
		}
	}

	restart() {
		debug('close c')
		this.close()
		this.wasManuallyClosed = false
		this._reconnectTimeout.clear()
		this._reconnectTimeout.runNow()
	}
}

class ExponentialBackoffTimeout {
	private timeout: NodeJS.Timeout | null = null
	private nextScheduledRunTimestamp = 0
	intervalLength: number

	constructor(
		private cb: () => Promise<void>,
		// five mins
		private readonly maxIdleIntervalLength: number = 1000 * 60 * 5,
		// five seconds
		private readonly maxInteractiveIntervalLength: number = 1000,
		private startIntervalLength: number = 500
	) {
		this.intervalLength = startIntervalLength
	}

	runNow() {
		this.cb()
	}

	run() {
		if (this.timeout) return
		this.timeout = setTimeout(() => {
			this.cb()
			this.intervalLength = Math.min(this.intervalLength * 2, this.maxIdleIntervalLength)
			if (this.timeout) {
				clearTimeout(this.timeout)
				this.timeout = null
			}
		}, this.intervalLength)
		this.nextScheduledRunTimestamp = Date.now() + this.intervalLength
	}

	clear() {
		this.intervalLength = this.startIntervalLength
		if (this.timeout) {
			clearTimeout(this.timeout)
			this.timeout = null
		}
	}

	userInteractionOccurred() {
		if (Date.now() + this.maxInteractiveIntervalLength < this.nextScheduledRunTimestamp) {
			this.clear()
			this.run()
		}
	}
}
