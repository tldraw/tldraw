import {
	AtomMap,
	MigrationFailureReason,
	RecordType,
	SerializedSchema,
	StoreSchema,
	TLPersistentStorage,
	TLPersistentStorageChange,
	TLPersistentStorageChangeOp,
	TLPersistentStorageTransaction,
	UnknownRecord,
} from '@tldraw/store'
import {
	Result,
	assert,
	assertExists,
	compact,
	exhaustiveSwitchError,
	getOwnProperty,
	isEqual,
	isNativeStructuredClone,
	objectMapEntriesIterable,
} from '@tldraw/utils'
import { fail } from 'assert'
import { createNanoEvents } from 'nanoevents'
import {
	RoomSession,
	RoomSessionState,
	SESSION_IDLE_TIMEOUT,
	SESSION_REMOVAL_WAIT_TIME,
	SESSION_START_WAIT_TIME,
} from './RoomSession'
import { TLSyncLog } from './TLSocketRoom'
import { TLSyncError, TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason } from './TLSyncClient'
import {
	NetworkDiff,
	ObjectDiff,
	RecordOp,
	RecordOpType,
	ValueOpType,
	applyObjectDiff,
} from './diff'
import { interval } from './interval'
import {
	TLIncompatibilityReason,
	TLSocketClientSentEvent,
	TLSocketServerSentDataEvent,
	TLSocketServerSentEvent,
	getTlsyncProtocolVersion,
} from './protocol'
import { applyAndDiffRecord, diffAndValidateRecord, validateRecord } from './recordDiff'

/**
 * WebSocket interface for server-side room connections. This defines the contract
 * that socket implementations must follow to work with TLSyncRoom.
 *
 * @internal
 */
export interface TLRoomSocket<R extends UnknownRecord> {
	/**
	 * Whether the socket connection is currently open and ready to send messages.
	 */
	isOpen: boolean
	/**
	 * Send a message to the connected client through this socket.
	 *
	 * @param msg - The server-sent event message to transmit
	 */
	sendMessage(msg: TLSocketServerSentEvent<R>): void
	/**
	 * Close the socket connection with optional status code and reason.
	 *
	 * @param code - WebSocket close code (optional)
	 * @param reason - Human-readable close reason (optional)
	 */
	close(code?: number, reason?: string): void
}

/**
 * The minimum time interval (in milliseconds) between sending batched data messages
 * to clients. This debouncing prevents overwhelming clients with rapid updates.
 * @public
 */
export const DATA_MESSAGE_DEBOUNCE_INTERVAL = 1000 / 60

const timeSince = (time: number) => Date.now() - time

/**
 * Snapshot of a room's complete state that can be persisted and restored.
 * Contains all documents, tombstones, and metadata needed to reconstruct the room.
 *
 * @public
 */
export interface RoomSnapshot {
	/**
	 * The current logical clock value for the room
	 */
	clock?: number
	/**
	 * Clock value when document data was last changed (optional for backwards compatibility)
	 */
	documentClock?: number
	/**
	 * Array of all document records with their last modification clocks
	 */
	documents: Array<{ state: UnknownRecord; lastChangedClock: number }>
	/**
	 * Map of deleted record IDs to their deletion clock values (optional)
	 */
	tombstones?: Record<string, number>
	/**
	 * Clock value where tombstone history begins - older deletions are not tracked (optional)
	 */
	tombstoneHistoryStartsAtClock?: number
	/**
	 * Serialized schema used when creating this snapshot (optional)
	 */
	schema?: SerializedSchema
}

/**
 * A collaborative workspace that manages multiple client sessions and synchronizes
 * document changes between them. The room serves as the authoritative source for
 * all document state and handles conflict resolution, schema migrations, and
 * real-time data distribution.
 *
 * @example
 * ```ts
 * const room = new TLSyncRoom({
 *   schema: mySchema,
 *   onDataChange: () => saveToDatabase(room.getSnapshot()),
 *   onPresenceChange: () => updateLiveCursors()
 * })
 *
 * // Handle new client connections
 * room.handleNewSession({
 *   sessionId: 'user-123',
 *   socket: webSocketAdapter,
 *   meta: { userId: '123', name: 'Alice' },
 *   isReadonly: false
 * })
 * ```
 *
 * @internal
 */
export class TLSyncRoom<R extends UnknownRecord, SessionMeta> {
	// A table of connected clients
	readonly sessions = new Map<string, RoomSession<R, SessionMeta>>()

	private lastDocumentClock = 0

	// eslint-disable-next-line local/prefer-class-methods
	pruneSessions = () => {
		for (const client of this.sessions.values()) {
			switch (client.state) {
				case RoomSessionState.Connected: {
					const hasTimedOut = timeSince(client.lastInteractionTime) > SESSION_IDLE_TIMEOUT
					if (hasTimedOut || !client.socket.isOpen) {
						this.cancelSession(client.sessionId)
					}
					break
				}
				case RoomSessionState.AwaitingConnectMessage: {
					const hasTimedOut = timeSince(client.sessionStartTime) > SESSION_START_WAIT_TIME
					if (hasTimedOut || !client.socket.isOpen) {
						// remove immediately
						this.removeSession(client.sessionId)
					}
					break
				}
				case RoomSessionState.AwaitingRemoval: {
					const hasTimedOut = timeSince(client.cancellationTime) > SESSION_REMOVAL_WAIT_TIME
					if (hasTimedOut) {
						this.removeSession(client.sessionId)
					}
					break
				}
				default: {
					exhaustiveSwitchError(client)
				}
			}
		}
	}

	readonly presenceStore = new PresenceStore<R>()

	private disposables: Array<() => void> = [interval(this.pruneSessions, 2000)]

	private _isClosed = false

	/**
	 * Close the room and clean up all resources. Disconnects all sessions
	 * and stops background processes.
	 */
	close() {
		this.disposables.forEach((d) => d())
		this.sessions.forEach((session) => {
			session.socket.close()
		})
		this._isClosed = true
	}

	/**
	 * Check if the room has been closed and is no longer accepting connections.
	 *
	 * @returns True if the room is closed
	 */
	isClosed() {
		return this._isClosed
	}

	readonly events = createNanoEvents<{
		room_became_empty(): void
		session_removed(args: { sessionId: string; meta: SessionMeta }): void
	}>()

	// Storage layer for documents, tombstones, and clocks
	private readonly storage: TLPersistentStorage<R>

	readonly serializedSchema: SerializedSchema

	readonly documentTypes: Set<string>
	readonly presenceType: RecordType<R, any> | null
	private log?: TLSyncLog
	public readonly schema: StoreSchema<R, any>
	private onDataChange?(): void
	private onPresenceChange?(): void

	constructor(opts: {
		log?: TLSyncLog
		schema: StoreSchema<R, any>
		onDataChange?(): void
		onPresenceChange?(): void
		storage: TLPersistentStorage<R>
	}) {
		this.schema = opts.schema
		this.log = opts.log
		this.onDataChange = opts.onDataChange
		this.onPresenceChange = opts.onPresenceChange
		this.storage = opts.storage

		assert(
			isNativeStructuredClone,
			'TLSyncRoom is supposed to run either on Cloudflare Workers' +
				'or on a 18+ version of Node.js, which both support the native structuredClone API'
		)

		// do a json serialization cycle to make sure the schema has no 'undefined' values
		this.serializedSchema = JSON.parse(JSON.stringify(this.schema.serialize()))

		this.documentTypes = new Set(
			Object.values<RecordType<R, any>>(this.schema.types)
				.filter((t) => t.scope === 'document')
				.map((t) => t.typeName)
		)

		const presenceTypes = new Set(
			Object.values<RecordType<R, any>>(this.schema.types).filter((t) => t.scope === 'presence')
		)

		if (presenceTypes.size > 1) {
			throw new Error(
				`TLSyncRoom: exactly zero or one presence type is expected, but found ${presenceTypes.size}`
			)
		}

		this.presenceType = presenceTypes.values().next()?.value ?? null

		const result = this.schema.migratePersistentStorage(this.storage)

		if (!result.ok) {
			throw new Error('Failed to migrate: ' + result.error)
		}

		this.lastDocumentClock = result.value.documentClock

		if (result.value.didChange) {
			this.onDataChange?.()
		}

		this.storage.onChange(({ source }) => {
			if (source !== this.changeSource) {
				this.broadcastExternalStorageChanges()
			}
		})
	}
	private broadcastExternalStorageChanges() {
		this.storage.transaction(this.changeSource, (txn) => {
			this.broadcastChanges(txn.getChangesSince(this.lastDocumentClock), txn.getClock())
			this.lastDocumentClock = txn.getClock()
		})
	}

	/**
	 * Send a message to a particular client. Debounces data events
	 *
	 * @param sessionId - The id of the session to send the message to.
	 * @param message - The message to send. UNSAFE Any diffs must have been downgraded already if necessary
	 */
	private _unsafe_sendMessage(
		sessionId: string,
		message: TLSocketServerSentEvent<R> | TLSocketServerSentDataEvent<R>
	) {
		const session = this.sessions.get(sessionId)
		if (!session) {
			this.log?.warn?.('Tried to send message to unknown session', message.type)
			return
		}
		if (session.state !== RoomSessionState.Connected) {
			this.log?.warn?.('Tried to send message to disconnected client', message.type)
			return
		}
		if (session.socket.isOpen) {
			if (message.type !== 'patch' && message.type !== 'push_result') {
				// this is not a data message
				if (message.type !== 'pong') {
					// non-data messages like "connect" might still need to be ordered correctly with
					// respect to data messages, so it's better to flush just in case
					this._flushDataMessages(sessionId)
				}
				session.socket.sendMessage(message)
			} else {
				if (session.debounceTimer === null) {
					// this is the first message since the last flush, don't delay it
					session.socket.sendMessage({ type: 'data', data: [message] })

					session.debounceTimer = setTimeout(
						() => this._flushDataMessages(sessionId),
						DATA_MESSAGE_DEBOUNCE_INTERVAL
					)
				} else {
					session.outstandingDataMessages.push(message)
				}
			}
		} else {
			this.cancelSession(session.sessionId)
		}
	}

	// needs to accept sessionId and not a session because the session might be dead by the time
	// the timer fires
	_flushDataMessages(sessionId: string) {
		const session = this.sessions.get(sessionId)

		if (!session || session.state !== RoomSessionState.Connected) {
			return
		}

		session.debounceTimer = null

		if (session.outstandingDataMessages.length > 0) {
			session.socket.sendMessage({ type: 'data', data: session.outstandingDataMessages })
			session.outstandingDataMessages.length = 0
		}
	}

	/** @internal */
	private removeSession(sessionId: string, fatalReason?: string) {
		const session = this.sessions.get(sessionId)
		if (!session) {
			this.log?.warn?.('Tried to remove unknown session')
			return
		}

		this.sessions.delete(sessionId)

		try {
			if (fatalReason) {
				session.socket.close(TLSyncErrorCloseEventCode, fatalReason)
			} else {
				session.socket.close()
			}
		} catch {
			// noop, calling .close() multiple times is fine
		}

		const presence = this.presenceStore.getDocument(session.presenceId ?? '')
		if (presence) {
			this.presenceStore.deleteDocument(session.presenceId!)
			this.broadcastPatch({
				diff: { [session.presenceId!]: [RecordOpType.Remove] },
				sourceSessionId: sessionId,
			})
		}

		this.events.emit('session_removed', { sessionId, meta: session.meta })
		if (this.sessions.size === 0) {
			this.events.emit('room_became_empty')
		}
	}

	private cancelSession(sessionId: string) {
		const session = this.sessions.get(sessionId)
		if (!session) {
			return
		}

		if (session.state === RoomSessionState.AwaitingRemoval) {
			this.log?.warn?.('Tried to cancel session that is already awaiting removal')
			return
		}

		this.sessions.set(sessionId, {
			state: RoomSessionState.AwaitingRemoval,
			sessionId,
			presenceId: session.presenceId,
			socket: session.socket,
			cancellationTime: Date.now(),
			meta: session.meta,
			isReadonly: session.isReadonly,
			requiresLegacyRejection: session.requiresLegacyRejection,
			supportsStringAppend: session.supportsStringAppend,
		})

		try {
			session.socket.close()
		} catch {
			// noop, calling .close() multiple times is fine
		}
	}

	private readonly changeSource = 'TLSyncRoom'

	/**
	 * Broadcast a patch to all connected clients except the one with the sessionId provided.
	 * Automatically handles schema migration for clients on different versions.
	 */
	broadcastPatch({ diff, sourceSessionId }: { diff: NetworkDiff<R>; sourceSessionId?: string }) {
		this.sessions.forEach((session) => {
			if (session.state !== RoomSessionState.Connected) return
			if (sourceSessionId === session.sessionId) return
			if (!session.socket.isOpen) {
				this.cancelSession(session.sessionId)
				return
			}

			if (session.requiresDownMigrations) {
				const { result } = this.storage.transaction(this.changeSource, (txn) => {
					return this.migrateDiffForSession(txn, session.serializedSchema, diff)
				})
				if (!result.ok) {
					this.rejectSession(
						session.sessionId,
						result.error === MigrationFailureReason.TargetVersionTooNew
							? TLSyncErrorCloseEventReason.SERVER_TOO_OLD
							: TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
					)
					return
				}
				diff = result.value
			}

			this._unsafe_sendMessage(session.sessionId, {
				type: 'patch',
				diff,
				serverClock: this.lastDocumentClock,
			})
		})
		return this
	}

	/**
	 * Send a custom message to a connected client. Useful for application-specific
	 * communication that doesn't involve document synchronization.
	 *
	 * @param sessionId - The ID of the session to send the message to
	 * @param data - The custom payload to send (will be JSON serialized)
	 * @example
	 * ```ts
	 * // Send a custom notification
	 * room.sendCustomMessage('user-123', {
	 *   type: 'notification',
	 *   message: 'Document saved successfully'
	 * })
	 *
	 * // Send user-specific data
	 * room.sendCustomMessage('user-456', {
	 *   type: 'user_permissions',
	 *   canEdit: true,
	 *   canDelete: false
	 * })
	 * ```
	 */
	sendCustomMessage(sessionId: string, data: any): void {
		this._unsafe_sendMessage(sessionId, { type: 'custom', data })
	}

	/**
	 * Register a new client session with the room. The session will be in an awaiting
	 * state until it sends a connect message with protocol handshake.
	 *
	 * @param opts - Session configuration
	 *   - sessionId - Unique identifier for this session
	 *   - socket - WebSocket adapter for communication
	 *   - meta - Application-specific metadata for this session
	 *   - isReadonly - Whether this session can modify documents
	 * @returns This room instance for method chaining
	 * @example
	 * ```ts
	 * room.handleNewSession({
	 *   sessionId: crypto.randomUUID(),
	 *   socket: new WebSocketAdapter(ws),
	 *   meta: { userId: '123', name: 'Alice', avatar: 'url' },
	 *   isReadonly: !hasEditPermission
	 * })
	 * ```
	 *
	 * @internal
	 */
	handleNewSession(opts: {
		sessionId: string
		socket: TLRoomSocket<R>
		meta: SessionMeta
		isReadonly: boolean
	}) {
		const { sessionId, socket, meta, isReadonly } = opts
		const existing = this.sessions.get(sessionId)
		this.sessions.set(sessionId, {
			state: RoomSessionState.AwaitingConnectMessage,
			sessionId,
			socket,
			presenceId: existing?.presenceId ?? this.presenceType?.createId() ?? null,
			sessionStartTime: Date.now(),
			meta,
			isReadonly: isReadonly ?? false,
			// this gets set later during handleConnectMessage
			requiresLegacyRejection: false,
			supportsStringAppend: true,
		})
		return this
	}

	/**
	 * Checks if all connected sessions support string append operations (protocol version 8+).
	 * If any client is on an older version, returns false to enable legacy append mode.
	 *
	 * @returns True if all connected sessions are on protocol version 8 or higher
	 */
	getCanEmitStringAppend(): boolean {
		for (const session of this.sessions.values()) {
			if (session.state === RoomSessionState.Connected) {
				if (!session.supportsStringAppend) {
					return false
				}
			}
		}
		return true
	}

	/**
	 * When we send a diff to a client, if that client is on a lower version than us, we need to make
	 * the diff compatible with their version. At the moment this means migrating each affected record
	 * to the client's version and sending the whole record again. We can optimize this later by
	 * keeping the previous versions of records around long enough to recalculate these diffs for
	 * older client versions.
	 */
	private migrateDiffForSession(
		txn: TLPersistentStorageTransaction<R>,
		serializedSchema: SerializedSchema,
		diff: NetworkDiff<R>
	): Result<NetworkDiff<R>, MigrationFailureReason> {
		// TODO: optimize this by recalculating patches using the previous versions of records

		// when the client connects we check whether the schema is identical and make sure
		// to use the same object reference so that === works on this line
		if (serializedSchema === this.serializedSchema) {
			return Result.ok(diff)
		}

		const result: NetworkDiff<R> = {}
		for (const [id, op] of objectMapEntriesIterable(diff)) {
			if (op[0] === RecordOpType.Remove) {
				result[id] = op
				continue
			}

			const doc = txn.getDocument(id)
			if (!doc) {
				return Result.err(MigrationFailureReason.TargetVersionTooNew)
			}
			const migrationResult = this.schema.migratePersistedRecord(
				doc.state,
				serializedSchema,
				'down'
			)

			if (migrationResult.type === 'error') {
				return Result.err(migrationResult.reason)
			}

			result[id] = [RecordOpType.Put, migrationResult.value]
		}

		return Result.ok(result)
	}

	/**
	 * Process an incoming message from a client session. Handles connection requests,
	 * data synchronization pushes, and ping/pong for connection health.
	 *
	 * @param sessionId - The ID of the session that sent the message
	 * @param message - The client message to process
	 * @example
	 * ```ts
	 * // Typically called by WebSocket message handlers
	 * websocket.onMessage((data) => {
	 *   const message = JSON.parse(data)
	 *   room.handleMessage(sessionId, message)
	 * })
	 * ```
	 */
	async handleMessage(sessionId: string, message: TLSocketClientSentEvent<R>) {
		const session = this.sessions.get(sessionId)
		if (!session) {
			this.log?.warn?.('Received message from unknown session')
			return
		}
		try {
			switch (message.type) {
				case 'connect': {
					return this.handleConnectRequest(session, message)
				}
				case 'push': {
					return this.handlePushRequest(session, message)
				}
				case 'ping': {
					if (session.state === RoomSessionState.Connected) {
						session.lastInteractionTime = Date.now()
					}
					return this._unsafe_sendMessage(session.sessionId, { type: 'pong' })
				}
				default: {
					exhaustiveSwitchError(message)
				}
			}
		} catch (e) {
			if (e instanceof TLSyncError) {
				this.rejectSession(session.sessionId, e.reason)
			} else {
				// log error and reboot the room?
				throw e
			}
		}
	}

	/**
	 * Reject and disconnect a session due to incompatibility or other fatal errors.
	 * Sends appropriate error messages before closing the connection.
	 *
	 * @param sessionId - The session to reject
	 * @param fatalReason - The reason for rejection (optional)
	 * @example
	 * ```ts
	 * // Reject due to version mismatch
	 * room.rejectSession('user-123', TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
	 *
	 * // Reject due to permission issue
	 * room.rejectSession('user-456', 'Insufficient permissions')
	 * ```
	 */
	rejectSession(sessionId: string, fatalReason?: TLSyncErrorCloseEventReason | string) {
		const session = this.sessions.get(sessionId)
		if (!session) return
		if (!fatalReason) {
			this.removeSession(sessionId)
			return
		}
		if (session.requiresLegacyRejection) {
			try {
				if (session.socket.isOpen) {
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					let legacyReason: TLIncompatibilityReason
					switch (fatalReason) {
						case TLSyncErrorCloseEventReason.CLIENT_TOO_OLD:
							// eslint-disable-next-line @typescript-eslint/no-deprecated
							legacyReason = TLIncompatibilityReason.ClientTooOld
							break
						case TLSyncErrorCloseEventReason.SERVER_TOO_OLD:
							// eslint-disable-next-line @typescript-eslint/no-deprecated
							legacyReason = TLIncompatibilityReason.ServerTooOld
							break
						case TLSyncErrorCloseEventReason.INVALID_RECORD:
							// eslint-disable-next-line @typescript-eslint/no-deprecated
							legacyReason = TLIncompatibilityReason.InvalidRecord
							break
						default:
							// eslint-disable-next-line @typescript-eslint/no-deprecated
							legacyReason = TLIncompatibilityReason.InvalidOperation
							break
					}
					session.socket.sendMessage({
						type: 'incompatibility_error',
						reason: legacyReason,
					})
				}
			} catch {
				// noop
			} finally {
				this.removeSession(sessionId)
			}
		} else {
			this.removeSession(sessionId, fatalReason)
		}
	}

	private broadcastChanges(changes: Iterable<TLPersistentStorageChange<R>>, clock: number) {
		const diff: NetworkDiff<R> = {}
		let didChange = false
		for (const [op, val] of changes) {
			didChange = true
			if (op === TLPersistentStorageChangeOp.PUT) {
				diff[val.id] = [RecordOpType.Put, val]
			} else if (op === TLPersistentStorageChangeOp.DELETE) {
				diff[val] = [RecordOpType.Remove]
			}
		}
		this.lastDocumentClock = clock
		if (didChange) {
			this.broadcastPatch({ diff })
		}
	}

	private handleConnectRequest(
		session: RoomSession<R, SessionMeta>,
		message: Extract<TLSocketClientSentEvent<R>, { type: 'connect' }>
	) {
		// if the protocol versions don't match, disconnect the client
		// we will eventually want to try to make our protocol backwards compatible to some degree
		// and have a MIN_PROTOCOL_VERSION constant that the TLSyncRoom implements support for
		let theirProtocolVersion = message.protocolVersion
		// 5 is the same as 6
		if (theirProtocolVersion === 5) {
			theirProtocolVersion = 6
		}
		// 6 is almost the same as 7
		session.requiresLegacyRejection = theirProtocolVersion === 6
		if (theirProtocolVersion === 6) {
			theirProtocolVersion++
		}
		if (theirProtocolVersion === 7) {
			theirProtocolVersion++
			session.supportsStringAppend = false
		}

		if (theirProtocolVersion == null || theirProtocolVersion < getTlsyncProtocolVersion()) {
			this.rejectSession(session.sessionId, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			return
		} else if (theirProtocolVersion > getTlsyncProtocolVersion()) {
			this.rejectSession(session.sessionId, TLSyncErrorCloseEventReason.SERVER_TOO_OLD)
			return
		}
		// If the client's store is at a different version to ours, it could cause corruption.
		// We should disconnect the client and ask them to refresh.
		if (message.schema == null) {
			this.rejectSession(session.sessionId, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			return
		}
		const migrations = this.schema.getMigrationsSince(message.schema)
		// if the client's store is at a different version to ours, we can't support them
		if (!migrations.ok || migrations.value.some((m) => m.scope === 'store' || !m.down)) {
			this.rejectSession(session.sessionId, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			return
		}

		const sessionSchema = isEqual(message.schema, this.serializedSchema)
			? this.serializedSchema
			: message.schema

		const connect = async (msg: Extract<TLSocketServerSentEvent<R>, { type: 'connect' }>) => {
			this.sessions.set(session.sessionId, {
				state: RoomSessionState.Connected,
				sessionId: session.sessionId,
				presenceId: session.presenceId,
				socket: session.socket,
				serializedSchema: sessionSchema,
				requiresDownMigrations: migrations.value.length > 0,
				lastInteractionTime: Date.now(),
				debounceTimer: null,
				outstandingDataMessages: [],
				supportsStringAppend: session.supportsStringAppend,
				meta: session.meta,
				isReadonly: session.isReadonly,
				requiresLegacyRejection: session.requiresLegacyRejection,
			})
			this._unsafe_sendMessage(session.sessionId, msg)
		}

		const { documentClock, result } = this.storage.transaction(this.changeSource, (txn) => {
			this.broadcastChanges(txn.getChangesSince(this.lastDocumentClock), txn.getClock())
			const changes = txn.getChangesSince(message.lastServerClock)
			let hydrationType: 'wipe_all' | 'wipe_presence' = 'wipe_presence'
			const diff: NetworkDiff<R> = {}
			for (const [op, val] of changes) {
				if (op === TLPersistentStorageChangeOp.PUT) {
					diff[val.id] = [RecordOpType.Put, val]
				} else if (op === TLPersistentStorageChangeOp.DELETE) {
					diff[val] = [RecordOpType.Remove]
				} else if (op === TLPersistentStorageChangeOp.WIPE_ALL) {
					hydrationType = 'wipe_all'
				}
			}

			const migrated = this.migrateDiffForSession(txn, sessionSchema, diff)
			if (!migrated.ok) {
				this.rejectSession(
					session.sessionId,
					migrated.error === MigrationFailureReason.TargetVersionTooNew
						? TLSyncErrorCloseEventReason.SERVER_TOO_OLD
						: TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
				)
				return null
			}
			return {
				type: 'connect',
				connectRequestId: message.connectRequestId,
				hydrationType,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: this.schema.serialize(),
				serverClock: txn.getClock(),
				diff: migrated.value,
				isReadonly: session.isReadonly,
			} satisfies Extract<TLSocketServerSentEvent<R>, { type: 'connect' }>
		})

		this.lastDocumentClock = documentClock

		if (result) {
			connect(result)
		}
	}

	private handlePushRequest(
		session: RoomSession<R, SessionMeta> | null,
		message: Extract<TLSocketClientSentEvent<R>, { type: 'push' }>
	) {
		// We must be connected to handle push requests
		if (session && session.state !== RoomSessionState.Connected) {
			return
		}

		// update the last interaction time
		if (session) {
			session.lastInteractionTime = Date.now()
		}

		const legacyAppendMode = !this.getCanEmitStringAppend()

		interface ActualChanges {
			diff: NetworkDiff<R> | null
		}

		const propagateOp = (changes: ActualChanges, id: string, op: RecordOp<R>) => {
			if (!changes.diff) changes.diff = {}
			changes.diff[id] = op
		}

		const addDocument = (
			storage: MinimalDocStore<R>,
			changes: ActualChanges,
			id: string,
			_state: R
		): Result<void, void> => {
			const res = session
				? this.schema.migratePersistedRecord(_state, session.serializedSchema, 'up')
				: { type: 'success' as const, value: _state }
			if (res.type === 'error') {
				return fail(
					res.reason === MigrationFailureReason.TargetVersionTooOld // target version is our version
						? TLSyncErrorCloseEventReason.SERVER_TOO_OLD
						: TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
				)
			}
			const { value: state } = res

			// Get the existing document, if any
			const doc = storage.getDocument(id)

			if (doc) {
				// If there's an existing document, replace it with the new state
				// but propagate a diff rather than the entire value
				const recordType = assertExists(getOwnProperty(this.schema.types, doc.state.typeName))
				const diff = diffAndValidateRecord(doc.state, state, recordType)
				if (diff) {
					storage.setDocument(id, state)
					propagateOp(changes, id, [RecordOpType.Patch, diff])
				}
			} else {
				// Otherwise, if we don't already have a document with this id
				// create the document and propagate the put op
				// setDocument automatically clears tombstones if they exist
				const recordType = assertExists(getOwnProperty(this.schema.types, state.typeName))
				validateRecord(state, recordType)
				storage.setDocument(id, state)
				propagateOp(changes, id, [RecordOpType.Put, state])
			}

			return Result.ok(undefined)
		}

		const patchDocument = (
			storage: MinimalDocStore<R>,
			changes: ActualChanges,
			id: string,
			patch: ObjectDiff
		) => {
			// if it was already deleted, there's no need to apply the patch
			const doc = storage.getDocument(id)
			if (!doc) return

			const recordType = assertExists(getOwnProperty(this.schema.types, doc.state.typeName))
			// If the client's version of the record is older than ours,
			// we apply the patch to the downgraded version of the record
			const downgraded = session
				? this.schema.migratePersistedRecord(doc.state, session.serializedSchema, 'down')
				: { type: 'success' as const, value: doc.state }
			if (downgraded.type === 'error') {
				throw new TLSyncError(downgraded.reason, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			}

			if (downgraded.value === doc.state) {
				// If the versions are compatible, apply the patch and propagate the patch op
				const diff = applyAndDiffRecord(doc.state, patch, recordType, legacyAppendMode)
				if (diff) {
					storage.setDocument(id, diff[1])
					propagateOp(changes, id, [RecordOpType.Patch, diff[0]])
				}
			} else {
				// need to apply the patch to the downgraded version and then upgrade it

				// apply the patch to the downgraded version
				const patched = applyObjectDiff(downgraded.value, patch)
				// then upgrade the patched version and use that as the new state
				const upgraded = session
					? this.schema.migratePersistedRecord(patched, session.serializedSchema, 'up')
					: { type: 'success' as const, value: patched }
				// If the client's version is too old, we'll hit an error
				if (upgraded.type === 'error') {
					return fail(TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
				}
				// replace the state with the upgraded version and propagate the patch op
				const diff = diffAndValidateRecord(doc.state, upgraded.value, recordType, legacyAppendMode)
				if (diff) {
					storage.setDocument(id, upgraded.value)
					propagateOp(changes, id, [RecordOpType.Patch, diff])
				}
			}
		}

		const { result, didChange, documentClock } = this.storage.transaction(
			this.changeSource,
			(
				txn
			): {
				outgoingMessages: Array<
					[string, TLSocketServerSentEvent<R> | TLSocketServerSentDataEvent<R>]
				>
				didPresenceChange: boolean
			} => {
				this.broadcastChanges(txn.getChangesSince(this.lastDocumentClock), txn.getClock())
				// collect actual ops that resulted from the push
				// these will be broadcast to other users

				const docChanges: ActualChanges = { diff: null }
				const presenceChanges: ActualChanges = { diff: null }

				const { clientClock } = message

				if (this.presenceType && session?.presenceId && 'presence' in message && message.presence) {
					if (!session) throw new Error('session is required for presence pushes')
					// The push request was for the presence scope.
					const id = session.presenceId
					const [type, val] = message.presence
					const { typeName } = this.presenceType
					switch (type) {
						case RecordOpType.Put: {
							// Try to put the document. If it fails, stop here.
							addDocument(this.presenceStore, presenceChanges, id, {
								...val,
								id,
								typeName,
							})
							break
						}
						case RecordOpType.Patch: {
							// Try to patch the document. If it fails, stop here.
							patchDocument(this.presenceStore, presenceChanges, id, {
								...val,
								id: [ValueOpType.Put, id],
								typeName: [ValueOpType.Put, typeName],
							})
							break
						}
					}
				}
				if (message.diff && !session?.isReadonly) {
					// The push request was for the document scope.
					for (const [id, op] of objectMapEntriesIterable(message.diff!)) {
						switch (op[0]) {
							case RecordOpType.Put: {
								// Try to add the document.
								// If we're putting a record with a type that we don't recognize, fail
								if (!this.documentTypes.has(op[1].typeName)) {
									throw new TLSyncError(
										'invalid record',
										TLSyncErrorCloseEventReason.INVALID_RECORD
									)
								}
								addDocument(txn, docChanges, id, op[1])
								break
							}
							case RecordOpType.Patch: {
								// Try to patch the document. If it fails, stop here.
								patchDocument(txn, docChanges, id, op[1])
								break
							}
							case RecordOpType.Remove: {
								const doc = txn.getDocument(id)
								if (!doc) {
									// If the doc was already deleted, don't do anything, no need to propagate a delete op
									continue
								}

								// Delete the document and propagate the delete op
								// deleteDocument automatically creates tombstones
								txn.deleteDocument(id)
								propagateOp(docChanges, id, op)
								break
							}
						}
					}
				}
				let pushResult: Extract<TLSocketServerSentEvent<R>, { type: 'push_result' }> | undefined =
					undefined
				const clock = txn.getClock()

				// Let the client know what action to take based on the results of the push
				if (
					// if there was only a presence push, the client doesn't need to do anything aside from
					// shift the push request.
					!message.diff ||
					isEqual(docChanges.diff, message.diff)
				) {
					// COMMIT
					// Applying the client's changes had the exact same effect on the server as
					// they had on the client, so the client should keep the diff
					if (session) {
						pushResult = {
							type: 'push_result',
							serverClock: clock,
							clientClock,
							action: 'commit',
						}
					}
				} else if (!docChanges.diff) {
					// DISCARD
					// Applying the client's changes had no effect, so the client should drop the diff
					if (session) {
						pushResult = {
							type: 'push_result',
							serverClock: clock,
							clientClock,
							action: 'discard',
						}
					}
				} else {
					// REBASE
					// Applying the client's changes had a different non-empty effect on the server,
					// so the client should rebase with our gold-standard / authoritative diff.
					// First we need to migrate the diff to the client's version
					if (session) {
						const migrateResult = this.migrateDiffForSession(
							txn,
							session.serializedSchema,
							docChanges.diff
						)
						if (!migrateResult.ok) {
							throw new TLSyncError(
								'Migration failed',
								migrateResult.error === MigrationFailureReason.TargetVersionTooNew
									? TLSyncErrorCloseEventReason.SERVER_TOO_OLD
									: TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
							)
						}
						// If the migration worked, send the rebased diff to the client
						pushResult = {
							type: 'push_result',
							serverClock: clock,
							clientClock,
							action: { rebaseWithDiff: migrateResult.value },
						}
					}
				}

				const outgoingMessages: Array<
					[string, TLSocketServerSentEvent<R> | TLSocketServerSentDataEvent<R>]
				> = pushResult && session ? [[session.sessionId, pushResult]] : []

				// If there are merged changes, broadcast them to all other clients
				if (docChanges.diff || presenceChanges.diff) {
					const noDownMigrationsMessage: TLSocketServerSentDataEvent<R> = {
						type: 'patch',
						diff: {
							...docChanges.diff,
							...presenceChanges.diff,
						},
						serverClock: clock,
					}
					for (const otherSession of this.sessions.values()) {
						if (session?.sessionId === otherSession.sessionId) continue
						if (otherSession.state !== RoomSessionState.Connected) continue

						if (!otherSession.requiresLegacyRejection) {
							outgoingMessages.push([otherSession.sessionId, noDownMigrationsMessage])
							continue
						}

						const downPresence = presenceChanges.diff
							? this.migrateDiffForSession(txn, otherSession.serializedSchema, presenceChanges.diff)
							: undefined

						const downDoc = docChanges.diff
							? this.migrateDiffForSession(txn, otherSession.serializedSchema, docChanges.diff)
							: undefined

						const down = Result.all(compact([downPresence, downDoc]))

						if (!down.ok) {
							this.rejectSession(
								otherSession.sessionId,
								down.error === MigrationFailureReason.TargetVersionTooNew
									? TLSyncErrorCloseEventReason.SERVER_TOO_OLD
									: TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
							)
							continue
						}

						outgoingMessages.push([
							otherSession.sessionId,
							{
								type: 'patch',
								diff: {
									...down.value[0],
									...down.value[1],
								},
								serverClock: this.lastDocumentClock,
							},
						])
					}
				}

				return { outgoingMessages, didPresenceChange: !!presenceChanges.diff }
			}
		)

		this.lastDocumentClock = documentClock

		result.outgoingMessages.forEach(([sessionId, message]) => {
			this._unsafe_sendMessage(sessionId, message)
		})

		// if it threw the changes will have been rolled back and the document clock will not have been incremented
		if (didChange) {
			this.onDataChange?.()
		}

		if (result.didPresenceChange) {
			this.onPresenceChange?.()
		}
	}

	/**
	 * Handle the event when a client disconnects. Cleans up the session and
	 * removes any presence information.
	 *
	 * @param sessionId - The session that disconnected
	 * @example
	 * ```ts
	 * websocket.onClose(() => {
	 *   room.handleClose(sessionId)
	 * })
	 * ```
	 */
	handleClose(sessionId: string) {
		this.cancelSession(sessionId)
	}
}

interface MinimalDocStore<R extends UnknownRecord> {
	getDocument: TLPersistentStorageTransaction<R>['getDocument']
	setDocument: TLPersistentStorageTransaction<R>['setDocument']
	deleteDocument: TLPersistentStorageTransaction<R>['deleteDocument']
}

class PresenceStore<R extends UnknownRecord> implements MinimalDocStore<R> {
	private readonly presences = new AtomMap<string, { state: R; lastChangedClock: number }>(
		'presences'
	)

	getDocument(id: string) {
		return this.presences.get(id)
	}

	setDocument(id: string, state: R): void {
		this.presences.set(id, { state, lastChangedClock: 0 })
	}

	deleteDocument(id: string): void {
		this.presences.delete(id)
	}

	values() {
		return Array.from(this.presences.values()).map(({ state }) => state)
	}
}
