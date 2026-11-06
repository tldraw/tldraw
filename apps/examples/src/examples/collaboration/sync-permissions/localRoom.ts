import {
	TLPersistentClientSocket,
	TLSocketClientSentEvent,
	TLSocketRoom,
	TLSocketServerSentEvent,
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

/**
 * A sync room that runs in the browser, for demos. In an app, the room runs on your server, and
 * the server decides each session's access from the request (a cookie, a share link token).
 */
export class LocalRoom {
	readonly room: TLSocketRoom<TLRecord>
	readonly permissions: TLPermissions<TLRecord>
	readonly records?: Record<string, CustomRecordInfo>

	constructor(opts: {
		permissions: TLPermissions<TLRecord>
		records?: Record<string, CustomRecordInfo>
		pages?: Array<{ id: string; name: string; meta?: JsonObject }>
		/** Add records to the room's first document, for example a frame for an agent. */
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
		return () => {
			const room = this.room
			const toClient = new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>()
			const toServer = new Map<string, Set<(event: any) => void>>()
			const emit = (type: string, event: any) => toServer.get(type)?.forEach((fn) => fn(event))
			let open = true

			const socket: TLPersistentClientSocket<
				TLSocketClientSentEvent<TLRecord>,
				TLSocketServerSentEvent<TLRecord>
			> = {
				connectionStatus: 'online',
				sendMessage(msg) {
					const data = JSON.stringify(msg)
					setTimeout(() => open && emit('message', { data }), LATENCY_MS)
				},
				onReceiveMessage(cb) {
					toClient.add(cb)
					return () => toClient.delete(cb)
				},
				onStatusChange() {
					return () => {}
				},
				restart() {},
				close() {
					open = false
					emit('close', {})
				},
			}

			room.handleSocketConnect({
				sessionId,
				access,
				socket: {
					get readyState() {
						return open ? 1 : 3
					},
					send(data: string) {
						setTimeout(() => {
							if (!open) return
							const msg = JSON.parse(data)
							toClient.forEach((fn) => fn(msg))
						}, LATENCY_MS)
					},
					close() {
						open = false
					},
					addEventListener(type: string, fn: (event: any) => void) {
						if (!toServer.has(type)) toServer.set(type, new Set())
						toServer.get(type)!.add(fn)
					},
					removeEventListener(type: string, fn: (event: any) => void) {
						toServer.get(type)?.delete(fn)
					},
				},
			})
			return socket
		}
	}

	/** Change a session's access live, as your server would after a role change. */
	setAccess(sessionId: string, access: TLAccess) {
		this.room.updateSessionAccess(sessionId, access)
	}
}
