import {
	TLPersistentClientSocket,
	TLSocketClientSentEvent,
	TLSocketRoom,
	TLSocketServerSentEvent,
	TLSocketStatusChangeEvent,
} from '@tldraw/sync'
import { AccessModel, SessionAccess, TLRecord, TLStoreSnapshot, createTLSchema } from 'tldraw'
import { accessSchemaRecords, commentSchemaRecords } from 'tldraw'

// A sync server that runs in the page, so each pane below is a real client of a real room: the
// room enforces the access model exactly as it would on a server.

type ClientSocket = TLPersistentClientSocket<
	TLSocketClientSentEvent<TLRecord>,
	TLSocketServerSentEvent<TLRecord>
>

export const accessSchema = createTLSchema({
	records: { ...accessSchemaRecords, ...commentSchemaRecords },
})

export class LocalRoom {
	readonly room: TLSocketRoom<TLRecord, { name: string }>
	constructor(model: AccessModel<TLRecord>, records: TLRecord[]) {
		this.room = new TLSocketRoom<TLRecord, { name: string }>({
			schema: accessSchema,
			access: model,
			initialSnapshot: {
				store: Object.fromEntries(records.map((r) => [r.id, r])),
				schema: accessSchema.serialize(),
			} as TLStoreSnapshot,
		})
	}

	/** A client socket for one pane, as `useSync({ connect })` wants it. */
	connect(sessionId: string, name: string, getAccess: () => SessionAccess): ClientSocket {
		const messageListeners = new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>()
		const statusListeners = new Set<(event: TLSocketStatusChangeEvent) => void>()
		let serverListeners: Record<string, Set<(event: any) => void>> = {}
		let open = false
		const room = this.room

		const setStatus = (event: TLSocketStatusChangeEvent) => {
			socket.connectionStatus = event.status === 'online' ? 'online' : 'offline'
			statusListeners.forEach((l) => l(event))
		}
		const dispatchToServer = (type: string, event: any) =>
			serverListeners[type]?.forEach((l) => l(event))

		const start = () => {
			serverListeners = { message: new Set(), close: new Set(), error: new Set() }
			open = true
			room.handleSocketConnect({
				sessionId,
				meta: { name },
				access: getAccess(),
				socket: {
					get readyState() {
						return open ? 1 : 3
					},
					addEventListener: (type, listener) => serverListeners[type]?.add(listener),
					removeEventListener: (type, listener) => serverListeners[type]?.delete(listener),
					send: (data: string) => {
						// a tick of "network" between the room and the client
						setTimeout(() => {
							if (!open) return
							const msg = JSON.parse(data)
							messageListeners.forEach((l) => l(msg))
						}, 0)
					},
					close: () => {
						open = false
					},
				},
			})
			setTimeout(() => setStatus({ status: 'online' }), 0)
		}

		const socket: ClientSocket = {
			connectionStatus: 'offline',
			sendMessage: (msg) => {
				const data = JSON.stringify(msg)
				setTimeout(() => open && dispatchToServer('message', { data }), 0)
			},
			onReceiveMessage: (cb) => {
				messageListeners.add(cb)
				return () => messageListeners.delete(cb)
			},
			onStatusChange: (cb) => {
				statusListeners.add(cb)
				return () => statusListeners.delete(cb)
			},
			restart: () => {
				dispatchToServer('close', {})
				open = false
				setStatus({ status: 'offline' })
				start()
			},
			close: () => {
				dispatchToServer('close', {})
				open = false
				setStatus({ status: 'offline' })
			},
		}
		start()
		return socket
	}
}
