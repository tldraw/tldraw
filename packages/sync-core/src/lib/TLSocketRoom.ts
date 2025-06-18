import type { StoreSchema, UnknownRecord } from '@tldraw/store'
import { TLStoreSnapshot, createTLSchema } from '@tldraw/tlschema'
import { objectMapValues, structuredClone } from '@tldraw/utils'
import { RoomSessionState } from './RoomSession'
import { ServerSocketAdapter, WebSocketMinimal } from './ServerSocketAdapter'
import { TLSyncErrorCloseEventReason } from './TLSyncClient'
import { RoomSnapshot, RoomStoreMethods, TLSyncRoom } from './TLSyncRoom'
import { JsonChunkAssembler } from './chunk'
import { TLSocketServerSentEvent } from './protocol'

// TODO: structured logging support
/** @public */
export interface TLSyncLog {
	warn?(...args: any[]): void
	error?(...args: any[]): void
}

/** @public */
export class TLSocketRoom<R extends UnknownRecord = UnknownRecord, SessionMeta = void> {
	private room: TLSyncRoom<R, SessionMeta>
	private readonly sessions = new Map<
		string,
		// eslint-disable-next-line @typescript-eslint/method-signature-style
		{ assembler: JsonChunkAssembler; socket: WebSocketMinimal; unlisten: () => void }
	>()
	readonly log?: TLSyncLog

	constructor(
		public readonly opts: {
			initialSnapshot?: RoomSnapshot | TLStoreSnapshot
			schema?: StoreSchema<R, any>
			// how long to wait for a client to communicate before disconnecting them
			clientTimeout?: number
			log?: TLSyncLog
			// a callback that is called when a client is disconnected
			// eslint-disable-next-line @typescript-eslint/method-signature-style
			onSessionRemoved?: (
				room: TLSocketRoom<R, SessionMeta>,
				args: { sessionId: string; numSessionsRemaining: number; meta: SessionMeta }
			) => void
			// a callback that is called whenever a message is sent
			// eslint-disable-next-line @typescript-eslint/method-signature-style
			onBeforeSendMessage?: (args: {
				sessionId: string
				/** @internal keep the protocol private for now */
				message: TLSocketServerSentEvent<R>
				stringified: string
				meta: SessionMeta
			}) => void
			// eslint-disable-next-line @typescript-eslint/method-signature-style
			onAfterReceiveMessage?: (args: {
				sessionId: string
				/** @internal keep the protocol private for now */
				message: TLSocketServerSentEvent<R>
				stringified: string
				meta: SessionMeta
			}) => void
			onDataChange?(): void
			/** @internal */
			onPresenceChange?(): void
		}
	) {
		const initialSnapshot =
			opts.initialSnapshot && 'store' in opts.initialSnapshot
				? convertStoreSnapshotToRoomSnapshot(opts.initialSnapshot!)
				: opts.initialSnapshot

		this.room = new TLSyncRoom<R, SessionMeta>({
			schema: opts.schema ?? (createTLSchema() as any),
			snapshot: initialSnapshot,
			onDataChange: opts.onDataChange,
			onPresenceChange: opts.onPresenceChange,
			log: opts.log,
		})
		this.room.events.on('session_removed', (args) => {
			this.sessions.delete(args.sessionId)
			if (this.opts.onSessionRemoved) {
				this.opts.onSessionRemoved(this, {
					sessionId: args.sessionId,
					numSessionsRemaining: this.room.sessions.size,
					meta: args.meta,
				})
			}
		})
		this.log = 'log' in opts ? opts.log : { error: console.error }
	}

	/**
	 * Returns the number of active sessions.
	 * Note that this is not the same as the number of connected sockets!
	 * Sessions time out a few moments after sockets close, to smooth over network hiccups.
	 *
	 * @returns the number of active sessions
	 */
	getNumActiveSessions() {
		return this.room.sessions.size
	}

	/**
	 * Call this when a client establishes a new socket connection.
	 *
	 * - `sessionId` is a unique ID for a browser tab. This is passed as a query param by the useSync hook.
	 * - `socket` is a WebSocket-like object that the server uses to communicate with the client.
	 * - `isReadonly` is an optional boolean that can be set to true if the client should not be able to make changes to the document. They will still be able to send presence updates.
	 * - `meta` is an optional object that can be used to store additional information about the session.
	 *
	 * @param opts - The options object
	 */
	handleSocketConnect(
		opts: {
			sessionId: string
			socket: WebSocketMinimal
			isReadonly?: boolean
		} & (SessionMeta extends void ? object : { meta: SessionMeta })
	) {
		const { sessionId, socket, isReadonly = false } = opts
		const handleSocketMessage = (event: MessageEvent) =>
			this.handleSocketMessage(sessionId, event.data)
		const handleSocketError = this.handleSocketError.bind(this, sessionId)
		const handleSocketClose = this.handleSocketClose.bind(this, sessionId)

		this.sessions.set(sessionId, {
			assembler: new JsonChunkAssembler(),
			socket,
			unlisten: () => {
				socket.removeEventListener?.('message', handleSocketMessage)
				socket.removeEventListener?.('close', handleSocketClose)
				socket.removeEventListener?.('error', handleSocketError)
			},
		})

		this.room.handleNewSession({
			sessionId,
			isReadonly,
			socket: new ServerSocketAdapter({
				ws: socket,
				onBeforeSendMessage: this.opts.onBeforeSendMessage
					? (message, stringified) =>
							this.opts.onBeforeSendMessage!({
								sessionId,
								message,
								stringified,
								meta: this.room.sessions.get(sessionId)?.meta as SessionMeta,
							})
					: undefined,
			}),
			meta: 'meta' in opts ? (opts.meta as any) : undefined,
		})

		socket.addEventListener?.('message', handleSocketMessage)
		socket.addEventListener?.('close', handleSocketClose)
		socket.addEventListener?.('error', handleSocketError)
	}

	/**
	 * If executing in a server environment where sockets do not have instance-level listeners
	 * (e.g. Bun.serve, Cloudflare Worker with WebSocket hibernation), you should call this
	 * method when messages are received. See our self-hosting example for Bun.serve for an example.
	 *
	 * @param sessionId - The id of the session. (should match the one used when calling handleSocketConnect)
	 * @param message - The message received from the client.
	 */
	handleSocketMessage(sessionId: string, message: string | AllowSharedBufferSource) {
		const assembler = this.sessions.get(sessionId)?.assembler
		if (!assembler) {
			this.log?.warn?.('Received message from unknown session', sessionId)
			return
		}

		try {
			const messageString =
				typeof message === 'string' ? message : new TextDecoder().decode(message)
			const res = assembler.handleMessage(messageString)
			if (!res) {
				// not enough chunks yet
				return
			}
			if ('data' in res) {
				// need to do this first in case the session gets removed as a result of handling the message
				if (this.opts.onAfterReceiveMessage) {
					const session = this.room.sessions.get(sessionId)
					if (session) {
						this.opts.onAfterReceiveMessage({
							sessionId,
							message: res.data as any,
							stringified: res.stringified,
							meta: session.meta,
						})
					}
				}

				this.room.handleMessage(sessionId, res.data as any)
			} else {
				this.log?.error?.('Error assembling message', res.error)
				// close the socket to reset the connection
				this.handleSocketError(sessionId)
			}
		} catch (e) {
			this.log?.error?.(e)
			// here we use rejectSession rather than removeSession to support legacy clients
			// that use the old incompatibility_error close event
			this.room.rejectSession(sessionId, TLSyncErrorCloseEventReason.UNKNOWN_ERROR)
		}
	}

	/**
	 * If executing in a server environment where sockets do not have instance-level listeners,
	 * call this when a socket error occurs.
	 * @param sessionId - The id of the session. (should match the one used when calling handleSocketConnect)
	 */
	handleSocketError(sessionId: string) {
		this.room.handleClose(sessionId)
	}

	/**
	 * If executing in a server environment where sockets do not have instance-level listeners,
	 * call this when a socket is closed.
	 * @param sessionId - The id of the session. (should match the one used when calling handleSocketConnect)
	 */
	handleSocketClose(sessionId: string) {
		this.room.handleClose(sessionId)
	}

	/**
	 * Returns the current 'clock' of the document.
	 * The clock is an integer that increments every time the document changes.
	 * The clock is stored as part of the snapshot of the document for consistency purposes.
	 *
	 * @returns The clock
	 */
	getCurrentDocumentClock() {
		return this.room.documentClock
	}

	/**
	 * Returns a deeply cloned record from the store, if available.
	 * @param id - The id of the record
	 * @returns the cloned record
	 */
	getRecord(id: string) {
		return structuredClone(this.room.state.get().documents[id]?.state)
	}

	/**
	 * Returns a list of the sessions in the room.
	 */
	getSessions(): Array<{
		sessionId: string
		isConnected: boolean
		isReadonly: boolean
		meta: SessionMeta
	}> {
		return [...this.room.sessions.values()].map((session) => {
			return {
				sessionId: session.sessionId,
				isConnected: session.state === RoomSessionState.Connected,
				isReadonly: session.isReadonly,
				meta: session.meta,
			}
		})
	}

	/**
	 * Return a snapshot of the document state, including clock-related bookkeeping.
	 * You can store this and load it later on when initializing a TLSocketRoom.
	 * You can also pass a snapshot to {@link TLSocketRoom#loadSnapshot} if you need to revert to a previous state.
	 * @returns The snapshot
	 */
	getCurrentSnapshot() {
		return this.room.getSnapshot()
	}

	/**
	 * @internal
	 */
	getPresenceRecords() {
		const result = {} as Record<string, UnknownRecord>
		for (const document of Object.values(this.room.state.get().documents)) {
			if (document.state.typeName === this.room.presenceType?.typeName) {
				result[document.state.id] = document.state
			}
		}
		return result
	}

	/**
	 * Return a serialized snapshot of the document state, including clock-related bookkeeping.
	 * @returns The serialized snapshot
	 * @internal
	 */
	getCurrentSerializedSnapshot() {
		return JSON.stringify(this.room.getSnapshot())
	}

	/**
	 * Load a snapshot of the document state, overwriting the current state.
	 * @param snapshot - The snapshot to load
	 */
	loadSnapshot(snapshot: RoomSnapshot | TLStoreSnapshot) {
		if ('store' in snapshot) {
			snapshot = convertStoreSnapshotToRoomSnapshot(snapshot)
		}
		const oldRoom = this.room
		const oldIds = oldRoom.getSnapshot().documents.map((d) => d.state.id)
		const newIds = new Set(snapshot.documents.map((d) => d.state.id))
		const removedIds = oldIds.filter((id) => !newIds.has(id))

		const tombstones = { ...snapshot.tombstones }
		removedIds.forEach((id) => {
			tombstones[id] = oldRoom.clock + 1
		})
		newIds.forEach((id) => {
			delete tombstones[id]
		})

		const newRoom = new TLSyncRoom<R, SessionMeta>({
			schema: oldRoom.schema,
			snapshot: {
				clock: oldRoom.clock + 1,
				documents: snapshot.documents.map((d) => ({
					lastChangedClock: oldRoom.clock + 1,
					state: d.state,
				})),
				schema: snapshot.schema,
				tombstones,
			},
			log: this.log,
		})
		// replace room with new one and kick out all the clients
		this.room = newRoom
		oldRoom.close()
	}

	/**
	 * Allow applying changes to the store inside of a transaction.
	 *
	 * You can get values from the store by id with `store.get(id)`.
	 * These values are safe to mutate, but to commit the changes you must call `store.put(...)` with the updated value.
	 * You can get all values in the store with `store.getAll()`.
	 * You can also delete values with `store.delete(id)`.
	 *
	 * @example
	 * ```ts
	 * room.updateStore(store => {
	 *   const shape = store.get('shape:abc123')
	 *   shape.meta.approved = true
	 *   store.put(shape)
	 * })
	 * ```
	 *
	 * Changes to the store inside the callback are isolated from changes made by other clients until the transaction commits.
	 *
	 * @param updater - A function that will be called with a store object that can be used to make changes.
	 * @returns A promise that resolves when the transaction is complete.
	 */
	async updateStore(updater: (store: RoomStoreMethods<R>) => void | Promise<void>) {
		return this.room.updateStore(updater)
	}

	/**
	 * Immediately remove a session from the room, and close its socket if not already closed.
	 *
	 * The client will attempt to reconnect unless you provide a `fatalReason` parameter.
	 *
	 * The `fatalReason` parameter will be available in the return value of the `useSync` hook as `useSync().error.reason`.
	 *
	 * @param sessionId - The id of the session to remove
	 * @param fatalReason - The reason message to use when calling .close on the underlying websocket
	 */
	closeSession(sessionId: string, fatalReason?: TLSyncErrorCloseEventReason | string) {
		this.room.rejectSession(sessionId, fatalReason)
	}

	/**
	 * Close the room and disconnect all clients. Call this before discarding the room instance or shutting down the server.
	 */
	close() {
		this.room.close()
	}

	/**
	 * @returns true if the room is closed
	 */
	isClosed() {
		return this.room.isClosed()
	}
}

/** @public */
export type OmitVoid<T, KS extends keyof T = keyof T> = {
	[K in KS extends any ? (void extends T[KS] ? never : KS) : never]: T[K]
}

function convertStoreSnapshotToRoomSnapshot(snapshot: TLStoreSnapshot): RoomSnapshot {
	return {
		clock: 0,
		documents: objectMapValues(snapshot.store).map((state) => ({
			state,
			lastChangedClock: 0,
		})),
		schema: snapshot.schema,
		tombstones: {},
	}
}
