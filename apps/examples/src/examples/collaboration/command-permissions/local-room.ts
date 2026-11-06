import {
	TLSocketRoom,
	TLSyncClient,
	type TLCommandActor,
	type TLPersistentClientSocket,
	type UseSyncConnectFn,
} from '@tldraw/sync'
import { atom, createTLStore, type TLRecord, type TLStore } from 'tldraw'
import { classroomCommands, schema } from './classroom'

// A sync server that runs in the page, so the example needs no backend. Every message waits
// LATENCY_MS, so you can see a command apply at once on its own client and reach the others later.
const LATENCY_MS = 150

interface Connection {
	/** Bumped when the connection drops, so messages in flight are lost, as on a real network. */
	generation: number
	online: boolean
	statusListeners: Set<(event: any) => void>
	open(): void
}

export class LocalRoom {
	readonly room = new TLSocketRoom<TLRecord, void>({ schema, commands: classroomCommands })
	private connections = new Map<string, Connection>()

	/** A `connect` function for `useSync`. The actor is read at each (re)connect. */
	connectAs(sessionId: string, getActor: () => TLCommandActor): UseSyncConnectFn {
		return () => this.openSocket(sessionId, getActor)
	}

	/** A session with no editor, for the agent. */
	headlessClient(sessionId: string, actor: TLCommandActor) {
		const store = createTLStore({ schema })
		return new TLSyncClient<TLRecord, TLStore>({
			store,
			socket: this.openSocket(sessionId, () => actor),
			presence: atom('presence', null),
			commands: classroomCommands,
			onLoad: () => {},
			onSyncError: () => {},
		})
	}

	/** Drop or restore a client's connection, like a laptop losing Wi-Fi. */
	setOnline(sessionId: string, online: boolean) {
		const connection = this.connections.get(sessionId)
		if (!connection || connection.online === online) return
		connection.online = online
		if (online) {
			connection.open()
			connection.statusListeners.forEach((l) => l({ status: 'online' }))
		} else {
			connection.generation++
			this.room.handleSocketClose(sessionId)
			connection.statusListeners.forEach((l) => l({ status: 'offline' }))
		}
	}

	private openSocket(sessionId: string, getActor: () => TLCommandActor) {
		const listeners = new Set<(msg: any) => void>()
		let closed = false
		const connection: Connection = {
			generation: 0,
			online: true,
			statusListeners: new Set(),
			open: () =>
				this.room.handleSocketConnect({
					sessionId,
					actor: getActor(),
					socket: {
						readyState: 1,
						send: (data) => later(() => listeners.forEach((l) => l(JSON.parse(data)))),
						// the server closes with a reason when it refuses the session, e.g. FORBIDDEN
						close: (_code?: number, reason?: string) => {
							if (!reason) return
							later(() => connection.statusListeners.forEach((l) => l({ status: 'error', reason })))
						},
					},
				}),
		}
		this.connections.set(sessionId, connection)
		const later = (fn: () => void) => {
			const generation = connection.generation
			setTimeout(() => !closed && generation === connection.generation && fn(), LATENCY_MS)
		}
		connection.open()

		const socket: TLPersistentClientSocket<any, any> = {
			get connectionStatus() {
				return connection.online ? 'online' : 'offline'
			},
			sendMessage: (msg) =>
				later(() => this.room.handleSocketMessage(sessionId, JSON.stringify(msg))),
			onReceiveMessage: (cb) => {
				listeners.add(cb)
				return () => listeners.delete(cb)
			},
			onStatusChange: (cb) => {
				connection.statusListeners.add(cb)
				return () => connection.statusListeners.delete(cb)
			},
			restart: () => {},
			close: () => {
				closed = true
				this.room.handleSocketClose(sessionId)
			},
		}
		return socket
	}
}
