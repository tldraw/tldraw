import {
	TLAuthorizerSession,
	TLObjectStoreAccess,
	TLPersistentClientSocket,
	TLSocketRoom,
	TLSocketStatusChangeEvent,
	TLSyncErrorCloseEventCode,
	TLSyncErrorCloseEventReason,
	WebSocketMinimal,
} from '@tldraw/sync'
import { atom } from 'tldraw'

/**
 * A client socket that talks to a `TLSocketRoom` in the same browser tab, so this example needs no
 * server. A real app connects to its server with `useSync({ uri })` instead. On every (re)connect
 * it asks the host for the session's current access, as a real server does at the WebSocket
 * upgrade.
 */
export class InMemoryClientSocket<Meta> implements TLPersistentClientSocket<any, any> {
	connectionStatus: 'online' | 'offline' | 'error' = 'offline'
	private messageListeners = new Set<(msg: any) => void>()
	private statusListeners = new Set<(ev: TLSocketStatusChangeEvent) => void>()
	private server: { listeners: Map<string, Set<(ev: any) => void>>; closed: boolean } | null = null

	constructor(
		private readonly room: TLSocketRoom<any, Meta>,
		readonly sessionId: string,
		/** `null` refuses the connection, as a server does for a person with no access. */
		private readonly getAccess: () => {
			meta: Meta
			isReadonly: boolean
			objectAccess: TLObjectStoreAccess
		} | null,
		/** The access that the server gave the current connection. */
		readonly session = atom<TLAuthorizerSession<Meta> | null>('session', null)
	) {
		queueMicrotask(() => this.connect())
	}

	private disposed = false

	private connect() {
		if (this.disposed) return
		const access = this.getAccess()
		if (!access) {
			this.session.set(null)
			queueMicrotask(() =>
				this.setStatus({ status: 'error', reason: TLSyncErrorCloseEventReason.FORBIDDEN })
			)
			return
		}
		const server = { listeners: new Map<string, Set<(ev: any) => void>>(), closed: false }
		this.server = server
		const ws: WebSocketMinimal = {
			readyState: 1,
			addEventListener: (type, fn) => {
				if (!server.listeners.has(type)) server.listeners.set(type, new Set())
				server.listeners.get(type)!.add(fn)
			},
			removeEventListener: (type, fn) => server.listeners.get(type)?.delete(fn),
			send: (data) => {
				if (server.closed) return
				const msg = JSON.parse(data)
				queueMicrotask(() => {
					if (server.closed) return
					this.messageListeners.forEach((l) => l(msg))
				})
			},
			close: (code, reason) => {
				if (server.closed) return
				server.closed = true
				ws.readyState = 3
				queueMicrotask(() => {
					if (code === TLSyncErrorCloseEventCode) {
						this.setStatus({ status: 'error', reason: reason ?? 'error' })
					} else {
						// the server closed the socket: reconnect with fresh access
						this.setStatus({ status: 'offline' })
						setTimeout(() => this.connect(), 10)
					}
				})
			},
		}
		this.room.handleSocketConnect({
			sessionId: this.sessionId,
			socket: ws,
			meta: access.meta,
			isReadonly: access.isReadonly,
			objectAccess: access.objectAccess,
		} as any)
		this.session.set({
			sessionId: this.sessionId,
			isReadonly: access.isReadonly,
			meta: access.meta,
		})
		this.setStatus({ status: 'online' })
	}

	private setStatus(ev: TLSocketStatusChangeEvent) {
		this.connectionStatus = ev.status
		this.statusListeners.forEach((l) => l(ev))
	}

	sendMessage(msg: any) {
		const server = this.server
		if (!server || server.closed) return
		const data = JSON.stringify(msg)
		queueMicrotask(() => {
			if (server.closed) return
			server.listeners.get('message')?.forEach((l) => l({ data }))
		})
	}

	onReceiveMessage(cb: (msg: any) => void) {
		this.messageListeners.add(cb)
		return () => this.messageListeners.delete(cb)
	}

	onStatusChange(cb: (ev: TLSocketStatusChangeEvent) => void) {
		this.statusListeners.add(cb)
		return () => this.statusListeners.delete(cb)
	}

	restart() {
		this.disconnect()
		this.connect()
	}

	close() {
		this.disposed = true
		this.disconnect()
	}

	private disconnect() {
		const server = this.server
		if (!server || server.closed) return
		server.closed = true
		server.listeners.get('close')?.forEach((l) => l({}))
		this.setStatus({ status: 'offline' })
	}
}
