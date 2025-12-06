import type { StoreSchema, UnknownRecord } from '@tldraw/store'
import { createTLSchema, TLStoreSnapshot } from '@tldraw/tlschema'
import { getOwnProperty, hasOwnProperty, isEqual, structuredClone } from '@tldraw/utils'
import { DEFAULT_INITIAL_SNAPSHOT, InMemorySyncStorage } from './InMemorySyncStorage'
import { RoomSessionState } from './RoomSession'
import { ServerSocketAdapter, WebSocketMinimal } from './ServerSocketAdapter'
import { TLSyncErrorCloseEventReason } from './TLSyncClient'
import { RoomSnapshot, TLSyncRoom } from './TLSyncRoom'
import {
	convertStoreSnapshotToRoomSnapshot,
	loadSnapshotIntoStorage,
	TLSyncStorage,
} from './TLSyncStorage'
import { JsonChunkAssembler } from './chunk'
import { TLSocketServerSentEvent } from './protocol'

/**
 * Logging interface for TLSocketRoom operations. Provides optional methods
 * for warning and error logging during synchronization operations.
 *
 * @example
 * ```ts
 * const logger: TLSyncLog = {
 *   warn: (...args) => console.warn('[SYNC]', ...args),
 *   error: (...args) => console.error('[SYNC]', ...args)
 * }
 *
 * const room = new TLSocketRoom({ log: logger })
 * ```
 *
 * @public
 */
export interface TLSyncLog {
	/**
	 * Optional warning logger for non-fatal sync issues
	 * @param args - Arguments to log
	 */
	warn?(...args: any[]): void
	/**
	 * Optional error logger for sync errors and failures
	 * @param args - Arguments to log
	 */
	error?(...args: any[]): void
}

/**
 * Base options for TLSocketRoom.
 * @public
 */
export interface TLSocketRoomOptions<R extends UnknownRecord, SessionMeta> {
	storage?: TLSyncStorage<R>
	/**
	 * @deprecated use the storage option instead
	 */
	initialSnapshot?: RoomSnapshot | TLStoreSnapshot
	/**
	 * @deprecated use the storage option with an onChange callback instead
	 */
	onDataChange?(): void
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
	/** @internal */
	onPresenceChange?(): void
}

/**
 * A server-side room that manages WebSocket connections and synchronizes tldraw document state
 * between multiple clients in real-time. Each room represents a collaborative document space
 * where users can work together on drawings with automatic conflict resolution.
 *
 * TLSocketRoom handles:
 * - WebSocket connection lifecycle management
 * - Real-time synchronization of document changes
 * - Session management and presence tracking
 * - Message chunking for large payloads
 * - Automatic client timeout and cleanup
 *
 * @example
 * ```ts
 * // Basic room setup
 * const room = new TLSocketRoom({
 *   onSessionRemoved: (room, { sessionId, numSessionsRemaining }) => {
 *     console.log(`Client ${sessionId} disconnected, ${numSessionsRemaining} remaining`)
 *     if (numSessionsRemaining === 0) {
 *       room.close()
 *     }
 *   },
 *   onDataChange: () => {
 *     console.log('Document data changed, consider persisting')
 *   }
 * })
 *
 * // Handle new client connections
 * room.handleSocketConnect({
 *   sessionId: 'user-session-123',
 *   socket: webSocket,
 *   isReadonly: false
 * })
 * ```
 *
 * @example
 * ```ts
 * // Room with initial snapshot and schema
 * const room = new TLSocketRoom({
 *   initialSnapshot: existingSnapshot,
 *   schema: myCustomSchema,
 *   clientTimeout: 30000,
 *   log: {
 *     warn: (...args) => logger.warn('SYNC:', ...args),
 *     error: (...args) => logger.error('SYNC:', ...args)
 *   }
 * })
 *
 * // Update document programmatically
 * await room.updateStore(store => {
 *   const shape = store.get('shape:abc123')
 *   if (shape) {
 *     shape.x = 100
 *     store.put(shape)
 *   }
 * })
 * ```
 *
 * @public
 */
export class TLSocketRoom<R extends UnknownRecord = UnknownRecord, SessionMeta = void> {
	private room: TLSyncRoom<R, SessionMeta>
	private readonly sessions = new Map<
		string,
		// eslint-disable-next-line @typescript-eslint/method-signature-style
		{ assembler: JsonChunkAssembler; socket: WebSocketMinimal; unlisten: () => void }
	>()
	readonly log?: TLSyncLog

	public storage: TLSyncStorage<R>

	private disposables = new Set<() => void>()

	/**
	 * Creates a new TLSocketRoom instance for managing collaborative document synchronization.
	 *
	 * opts - Configuration options for the room
	 *   - initialSnapshot - Optional initial document state to load
	 *   - schema - Store schema defining record types and validation
	 *   - clientTimeout - Milliseconds to wait before disconnecting inactive clients
	 *   - log - Optional logger for warnings and errors
	 *   - onSessionRemoved - Called when a client session is removed
	 *   - onBeforeSendMessage - Called before sending messages to clients
	 *   - onAfterReceiveMessage - Called after receiving messages from clients
	 *   - onDataChange - Called when document data changes
	 *   - onPresenceChange - Called when presence data changes
	 */
	constructor(public readonly opts: TLSocketRoomOptions<R, SessionMeta>) {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		if (opts.storage && opts.initialSnapshot) {
			throw new Error('Cannot provide both storage and initialSnapshot options')
		}
		const storage = opts.storage
			? opts.storage
			: new InMemorySyncStorage<R>({
					snapshot: convertStoreSnapshotToRoomSnapshot(
						// eslint-disable-next-line @typescript-eslint/no-deprecated
						opts.initialSnapshot ?? DEFAULT_INITIAL_SNAPSHOT
					),
				})

		// eslint-disable-next-line @typescript-eslint/no-deprecated
		if ('onDataChange' in opts && opts.onDataChange) {
			this.disposables.add(
				storage.onChange(() => {
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					opts.onDataChange?.()
				})
			)
		}
		this.room = new TLSyncRoom<R, SessionMeta>({
			onPresenceChange: opts.onPresenceChange,
			schema: opts.schema ?? (createTLSchema() as any),
			log: opts.log,
			storage,
		})
		this.storage = storage
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
	 * Handles a new client WebSocket connection, creating a session within the room.
	 * This should be called whenever a client establishes a WebSocket connection to join
	 * the collaborative document.
	 *
	 * @param opts - Connection options
	 *   - sessionId - Unique identifier for the client session (typically from browser tab)
	 *   - socket - WebSocket-like object for client communication
	 *   - isReadonly - Whether the client can modify the document (defaults to false)
	 *   - meta - Additional session metadata (required if SessionMeta is not void)
	 *
	 * @example
	 * ```ts
	 * // Handle new WebSocket connection
	 * room.handleSocketConnect({
	 *   sessionId: 'user-session-abc123',
	 *   socket: webSocketConnection,
	 *   isReadonly: !userHasEditPermission
	 * })
	 * ```
	 *
	 * @example
	 * ```ts
	 * // With session metadata
	 * room.handleSocketConnect({
	 *   sessionId: 'session-xyz',
	 *   socket: ws,
	 *   meta: { userId: 'user-123', name: 'Alice' }
	 * })
	 * ```
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
	 * Processes a message received from a client WebSocket. Use this method in server
	 * environments where WebSocket event listeners cannot be attached directly to socket
	 * instances (e.g., Bun.serve, Cloudflare Workers with WebSocket hibernation).
	 *
	 * The method handles message chunking/reassembly and forwards complete messages
	 * to the underlying sync room for processing.
	 *
	 * @param sessionId - Session identifier matching the one used in handleSocketConnect
	 * @param message - Raw message data from the client (string or binary)
	 *
	 * @example
	 * ```ts
	 * // In a Bun.serve handler
	 * server.upgrade(req, {
	 *   data: { sessionId, room },
	 *   upgrade(res, req) {
	 *     // Connection established
	 *   },
	 *   message(ws, message) {
	 *     const { sessionId, room } = ws.data
	 *     room.handleSocketMessage(sessionId, message)
	 *   }
	 * })
	 * ```
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
	 * Handles a WebSocket error for the specified session. Use this in server environments
	 * where socket event listeners cannot be attached directly. This will initiate cleanup
	 * and session removal for the affected client.
	 *
	 * @param sessionId - Session identifier matching the one used in handleSocketConnect
	 *
	 * @example
	 * ```ts
	 * // In a custom WebSocket handler
	 * socket.addEventListener('error', () => {
	 *   room.handleSocketError(sessionId)
	 * })
	 * ```
	 */
	handleSocketError(sessionId: string) {
		this.room.handleClose(sessionId)
	}

	/**
	 * Handles a WebSocket close event for the specified session. Use this in server
	 * environments where socket event listeners cannot be attached directly. This will
	 * initiate cleanup and session removal for the disconnected client.
	 *
	 * @param sessionId - Session identifier matching the one used in handleSocketConnect
	 *
	 * @example
	 * ```ts
	 * // In a custom WebSocket handler
	 * socket.addEventListener('close', () => {
	 *   room.handleSocketClose(sessionId)
	 * })
	 * ```
	 */
	handleSocketClose(sessionId: string) {
		this.room.handleClose(sessionId)
	}

	/**
	 * Returns the current document clock value. The clock is a monotonically increasing
	 * integer that increments with each document change, providing a consistent ordering
	 * of changes across the distributed system.
	 *
	 * @returns The current document clock value
	 *
	 * @example
	 * ```ts
	 * const clock = room.getCurrentDocumentClock()
	 * console.log(`Document is at version ${clock}`)
	 * ```
	 */
	getCurrentDocumentClock() {
		return this.storage.getClock()
	}

	/**
	 * Retrieves a deeply cloned copy of a record from the document store.
	 * Returns undefined if the record doesn't exist. The returned record is
	 * safe to mutate without affecting the original store data.
	 *
	 * @param id - Unique identifier of the record to retrieve
	 * @returns Deep clone of the record, or undefined if not found
	 *
	 * @example
	 * ```ts
	 * const shape = room.getRecord('shape:abc123')
	 * if (shape) {
	 *   console.log('Shape position:', shape.x, shape.y)
	 *   // Safe to modify without affecting store
	 *   shape.x = 100
	 * }
	 * ```
	 */
	getRecord(id: string) {
		return this.storage.transaction((txn) => {
			return structuredClone(txn.get(id)) as any
		}).result as R
	}

	/**
	 * Returns information about all active sessions in the room. Each session
	 * represents a connected client with their current connection status and metadata.
	 *
	 * @returns Array of session information objects containing:
	 *   - sessionId - Unique session identifier
	 *   - isConnected - Whether the session has an active WebSocket connection
	 *   - isReadonly - Whether the session can modify the document
	 *   - meta - Custom session metadata
	 *
	 * @example
	 * ```ts
	 * const sessions = room.getSessions()
	 * console.log(`Room has ${sessions.length} active sessions`)
	 *
	 * for (const session of sessions) {
	 *   console.log(`${session.sessionId}: ${session.isConnected ? 'online' : 'offline'}`)
	 *   if (session.isReadonly) {
	 *     console.log('  (read-only access)')
	 *   }
	 * }
	 * ```
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
	 * Creates a complete snapshot of the current document state, including all records
	 * and synchronization metadata. This snapshot can be persisted to storage and used
	 * to restore the room state later or revert to a previous version.
	 *
	 * @returns Complete room snapshot including documents, clock values, and tombstones
	 * @deprecated if you need to do this use
	 *
	 * @example
	 * ```ts
	 * // Capture current state for persistence
	 * const snapshot = room.getCurrentSnapshot()
	 * await saveToDatabase(roomId, JSON.stringify(snapshot))
	 *
	 * // Later, restore from snapshot
	 * const savedSnapshot = JSON.parse(await loadFromDatabase(roomId))
	 * const newRoom = new TLSocketRoom({ initialSnapshot: savedSnapshot })
	 * ```
	 */
	getCurrentSnapshot() {
		if (this.storage.getSnapshot) {
			return this.storage.getSnapshot()
		}
		throw new Error('getCurrentSnapshot is not supported for this storage type')
	}

	/**
	 * Retrieves all presence records from the document store. Presence records
	 * contain ephemeral user state like cursor positions and selections.
	 *
	 * @returns Object mapping record IDs to presence record data
	 * @internal
	 */
	getPresenceRecords() {
		const result = {} as Record<string, UnknownRecord>
		for (const presence of this.room.presenceStore.values()) {
			result[presence.id] = presence
		}
		return result
	}

	/**
	 * Loads a document snapshot, completely replacing the current room state.
	 * This will disconnect all current clients and update the document to match
	 * the provided snapshot. Use this for restoring from backups or implementing
	 * document versioning.
	 *
	 * @param snapshot - Room or store snapshot to load
	 *
	 * @example
	 * ```ts
	 * // Restore from a saved snapshot
	 * const backup = JSON.parse(await loadBackup(roomId))
	 * room.loadSnapshot(backup)
	 *
	 * // All clients will be disconnected and need to reconnect
	 * // to see the restored document state
	 * ```
	 */
	loadSnapshot(snapshot: RoomSnapshot | TLStoreSnapshot) {
		this.storage.transaction((txn) => {
			loadSnapshotIntoStorage(txn, this.room.schema, snapshot)
		})
	}

	/**
	 * Executes a transaction to modify the document store. Changes made within the
	 * transaction are atomic and will be synchronized to all connected clients.
	 * The transaction provides isolation from concurrent changes until it commits.
	 *
	 * @param updater - Function that receives store methods to make changes
	 *   - store.get(id) - Retrieve a record (safe to mutate, but must call put() to commit)
	 *   - store.put(record) - Save a modified record
	 *   - store.getAll() - Get all records in the store
	 *   - store.delete(id) - Remove a record from the store
	 * @returns Promise that resolves when the transaction completes
	 *
	 * @example
	 * ```ts
	 * // Update multiple shapes in a single transaction
	 * await room.updateStore(store => {
	 *   const shape1 = store.get('shape:abc123')
	 *   const shape2 = store.get('shape:def456')
	 *
	 *   if (shape1) {
	 *     shape1.x = 100
	 *     store.put(shape1)
	 *   }
	 *
	 *   if (shape2) {
	 *     shape2.meta.approved = true
	 *     store.put(shape2)
	 *   }
	 * })
	 * ```
	 *
	 * @example
	 * ```ts
	 * // Async transaction with external API call
	 * await room.updateStore(async store => {
	 *   const doc = store.get('document:main')
	 *   if (doc) {
	 *     doc.lastModified = await getCurrentTimestamp()
	 *     store.put(doc)
	 *   }
	 * })
	 * ```
	 * @deprecated use the storage.transaction method instead
	 */
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	async updateStore(updater: (store: RoomStoreMethods<R>) => void | Promise<void>) {
		if (this.isClosed()) {
			throw new Error('Cannot update store on a closed room')
		}
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		const ctx = new StoreUpdateContext<R>(
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			Object.fromEntries(this.getCurrentSnapshot().documents.map((d) => [d.state.id, d.state])),
			this.room.schema
		)
		try {
			await updater(ctx)
		} finally {
			ctx.close()
		}
		this.storage.transaction((txn) => {
			for (const [id, record] of Object.entries(ctx.updates.puts)) {
				txn.set(id, record as R)
			}
			for (const id of ctx.updates.deletes) {
				txn.delete(id)
			}
		})
	}

	/**
	 * Sends a custom message to a specific client session. This allows sending
	 * application-specific data that doesn't modify the document state, such as
	 * notifications, chat messages, or custom commands.
	 *
	 * @param sessionId - Target session identifier
	 * @param data - Custom payload to send (will be JSON serialized)
	 *
	 * @example
	 * ```ts
	 * // Send a notification to a specific user
	 * room.sendCustomMessage('session-123', {
	 *   type: 'notification',
	 *   message: 'Your changes have been saved'
	 * })
	 *
	 * // Send a chat message
	 * room.sendCustomMessage('session-456', {
	 *   type: 'chat',
	 *   from: 'Alice',
	 *   text: 'Great work on this design!'
	 * })
	 * ```
	 */
	sendCustomMessage(sessionId: string, data: any) {
		this.room.sendCustomMessage(sessionId, data)
	}

	/**
	 * Immediately removes a session from the room and closes its WebSocket connection.
	 * The client will attempt to reconnect automatically unless a fatal reason is provided.
	 *
	 * @param sessionId - Session identifier to remove
	 * @param fatalReason - Optional fatal error reason that prevents reconnection
	 *
	 * @example
	 * ```ts
	 * // Kick a user (they can reconnect)
	 * room.closeSession('session-troublemaker')
	 *
	 * // Permanently ban a user
	 * room.closeSession('session-banned', 'PERMISSION_DENIED')
	 *
	 * // Close session due to inactivity
	 * room.closeSession('session-idle', 'TIMEOUT')
	 * ```
	 */
	closeSession(sessionId: string, fatalReason?: TLSyncErrorCloseEventReason | string) {
		this.room.rejectSession(sessionId, fatalReason)
	}

	/**
	 * Closes the room and disconnects all connected clients. This should be called
	 * when shutting down the room permanently, such as during server shutdown or
	 * when the room is no longer needed. Once closed, the room cannot be reopened.
	 *
	 * @example
	 * ```ts
	 * // Clean shutdown when no users remain
	 * if (room.getNumActiveSessions() === 0) {
	 *   await persistSnapshot(room.getCurrentSnapshot())
	 *   room.close()
	 * }
	 *
	 * // Server shutdown
	 * process.on('SIGTERM', () => {
	 *   for (const room of activeRooms.values()) {
	 *     room.close()
	 *   }
	 * })
	 * ```
	 */
	close() {
		this.room.close()
		this.disposables.forEach((d) => d())
		this.disposables.clear()
	}

	/**
	 * Checks whether the room has been permanently closed. Closed rooms cannot
	 * accept new connections or process further changes.
	 *
	 * @returns True if the room is closed, false if still active
	 *
	 * @example
	 * ```ts
	 * if (room.isClosed()) {
	 *   console.log('Room has been shut down')
	 *   // Create a new room or redirect users
	 * } else {
	 *   // Room is still accepting connections
	 *   room.handleSocketConnect({ sessionId, socket })
	 * }
	 * ```
	 */
	isClosed() {
		return this.room.isClosed()
	}
}

/**
 * Utility type that removes properties with void values from an object type.
 * This is used internally to conditionally require session metadata based on
 * whether SessionMeta extends void.
 *
 * @example
 * ```ts
 * type Example = { a: string, b: void, c: number }
 * type Result = OmitVoid<Example> // { a: string, c: number }
 * ```
 *
 * @public
 */
export type OmitVoid<T, KS extends keyof T = keyof T> = {
	[K in KS extends any ? (void extends T[KS] ? never : KS) : never]: T[K]
}

/**
 * Interface for making transactional changes to room store data. Used within
 * updateStore transactions to modify documents atomically.
 *
 * @example
 * ```ts
 * await room.updateStore((store) => {
 *   const shape = store.get('shape:123')
 *   if (shape) {
 *     store.put({ ...shape, x: shape.x + 10 })
 *   }
 *   store.delete('shape:456')
 * })
 * ```
 *
 * @public
 * @deprecated use the storage.transaction method instead
 */
export interface RoomStoreMethods<R extends UnknownRecord = UnknownRecord> {
	/**
	 * Add or update a record in the store.
	 *
	 * @param record - The record to store
	 */
	put(record: R): void
	/**
	 * Delete a record from the store.
	 *
	 * @param recordOrId - The record or record ID to delete
	 */
	delete(recordOrId: R | string): void
	/**
	 * Get a record by its ID.
	 *
	 * @param id - The record ID
	 * @returns The record or null if not found
	 */
	get(id: string): R | null
	/**
	 * Get all records in the store.
	 *
	 * @returns Array of all records
	 */
	getAll(): R[]
}

/**
 * @deprecated use the storage.transaction method instead
 */
// eslint-disable-next-line @typescript-eslint/no-deprecated
class StoreUpdateContext<R extends UnknownRecord> implements RoomStoreMethods<R> {
	constructor(
		private readonly snapshot: Record<string, UnknownRecord>,
		private readonly schema: StoreSchema<R, any>
	) {}
	readonly updates = {
		puts: {} as Record<string, UnknownRecord>,
		deletes: new Set<string>(),
	}
	put(record: R): void {
		if (this._isClosed) throw new Error('StoreUpdateContext is closed')
		const recordType = getOwnProperty(this.schema.types, record.typeName)
		if (!recordType) {
			throw new Error(`Missing definition for record type ${record.typeName}`)
		}
		const recordBefore = this.snapshot[record.id] ?? undefined
		recordType.validate(record, recordBefore as R)

		if (record.id in this.snapshot && isEqual(this.snapshot[record.id], record)) {
			delete this.updates.puts[record.id]
		} else {
			this.updates.puts[record.id] = structuredClone(record)
		}
		this.updates.deletes.delete(record.id)
	}
	delete(recordOrId: R | string): void {
		if (this._isClosed) throw new Error('StoreUpdateContext is closed')
		const id = typeof recordOrId === 'string' ? recordOrId : recordOrId.id
		delete this.updates.puts[id]
		if (this.snapshot[id]) {
			this.updates.deletes.add(id)
		}
	}
	get(id: string): R | null {
		if (this._isClosed) throw new Error('StoreUpdateContext is closed')
		if (hasOwnProperty(this.updates.puts, id)) {
			return structuredClone(this.updates.puts[id]) as R
		}
		if (this.updates.deletes.has(id)) {
			return null
		}
		return structuredClone(this.snapshot[id] ?? null) as R
	}

	getAll(): R[] {
		if (this._isClosed) throw new Error('StoreUpdateContext is closed')
		const result = Object.values(this.updates.puts)
		for (const [id, record] of Object.entries(this.snapshot)) {
			if (!this.updates.deletes.has(id) && !hasOwnProperty(this.updates.puts, id)) {
				result.push(record)
			}
		}
		return structuredClone(result) as R[]
	}

	private _isClosed = false
	close() {
		this._isClosed = true
	}
}
