import {
	AtomMap,
	MigrationFailureReason,
	RecordType,
	SerializedSchema,
	StoreSchema,
	UnknownRecord,
} from '@tldraw/store'
import {
	assert,
	assertExists,
	exhaustiveSwitchError,
	getOwnProperty,
	isEqual,
	isNativeStructuredClone,
	objectMapEntriesIterable,
	Result,
} from '@tldraw/utils'
import { createNanoEvents } from 'nanoevents'
import {
	applyObjectDiff,
	diffRecord,
	NetworkDiff,
	ObjectDiff,
	RecordOp,
	RecordOpType,
	ValueOpType,
} from './diff'
import { interval } from './interval'
import {
	getTlsyncProtocolVersion,
	TLIncompatibilityReason,
	TLSocketClientSentEvent,
	TLSocketServerSentDataEvent,
	TLSocketServerSentEvent,
} from './protocol'
import { applyAndDiffRecord, diffAndValidateRecord, validateRecord } from './recordDiff'
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
	TLSyncForwardDiff,
	TLSyncStorage,
	TLSyncStorageTransaction,
	toNetworkDiff,
} from './TLSyncStorage'

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
	private readonly storage: TLSyncStorage<R>

	readonly serializedSchema: SerializedSchema

	readonly documentTypes: Set<string>
	readonly presenceType: RecordType<R, any> | null
	private log?: TLSyncLog
	public readonly schema: StoreSchema<R, any>
	private onPresenceChange?(): void

	constructor(opts: {
		log?: TLSyncLog
		schema: StoreSchema<R, any>
		onPresenceChange?(): void
		storage: TLSyncStorage<R>
	}) {
		this.schema = opts.schema
		this.log = opts.log
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

		const { documentClock } = this.storage.transaction((txn) => {
			this.schema.migrateStorage(txn)
		})

		this.lastDocumentClock = documentClock

		this.disposables.push(
			this.storage.onChange(({ id }) => {
				if (id !== this.internalTxnId) {
					this.broadcastExternalStorageChanges()
				}
			})
		)
	}
	private broadcastExternalStorageChanges() {
		this.storage.transaction((txn) => {
			this.broadcastChanges(txn)
			this.lastDocumentClock = txn.getClock()
		}) // no id needed because this only reads, no writes.
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

		const presence = this.presenceStore.get(session.presenceId ?? '')
		if (presence) {
			this.presenceStore.delete(session.presenceId!)
			// Broadcast presence removal - use RecordsDiff with the removed record
			this.broadcastPatch({
				puts: {},
				deletes: [session.presenceId!],
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

	readonly internalTxnId = 'TLSyncRoom.txn'

	/**
	 * Broadcast a patch to all connected clients except the one with the sessionId provided.
	 *
	 * @param diff - The TLSyncForwardDiff with full records (used for migration)
	 * @param networkDiff - Optional pre-computed NetworkDiff for sessions not needing migration.
	 *                      If not provided, will be computed from recordsDiff.
	 * @param sourceSessionId - Optional session ID to exclude from the broadcast
	 */
	private broadcastPatch(
		diff: TLSyncForwardDiff<R>,
		networkDiff?: NetworkDiff<R> | null,
		sourceSessionId?: string
	) {
		// Pre-compute network diff if not provided
		const unmigrated = networkDiff ?? toNetworkDiff(diff)
		if (!unmigrated) return this

		this.sessions.forEach((session) => {
			if (session.state !== RoomSessionState.Connected) return
			if (sourceSessionId === session.sessionId) return
			if (!session.socket.isOpen) {
				this.cancelSession(session.sessionId)
				return
			}

			const diffResult = this.migrateDiffOrRejectSession(
				session.sessionId,
				session.serializedSchema,
				session.requiresDownMigrations,
				diff
			)
			if (!diffResult.ok) return

			this._unsafe_sendMessage(session.sessionId, {
				type: 'patch',
				diff: diffResult.value,
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
	 * the diff compatible with their version. This method takes a TLSyncForwardDiff (which has full
	 * records) and migrates all records down to the client's schema version, returning a NetworkDiff.
	 *
	 * For updates (entries with [before, after] tuples), both records are migrated and a patch is
	 * computed from the migrated versions, preserving efficient patch semantics even across versions.
	 *
	 * If a migration fails, the session will be rejected.
	 *
	 * @param sessionId - The session ID (for rejection on migration failure)
	 * @param serializedSchema - The client's schema to migrate to
	 * @param requiresDownMigrations - Whether the client needs down migrations
	 * @param diff - The TLSyncForwardDiff containing full records to migrate
	 * @param unmigrated - Optional pre-computed NetworkDiff for when no migration is needed
	 * @returns A NetworkDiff with migrated records, or a migration failure
	 */
	private migrateDiffOrRejectSession(
		sessionId: string,
		serializedSchema: SerializedSchema,
		requiresDownMigrations: boolean,
		diff: TLSyncForwardDiff<R>,
		unmigrated?: NetworkDiff<R>
	): Result<NetworkDiff<R>, MigrationFailureReason> {
		if (!requiresDownMigrations) {
			return Result.ok(unmigrated ?? toNetworkDiff(diff) ?? {})
		}

		const result: NetworkDiff<R> = {}

		// Migrate puts (either adds or updates)
		for (const [id, put] of objectMapEntriesIterable(diff.puts)) {
			if (Array.isArray(put)) {
				// Update: [before, after] tuple - migrate both and compute patch
				const [from, to] = put
				const fromResult = this.schema.migratePersistedRecord(from, serializedSchema, 'down')
				if (fromResult.type === 'error') {
					this.rejectSession(sessionId, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
					return Result.err(fromResult.reason)
				}
				const toResult = this.schema.migratePersistedRecord(to, serializedSchema, 'down')
				if (toResult.type === 'error') {
					this.rejectSession(sessionId, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
					return Result.err(toResult.reason)
				}
				const patch = diffRecord(fromResult.value, toResult.value)
				if (patch) {
					result[id] = [RecordOpType.Patch, patch]
				}
			} else {
				// Add: single record - migrate and put
				const migrationResult = this.schema.migratePersistedRecord(put, serializedSchema, 'down')
				if (migrationResult.type === 'error') {
					this.rejectSession(sessionId, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
					return Result.err(migrationResult.reason)
				}
				result[id] = [RecordOpType.Put, migrationResult.value]
			}
		}

		// Deletes don't need migration
		for (const id of diff.deletes) {
			result[id] = [RecordOpType.Remove]
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

	private forceAllReconnect() {
		for (const session of this.sessions.values()) {
			this.removeSession(session.sessionId)
		}
	}

	private broadcastChanges(txn: TLSyncStorageTransaction<R>) {
		const changes = txn.getChangesSince(this.lastDocumentClock)
		if (!changes) return
		const { wipeAll, diff } = changes
		this.lastDocumentClock = txn.getClock()
		if (wipeAll) {
			// If this happens it means we'd need to broadcast a wipe_all message to all clients,
			// which is not part of the protocol yet, so we need to force all clients to reconnect instead.
			this.forceAllReconnect()
			return
		}
		this.broadcastPatch(diff)
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
		if (!migrations.ok || migrations.value.some((m) => m.scope !== 'record' || !m.down)) {
			this.rejectSession(session.sessionId, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			return
		}

		const sessionSchema = isEqual(message.schema, this.serializedSchema)
			? this.serializedSchema
			: message.schema

		const requiresDownMigrations = migrations.value.length > 0

		const connect = async (msg: Extract<TLSocketServerSentEvent<R>, { type: 'connect' }>) => {
			this.sessions.set(session.sessionId, {
				state: RoomSessionState.Connected,
				sessionId: session.sessionId,
				presenceId: session.presenceId,
				socket: session.socket,
				serializedSchema: sessionSchema,
				requiresDownMigrations,
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

		const { documentClock, result } = this.storage.transaction((txn) => {
			this.broadcastChanges(txn)
			const docChanges = txn.getChangesSince(message.lastServerClock)
			const presenceDiff = this.migrateDiffOrRejectSession(
				session.sessionId,
				sessionSchema,
				requiresDownMigrations,
				{
					puts: Object.fromEntries([...this.presenceStore.values()].map((p) => [p.id, p])),
					deletes: [],
				}
			)
			if (!presenceDiff.ok) return null

			// Migrate the diff if needed, or use the pre-computed network diff
			let docDiff: NetworkDiff<R> | null = null
			if (docChanges && sessionSchema !== this.serializedSchema) {
				const migrated = this.migrateDiffOrRejectSession(
					session.sessionId,
					sessionSchema,
					requiresDownMigrations,
					docChanges.diff
				)
				if (!migrated.ok) return null
				docDiff = migrated.value
			} else if (docChanges) {
				docDiff = toNetworkDiff(docChanges.diff)
			}
			return {
				type: 'connect',
				connectRequestId: message.connectRequestId,
				hydrationType: docChanges?.wipeAll ? 'wipe_all' : 'wipe_presence',
				protocolVersion: getTlsyncProtocolVersion(),
				schema: this.schema.serialize(),
				serverClock: txn.getClock(),
				diff: { ...presenceDiff.value, ...docDiff },
				isReadonly: session.isReadonly,
			} satisfies Extract<TLSocketServerSentEvent<R>, { type: 'connect' }>
		}) // no id needed because this only reads, no writes.

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
			diffs: {
				networkDiff: NetworkDiff<R>
				diff: TLSyncForwardDiff<R>
			} | null
		}

		const propagateOp = (
			changes: ActualChanges,
			id: string,
			op: RecordOp<R>,
			before: R | undefined,
			after: R | undefined
		) => {
			if (!changes.diffs) changes.diffs = { networkDiff: {}, diff: { puts: {}, deletes: [] } }
			changes.diffs.networkDiff[id] = op
			switch (op[0]) {
				case RecordOpType.Put:
					changes.diffs.diff.puts[id] = op[1]
					break
				case RecordOpType.Patch:
					assert(before && after, 'before and after are required for patches')
					changes.diffs.diff.puts[id] = [before, after]
					break
				case RecordOpType.Remove:
					changes.diffs.diff.deletes.push(id)
					break
				default:
					exhaustiveSwitchError(op[0])
			}
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
				throw new TLSyncError(res.reason, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			}
			const { value: state } = res

			// Get the existing document, if any
			const doc = storage.get(id) as R | undefined

			if (doc) {
				// If there's an existing document, replace it with the new state
				// but propagate a diff rather than the entire value
				const recordType = assertExists(getOwnProperty(this.schema.types, doc.typeName))
				const diff = diffAndValidateRecord(doc, state, recordType)
				if (diff) {
					storage.set(id, state)
					propagateOp(changes, id, [RecordOpType.Patch, diff], doc, state)
				}
			} else {
				// Otherwise, if we don't already have a document with this id
				// create the document and propagate the put op
				// set automatically clears tombstones if they exist
				const recordType = assertExists(getOwnProperty(this.schema.types, state.typeName))
				validateRecord(state, recordType)
				storage.set(id, state)
				propagateOp(changes, id, [RecordOpType.Put, state], undefined, undefined)
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
			const doc = storage.get(id) as R | undefined
			if (!doc) return

			const recordType = assertExists(getOwnProperty(this.schema.types, doc.typeName))
			// If the client's version of the record is older than ours,
			// we apply the patch to the downgraded version of the record
			const downgraded = session
				? this.schema.migratePersistedRecord(doc, session.serializedSchema, 'down')
				: { type: 'success' as const, value: doc }
			if (downgraded.type === 'error') {
				throw new TLSyncError(downgraded.reason, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			}

			if (downgraded.value === doc) {
				// If the versions are compatible, apply the patch and propagate the patch op
				const diff = applyAndDiffRecord(doc, patch, recordType, legacyAppendMode)
				if (diff) {
					storage.set(id, diff[1])
					propagateOp(changes, id, [RecordOpType.Patch, diff[0]], doc, diff[1])
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
					throw new TLSyncError(upgraded.reason, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
				}
				// replace the state with the upgraded version and propagate the patch op
				const diff = diffAndValidateRecord(doc, upgraded.value, recordType, legacyAppendMode)
				if (diff) {
					storage.set(id, upgraded.value)
					propagateOp(changes, id, [RecordOpType.Patch, diff], doc, upgraded.value)
				}
			}
		}

		const { result, documentClock, changes } = this.storage.transaction(
			(txn) => {
				this.broadcastChanges(txn)
				// collect actual ops that resulted from the push
				// these will be broadcast to other users

				const docChanges: ActualChanges = { diffs: null }
				const presenceChanges: ActualChanges = { diffs: null }

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
								const doc = txn.get(id)
								if (!doc) {
									// If the doc was already deleted, don't do anything, no need to propagate a delete op
									continue
								}

								// Delete the document and propagate the delete op
								// delete automatically creates tombstones
								txn.delete(id)
								propagateOp(docChanges, id, op, doc, undefined)
								break
							}
						}
					}
				}

				return { docChanges, presenceChanges }
			},
			{ id: this.internalTxnId, emitChanges: 'when-different' }
		)

		this.lastDocumentClock = documentClock

		let pushResult: TLSocketServerSentEvent<R> | undefined
		if (changes && session) {
			// txn did not apply verbatim so we should broadcast the actual changes
			result.docChanges.diffs = { networkDiff: toNetworkDiff(changes) ?? {}, diff: changes }
		}

		if (isEqual(result.docChanges.diffs?.networkDiff, message.diff)) {
			pushResult = {
				type: 'push_result',
				clientClock: message.clientClock,
				serverClock: documentClock,
				action: 'commit',
			}
		} else if (!result.docChanges.diffs?.networkDiff) {
			pushResult = {
				type: 'push_result',
				clientClock: message.clientClock,
				serverClock: documentClock,
				action: 'discard',
			}
		} else if (session) {
			// if recordsDiff is null but diff is not, then there are no clients that need down migrations
			// so we can just use the diff directly
			const diff = this.migrateDiffOrRejectSession(
				session.sessionId,
				session.serializedSchema,
				session.requiresDownMigrations,
				result.docChanges.diffs.diff,
				result.docChanges.diffs.networkDiff
			)
			if (diff.ok) {
				pushResult = {
					type: 'push_result',
					clientClock: message.clientClock,
					serverClock: documentClock,
					action: { rebaseWithDiff: diff.value },
				}
			}
			// if the difff was not ok then the session was rejected and it's ok to continue without a push result
		}

		if (session && pushResult) {
			this._unsafe_sendMessage(session.sessionId, pushResult)
		}
		if (result.docChanges.diffs || result.presenceChanges.diffs) {
			this.broadcastPatch(
				{
					puts: {
						...result.docChanges.diffs?.diff.puts,
						...result.presenceChanges.diffs?.diff.puts,
					},
					deletes: [
						...(result.docChanges.diffs?.diff.deletes ?? []),
						...(result.presenceChanges.diffs?.diff.deletes ?? []),
					],
				},
				{
					...result.docChanges.diffs?.networkDiff,
					...result.presenceChanges.diffs?.networkDiff,
				},
				session?.sessionId
			)
		}

		if (result.presenceChanges.diffs) {
			queueMicrotask(() => {
				this.onPresenceChange?.()
			})
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

/** @internal */
export interface MinimalDocStore<R extends UnknownRecord> {
	get(id: string): UnknownRecord | undefined
	set(id: string, record: R): void
	delete(id: string): void
}

/** @internal */
export class PresenceStore<R extends UnknownRecord> implements MinimalDocStore<R> {
	private readonly presences = new AtomMap<string, R>('presences')

	get(id: string): UnknownRecord | undefined {
		return this.presences.get(id)
	}

	set(id: string, state: R): void {
		this.presences.set(id, state)
	}

	delete(id: string): void {
		this.presences.delete(id)
	}

	values() {
		return this.presences.values()
	}
}
