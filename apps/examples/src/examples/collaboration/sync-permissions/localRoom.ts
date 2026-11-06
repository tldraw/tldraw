import {
	TLPersistentClientSocket,
	TLSocketClientSentEvent,
	TLSocketRoom,
	TLSocketServerSentEvent,
	TLSocketStatusChangeEvent,
	UseSyncConnectFn,
} from '@tldraw/sync'
import {
	CustomRecordInfo,
	IndexKey,
	JsonObject,
	PageRecordType,
	TLAccess,
	TLPageId,
	TLPermissions,
	TLRecord,
	TLStore,
	createTLSchema,
	createTLStore,
	defaultBindingSchemas,
	defaultBindingUtils,
	defaultShapeSchemas,
	defaultShapeUtils,
} from 'tldraw'

// Messages take this long each way, so you can see the difference between a change the editor
// denies at once and one the server denies a moment later.
const LATENCY_MS = 150

type ServerMessage = TLSocketServerSentEvent<TLRecord>
type ClientMessage = TLSocketClientSentEvent<TLRecord>

/**
 * A sync room that runs in the browser, for demos. In an app, the room runs on your server, and
 * the server decides each session's access from the request (a cookie, a share link token).
 */
export class LocalRoom {
	readonly room: TLSocketRoom<TLRecord>
	readonly permissions: TLPermissions<TLRecord>
	readonly records?: Record<string, CustomRecordInfo>
	private readonly sessions = new Map<string, { access: TLAccess; socket?: LocalSocket }>()

	constructor(opts: {
		permissions: TLPermissions<TLRecord>
		records?: Record<string, CustomRecordInfo>
		pages?: Array<{ id: string; name: string; meta?: JsonObject }>
		/** Add records to the room's document, for example a frame for an agent. */
		setup?(store: TLStore): void
	}) {
		this.permissions = opts.permissions
		this.records = opts.records
		const store = createTLStore({
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
			records: opts.records,
		})
		store.ensureStoreIsUsable()
		store.put(
			(opts.pages ?? []).map((p, i) =>
				PageRecordType.create({
					id: p.id as TLPageId,
					name: p.name,
					meta: p.meta ?? {},
					index: `a${i + 2}` as IndexKey,
				})
			)
		)
		opts.setup?.(store)
		this.room = new TLSocketRoom<TLRecord>({
			schema: createTLSchema({
				shapes: defaultShapeSchemas,
				bindings: defaultBindingSchemas,
				records: opts.records,
			}),
			permissions: opts.permissions,
			initialSnapshot: store.getStoreSnapshot('document'),
		})
	}

	/** A `connect` function for `useSync` that joins this room as `sessionId` with `access`. */
	connect(sessionId: string, access: TLAccess): UseSyncConnectFn {
		if (!this.sessions.has(sessionId)) this.sessions.set(sessionId, { access })
		return () => {
			const session = this.sessions.get(sessionId)!
			session.socket = new LocalSocket(this.room, sessionId, () => session.access)
			return session.socket
		}
	}

	/** Change a session's access live, as your server would after a role change. */
	setAccess(sessionId: string, access: TLAccess) {
		const session = this.sessions.get(sessionId)
		if (session) session.access = access
		if (session?.socket?.connectionStatus === 'online') {
			this.room.updateSessionAccess(sessionId, access)
		}
	}

	/** Drop a session's socket (as if its wifi went down), or connect it again. */
	setOnline(sessionId: string, online: boolean) {
		const socket = this.sessions.get(sessionId)?.socket
		if (online) socket?.open()
		else socket?.drop()
	}
}

/**
 * The client end of a connection to a {@link LocalRoom}. Like a real persistent socket, it can
 * drop and open again: each `open` is a new connection to the room, with the session's current
 * access.
 */
class LocalSocket implements TLPersistentClientSocket<ClientMessage, ServerMessage> {
	connectionStatus: 'online' | 'offline' | 'error' = 'offline'
	private readonly receivers = new Set<(msg: ServerMessage) => void>()
	private readonly statusListeners = new Set<(event: TLSocketStatusChangeEvent) => void>()
	private connection: { isOpen: boolean; toServer: Map<string, Set<(event: any) => void>> } | null =
		null

	constructor(
		private readonly room: TLSocketRoom<TLRecord>,
		private readonly sessionId: string,
		private readonly getAccess: () => TLAccess
	) {
		this.open()
	}

	open() {
		if (this.connection) return
		const connection = { isOpen: true, toServer: new Map<string, Set<(event: any) => void>>() }
		this.connection = connection
		this.room.handleSocketConnect({
			sessionId: this.sessionId,
			access: this.getAccess(),
			socket: {
				get readyState() {
					return connection.isOpen ? 1 : 3
				},
				send: (data: string) => {
					setTimeout(() => {
						if (!connection.isOpen) return
						const msg = JSON.parse(data)
						this.receivers.forEach((fn) => fn(msg))
					}, LATENCY_MS)
				},
				close() {
					connection.isOpen = false
				},
				addEventListener(type: string, fn: (event: any) => void) {
					if (!connection.toServer.has(type)) connection.toServer.set(type, new Set())
					connection.toServer.get(type)!.add(fn)
				},
				removeEventListener(type: string, fn: (event: any) => void) {
					connection.toServer.get(type)?.delete(fn)
				},
			},
		})
		this.setStatus('online')
	}

	drop() {
		const connection = this.connection
		if (!connection) return
		this.connection = null
		connection.isOpen = false
		connection.toServer.get('close')?.forEach((fn) => fn({}))
		this.setStatus('offline')
	}

	sendMessage(msg: ClientMessage) {
		const connection = this.connection
		if (!connection) return
		const data = JSON.stringify(msg)
		setTimeout(() => {
			if (connection.isOpen) connection.toServer.get('message')?.forEach((fn) => fn({ data }))
		}, LATENCY_MS)
	}

	onReceiveMessage(cb: (msg: ServerMessage) => void) {
		this.receivers.add(cb)
		return () => {
			this.receivers.delete(cb)
		}
	}

	onStatusChange(cb: (event: TLSocketStatusChangeEvent) => void) {
		this.statusListeners.add(cb)
		return () => {
			this.statusListeners.delete(cb)
		}
	}

	restart() {
		this.drop()
		this.open()
	}

	close() {
		this.drop()
	}

	private setStatus(status: 'online' | 'offline') {
		if (this.connectionStatus === status) return
		this.connectionStatus = status
		this.statusListeners.forEach((fn) => fn({ status }))
	}
}
