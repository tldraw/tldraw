import { atom } from '@tldraw/state'
import {
	CustomRecordInfo,
	PageRecordType,
	TL_FULL_ACCESS,
	TLAccess,
	TLPageId,
	TLPermissionDenial,
	TLPermissions,
	TLRecord,
	TLStore,
	TLStoreSnapshot,
	TLUser,
	UserRecordType,
	createPresenceStateDerivation,
	createTLSchema,
	defaultBindingSchemas,
	defaultShapeSchemas,
} from '@tldraw/tlschema'
import { IndexKey, JsonObject } from '@tldraw/utils'
import {
	Editor,
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	registerDefaultSideEffects,
	tipTapDefaultExtensions,
} from 'tldraw'
import { vi } from 'vitest'
import { InMemorySyncStorage } from '../../lib/InMemorySyncStorage'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from '../../lib/protocol'
import { TLSocketRoom } from '../../lib/TLSocketRoom'
import { TLPersistentClientSocket, TLSyncClient } from '../../lib/TLSyncClient'

/** A room document with the given pages, the first one named "Page 1". */
export function roomSnapshot(
	pages: Array<{ id: string; name: string; meta?: JsonObject }> = []
): TLStoreSnapshot {
	const store = createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils })
	store.ensureStoreIsUsable()
	store.put(
		pages.map((p, i) =>
			PageRecordType.create({
				id: p.id as TLPageId,
				name: p.name,
				meta: p.meta ?? {},
				index: `a${i + 2}` as IndexKey,
			})
		)
	)
	return store.getStoreSnapshot('document')
}

/**
 * A real sync room and real clients in one process, joined by in-memory sockets. Messages queue up
 * and `settle()` delivers them until both sides are quiet, so a test sees what a user would see
 * after the network catches up.
 */
export class SyncHarness {
	readonly room: TLSocketRoom<TLRecord>
	readonly users: SyncUser[] = []
	private queue: Array<() => void> = []

	constructor(
		readonly permissions: TLPermissions<TLRecord>,
		readonly opts: { snapshot?: TLStoreSnapshot; records?: Record<string, CustomRecordInfo> } = {}
	) {
		this.room = new TLSocketRoom<TLRecord>({
			schema: createTLSchema({
				shapes: defaultShapeSchemas,
				bindings: defaultBindingSchemas,
				records: opts.records,
			}),
			permissions,
			initialSnapshot: opts.snapshot,
		})
	}

	/** Connect a user and wait until their editor holds the room's document. */
	connect(name: string, access: TLAccess = { ...TL_FULL_ACCESS, userId: name }): SyncUser {
		const user = new SyncUser(this, name, access)
		this.users.push(user)
		this.settle()
		user.createEditor()
		this.settle()
		return user
	}

	/** @internal */
	enqueue(fn: () => void) {
		this.queue.push(fn)
	}

	/** Deliver every queued message and timer until nothing moves. */
	settle() {
		let quietRounds = 0
		for (let i = 0; i < 200; i++) {
			for (const user of this.users) user.store._flushHistory()
			vi.advanceTimersByTime(50)
			// throttled senders (presence, pushes) may still fire on a later tick
			if (!this.queue.length) {
				if (++quietRounds >= 5) return
				continue
			}
			quietRounds = 0
			const queue = this.queue
			this.queue = []
			for (const fn of queue) fn()
		}
		throw new Error('the room never settled')
	}

	/** Every record on the server. */
	serverRecords() {
		return (this.room.storage as InMemorySyncStorage<TLRecord>)
			.getSnapshot()
			.documents.map((d) => d.state as TLRecord)
	}

	serverRecord(id: string) {
		return this.serverRecords().find((r) => r.id === id)
	}

	dispose() {
		for (const user of this.users) user.dispose()
		this.room.close()
	}
}

export class SyncUser {
	readonly store: TLStore
	readonly client: TLSyncClient<TLRecord, TLStore>
	readonly denials: TLPermissionDenial[] = []
	editor!: Editor
	readonly sessionId: string
	private readonly access = atom<TLAccess>('access', TL_FULL_ACCESS)
	private readonly lastDenial = atom<TLPermissionDenial | null>('lastDenial', null)
	private disposeSideEffects?: () => void
	private readonly mode = atom<'readonly' | 'readwrite'>('mode', 'readwrite')

	constructor(
		private readonly harness: SyncHarness,
		readonly name: string,
		access: TLAccess
	) {
		this.sessionId = `session-${name}`
		const socket = this.createSocket(access)
		const user = atom<TLUser | null>('user', {
			...UserRecordType.create({ id: UserRecordType.createId(name), name, color: '#000' }),
		})
		this.store = createTLStore({
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
			records: harness.opts.records,
			collaboration: {
				status: atom('status', 'online' as const),
				mode: this.mode,
				access: this.access,
				permissions: harness.permissions,
				lastDenial: this.lastDenial,
			},
		})
		this.client = new TLSyncClient<TLRecord, TLStore>({
			store: this.store,
			socket,
			presence: createPresenceStateDerivation(user)(this.store),
			presenceMode: atom('presenceMode', 'full' as const),
			onLoad: () => {},
			onSyncError: (reason) => {
				throw new Error(`sync error for ${name}: ${reason}`)
			},
			onAfterConnect: (_, { access }) => {
				this.setAccess(access)
				this.store.ensureStoreIsUsable()
			},
			onAccessChange: (access) => this.setAccess(access),
			onPushDenied: (denial) => this.lastDenial.set({ ...denial, source: 'server' }),
		})
	}

	private setAccess(access: TLAccess) {
		this.access.set(access)
		this.mode.set(access.abilities.includes('edit') ? 'readwrite' : 'readonly')
	}

	/** @internal */
	createEditor() {
		this.editor = new Editor({
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
			tools: defaultTools,
			initialState: 'select',
			store: this.store,
			getContainer: () => document.createElement('div'),
			options: {
				text: {
					addFontsFromNode: defaultAddFontsFromNode,
					tipTapConfig: { extensions: tipTapDefaultExtensions },
				},
			},
		})
		this.disposeSideEffects = registerDefaultSideEffects(this.editor)
		this.editor.on('permission-denied', (denial) => this.denials.push(denial))
	}

	private online = true
	private readonly socketListeners = {
		message: new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>(),
		status: new Set<(event: any) => void>(),
	}
	private serverListeners = new Map<string, Set<(event: any) => void>>()

	private createSocket(access: TLAccess) {
		const harness = this.harness
		const listeners = this.socketListeners
		const client: TLPersistentClientSocket<
			TLSocketClientSentEvent<TLRecord>,
			TLSocketServerSentEvent<TLRecord>
		> = {
			connectionStatus: 'online',
			sendMessage: (msg) => {
				if (!this.online) return
				const data = JSON.stringify(msg)
				const serverListeners = this.serverListeners
				harness.enqueue(() => serverListeners.get('message')?.forEach((fn) => fn({ data })))
			},
			onReceiveMessage: (cb) => {
				listeners.message.add(cb)
				return () => listeners.message.delete(cb)
			},
			onStatusChange: (cb) => {
				listeners.status.add(cb)
				return () => listeners.status.delete(cb)
			},
			restart: () => {},
			close: () => {},
		}
		this.clientSocket = client
		this.connectServerSide(access)
		return client
	}

	private clientSocket!: TLPersistentClientSocket<
		TLSocketClientSentEvent<TLRecord>,
		TLSocketServerSentEvent<TLRecord>
	>

	/** Open a new server-side socket for this session, as a fresh WebSocket would. */
	private connectServerSide(access: TLAccess) {
		const listeners = this.socketListeners
		const serverListeners = new Map<string, Set<(event: any) => void>>()
		this.serverListeners = serverListeners
		this.harness.room.handleSocketConnect({
			sessionId: this.sessionId,
			access,
			socket: {
				readyState: 1,
				send: (data: string) => {
					// a message the server sent to a socket that has since dropped never arrives
					if (this.serverListeners !== serverListeners) return
					this.harness.enqueue(() => {
						if (this.serverListeners !== serverListeners) return
						const msg = JSON.parse(data)
						listeners.message.forEach((fn) => fn(msg))
					})
				},
				close: () => {
					this.clientSocket.connectionStatus = 'offline'
				},
				addEventListener: (type: string, fn: (event: any) => void) => {
					if (!serverListeners.has(type)) serverListeners.set(type, new Set())
					serverListeners.get(type)!.add(fn)
				},
				removeEventListener: (type: string, fn: (event: any) => void) => {
					serverListeners.get(type)?.delete(fn)
				},
			},
		})
	}

	/** Drop the connection. Local changes keep working and queue up until `reconnect`. */
	goOffline() {
		this.online = false
		this.serverListeners.get('close')?.forEach((fn) => fn({}))
		this.serverListeners = new Map()
		this.clientSocket.connectionStatus = 'offline'
		this.socketListeners.status.forEach((fn) => fn({ status: 'offline' }))
		this.harness.settle()
	}

	/** Connect again with a new socket, and wait until the client has caught up. */
	reconnect(access: TLAccess = this.access.get()) {
		this.online = true
		this.connectServerSide(access)
		this.clientSocket.connectionStatus = 'online'
		this.socketListeners.status.forEach((fn) => fn({ status: 'online' }))
		this.harness.settle()
	}

	/** Change this session's access on the server, as an app would after a role change. */
	setServerAccess(access: TLAccess) {
		this.harness.room.updateSessionAccess(this.sessionId, access)
		this.harness.settle()
	}

	dispose() {
		this.client.close()
		this.disposeSideEffects?.()
		this.editor?.dispose()
	}
}
