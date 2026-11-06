import {
	TLPersistentClientSocket,
	TLSocketClientSentEvent,
	TLSocketRoom,
	TLSocketServerSentEvent,
	TLSocketStatusChangeEvent,
	TLSyncErrorCloseEventCode,
	UseSyncConnectFn,
	WebSocketMinimal,
} from '@tldraw/sync'
import { TLRecord, atom } from 'tldraw'
import { Meta } from './access'

type ClientSocket = TLPersistentClientSocket<
	TLSocketClientSentEvent<TLRecord>,
	TLSocketServerSentEvent<TLRecord>
>

/** What the app decides at connect time: the same options a real server passes to `handleSocketConnect`. */
export type ConnectDecision =
	| { allow: false }
	| {
			allow: true
			isReadonly: boolean
			objectAccess: 'read' | 'write'
			meta: Meta
	  }

// The latency of the fake network. Long enough that a rejected write visibly shows, then reverts,
// the way it does over a real connection.
const LATENCY_MS = 60

/**
 * A `TLSocketRoom` that runs in the browser, with an in-memory "network" between it and each
 * editor. Everything the room does is the real server code: only the WebSocket is fake. Each
 * editor connects through {@link LocalRoom.connect}, with its own session id, and the app's
 * `resolve` callback decides the session options on every connect, so a reconnect picks up a
 * new role.
 */
export class LocalRoom {
	// An atom, so a client check that reads the grant runs again when the user reconnects.
	private readonly granted = atom<Record<string, ConnectDecision>>('granted', {})

	constructor(
		readonly room: TLSocketRoom<TLRecord, Meta>,
		private readonly resolve: (userId: string) => ConnectDecision
	) {}

	/** A `connect` function for `useSync`. */
	connect(userId: string): UseSyncConnectFn {
		return () => new LocalClientSocket(this, userId)
	}

	/** Apply new access for a user: close their sessions, so their clients reconnect and resolve again. */
	reconnect(userId: string) {
		for (const session of this.room.getSessions()) {
			if (session.sessionId.startsWith(`${userId}:`)) this.room.closeSession(session.sessionId)
		}
	}

	/**
	 * What the user's session was given when it last connected. A client's own checks use this,
	 * not the app's current state, so they agree with the server until the session reconnects.
	 */
	grantFor(userId: string) {
		return this.granted.get()[userId]
	}

	/** @internal */
	_open(userId: string, client: LocalClientSocket): FakeServerSocket | null {
		const decision = this.resolve(userId)
		this.granted.update((g) => ({ ...g, [userId]: decision }))
		if (!decision.allow) return null
		const sessionId = `${userId}:${client.id}`
		const socket = new FakeServerSocket(client)
		this.room.handleSocketConnect({
			sessionId,
			socket,
			isReadonly: decision.isReadonly,
			objectAccess: decision.objectAccess,
			meta: decision.meta,
		})
		return socket
	}

	close() {
		this.room.close()
	}
}

let nextClientId = 1

/** The server's end of the fake WebSocket. */
class FakeServerSocket implements WebSocketMinimal {
	readyState = 1
	private readonly listeners = {
		message: new Set<any>(),
		close: new Set<any>(),
		error: new Set<any>(),
	}

	private clientGone = false

	constructor(private readonly client: LocalClientSocket) {}

	addEventListener(type: 'message' | 'close' | 'error', listener: (event: any) => void) {
		this.listeners[type].add(listener)
	}
	removeEventListener(type: 'message' | 'close' | 'error', listener: (event: any) => void) {
		this.listeners[type].delete(listener)
	}

	/** The room sends a message to the client. */
	send(data: string) {
		if (this.readyState !== 1) return
		setTimeout(() => {
			// Like a real socket, a message sent before the server closes still arrives.
			if (!this.clientGone) this.client._receive(JSON.parse(data))
		}, LATENCY_MS)
	}

	/** The room closes the connection. */
	close(code?: number, reason?: string) {
		if (this.readyState === 3) return
		this.readyState = 3
		for (const l of this.listeners.close) l({ code, reason })
		// After the messages already in flight, as a real socket delivers them.
		setTimeout(() => {
			if (!this.clientGone) this.client._serverClosed(code, reason)
		}, LATENCY_MS)
	}

	/** The client sends a message to the room. */
	_deliver(msg: unknown) {
		const data = JSON.stringify(msg)
		setTimeout(() => {
			if (this.readyState !== 1) return
			for (const l of this.listeners.message) l({ data })
		}, LATENCY_MS)
	}

	/** The client closes the connection. */
	_clientClosed() {
		this.clientGone = true
		if (this.readyState === 3) return
		this.readyState = 3
		for (const l of this.listeners.close) l({ code: 1000 })
	}
}

/** The client's end of the fake WebSocket, with the reconnect behavior of `ClientWebSocketAdapter`. */
class LocalClientSocket implements ClientSocket {
	readonly id = nextClientId++
	connectionStatus: ClientSocket['connectionStatus'] = 'offline'
	private server: FakeServerSocket | null = null
	private closed = false
	private readonly messageListeners = new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>()
	private readonly statusListeners = new Set<(ev: TLSocketStatusChangeEvent) => void>()

	constructor(
		private readonly room: LocalRoom,
		private readonly userId: string
	) {
		setTimeout(() => this.open(), 0)
	}

	private open() {
		if (this.closed) return
		this.server = this.room._open(this.userId, this)
		if (!this.server) {
			this.setStatus({ status: 'error', reason: 'FORBIDDEN' })
			return
		}
		this.setStatus({ status: 'online' })
	}

	private setStatus(ev: TLSocketStatusChangeEvent) {
		this.connectionStatus = ev.status
		for (const l of this.statusListeners) l(ev)
	}

	sendMessage(msg: TLSocketClientSentEvent<TLRecord>) {
		if (this.connectionStatus !== 'online' || !this.server) throw new Error('socket is not open')
		this.server._deliver(msg)
	}

	onReceiveMessage(cb: (msg: TLSocketServerSentEvent<TLRecord>) => void) {
		this.messageListeners.add(cb)
		return () => this.messageListeners.delete(cb)
	}

	onStatusChange(cb: (ev: TLSocketStatusChangeEvent) => void) {
		this.statusListeners.add(cb)
		return () => this.statusListeners.delete(cb)
	}

	restart() {
		this.server?._clientClosed()
		this.server = null
		this.setStatus({ status: 'offline' })
		setTimeout(() => this.open(), LATENCY_MS)
	}

	close() {
		this.closed = true
		this.server?._clientClosed()
		this.server = null
		this.setStatus({ status: 'offline' })
	}

	/** @internal */
	_receive(msg: TLSocketServerSentEvent<TLRecord>) {
		for (const l of this.messageListeners) l(msg)
	}

	/** @internal */
	_serverClosed(code?: number, reason?: string) {
		this.server = null
		if (code === TLSyncErrorCloseEventCode) {
			this.setStatus({ status: 'error', reason: reason ?? 'UNKNOWN_ERROR' })
			return
		}
		// A plain close, for example from `closeSession` when access changes: reconnect, and let the
		// app resolve the session options again.
		this.setStatus({ status: 'offline' })
		setTimeout(() => this.open(), LATENCY_MS * 3)
	}
}
