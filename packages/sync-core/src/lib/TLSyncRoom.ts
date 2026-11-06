import {
	AtomMap,
	MigrationFailureReason,
	RecordsDiff,
	RecordType,
	SerializedSchema,
	StoreSchema,
	UnknownRecord,
} from '@tldraw/store'
import {
	accessCan,
	createTransaction,
	defaultAbilityRules,
	definePermissions,
	TL_FULL_ACCESS,
	TLAccess,
	TLIntent,
	TLMutatorContext,
	TLPermissions,
	TLRecordReader,
} from '@tldraw/tlschema'
import {
	assert,
	assertExists,
	exhaustiveSwitchError,
	getOwnProperty,
	isEqual,
	isNativeStructuredClone,
	objectMapEntriesIterable,
	Result,
	throttle,
	type ThrottledFunction,
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

// WebSocket close frames cap the reason at 123 UTF-8 bytes; a longer one makes `close()` throw
const MAX_CLOSE_REASON_BYTES = 123
const closeReasonEncoder = new TextEncoder()

const truncatedSuffix = (droppedBytes: number) => `... (+${droppedBytes} bytes)`

function truncateCloseReason(reason: string) {
	const totalBytes = closeReasonEncoder.encode(reason).length
	if (totalBytes <= MAX_CLOSE_REASON_BYTES) return reason
	// the dropped count can't have more digits than the total, so reserving room for it always fits
	const budget = MAX_CLOSE_REASON_BYTES - truncatedSuffix(totalBytes).length
	let out = ''
	let outBytes = 0
	// step by code point so a multi-byte character is never cut in half
	for (const char of reason) {
		const charBytes = closeReasonEncoder.encode(char).length
		if (outBytes + charBytes > budget) break
		out += char
		outBytes += charBytes
	}
	return out + truncatedSuffix(totalBytes - outBytes)
}

/**
 * A client push that the room's permissions denied. The room discards the whole push and tells
 * the client why.
 *
 * @public
 */
export interface TLPushDeniedInfo<SessionMeta> {
	sessionId: string
	meta: SessionMeta
	access: TLAccess
	reason: string
	intent: TLIntent | null
}

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
 *   access: { userId: '123', abilities: ['edit'] }
 * })
 * ```
 *
 * @internal
 */
export class TLSyncRoom<R extends UnknownRecord, SessionMeta> {
	// A table of connected clients
	readonly sessions = new Map<string, RoomSession<R, SessionMeta>>()

	private lastDocumentClock = 0

	private pruneTimer: ReturnType<typeof setTimeout> | null = null

	pruneSessions: ThrottledFunction<() => void> = throttle(() => {
		if (this.pruneTimer) {
			clearTimeout(this.pruneTimer)
			this.pruneTimer = null
		}
		for (const client of this.sessions.values()) {
			switch (client.state) {
				case RoomSessionState.Connected: {
					const hasTimedOut = timeSince(client.lastInteractionTime) > this.sessionIdleTimeout
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
					} else {
						this.scheduleFollowUpPrune()
					}
					break
				}
				case RoomSessionState.AwaitingRemoval: {
					const hasTimedOut = timeSince(client.cancellationTime) > SESSION_REMOVAL_WAIT_TIME
					if (hasTimedOut) {
						this.removeSession(client.sessionId)
					} else {
						this.scheduleFollowUpPrune()
					}
					break
				}
				default: {
					exhaustiveSwitchError(client)
				}
			}
		}
	}, 1000)

	private scheduleFollowUpPrune() {
		// don't leave a stray timer on a room the host has already torn down
		if (this._isClosed || this.pruneTimer) return
		this.pruneTimer = setTimeout(this.pruneSessions, SESSION_REMOVAL_WAIT_TIME + 100)
	}

	readonly presenceStore = new PresenceStore<R>()

	private disposables: Array<() => void> = []

	private _isClosed = false

	/**
	 * Close the room and clean up all resources. Disconnects all sessions
	 * and stops background processes.
	 */
	close() {
		this._isClosed = true
		this.disposables.forEach((d) => d())
		this.sessions.forEach((session) => {
			this.clearDebounceTimer(session)
			try {
				session.socket.close()
			} catch {
				// noop, one bad socket must not leave the rest open
			}
		})
		// forgetting the sessions is what makes late socket close/error events no-ops, so
		// nothing can emit session_removed / room_became_empty on a closed room
		this.sessions.clear()
	}

	private clearDebounceTimer(session: RoomSession<R, SessionMeta>) {
		if (session.state === RoomSessionState.Connected && session.debounceTimer !== null) {
			clearTimeout(session.debounceTimer)
			session.debounceTimer = null
			session.outstandingDataMessages = []
		}
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
	/**
	 * Record types served by the object-store lane. Object records ride the same wire messages
	 * as document records, and are excluded from `documentTypes` so hosts can persist them in a
	 * separate lane. Who may write them is the permissions' call, as for any other record.
	 */
	readonly objectTypes: Set<string>
	readonly presenceType: RecordType<R, any> | null
	private log?: TLSyncLog
	public readonly schema: StoreSchema<R, any>
	private onPresenceChange?(): void
	private onCommittedChanges?(args: { diff: TLSyncForwardDiff<R>; documentClock: number }): void
	private readonly permissions: TLPermissions<R>
	private onPushDenied?(args: TLPushDeniedInfo<SessionMeta>): void
	private readonly sessionIdleTimeout: number

	constructor(opts: {
		log?: TLSyncLog
		schema: StoreSchema<R, any>
		onPresenceChange?(): void
		/**
		 * Called once after a client push commits, with the committed document diff. Fires for
		 * local and remote pushes. Use this to react to document changes (e.g. persist certain
		 * record types to a separate lane, or project them to an external store) as soon as they
		 * commit. Best-effort — do not throw; do not block.
		 */
		onCommittedChanges?(args: { diff: TLSyncForwardDiff<R>; documentClock: number }): void
		/**
		 * Record type names to serve through the object-store lane instead of the document lane.
		 * Each must be a document-scoped type registered in the schema.
		 */
		objectTypes?: readonly string[]
		/**
		 * Checks every client push as one transaction, filters what each session can see, and
		 * runs server mutators. See `definePermissions` in `@tldraw/tlschema`. Defaults to
		 * `defaultAbilityRules`: `edit` to change the canvas, `comment` to write comments.
		 */
		permissions?: TLPermissions<R>
		/** Called when the permissions deny a client push. Use it for logs and audit trails. */
		onPushDenied?(args: TLPushDeniedInfo<SessionMeta>): void
		storage: TLSyncStorage<R>
		clientTimeout?: number
	}) {
		this.schema = opts.schema
		this.log = opts.log
		this.onPresenceChange = opts.onPresenceChange
		this.onCommittedChanges = opts.onCommittedChanges
		this.permissions = opts.permissions ?? definePermissions({ rules: defaultAbilityRules<R>() })
		this.onPushDenied = opts.onPushDenied
		this.storage = opts.storage
		this.sessionIdleTimeout = opts.clientTimeout ?? SESSION_IDLE_TIMEOUT

		assert(
			isNativeStructuredClone,
			'TLSyncRoom is supposed to run either on Cloudflare Workers' +
				'or on a 18+ version of Node.js, which both support the native structuredClone API'
		)

		// do a json serialization cycle to make sure the schema has no 'undefined' values
		this.serializedSchema = JSON.parse(JSON.stringify(this.schema.serialize()))

		this.objectTypes = new Set(opts.objectTypes ?? [])
		for (const typeName of this.objectTypes) {
			const type = getOwnProperty(this.schema.types, typeName)
			assert(type, `TLSyncRoom: object type '${typeName}' is not registered in the schema`)
			assert(
				type.scope === 'document',
				`TLSyncRoom: object type '${typeName}' must have scope 'document', got '${type.scope}'`
			)
		}

		// object-lane types are partitioned out of the document lane
		this.documentTypes = new Set(
			Object.values<RecordType<R, any>>(this.schema.types)
				.filter((t) => t.scope === 'document' && !this.objectTypes.has(t.typeName))
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

		this.disposables.push(() => {
			this.pruneSessions.cancel()
			if (this.pruneTimer) {
				clearTimeout(this.pruneTimer)
				this.pruneTimer = null
			}
		})

		// When clientTimeout is finite, run periodic pruning so idle sessions are
		// cleaned up even with no traffic. When Infinity or 0 we skip the interval
		// (e.g. for hibernation); without it, pruning only runs on message or when
		// socket close/error triggers cancelSession, so pruning idle sessions
		// reliably depends on the runtime delivering those events.
		if (Number.isFinite(this.sessionIdleTimeout) && this.sessionIdleTimeout > 0) {
			const pruneIntervalMs = Math.min(2000, Math.floor(this.sessionIdleTimeout / 4))
			this.disposables.push(interval(() => this.pruneSessions(), pruneIntervalMs))
		}
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
			// hand the buffer over and start a fresh one, rather than truncating in
			// place, so sockets that defer serialization don't see an emptied array
			const data = session.outstandingDataMessages
			session.outstandingDataMessages = []
			if (!session.socket.isOpen) {
				// same as the immediate-send path: send() into a closed socket throws on
				// some runtimes (Cloudflare), and here that would be from inside a timer
				this.cancelSession(sessionId)
				return
			}
			session.socket.sendMessage({ type: 'data', data })
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
		this.clearDebounceTimer(session)

		try {
			if (fatalReason) {
				// the session is already gone, so a throwing close() would leave its socket open
				session.socket.close(TLSyncErrorCloseEventCode, truncateCloseReason(fatalReason))
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

		this.clearDebounceTimer(session)
		this.sessions.set(sessionId, {
			state: RoomSessionState.AwaitingRemoval,
			sessionId,
			presenceId: session.presenceId,
			socket: session.socket,
			cancellationTime: Date.now(),
			meta: session.meta,
			access: session.access,
			visibleIds: null,
			deniedCount: 0,
			deniedIds: new Set(),
			requiresLegacyRejection: session.requiresLegacyRejection,
			supportsStringAppend: session.supportsStringAppend,
		})

		try {
			session.socket.close()
		} catch {
			// noop, calling .close() multiple times is fine
		}

		this.scheduleFollowUpPrune()
	}

	readonly internalTxnId = 'TLSyncRoom.txn'

	/**
	 * Broadcast a patch to all connected clients except the one with the sessionId provided.
	 *
	 * @param diff - The TLSyncForwardDiff with full records (used for migration)
	 * @param networkDiff - Optional pre-computed NetworkDiff for sessions not needing migration.
	 *                      If not provided, will be computed from recordsDiff.
	 * @param sourceSessionId - Optional session ID to exclude from the broadcast
	 * @param visibility - What each filtered session can see after the change, if the room filters reads
	 */
	private broadcastPatch(
		diff: TLSyncForwardDiff<R>,
		networkDiff?: NetworkDiff<R> | null,
		sourceSessionId?: string,
		visibility?: VisibilityUpdate<R> | null
	) {
		// Computed once and shared by every session that needs no down-migration; the push path
		// hands us the diff it already computed (in legacy append mode when needed), and re-deriving
		// it per session would both repeat the diffing work and lose that legacy handling.
		const legacyAppendMode = !this.getCanEmitStringAppend()
		const unmigrated = networkDiff ?? toNetworkDiff(diff, legacyAppendMode)

		this.sessions.forEach((session) => {
			if (session.state !== RoomSessionState.Connected) return
			const isSource = sourceSessionId === session.sessionId
			if (isSource && !session.visibleIds) return
			if (!session.socket.isOpen) {
				this.cancelSession(session.sessionId)
				return
			}

			// A session that sees only part of the room gets its own diff: changes to what it
			// sees, the full record for what it can now see, and a delete for what it can no
			// longer see. The source session already has its own changes, so it gets only the
			// visibility part.
			let sessionDiff = diff
			let sessionNetworkDiff: NetworkDiff<R> | undefined = unmigrated
			if (session.visibleIds) {
				sessionDiff = this.filterDiffForSession(session, diff, visibility, isSource)
				if (!Object.keys(sessionDiff.puts).length && !sessionDiff.deletes.length) return
				sessionNetworkDiff = undefined
			}

			const diffResult = this.migrateDiffOrRejectSession(
				session.sessionId,
				session.serializedSchema,
				session.requiresDownMigrations,
				sessionDiff,
				sessionNetworkDiff ?? toNetworkDiff(sessionDiff, legacyAppendMode),
				legacyAppendMode
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
	 *   - access - What this session may do (defaults to full access)
	 * @returns This room instance for method chaining
	 * @example
	 * ```ts
	 * room.handleNewSession({
	 *   sessionId: crypto.randomUUID(),
	 *   socket: new WebSocketAdapter(ws),
	 *   meta: { userId: '123', name: 'Alice', avatar: 'url' },
	 *   access: { userId: '123', abilities: hasEditPermission ? ['edit', 'comment'] : ['comment'] }
	 * })
	 * ```
	 *
	 * @internal
	 */
	handleNewSession(opts: {
		sessionId: string
		socket: TLRoomSocket<R>
		meta: SessionMeta
		access?: TLAccess
	}) {
		const { sessionId, socket, meta, access } = opts
		// a connect racing close() would otherwise create a session nothing ever prunes
		if (this._isClosed) {
			socket.close()
			return this
		}
		const existing = this.sessions.get(sessionId)
		if (existing) this.clearDebounceTimer(existing)
		this.sessions.set(sessionId, {
			state: RoomSessionState.AwaitingConnectMessage,
			sessionId,
			socket,
			presenceId: existing?.presenceId ?? this.presenceType?.createId() ?? null,
			sessionStartTime: Date.now(),
			meta,
			access: access ?? TL_FULL_ACCESS,
			visibleIds: null,
			deniedCount: 0,
			deniedIds: new Set(),
			// this gets set later during handleConnectMessage
			requiresLegacyRejection: false,
			supportsStringAppend: true,
		})
		return this
	}

	/**
	 * Resume a previously-connected session directly into `Connected` state, bypassing the
	 * connect handshake. Used after server hibernation when the WebSocket is still alive but
	 * all in-memory state has been lost.
	 *
	 * @internal
	 */
	handleResumedSession(opts: {
		sessionId: string
		socket: TLRoomSocket<R>
		meta: SessionMeta
		access: TLAccess
		serializedSchema: SerializedSchema
		presenceId: string | null
		presenceRecord: UnknownRecord | null
		requiresLegacyRejection: boolean
		supportsStringAppend: boolean
	}) {
		const {
			sessionId,
			socket,
			meta,
			access,
			serializedSchema,
			presenceId,
			presenceRecord,
			requiresLegacyRejection,
			supportsStringAppend,
		} = opts

		if (this._isClosed) {
			socket.close()
			return
		}

		const migrations = this.schema.getMigrationsSince(serializedSchema)
		const requiresDownMigrations = migrations.ok ? migrations.value.length > 0 : false

		this.sessions.set(sessionId, {
			state: RoomSessionState.Connected,
			sessionId,
			socket,
			presenceId: presenceId ?? this.presenceType?.createId() ?? null,
			serializedSchema,
			requiresDownMigrations,
			lastInteractionTime: Date.now(),
			debounceTimer: null,
			outstandingDataMessages: [],
			meta,
			access,
			visibleIds: null,
			deniedCount: 0,
			deniedIds: new Set(),
			requiresLegacyRejection,
			supportsStringAppend,
		})

		// Restore presence before the schema checks: other clients still hold it from before the
		// socket slept, and a rejection only broadcasts its removal if it's in the store
		if (presenceRecord && presenceId) {
			this.presenceStore.set(presenceId, presenceRecord as R)
		}

		// The server may have changed builds while the socket slept, so re-run the handshake's
		// schema checks (HS3): a schema we can no longer reconcile must not be served raw diffs.
		if (!migrations.ok) {
			this.rejectSession(sessionId, this.getVersionMismatchReason(serializedSchema))
			return
		}
		if (migrations.value.some((m) => m.scope !== 'record' || !m.down)) {
			this.rejectSession(sessionId, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			return
		}
		// What the client held before the socket slept is unknown, so it may hold records it can
		// no longer see. Make it reconnect: a fresh connect sends exactly its visible records.
		if (this.permissions.canRead) {
			this.removeSession(sessionId)
		}
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
	 * @param legacyAppendMode - Emit string appends as puts (SES5); defaults to the room-wide state
	 * @returns A NetworkDiff with migrated records, or a migration failure
	 */
	private migrateDiffOrRejectSession(
		sessionId: string,
		serializedSchema: SerializedSchema,
		requiresDownMigrations: boolean,
		diff: TLSyncForwardDiff<R>,
		unmigrated?: NetworkDiff<R>,
		legacyAppendMode = !this.getCanEmitStringAppend()
	): Result<NetworkDiff<R>, MigrationFailureReason> {
		if (!requiresDownMigrations) {
			return Result.ok(unmigrated ?? toNetworkDiff(diff, legacyAppendMode))
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
				const patch = diffRecord(fromResult.value, toResult.value, legacyAppendMode)
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
	 * @param fatalReason - The reason for rejection (optional). WebSocket close reasons are capped
	 * at 123 UTF-8 bytes, so a longer reason is truncated and ends with `... (+N bytes)`.
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
			// Only connected clients hold state at a clock we can no longer diff from. A session
			// mid-handshake gets hydrated from its own lastServerClock in the same transaction, so
			// removing it would close its socket and then re-add it as Connected (resurrected).
			if (session.state !== RoomSessionState.Connected) continue
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
		this.broadcastPatch(
			diff,
			undefined,
			undefined,
			this.permissions.canRead ? this.computeVisibilityUpdate(this.readerFor(txn), true) : null
		)
	}

	/**
	 * Work out whether a client we can't reconcile schemas with is running a newer or older SDK
	 * than us.
	 */
	private getVersionMismatchReason(theirSchema: SerializedSchema) {
		const ourSchema = this.serializedSchema

		if (theirSchema.schemaVersion > ourSchema.schemaVersion) {
			return TLSyncErrorCloseEventReason.SERVER_TOO_OLD
		}

		if (
			theirSchema.schemaVersion === 2 &&
			ourSchema.schemaVersion === 2 &&
			// a malformed client schema must reject the session, not throw
			typeof theirSchema.sequences === 'object' &&
			theirSchema.sequences !== null
		) {
			for (const [sequenceId, theirVersion] of Object.entries(theirSchema.sequences)) {
				const ourVersion = ourSchema.sequences[sequenceId]
				if (ourVersion === undefined || theirVersion > ourVersion) {
					return TLSyncErrorCloseEventReason.SERVER_TOO_OLD
				}
			}
		}
		return TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
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
		if (!migrations.ok) {
			this.rejectSession(session.sessionId, this.getVersionMismatchReason(message.schema))
			return
		}
		// The client's schema is older than ours, but we can't migrate our data down to their
		// version (a migration isn't record-scoped or has no down migration), so they're too old.
		if (migrations.value.some((m) => m.scope !== 'record' || !m.down)) {
			this.rejectSession(session.sessionId, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			return
		}

		const sessionSchema = isEqual(message.schema, this.serializedSchema)
			? this.serializedSchema
			: message.schema

		const requiresDownMigrations = migrations.value.length > 0

		const connect = (msg: Extract<TLSocketServerSentEvent<R>, { type: 'connect' }>) => {
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
				access: session.access,
				visibleIds,
				deniedCount: 0,
				deniedIds: new Set(),
				requiresLegacyRejection: session.requiresLegacyRejection,
			})
			this._unsafe_sendMessage(session.sessionId, msg)
		}

		// With read filtering, the client gets only what it may see, so an incremental diff from
		// its last clock is not enough: a record it could not see before may be visible now
		// without having changed. Send the full visible state instead.
		let visibleIds: Set<string> | null = null

		const { documentClock, result } = this.storage.transaction((txn) => {
			this.broadcastChanges(txn)
			let docChanges = txn.getChangesSince(message.lastServerClock)
			if (this.permissions.canRead) {
				visibleIds = this.computeVisibleIds(session.access, this.readerFor(txn))
				const puts: TLSyncForwardDiff<R>['puts'] = {}
				for (const record of txn.values()) {
					if (visibleIds.has(record.id)) puts[record.id] = record
				}
				docChanges = { wipeAll: true, diff: { puts, deletes: [] } }
			}
			const presenceDiff = this.migrateDiffOrRejectSession(
				session.sessionId,
				sessionSchema,
				requiresDownMigrations,
				{
					// Exclude the connecting session's own presence — it will push fresh
					// data immediately after connecting. Sending the stale record back
					// would leave an orphaned presence in the client's local store (the
					// server never echoes a session's own updates back to it).
					puts: Object.fromEntries(
						[...this.presenceStore.values()]
							.filter((p) => p.id !== session.presenceId && (!visibleIds || visibleIds.has(p.id)))
							.map((p) => [p.id, p])
					),
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
				access: session.access,
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
			_state: R,
			// The existing document if the caller already fetched it; `null` for fetched-and-absent,
			// `undefined` for not fetched. Saves a second SELECT + JSON.parse on the push hot path.
			prevDoc?: R | null
		): Result<void, void> => {
			const res = session
				? this.schema.migratePersistedRecord(_state, session.serializedSchema, 'up')
				: { type: 'success' as const, value: _state }
			if (res.type === 'error') {
				throw new TLSyncError(res.reason, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			}
			const { value: state } = res

			const doc =
				prevDoc !== undefined ? (prevDoc ?? undefined) : (storage.get(id) as R | undefined)

			if (doc) {
				// If there's an existing document, replace it with the new state
				// but propagate a diff rather than the entire value
				const recordType = assertExists(getOwnProperty(this.schema.types, doc.typeName))
				const diff = diffAndValidateRecord(doc, state, recordType, legacyAppendMode)
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
			patch: ObjectDiff,
			// The existing document if the caller already fetched it (see `addDocument`).
			prevDoc?: R
		) => {
			// if it was already deleted, there's no need to apply the patch
			const doc = prevDoc ?? (storage.get(id) as R | undefined)
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

		const intent = message.intent ?? null
		const permissions = session ? this.permissions : undefined
		const mutator =
			intent && permissions ? getOwnProperty(permissions.mutators, intent.name) : undefined
		let denied: { reason: string } | null = null

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

				// Document writes go to an overlay first. The permissions check the whole push
				// against the overlay, and only an allowed push reaches storage: a denied push
				// changes nothing, so a group is never created without its children, or the
				// other way round.
				const overlay = new PushOverlay<R>(txn)

				if (session && (message.deniedCount ?? 0) >= session.deniedCount) {
					// the client has seen every denial, so nothing it sends can build on one
					session.deniedIds.clear()
				}
				if (session && message.diff && dependsOnAny(message.diff, session.deniedIds)) {
					// The client made this change before it knew that an earlier push was denied, and
					// the change touches or points at records from that push (a child of a denied
					// frame, say). Deny it too, or it would land on records that do not exist.
					denied = { reason: 'This change depends on a change that was denied.' }
				} else if (mutator && session) {
					// A server mutator: run the named operation here, and ignore the client's diff.
					// The client's diff was its prediction; the rebase replaces it with this result.
					try {
						mutator(
							this.mutatorContext(overlay, docChanges, session.access, legacyAppendMode),
							intent!.args
						)
					} catch (e) {
						denied = { reason: e instanceof Error ? e.message : String(e) }
					}
				} else if (message.diff) {
					// The push request was for the document scope.
					for (const [id, op] of objectMapEntriesIterable(message.diff!)) {
						switch (op[0]) {
							case RecordOpType.Put: {
								// If we're putting a record with a type that we don't recognize, fail
								if (
									!this.documentTypes.has(op[1].typeName) &&
									!this.objectTypes.has(op[1].typeName)
								) {
									throw new TLSyncError(
										'invalid record',
										TLSyncErrorCloseEventReason.INVALID_RECORD
									)
								}
								const record = op[1]
								// A put must not change the record's typeName. Rules key off the
								// typeName, and the replace path validates against the stored one, so a
								// swap would be checked as the wrong type. Skip it; the client
								// self-corrects.
								const prevRecord = (overlay.get(id) as R | undefined) ?? null
								if (session && prevRecord && prevRecord.typeName !== record.typeName) {
									this.log?.warn?.(
										'skipping put that changes typeName',
										`${prevRecord.typeName} -> ${record.typeName}`,
										id,
										'session:',
										session.sessionId
									)
									continue
								}
								addDocument(overlay, docChanges, id, record, prevRecord)
								break
							}
							case RecordOpType.Patch: {
								const doc = overlay.get(id) as R | undefined
								// if it was already deleted, there's no need to apply the patch
								if (!doc) continue
								patchDocument(overlay, docChanges, id, op[1], doc)
								break
							}
							case RecordOpType.Remove: {
								const doc = overlay.get(id) as R | undefined
								if (!doc) {
									// If the doc was already deleted, don't do anything, no need to propagate a delete op
									continue
								}
								overlay.delete(id)
								propagateOp(docChanges, id, op, doc, undefined)
								break
							}
						}
					}
				}

				if (session && permissions && !denied && overlay.hasChanges()) {
					try {
						const verdict = permissions.check(
							createTransaction({
								access: session.access,
								intent,
								diff: overlay.getRecordsDiff(),
								after: overlay,
							})
						)
						if (!verdict.ok) denied = { reason: verdict.reason }
					} catch (e) {
						// Fail closed: rules are security code, so a bug must never let a push through.
						this.log?.error?.('permission rule threw; denying the push', e)
						denied = { reason: 'The permission check failed.' }
					}
				}

				if (denied) {
					this.log?.warn?.('push denied', denied.reason, 'session:', session?.sessionId)
					if (session) {
						session.deniedCount++
						for (const id in message.diff) session.deniedIds.add(id)
						const info = {
							sessionId: session.sessionId,
							meta: session.meta,
							access: session.access,
							reason: denied.reason,
							intent,
						}
						queueMicrotask(() => {
							try {
								this.onPushDenied?.(info)
							} catch (e) {
								this.log?.error?.('onPushDenied threw', e)
							}
						})
					}
					docChanges.diffs = null
				} else {
					overlay.commit()
				}

				// What each filtered session can see now, computed while the storage is open.
				const visibility =
					this.permissions.canRead && (docChanges.diffs || presenceChanges.diffs)
						? this.computeVisibilityUpdate(this.readerFor(txn), !!docChanges.diffs)
						: null

				return { docChanges, presenceChanges, visibility }
			},
			{ id: this.internalTxnId, emitChanges: 'when-different' }
		)

		this.lastDocumentClock = documentClock

		let pushResult: TLSocketServerSentEvent<R> | undefined
		if (changes && session) {
			// txn did not apply verbatim so we should broadcast the actual changes
			result.docChanges.diffs = {
				networkDiff: toNetworkDiff(changes, legacyAppendMode),
				diff: changes,
			}
		}

		if (denied) {
			pushResult = {
				type: 'push_result',
				clientClock: message.clientClock,
				serverClock: documentClock,
				action: 'discard',
				denied,
			}
		} else if (isEqual(result.docChanges.diffs?.networkDiff, message.diff)) {
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
				result.docChanges.diffs.networkDiff,
				legacyAppendMode
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
				session?.sessionId,
				result.visibility
			)
		} else if (result.visibility) {
			this.broadcastPatch({ puts: {}, deletes: [] }, {}, session?.sessionId, result.visibility)
		}

		if (result.presenceChanges.diffs) {
			queueMicrotask(() => {
				this.onPresenceChange?.()
			})
		}

		if (result.docChanges.diffs && this.onCommittedChanges) {
			const diff = result.docChanges.diffs.diff
			queueMicrotask(() => {
				try {
					this.onCommittedChanges?.({ diff, documentClock })
				} catch (e) {
					this.log?.error?.('onCommittedChanges threw', e)
				}
			})
		}
	}

	/** A reader over the room's records at this point in a storage transaction. */
	private readerFor(txn: TLSyncStorageTransaction<R>): TLRecordReader<R> {
		return {
			get: (id) => (txn.get(id) as R | undefined) ?? (this.presenceStore.get(id) as R | undefined),
			all: () => txn.values(),
		}
	}

	/** The ids a session with `access` can see: documents and presence. */
	private computeVisibleIds(access: TLAccess, records: TLRecordReader<R>): Set<string> {
		const canRead = this.permissions.canRead
		const ids = new Set<string>()
		const ctx = { access, can: (ability: string) => accessCan(access, ability), records }
		for (const record of records.all()) {
			if (!canRead || canRead(record, ctx)) ids.add(record.id)
		}
		for (const record of this.presenceStore.values()) {
			if (!canRead || canRead(record, ctx)) ids.add(record.id)
		}
		return ids
	}

	/**
	 * What each filtered session can see after a change. With `full`, every record is checked
	 * again, because a change to one record (a page, a parent) can change what others show. A
	 * presence-only change checks only the presence records. Sessions with the same access
	 * share one result.
	 */
	private computeVisibilityUpdate(records: TLRecordReader<R>, full: boolean): VisibilityUpdate<R> {
		const byAccess = new Map<string, Set<string>>()
		const update: VisibilityUpdate<R> = { visibleIds: new Map(), revealed: new Map() }
		for (const session of this.sessions.values()) {
			if (session.state !== RoomSessionState.Connected || !session.visibleIds) continue
			const key = JSON.stringify(session.access)
			let next = byAccess.get(key)
			if (!next) {
				if (full) {
					next = this.computeVisibleIds(session.access, records)
				} else {
					next = new Set(session.visibleIds)
					const canRead = this.permissions.canRead!
					const access = session.access
					const ctx = { access, can: (ability: string) => accessCan(access, ability), records }
					for (const presence of this.presenceStore.values()) {
						if (canRead(presence, ctx)) next.add(presence.id)
						else next.delete(presence.id)
					}
				}
				byAccess.set(key, next)
			}
			update.visibleIds.set(session.sessionId, next)
			collectRevealed(update, session.visibleIds, next, records)
		}
		return update
	}

	/**
	 * The part of `diff` that a filtered session should get, plus records that became visible or
	 * hidden. Updates the session's visible set.
	 */
	private filterDiffForSession(
		session: RoomSession<R, SessionMeta>,
		diff: TLSyncForwardDiff<R>,
		visibility: VisibilityUpdate<R> | null | undefined,
		isSource: boolean
	): TLSyncForwardDiff<R> {
		const before = session.visibleIds!
		const after = visibility?.visibleIds.get(session.sessionId) ?? before
		const result: TLSyncForwardDiff<R> = { puts: {}, deletes: [] }
		const touched = new Set<string>()
		for (const [id, put] of objectMapEntriesIterable(diff.puts)) {
			touched.add(id)
			if (isSource) continue
			if (after.has(id)) {
				// newly visible: send the whole record, the client has no base to patch
				result.puts[id] = before.has(id) ? put : Array.isArray(put) ? put[1] : put
			} else if (before.has(id)) {
				result.deletes.push(id)
			}
		}
		for (const id of diff.deletes) {
			touched.add(id)
			if (!isSource && before.has(id)) result.deletes.push(id)
		}
		if (visibility && after !== before) {
			for (const id of after) {
				if (before.has(id) || touched.has(id)) continue
				const record = visibility.revealed.get(id)
				if (record) result.puts[id] = record
			}
			for (const id of before) {
				if (!after.has(id) && !touched.has(id)) result.deletes.push(id)
			}
		}
		session.visibleIds = after
		return result
	}

	/**
	 * Change what a connected session may do, with no reconnect. The client gets the new access
	 * at once. With read filtering, it also gets the records it can now see, and loses the ones
	 * it can no longer see.
	 */
	updateSessionAccess(sessionId: string, access: TLAccess) {
		const session = this.sessions.get(sessionId)
		if (!session) return
		session.access = access
		if (session.state !== RoomSessionState.Connected) return
		this._unsafe_sendMessage(sessionId, { type: 'access', access })
		if (!session.visibleIds) return
		this.storage.transaction((txn) => {
			const records = this.readerFor(txn)
			const visibleIds = this.computeVisibleIds(access, records)
			const visibility: VisibilityUpdate<R> = {
				visibleIds: new Map([[sessionId, visibleIds]]),
				revealed: new Map(),
			}
			collectRevealed(visibility, session.visibleIds!, visibleIds, records)
			const diff = this.filterDiffForSession(session, { puts: {}, deletes: [] }, visibility, false)
			if (!Object.keys(diff.puts).length && !diff.deletes.length) return
			const migrated = this.migrateDiffOrRejectSession(
				sessionId,
				session.serializedSchema,
				session.requiresDownMigrations,
				diff
			)
			if (!migrated.ok) return
			this._unsafe_sendMessage(sessionId, {
				type: 'patch',
				diff: migrated.value,
				serverClock: txn.getClock(),
			})
		})
	}

	/** The write surface a server mutator gets: reads and writes go through the push overlay. */
	private mutatorContext(
		overlay: PushOverlay<R>,
		changes: { diffs: { networkDiff: NetworkDiff<R>; diff: TLSyncForwardDiff<R> } | null },
		access: TLAccess,
		legacyAppendMode: boolean
	): TLMutatorContext<R> {
		const record = (id: string, op: RecordOp<R>, before: R | undefined, after: R | undefined) => {
			if (!changes.diffs) changes.diffs = { networkDiff: {}, diff: { puts: {}, deletes: [] } }
			changes.diffs.networkDiff[id] = op
			if (op[0] === RecordOpType.Put) changes.diffs.diff.puts[id] = op[1]
			else if (op[0] === RecordOpType.Patch) changes.diffs.diff.puts[id] = [before!, after!]
			else changes.diffs.diff.deletes.push(id)
		}
		return {
			access,
			can: (ability) => accessCan(access, ability),
			get: (id) => overlay.get(id) as R | undefined,
			all: () => overlay.all(),
			put: (records) => {
				for (const next of records) {
					const recordType = getOwnProperty(this.schema.types, next.typeName)
					if (
						!recordType ||
						(!this.documentTypes.has(next.typeName) && !this.objectTypes.has(next.typeName))
					) {
						throw new Error(`Mutators cannot write ${next.typeName} records.`)
					}
					const prev = overlay.get(next.id) as R | undefined
					if (prev) {
						const diff = diffAndValidateRecord(prev, next, recordType, legacyAppendMode)
						if (!diff) continue
						overlay.set(next.id, next)
						record(next.id, [RecordOpType.Patch, diff], prev, next)
					} else {
						validateRecord(next, recordType)
						overlay.set(next.id, next)
						record(next.id, [RecordOpType.Put, next], undefined, undefined)
					}
				}
			},
			remove: (ids) => {
				for (const id of ids) {
					const prev = overlay.get(id) as R | undefined
					if (!prev) continue
					overlay.delete(id)
					record(id, [RecordOpType.Remove], prev, undefined)
				}
			},
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

/**
 * What each filtered session can see after a change, and the records that became visible to
 * someone. Those are read while the storage transaction is open: the broadcast runs after it.
 */
interface VisibilityUpdate<R extends UnknownRecord> {
	visibleIds: Map<string, Set<string>>
	revealed: Map<string, R>
}

function collectRevealed<R extends UnknownRecord>(
	update: VisibilityUpdate<R>,
	before: ReadonlySet<string>,
	after: ReadonlySet<string>,
	records: TLRecordReader<R>
) {
	if (after === before) return
	for (const id of after) {
		if (before.has(id) || update.revealed.has(id)) continue
		const record = records.get(id)
		if (record) update.revealed.set(id, record)
	}
}

/**
 * Does a push touch, or point at, any of `ids`? A record points at another when any of its values
 * is that record's id (`parentId`, `fromId`, `meta.someId`, ...). Only pushes made before the
 * client saw a denial pay for this scan.
 */
function dependsOnAny(diff: NetworkDiff<any>, ids: ReadonlySet<string>): boolean {
	if (ids.size === 0) return false
	const mentions = (value: unknown): boolean => {
		if (typeof value === 'string') return ids.has(value)
		if (Array.isArray(value)) return value.some(mentions)
		if (value && typeof value === 'object') return Object.values(value).some(mentions)
		return false
	}
	for (const [id, op] of objectMapEntriesIterable(diff)) {
		if (ids.has(id) || mentions(op[1])) return true
	}
	return false
}

/**
 * Buffers a push's document writes over the storage transaction, so the permissions can check
 * the whole push before anything is stored. Reads see the buffered writes.
 */
class PushOverlay<R extends UnknownRecord> implements MinimalDocStore<R>, TLRecordReader<R> {
	// id -> the record now (null = deleted), and the record before the push (null = absent)
	private readonly writes = new Map<string, R | null>()
	private readonly originals = new Map<string, R | null>()

	constructor(private readonly txn: TLSyncStorageTransaction<R>) {}

	get(id: string): R | undefined {
		if (this.writes.has(id)) return this.writes.get(id) ?? undefined
		return this.txn.get(id) as R | undefined
	}

	*all(): Iterable<R> {
		for (const record of this.txn.values()) {
			if (!this.writes.has(record.id)) yield record
		}
		for (const record of this.writes.values()) if (record) yield record
	}

	set(id: string, record: R): void {
		this.remember(id)
		this.writes.set(id, record)
	}

	delete(id: string): void {
		this.remember(id)
		this.writes.set(id, null)
	}

	hasChanges() {
		return this.writes.size > 0
	}

	/** The net change of the push, for the permissions. */
	getRecordsDiff(): RecordsDiff<R> {
		const diff: RecordsDiff<R> = { added: {}, updated: {}, removed: {} } as RecordsDiff<R>
		for (const [id, next] of this.writes) {
			const prev = this.originals.get(id) ?? null
			if (prev && next) (diff.updated as any)[id] = [prev, next]
			else if (next) (diff.added as any)[id] = next
			else if (prev) (diff.removed as any)[id] = prev
		}
		return diff
	}

	/** Write the buffered changes to storage. */
	commit() {
		for (const [id, record] of this.writes) {
			if (record) this.txn.set(id, record)
			else if (this.originals.get(id)) this.txn.delete(id)
		}
	}

	private remember(id: string) {
		if (!this.originals.has(id)) {
			this.originals.set(id, (this.txn.get(id) as R | undefined) ?? null)
		}
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
