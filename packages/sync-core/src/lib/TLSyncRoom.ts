import { Atom, atom, transaction } from '@tldraw/state'
import {
	IdOf,
	MigrationFailureReason,
	RecordType,
	SerializedSchema,
	StoreSchema,
	UnknownRecord,
} from '@tldraw/store'
import { DocumentRecordType, PageRecordType, TLDOCUMENT_ID } from '@tldraw/tlschema'
import {
	IndexKey,
	Result,
	assert,
	assertExists,
	exhaustiveSwitchError,
	getOwnProperty,
	hasOwnProperty,
	isNativeStructuredClone,
	objectMapEntries,
	objectMapKeys,
	structuredClone,
} from '@tldraw/utils'
import isEqual from 'lodash.isequal'
import { createNanoEvents } from 'nanoevents'
import {
	RoomSession,
	RoomSessionState,
	SESSION_IDLE_TIMEOUT,
	SESSION_REMOVAL_WAIT_TIME,
	SESSION_START_WAIT_TIME,
} from './RoomSession'
import { TLSyncLog } from './TLSocketRoom'
import { TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason } from './TLSyncClient'
import {
	NetworkDiff,
	ObjectDiff,
	RecordOp,
	RecordOpType,
	ValueOpType,
	applyObjectDiff,
	diffRecord,
} from './diff'
import { interval } from './interval'
import {
	TLIncompatibilityReason,
	TLSocketClientSentEvent,
	TLSocketServerSentDataEvent,
	TLSocketServerSentEvent,
	getTlsyncProtocolVersion,
} from './protocol'

/** @internal */
export interface TLRoomSocket<R extends UnknownRecord> {
	isOpen: boolean
	sendMessage(msg: TLSocketServerSentEvent<R>): void
	close(code?: number, reason?: string): void
}

// the max number of tombstones to keep in the store
export const MAX_TOMBSTONES = 3000
// the number of tombstones to delete when the max is reached
export const TOMBSTONE_PRUNE_BUFFER_SIZE = 300
// the minimum time between data-related messages to the clients
export const DATA_MESSAGE_DEBOUNCE_INTERVAL = 1000 / 60

const timeSince = (time: number) => Date.now() - time

/** @internal */
export class DocumentState<R extends UnknownRecord> {
	_atom: Atom<{ state: R; lastChangedClock: number }>

	static createWithoutValidating<R extends UnknownRecord>(
		state: R,
		lastChangedClock: number,
		recordType: RecordType<R, any>
	): DocumentState<R> {
		return new DocumentState(state, lastChangedClock, recordType)
	}

	static createAndValidate<R extends UnknownRecord>(
		state: R,
		lastChangedClock: number,
		recordType: RecordType<R, any>
	): Result<DocumentState<R>, Error> {
		try {
			recordType.validate(state)
		} catch (error: any) {
			return Result.err(error)
		}
		return Result.ok(new DocumentState(state, lastChangedClock, recordType))
	}

	private constructor(
		state: R,
		lastChangedClock: number,
		private readonly recordType: RecordType<R, any>
	) {
		this._atom = atom('document:' + state.id, { state, lastChangedClock })
	}
	// eslint-disable-next-line no-restricted-syntax
	get state() {
		return this._atom.get().state
	}
	// eslint-disable-next-line no-restricted-syntax
	get lastChangedClock() {
		return this._atom.get().lastChangedClock
	}
	replaceState(state: R, clock: number): Result<ObjectDiff | null, Error> {
		const diff = diffRecord(this.state, state)
		if (!diff) return Result.ok(null)
		try {
			this.recordType.validate(state)
		} catch (error: any) {
			return Result.err(error)
		}
		this._atom.set({ state, lastChangedClock: clock })
		return Result.ok(diff)
	}
	mergeDiff(diff: ObjectDiff, clock: number): Result<ObjectDiff | null, Error> {
		const newState = applyObjectDiff(this.state, diff)
		return this.replaceState(newState, clock)
	}
}

/** @public */
export interface RoomSnapshot {
	clock: number
	documents: Array<{ state: UnknownRecord; lastChangedClock: number }>
	tombstones?: Record<string, number>
	schema?: SerializedSchema
}

/**
 * A room is a workspace for a group of clients. It allows clients to collaborate on documents
 * within that workspace.
 *
 * @internal
 */
export class TLSyncRoom<R extends UnknownRecord, SessionMeta> {
	// A table of connected clients
	readonly sessions = new Map<string, RoomSession<R, SessionMeta>>()

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

	private disposables: Array<() => void> = [interval(this.pruneSessions, 2000)]

	private _isClosed = false

	close() {
		this.disposables.forEach((d) => d())
		this.sessions.forEach((session) => {
			session.socket.close()
		})
		this._isClosed = true
	}

	isClosed() {
		return this._isClosed
	}

	readonly events = createNanoEvents<{
		room_became_empty(): void
		session_removed(args: { sessionId: string; meta: SessionMeta }): void
	}>()

	// Values associated with each uid (must be serializable).
	/** @internal */
	state = atom<{
		documents: Record<string, DocumentState<R>>
		tombstones: Record<string, number>
	}>('room state', {
		documents: {},
		tombstones: {},
	})

	// this clock should start higher than the client, to make sure that clients who sync with their
	// initial lastServerClock value get the full state
	// in this case clients will start with 0, and the server will start with 1
	clock = 1
	documentClock = 1
	tombstoneHistoryStartsAtClock = this.clock
	// map from record id to clock upon deletion

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
		snapshot?: RoomSnapshot
		onDataChange?(): void
		onPresenceChange?(): void
	}) {
		this.schema = opts.schema
		let snapshot = opts.snapshot
		this.log = opts.log
		this.onDataChange = opts.onDataChange
		this.onPresenceChange = opts.onPresenceChange

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

		if (!snapshot) {
			snapshot = {
				clock: 0,
				documents: [
					{
						state: DocumentRecordType.create({ id: TLDOCUMENT_ID }),
						lastChangedClock: 0,
					},
					{
						state: PageRecordType.create({ name: 'Page 1', index: 'a1' as IndexKey }),
						lastChangedClock: 0,
					},
				],
			}
		}

		this.clock = snapshot.clock
		let didIncrementClock = false
		const ensureClockDidIncrement = (_reason: string) => {
			if (!didIncrementClock) {
				didIncrementClock = true
				this.clock++
			}
		}

		const tombstones = { ...snapshot.tombstones }
		const filteredDocuments = []
		for (const doc of snapshot.documents) {
			if (this.documentTypes.has(doc.state.typeName)) {
				filteredDocuments.push(doc)
			} else {
				ensureClockDidIncrement('doc type was not doc type')
				tombstones[doc.state.id] = this.clock
			}
		}

		const documents: Record<string, DocumentState<R>> = Object.fromEntries(
			filteredDocuments.map((r) => [
				r.state.id,
				DocumentState.createWithoutValidating<R>(
					r.state as R,
					r.lastChangedClock,
					assertExists(getOwnProperty(this.schema.types, r.state.typeName))
				),
			])
		)

		const migrationResult = this.schema.migrateStoreSnapshot({
			store: Object.fromEntries(
				objectMapEntries(documents).map(([id, { state }]) => [id, state as R])
			) as Record<IdOf<R>, R>,
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			schema: snapshot.schema ?? this.schema.serializeEarliestVersion(),
		})

		if (migrationResult.type === 'error') {
			// TODO: Fault tolerance
			throw new Error('Failed to migrate: ' + migrationResult.reason)
		}

		for (const [id, r] of objectMapEntries(migrationResult.value)) {
			const existing = documents[id]
			if (!existing) {
				// record was added during migration
				ensureClockDidIncrement('record was added during migration')
				documents[id] = DocumentState.createWithoutValidating(
					r,
					this.clock,
					assertExists(getOwnProperty(this.schema.types, r.typeName)) as any
				)
			} else if (!isEqual(existing.state, r)) {
				// record was maybe updated during migration
				ensureClockDidIncrement('record was maybe updated during migration')
				existing.replaceState(r, this.clock)
			}
		}

		for (const id of objectMapKeys(documents)) {
			if (!migrationResult.value[id as keyof typeof migrationResult.value]) {
				// record was removed during migration
				ensureClockDidIncrement('record was removed during migration')
				tombstones[id] = this.clock
				delete documents[id]
			}
		}

		this.state.set({ documents, tombstones })

		this.pruneTombstones()
		this.documentClock = this.clock
		if (didIncrementClock) {
			opts.onDataChange?.()
		}
	}

	// eslint-disable-next-line local/prefer-class-methods
	private pruneTombstones = () => {
		// avoid blocking any pending responses
		this.state.update(({ tombstones, documents }) => {
			const entries = Object.entries(this.state.get().tombstones)
			if (entries.length > MAX_TOMBSTONES) {
				// sort entries in ascending order by clock
				entries.sort((a, b) => a[1] - b[1])
				// trim off the first bunch
				const excessQuantity = entries.length - MAX_TOMBSTONES
				tombstones = Object.fromEntries(entries.slice(excessQuantity + TOMBSTONE_PRUNE_BUFFER_SIZE))
			}
			return {
				documents,
				tombstones,
			}
		})
	}

	private getDocument(id: string) {
		return this.state.get().documents[id]
	}

	private addDocument(id: string, state: R, clock: number): Result<void, Error> {
		let { documents, tombstones } = this.state.get()
		if (hasOwnProperty(tombstones, id)) {
			tombstones = { ...tombstones }
			delete tombstones[id]
		}
		const createResult = DocumentState.createAndValidate(
			state,
			clock,
			assertExists(getOwnProperty(this.schema.types, state.typeName))
		)
		if (!createResult.ok) return createResult
		documents = { ...documents, [id]: createResult.value }
		this.state.set({ documents, tombstones })
		return Result.ok(undefined)
	}

	private removeDocument(id: string, clock: number) {
		this.state.update(({ documents, tombstones }) => {
			documents = { ...documents }
			delete documents[id]
			tombstones = { ...tombstones, [id]: clock }
			return { documents, tombstones }
		})
	}

	getSnapshot(): RoomSnapshot {
		const { documents, tombstones } = this.state.get()
		return {
			clock: this.clock,
			tombstones,
			schema: this.serializedSchema,
			documents: Object.values(documents)
				.filter((d) => this.documentTypes.has(d.state.typeName))
				.map((doc) => ({
					state: doc.state,
					lastChangedClock: doc.lastChangedClock,
				})),
		}
	}

	/**
	 * Send a message to a particular client. Debounces data events
	 *
	 * @param sessionId - The id of the session to send the message to.
	 * @param message - The message to send.
	 */
	private sendMessage(
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

		const presence = this.getDocument(session.presenceId ?? '')

		try {
			if (fatalReason) {
				session.socket.close(TLSyncErrorCloseEventCode, fatalReason)
			} else {
				session.socket.close()
			}
		} catch {
			// noop, calling .close() multiple times is fine
		}

		if (presence) {
			this.state.update(({ tombstones, documents }) => {
				documents = { ...documents }
				delete documents[session.presenceId!]
				return { documents, tombstones }
			})

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
		})

		try {
			session.socket.close()
		} catch {
			// noop, calling .close() multiple times is fine
		}
	}

	/**
	 * Broadcast a message to all connected clients except the one with the sessionId provided.
	 *
	 * @param message - The message to broadcast.
	 */
	broadcastPatch(message: { diff: NetworkDiff<R>; sourceSessionId?: string }) {
		const { diff, sourceSessionId } = message
		this.sessions.forEach((session) => {
			if (session.state !== RoomSessionState.Connected) return
			if (sourceSessionId === session.sessionId) return
			if (!session.socket.isOpen) {
				this.cancelSession(session.sessionId)
				return
			}

			const res = this.migrateDiffForSession(session.serializedSchema, diff)

			if (!res.ok) {
				// disconnect client and send incompatibility error
				this.rejectSession(
					session.sessionId,
					res.error === MigrationFailureReason.TargetVersionTooNew
						? TLSyncErrorCloseEventReason.SERVER_TOO_OLD
						: TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
				)
				return
			}

			this.sendMessage(session.sessionId, {
				type: 'patch',
				diff: res.value,
				serverClock: this.clock,
			})
		})
		return this
	}

	/**
	 * When a client connects to the room, add them to the list of clients and then merge the history
	 * down into the snapshots.
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
		})
		return this
	}

	/**
	 * When we send a diff to a client, if that client is on a lower version than us, we need to make
	 * the diff compatible with their version. At the moment this means migrating each affected record
	 * to the client's version and sending the whole record again. We can optimize this later by
	 * keeping the previous versions of records around long enough to recalculate these diffs for
	 * older client versions.
	 */
	private migrateDiffForSession(
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
		for (const [id, op] of Object.entries(diff)) {
			if (op[0] === RecordOpType.Remove) {
				result[id] = op
				continue
			}

			const migrationResult = this.schema.migratePersistedRecord(
				this.getDocument(id).state,
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
	 * When the server receives a message from the clients Currently, supports connect and patches.
	 * Invalid messages types throws an error. Currently, doesn't validate data.
	 *
	 * @param sessionId - The session that sent the message
	 * @param message - The message that was sent
	 */
	async handleMessage(sessionId: string, message: TLSocketClientSentEvent<R>) {
		const session = this.sessions.get(sessionId)
		if (!session) {
			this.log?.warn?.('Received message from unknown session')
			return
		}
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
				return this.sendMessage(session.sessionId, { type: 'pong' })
			}
			default: {
				exhaustiveSwitchError(message)
			}
		}
	}

	/** If the client is out of date, or we are out of date, we need to let them know */
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

		const connect = (msg: TLSocketServerSentEvent<R>) => {
			this.sessions.set(session.sessionId, {
				state: RoomSessionState.Connected,
				sessionId: session.sessionId,
				presenceId: session.presenceId,
				socket: session.socket,
				serializedSchema: sessionSchema,
				lastInteractionTime: Date.now(),
				debounceTimer: null,
				outstandingDataMessages: [],
				meta: session.meta,
				isReadonly: session.isReadonly,
				requiresLegacyRejection: session.requiresLegacyRejection,
			})
			this.sendMessage(session.sessionId, msg)
		}

		transaction((rollback) => {
			if (
				// if the client requests changes since a time before we have tombstone history, send them the full state
				message.lastServerClock < this.tombstoneHistoryStartsAtClock ||
				// similarly, if they ask for a time we haven't reached yet, send them the full state
				// this will only happen if the DB is reset (or there is no db) and the server restarts
				// or if the server exits/crashes with unpersisted changes
				message.lastServerClock > this.clock
			) {
				const diff: NetworkDiff<R> = {}
				for (const [id, doc] of Object.entries(this.state.get().documents)) {
					if (id !== session.presenceId) {
						diff[id] = [RecordOpType.Put, doc.state]
					}
				}
				const migrated = this.migrateDiffForSession(sessionSchema, diff)
				if (!migrated.ok) {
					rollback()
					this.rejectSession(
						session.sessionId,
						migrated.error === MigrationFailureReason.TargetVersionTooNew
							? TLSyncErrorCloseEventReason.SERVER_TOO_OLD
							: TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
					)
					return
				}
				connect({
					type: 'connect',
					connectRequestId: message.connectRequestId,
					hydrationType: 'wipe_all',
					protocolVersion: getTlsyncProtocolVersion(),
					schema: this.schema.serialize(),
					serverClock: this.clock,
					diff: migrated.value,
					isReadonly: session.isReadonly,
				})
			} else {
				// calculate the changes since the time the client last saw
				const diff: NetworkDiff<R> = {}
				const updatedDocs = Object.values(this.state.get().documents).filter(
					(doc) => doc.lastChangedClock > message.lastServerClock
				)
				const presenceDocs = this.presenceType
					? Object.values(this.state.get().documents).filter(
							(doc) =>
								this.presenceType!.typeName === doc.state.typeName &&
								doc.state.id !== session.presenceId
						)
					: []
				const deletedDocsIds = Object.entries(this.state.get().tombstones)
					.filter(([_id, deletedAtClock]) => deletedAtClock > message.lastServerClock)
					.map(([id]) => id)

				for (const doc of updatedDocs) {
					diff[doc.state.id] = [RecordOpType.Put, doc.state]
				}
				for (const doc of presenceDocs) {
					diff[doc.state.id] = [RecordOpType.Put, doc.state]
				}

				for (const docId of deletedDocsIds) {
					diff[docId] = [RecordOpType.Remove]
				}
				const migrated = this.migrateDiffForSession(sessionSchema, diff)
				if (!migrated.ok) {
					rollback()
					this.rejectSession(
						session.sessionId,
						migrated.error === MigrationFailureReason.TargetVersionTooNew
							? TLSyncErrorCloseEventReason.SERVER_TOO_OLD
							: TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
					)
					return
				}

				connect({
					type: 'connect',
					connectRequestId: message.connectRequestId,
					hydrationType: 'wipe_presence',
					schema: this.schema.serialize(),
					protocolVersion: getTlsyncProtocolVersion(),
					serverClock: this.clock,
					diff: migrated.value,
					isReadonly: session.isReadonly,
				})
			}
		})
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

		// increment the clock for this push
		this.clock++

		const initialDocumentClock = this.documentClock
		let didPresenceChange = false
		transaction((rollback) => {
			// collect actual ops that resulted from the push
			// these will be broadcast to other users
			interface ActualChanges {
				diff: NetworkDiff<R> | null
			}
			const docChanges: ActualChanges = { diff: null }
			const presenceChanges: ActualChanges = { diff: null }

			const propagateOp = (changes: ActualChanges, id: string, op: RecordOp<R>) => {
				if (!changes.diff) changes.diff = {}
				changes.diff[id] = op
			}

			const fail = (
				reason: TLSyncErrorCloseEventReason,
				underlyingError?: Error
			): Result<void, void> => {
				rollback()
				if (session) {
					this.rejectSession(session.sessionId, reason)
				} else {
					throw new Error('failed to apply changes: ' + reason, underlyingError)
				}
				if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
					this.log?.error?.('failed to apply push', reason, message, underlyingError)
				}
				return Result.err(undefined)
			}

			const addDocument = (changes: ActualChanges, id: string, _state: R): Result<void, void> => {
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
				const doc = this.getDocument(id)

				if (doc) {
					// If there's an existing document, replace it with the new state
					// but propagate a diff rather than the entire value
					const diff = doc.replaceState(state, this.clock)
					if (!diff.ok) {
						return fail(TLSyncErrorCloseEventReason.INVALID_RECORD)
					}
					if (diff.value) {
						propagateOp(changes, id, [RecordOpType.Patch, diff.value])
					}
				} else {
					// Otherwise, if we don't already have a document with this id
					// create the document and propagate the put op
					const result = this.addDocument(id, state, this.clock)
					if (!result.ok) {
						return fail(TLSyncErrorCloseEventReason.INVALID_RECORD)
					}
					propagateOp(changes, id, [RecordOpType.Put, state])
				}

				return Result.ok(undefined)
			}

			const patchDocument = (
				changes: ActualChanges,
				id: string,
				patch: ObjectDiff
			): Result<void, void> => {
				// if it was already deleted, there's no need to apply the patch
				const doc = this.getDocument(id)
				if (!doc) return Result.ok(undefined)
				// If the client's version of the record is older than ours,
				// we apply the patch to the downgraded version of the record
				const downgraded = session
					? this.schema.migratePersistedRecord(doc.state, session.serializedSchema, 'down')
					: { type: 'success' as const, value: doc.state }
				if (downgraded.type === 'error') {
					return fail(TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
				}

				if (downgraded.value === doc.state) {
					// If the versions are compatible, apply the patch and propagate the patch op
					const diff = doc.mergeDiff(patch, this.clock)
					if (!diff.ok) {
						return fail(TLSyncErrorCloseEventReason.INVALID_RECORD)
					}
					if (diff.value) {
						propagateOp(changes, id, [RecordOpType.Patch, diff.value])
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
					const diff = doc.replaceState(upgraded.value, this.clock)
					if (!diff.ok) {
						return fail(TLSyncErrorCloseEventReason.INVALID_RECORD)
					}
					if (diff.value) {
						propagateOp(changes, id, [RecordOpType.Patch, diff.value])
					}
				}

				return Result.ok(undefined)
			}

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
						const res = addDocument(presenceChanges, id, { ...val, id, typeName })
						// if res.ok is false here then we already called `fail` and we should stop immediately
						if (!res.ok) return
						break
					}
					case RecordOpType.Patch: {
						// Try to patch the document. If it fails, stop here.
						const res = patchDocument(presenceChanges, id, {
							...val,
							id: [ValueOpType.Put, id],
							typeName: [ValueOpType.Put, typeName],
						})
						// if res.ok is false here then we already called `fail` and we should stop immediately
						if (!res.ok) return
						break
					}
				}
			}
			if (message.diff && !session?.isReadonly) {
				// The push request was for the document scope.
				for (const [id, op] of Object.entries(message.diff!)) {
					switch (op[0]) {
						case RecordOpType.Put: {
							// Try to add the document.
							// If we're putting a record with a type that we don't recognize, fail
							if (!this.documentTypes.has(op[1].typeName)) {
								return fail(TLSyncErrorCloseEventReason.INVALID_RECORD)
							}
							const res = addDocument(docChanges, id, op[1])
							// if res.ok is false here then we already called `fail` and we should stop immediately
							if (!res.ok) return
							break
						}
						case RecordOpType.Patch: {
							// Try to patch the document. If it fails, stop here.
							const res = patchDocument(docChanges, id, op[1])
							// if res.ok is false here then we already called `fail` and we should stop immediately
							if (!res.ok) return
							break
						}
						case RecordOpType.Remove: {
							const doc = this.getDocument(id)
							if (!doc) {
								// If the doc was already deleted, don't do anything, no need to propagate a delete op
								continue
							}

							// Delete the document and propagate the delete op
							this.removeDocument(id, this.clock)
							// Schedule a pruneTombstones call to happen on the next call stack
							setTimeout(this.pruneTombstones, 0)
							propagateOp(docChanges, id, op)
							break
						}
					}
				}
			}

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
					this.sendMessage(session.sessionId, {
						type: 'push_result',
						serverClock: this.clock,
						clientClock,
						action: 'commit',
					})
				}
			} else if (!docChanges.diff) {
				// DISCARD
				// Applying the client's changes had no effect, so the client should drop the diff
				if (session) {
					this.sendMessage(session.sessionId, {
						type: 'push_result',
						serverClock: this.clock,
						clientClock,
						action: 'discard',
					})
				}
			} else {
				// REBASE
				// Applying the client's changes had a different non-empty effect on the server,
				// so the client should rebase with our gold-standard / authoritative diff.
				// First we need to migrate the diff to the client's version
				if (session) {
					const migrateResult = this.migrateDiffForSession(
						session.serializedSchema,
						docChanges.diff
					)
					if (!migrateResult.ok) {
						return fail(
							migrateResult.error === MigrationFailureReason.TargetVersionTooNew
								? TLSyncErrorCloseEventReason.SERVER_TOO_OLD
								: TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
						)
					}
					// If the migration worked, send the rebased diff to the client
					this.sendMessage(session.sessionId, {
						type: 'push_result',
						serverClock: this.clock,
						clientClock,
						action: { rebaseWithDiff: migrateResult.value },
					})
				}
			}

			// If there are merged changes, broadcast them to all other clients
			if (docChanges.diff || presenceChanges.diff) {
				this.broadcastPatch({
					sourceSessionId: session?.sessionId,
					diff: {
						...docChanges.diff,
						...presenceChanges.diff,
					},
				})
			}

			if (docChanges.diff) {
				this.documentClock = this.clock
			}
			if (presenceChanges.diff) {
				didPresenceChange = true
			}

			return
		})

		// if it threw the changes will have been rolled back and the document clock will not have been incremented
		if (this.documentClock !== initialDocumentClock) {
			this.onDataChange?.()
		}

		if (didPresenceChange) {
			this.onPresenceChange?.()
		}
	}

	/**
	 * Handle the event when a client disconnects.
	 *
	 * @param sessionId - The session that disconnected.
	 */
	handleClose(sessionId: string) {
		this.cancelSession(sessionId)
	}

	/**
	 * Allow applying changes to the store in a transactional way.
	 * @param updater - A function that will be called with a store object that can be used to make changes.
	 * @returns A promise that resolves when the transaction is complete.
	 */
	async updateStore(updater: (store: RoomStoreMethods<R>) => void | Promise<void>) {
		if (this._isClosed) {
			throw new Error('Cannot update store on a closed room')
		}
		const context = new StoreUpdateContext<R>(
			Object.fromEntries(this.getSnapshot().documents.map((d) => [d.state.id, d.state]))
		)
		try {
			await updater(context)
		} finally {
			context.close()
		}

		const diff = context.toDiff()
		if (Object.keys(diff).length === 0) {
			return
		}

		this.handlePushRequest(null, { type: 'push', diff, clientClock: 0 })
	}
}

/**
 * @public
 */
export interface RoomStoreMethods<R extends UnknownRecord = UnknownRecord> {
	put(record: R): void
	delete(recordOrId: R | string): void
	get(id: string): R | null
	getAll(): R[]
}

class StoreUpdateContext<R extends UnknownRecord> implements RoomStoreMethods<R> {
	constructor(private readonly snapshot: Record<string, UnknownRecord>) {}
	private readonly updates = {
		puts: {} as Record<string, UnknownRecord>,
		deletes: new Set<string>(),
	}
	put(record: R): void {
		if (this._isClosed) throw new Error('StoreUpdateContext is closed')
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

	toDiff(): NetworkDiff<any> {
		const diff: NetworkDiff<R> = {}
		for (const [id, record] of Object.entries(this.updates.puts)) {
			diff[id] = [RecordOpType.Put, record as R]
		}
		for (const id of this.updates.deletes) {
			diff[id] = [RecordOpType.Remove]
		}
		return diff
	}

	private _isClosed = false
	close() {
		this._isClosed = true
	}
}
