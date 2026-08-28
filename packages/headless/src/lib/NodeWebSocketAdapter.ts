import {
	TLPersistentClientSocket,
	TLSocketStatusChangeEvent,
	TLSyncErrorCloseEventCode,
	chunk,
} from '@tldraw/sync-core'
import { warnOnce } from '@tldraw/utils'

/**
 * The socket type {@link connectHeadlessEditor} accepts. Message payloads are typed `any`
 * because the sync protocol's message types are internal to sync-core.
 *
 * @public
 */
export type TLHeadlessClientSocket = TLPersistentClientSocket<any, any>

/** @public */
export interface NodeWebSocketAdapterOptions {
	/** Initial reconnection delay in milliseconds. Defaults to 500. */
	minReconnectDelay?: number
	/** Reconnection delay ceiling in milliseconds. Defaults to 10,000. */
	maxReconnectDelay?: number
}

function httpToWs(url: string) {
	return url.replace(/^http(s)?:/, 'ws$1:')
}

/**
 * A `TLPersistentClientSocket` for Node.js, built on the global `WebSocket` (Node 22+). It
 * reconnects with plain exponential backoff, since the browser adapter's reconnection cues
 * (document visibility, online and offline events) don't exist in Node. Connection failures
 * feed the retry loop rather than escaping as unhandled rejections.
 *
 * Note: an open connection keeps the process alive until `close()` is called.
 *
 * @public
 */
export class NodeWebSocketAdapter implements TLHeadlessClientSocket {
	private ws: WebSocket | null = null
	private isDisposed = false
	private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
	// Bumped by connect/restart/close so a connect whose async getUri resolves late can tell
	// it has been superseded. Without this, restart() during an in-flight connect ends with
	// two bound sockets, one orphaned and never closed.
	private connectSeq = 0
	private readonly minDelay: number
	private readonly maxDelay: number
	private delay: number

	connectionStatus: 'online' | 'offline' | 'error' = 'offline'

	constructor(
		private readonly getUri: () => string | Promise<string>,
		opts: NodeWebSocketAdapterOptions = {}
	) {
		this.minDelay = opts.minReconnectDelay ?? 500
		this.maxDelay = opts.maxReconnectDelay ?? 10_000
		this.delay = this.minDelay
		this.connect()
	}

	private messageListeners = new Set<(msg: any) => void>()
	private statusListeners = new Set<(event: TLSocketStatusChangeEvent) => void>()

	private setStatus(status: 'online' | 'offline' | 'error', reason?: string) {
		if (this.connectionStatus === status) return
		this.connectionStatus = status
		this.statusListeners.forEach((cb) =>
			cb(status === 'error' ? { status, reason: reason ?? 'unknown error' } : { status })
		)
	}

	private connect() {
		if (this.isDisposed) return
		const seq = ++this.connectSeq
		Promise.resolve()
			.then(() => this.getUri())
			.then((uri) => {
				if (this.isDisposed || seq !== this.connectSeq) return
				this.bindSocket(new WebSocket(httpToWs(uri)))
			})
			.catch((error) => {
				// A rejecting uri thunk (or a synchronously-throwing WebSocket constructor) is a
				// connection failure like any other: without this catch it would surface as an
				// unhandled rejection, which kills a Node process by default.
				if (this.isDisposed) return
				warnOnce(`tldraw: websocket connection attempt failed: ${error}`)
				this.scheduleReconnect()
			})
	}

	private bindSocket(ws: WebSocket) {
		this.ws?.close()
		this.ws = ws
		// Each handler ignores events from sockets it has replaced: a closing socket can emit a
		// paired error+close, and acting on both would double-schedule reconnection.
		ws.onopen = () => {
			if (this.ws !== ws) return
			this.delay = this.minDelay
			this.setStatus('online')
		}
		ws.onclose = (event: CloseEvent) => {
			if (this.ws !== ws) return
			this.ws = null
			if (event.code === TLSyncErrorCloseEventCode) {
				// The server rejected this client outright (e.g. auth); retrying would loop forever.
				this.setStatus('error', event.reason)
				return
			}
			this.setStatus('offline')
			this.scheduleReconnect()
		}
		ws.onerror = () => {
			if (this.ws !== ws) return
			// Orphan the socket before doing anything else: a failed connection can emit
			// error and close in either order (and undici fires another error from close()),
			// so acting on both — or closing from inside the error handler — loops.
			this.ws = null
			this.setStatus('offline')
			this.scheduleReconnect()
		}
		ws.onmessage = (event) => {
			if (this.ws !== ws) return
			let message: any
			try {
				message = JSON.parse(event.data.toString())
			} catch {
				// Corrupt data means we can't trust that we're still in sync; a restart re-hydrates
				// from the last known server clock instead of silently desyncing.
				warnOnce('tldraw: received malformed WebSocket message. Restarting the connection.')
				this.restart()
				return
			}
			this.messageListeners.forEach((cb) => cb(message))
		}
	}

	private scheduleReconnect() {
		if (this.isDisposed || this.reconnectTimeout) return
		this.reconnectTimeout = setTimeout(() => {
			this.reconnectTimeout = null
			this.connect()
		}, this.delay)
		this.delay = Math.min(this.maxDelay, this.delay * 2)
	}

	sendMessage(msg: object) {
		if (this.isDisposed) throw new Error('Tried to send message on a disposed socket')
		if (!this.ws || this.connectionStatus !== 'online') {
			warnOnce('tldraw: tried to send a message while ' + this.connectionStatus)
			return
		}
		for (const part of chunk(JSON.stringify(msg))) {
			this.ws.send(part)
		}
	}

	onReceiveMessage(cb: (msg: any) => void): () => void {
		this.messageListeners.add(cb)
		return () => {
			this.messageListeners.delete(cb)
		}
	}

	onStatusChange(cb: (event: TLSocketStatusChangeEvent) => void): () => void {
		this.statusListeners.add(cb)
		return () => {
			this.statusListeners.delete(cb)
		}
	}

	restart() {
		if (this.isDisposed) return
		this.connectSeq++
		const ws = this.ws
		this.ws = null
		ws?.close()
		if (this.connectionStatus !== 'error') {
			this.setStatus('offline')
			this.delay = this.minDelay
			this.scheduleReconnect()
		}
	}

	close() {
		if (this.isDisposed) return
		this.isDisposed = true
		this.connectSeq++
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout)
			this.reconnectTimeout = null
		}
		const ws = this.ws
		this.ws = null
		ws?.close()
		this.setStatus('offline')
	}
}
