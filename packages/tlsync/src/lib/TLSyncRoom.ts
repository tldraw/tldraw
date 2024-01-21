import { Atom, atom, transaction } from '@tldraw/state'
import {
	IdOf,
	MigrationFailureReason,
	RecordType,
	SerializedSchema,
	StoreSchema,
	UnknownRecord,
	compareRecordVersions,
	getRecordVersion,
} from '@tldraw/store'
import { DocumentRecordType, PageRecordType, TLDOCUMENT_ID } from '@tldraw/tlschema'
import {
	Result,
	assertExists,
	exhaustiveSwitchError,
	getOwnProperty,
	hasOwnProperty,
	objectMapEntries,
	objectMapKeys,
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
	TLSYNC_PROTOCOL_VERSION,
	TLSocketClientSentEvent,
	TLSocketServerSentEvent,
} from './protocol'

/** @public */
export type TLRoomSocket<R extends UnknownRecord> = {
	isOpen: boolean
	sendMessage: (msg: TLSocketServerSentEvent<R>) => void
	close: () => void
}

// the max number of tombstones to keep in the store
export const MAX_TOMBSTONES = 3000
// the number of tombstones to delete when the max is reached
export const TOMBSTONE_PRUNE_BUFFER_SIZE = 300

const timeSince = (time: number) => Date.now() - time

class DocumentState<R extends UnknownRecord> {
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
export type RoomSnapshot = {
	clock: number
	documents: Array<{ state: UnknownRecord; lastChangedClock: number }>
	tombstones?: Record<string, number>
	schema?: SerializedSchema
}

/**
 * A room is a workspace for a group of clients. It allows clients to collaborate on documents
 * within that workspace.
 *
 * @public
 */
export class TLSyncRoom<R extends UnknownRecord> {
	// A table of connected clients
	readonly sessions = new Map<string, RoomSession<R>>()

	pruneSessions = () => {
		for (const client of this.sessions.values()) {
			switch (client.state) {
				case RoomSessionState.CONNECTED: {
					const hasTimedOut = timeSince(client.lastInteractionTime) > SESSION_IDLE_TIMEOUT
					if (hasTimedOut || !client.socket.isOpen) {
						this.cancelSession(client.sessionKey)
					}
					break
				}
				case RoomSessionState.AWAITING_CONNECT_MESSAGE: {
					const hasTimedOut = timeSince(client.sessionStartTime) > SESSION_START_WAIT_TIME
					if (hasTimedOut || !client.socket.isOpen) {
						// remove immediately
						this.removeSession(client.sessionKey)
					}
					break
				}
				case RoomSessionState.AWAITING_REMOVAL: {
					const hasTimedOut = timeSince(client.cancellationTime) > SESSION_REMOVAL_WAIT_TIME
					if (hasTimedOut) {
						this.removeSession(client.sessionKey)
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

	close() {
		this.disposables.forEach((d) => d())
		this.sessions.forEach((session) => {
			session.socket.close()
		})
	}

	readonly events = createNanoEvents<{
		room_became_empty: () => void
		session_removed: (args: { sessionKey: string }) => void
	}>()

	// Values associated with each uid (must be serializable).
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
	tombstoneHistoryStartsAtClock = this.clock
	// map from record id to clock upon deletion

	readonly serializedSchema: SerializedSchema

	readonly documentTypes: Set<string>
	readonly presenceType: RecordType<R, any>

	constructor(
		public readonly schema: StoreSchema<R, any>,
		snapshot?: RoomSnapshot
	) {
		// do a json serialization cycle to make sure the schema has no 'undefined' values
		this.serializedSchema = JSON.parse(JSON.stringify(schema.serialize()))

		this.documentTypes = new Set(
			Object.values<RecordType<R, any>>(schema.types)
				.filter((t) => t.scope === 'document')
				.map((t) => t.typeName)
		)

		const presenceTypes = new Set(
			Object.values<RecordType<R, any>>(schema.types).filter((t) => t.scope === 'presence')
		)

		if (presenceTypes.size != 1) {
			throw new Error(
				`TLSyncRoom: exactly one presence type is expected, but found ${presenceTypes.size}`
			)
		}

		this.presenceType = presenceTypes.values().next().value

		if (!snapshot) {
			snapshot = {
				clock: 0,
				documents: [
					{
						state: DocumentRecordType.create({ id: TLDOCUMENT_ID }),
						lastChangedClock: 0,
					},
					{
						state: PageRecordType.create({ name: 'Page 1', index: 'a1' }),
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
					assertExists(getOwnProperty(schema.types, r.state.typeName))
				),
			])
		)

		const migrationResult = schema.migrateStoreSnapshot({
			store: Object.fromEntries(
				objectMapEntries(documents).map(([id, { state }]) => [id, state as R])
			) as Record<IdOf<R>, R>,
			schema: snapshot.schema ?? schema.serializeEarliestVersion(),
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
					assertExists(getOwnProperty(schema.types, r.typeName)) as any
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
	}

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
				.map((doc) => ({
					state: doc.state,
					lastChangedClock: doc.lastChangedClock,
				}))
				.filter((d) => this.documentTypes.has(d.state.typeName)),
		}
	}

	/**
	 * Send a message to a particular client.
	 *
	 * @param client - The client to send the message to.
	 * @param message - The message to send.
	 */
	private sendMessage(sessionKey: string, message: TLSocketServerSentEvent<R>) {
		const session = this.sessions.get(sessionKey)
		if (!session) {
			console.warn('Tried to send message to unknown session', message.type)
			return
		}
		if (session.state !== RoomSessionState.CONNECTED) {
			console.warn('Tried to send message to disconnected client', message.type)
			return
		}
		if (session.socket.isOpen) {
			session.socket.sendMessage(message)
		} else {
			this.cancelSession(session.sessionKey)
		}
	}

	private removeSession(sessionKey: string) {
		const session = this.sessions.get(sessionKey)
		if (!session) {
			console.warn('Tried to remove unknown session')
			return
		}

		this.sessions.delete(sessionKey)

		const presence = this.getDocument(session.presenceId)

		try {
			if (session.socket.isOpen) {
				session.socket.close()
			}
		} catch (_e) {
			// noop
		}

		if (presence) {
			this.state.update(({ tombstones, documents }) => {
				documents = { ...documents }
				delete documents[session.presenceId]
				return { documents, tombstones }
			})

			this.broadcastPatch({
				diff: { [session.presenceId]: [RecordOpType.Remove] },
				sourceSessionKey: sessionKey,
			})
		}

		this.events.emit('session_removed', { sessionKey })
		if (this.sessions.size === 0) {
			this.events.emit('room_became_empty')
		}
	}

	private cancelSession(sessionKey: string) {
		const session = this.sessions.get(sessionKey)
		if (!session) {
			return
		}

		if (session.state === RoomSessionState.AWAITING_REMOVAL) {
			console.warn('Tried to cancel session that is already awaiting removal')
			return
		}

		this.sessions.set(sessionKey, {
			state: RoomSessionState.AWAITING_REMOVAL,
			sessionKey,
			presenceId: session.presenceId,
			socket: session.socket,
			cancellationTime: Date.now(),
		})
	}

	/**
	 * Broadcast a message to all connected clients except the clientId provided.
	 *
	 * @param message - The message to broadcast.
	 * @param clientId - The client to exclude.
	 */
	broadcastPatch({
		diff,
		sourceSessionKey: sourceSessionKey,
	}: {
		diff: NetworkDiff<R>
		sourceSessionKey: string
	}) {
		this.sessions.forEach((session) => {
			if (session.state !== RoomSessionState.CONNECTED) return
			if (sourceSessionKey === session.sessionKey) return
			if (!session.socket.isOpen) {
				this.cancelSession(session.sessionKey)
				return
			}

			const res = this.migrateDiffForSession(session.serializedSchema, diff)

			if (!res.ok) {
				// disconnect client and send incompatibility error
				this.rejectSession(
					session,
					res.error === MigrationFailureReason.TargetVersionTooNew
						? TLIncompatibilityReason.ServerTooOld
						: TLIncompatibilityReason.ClientTooOld
				)
				return
			}

			this.sendMessage(session.sessionKey, {
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
	 * @param client - The client that connected to the room.
	 */
	handleNewSession = (sessionKey: string, socket: TLRoomSocket<R>) => {
		const existing = this.sessions.get(sessionKey)
		this.sessions.set(sessionKey, {
			state: RoomSessionState.AWAITING_CONNECT_MESSAGE,
			sessionKey,
			socket,
			presenceId: existing?.presenceId ?? this.presenceType.createId(),
			sessionStartTime: Date.now(),
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
	 * When the server receives a message from the clients Currently supports connect and patches.
	 * Invalid messages types log a warning. Currently doesn't validate data.
	 *
	 * @param client - The client that sent the message
	 * @param message - The message that was sent
	 */
	handleMessage = async (sessionKey: string, message: TLSocketClientSentEvent<R>) => {
		const session = this.sessions.get(sessionKey)
		if (!session) {
			console.warn('Received message from unknown session')
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
				if (session.state === RoomSessionState.CONNECTED) {
					session.lastInteractionTime = Date.now()
				}
				return this.sendMessage(session.sessionKey, { type: 'pong' })
			}
			default: {
				exhaustiveSwitchError(message)
			}
		}

		return this
	}

	/** If the client is out of date or we are out of date, we need to let them know */
	private rejectSession(session: RoomSession<R>, reason: TLIncompatibilityReason) {
		try {
			if (session.socket.isOpen) {
				session.socket.sendMessage({
					type: 'incompatibility_error',
					reason,
				})
			}
		} catch (e) {
			// noop
		} finally {
			this.removeSession(session.sessionKey)
		}
	}

	private handleConnectRequest(
		session: RoomSession<R>,
		message: Extract<TLSocketClientSentEvent<R>, { type: 'connect' }>
	) {
		// if the protocol versions don't match, disconnect the client
		// we will eventually want to try to make our protocol backwards compatible to some degree
		// and have a MIN_PROTOCOL_VERSION constant that the TLSyncRoom implements support for
		if (message.protocolVersion == null || message.protocolVersion < TLSYNC_PROTOCOL_VERSION) {
			this.rejectSession(session, TLIncompatibilityReason.ClientTooOld)
			return
		} else if (message.protocolVersion > TLSYNC_PROTOCOL_VERSION) {
			this.rejectSession(session, TLIncompatibilityReason.ServerTooOld)
			return
		}
		// If the client's store is at a different version to ours, it could cause corruption.
		// We should disconnect the client and ask them to refresh.
		if (message.schema == null || message.schema.storeVersion < this.schema.currentStoreVersion) {
			this.rejectSession(session, TLIncompatibilityReason.ClientTooOld)
			return
		} else if (message.schema.storeVersion > this.schema.currentStoreVersion) {
			this.rejectSession(session, TLIncompatibilityReason.ServerTooOld)
			return
		}

		const sessionSchema = isEqual(message.schema, this.serializedSchema)
			? this.serializedSchema
			: message.schema

		const connect = (msg: TLSocketServerSentEvent<R>) => {
			this.sessions.set(session.sessionKey, {
				state: RoomSessionState.CONNECTED,
				sessionKey: session.sessionKey,
				presenceId: session.presenceId,
				socket: session.socket,
				serializedSchema: sessionSchema,
				lastInteractionTime: Date.now(),
			})
			this.sendMessage(session.sessionKey, msg)
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
						session,
						migrated.error === MigrationFailureReason.TargetVersionTooNew
							? TLIncompatibilityReason.ServerTooOld
							: TLIncompatibilityReason.ClientTooOld
					)
					return
				}
				connect({
					type: 'connect',
					connectRequestId: message.connectRequestId,
					hydrationType: 'wipe_all',
					protocolVersion: TLSYNC_PROTOCOL_VERSION,
					schema: this.schema.serialize(),
					serverClock: this.clock,
					diff: migrated.value,
				})
			} else {
				// calculate the changes since the time the client last saw
				const diff: NetworkDiff<R> = {}
				const updatedDocs = Object.values(this.state.get().documents).filter(
					(doc) => doc.lastChangedClock > message.lastServerClock
				)
				const presenceDocs = Object.values(this.state.get().documents).filter(
					(doc) =>
						this.presenceType.typeName === doc.state.typeName && doc.state.id !== session.presenceId
				)
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
						session,
						migrated.error === MigrationFailureReason.TargetVersionTooNew
							? TLIncompatibilityReason.ServerTooOld
							: TLIncompatibilityReason.ClientTooOld
					)
					return
				}

				connect({
					type: 'connect',
					connectRequestId: message.connectRequestId,
					hydrationType: 'wipe_presence',
					schema: this.schema.serialize(),
					protocolVersion: TLSYNC_PROTOCOL_VERSION,
					serverClock: this.clock,
					diff: migrated.value,
				})
			}
		})
	}

	private handlePushRequest(
		session: RoomSession<R>,
		message: Extract<TLSocketClientSentEvent<R>, { type: 'push' }>
	) {
		const isPresencePush = 'presence' in message
		const clientClock = message.clientClock

		if (session.state !== RoomSessionState.CONNECTED) {
			return
		}
		session.lastInteractionTime = Date.now()

		// increment the clock for this push
		this.clock++

		transaction((rollback) => {
			// collect actual ops that resulted from the push
			// these will be broadcast to other users
			let mergedChanges: NetworkDiff<R> | null = null
			const propagateOp = (id: string, op: RecordOp<R>) => {
				if (!mergedChanges) mergedChanges = {}
				mergedChanges[id] = op
			}

			const fail = (reason: TLIncompatibilityReason): Result<void, void> => {
				rollback()
				this.rejectSession(session, reason)
				if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
					console.error('failed to apply push', reason, message)
				}
				return Result.err(undefined)
			}

			const addDocument = (id: string, _state: R): Result<void, void> => {
				const res = this.schema.migratePersistedRecord(_state, session.serializedSchema, 'up')
				if (res.type === 'error') {
					return fail(
						res.reason === MigrationFailureReason.TargetVersionTooOld // target version is our version
							? TLIncompatibilityReason.ServerTooOld
							: TLIncompatibilityReason.ClientTooOld
					)
				}
				const state = res.value
				const doc = this.getDocument(id)
				if (doc) {
					// if we already have a document with this id, set it to the new value
					// but propagate a diff rather than the entire value
					const diff = doc.replaceState(state, this.clock)
					if (!diff.ok) {
						return fail(TLIncompatibilityReason.InvalidRecord)
					}
					if (diff.value) propagateOp(id, [RecordOpType.Patch, diff.value])
				} else {
					// if we don't already have a document with this id, create it and propagate the put op
					const result = this.addDocument(id, state, this.clock)
					if (!result.ok) {
						return fail(TLIncompatibilityReason.InvalidRecord)
					}
					propagateOp(id, [RecordOpType.Put, state])
				}

				return Result.ok(undefined)
			}

			const patchDocument = (id: string, patch: ObjectDiff): Result<void, void> => {
				// if it was already deleted, there's no need to apply the patch
				const doc = this.getDocument(id)
				if (!doc) return Result.ok(undefined)
				const theirVersion = getRecordVersion(doc.state, session.serializedSchema)
				const ourVersion = getRecordVersion(doc.state, this.serializedSchema)
				if (compareRecordVersions(ourVersion, theirVersion) === 1) {
					// if the client's version of the record is older than ours, we apply the patch to the downgraded version of the record
					const downgraded = this.schema.migratePersistedRecord(
						doc.state,
						session.serializedSchema,
						'down'
					)
					if (downgraded.type === 'error') {
						return fail(TLIncompatibilityReason.ClientTooOld)
					}
					const patched = applyObjectDiff(downgraded.value, patch)
					// then upgrade the patched version and use that as the new state
					const upgraded = this.schema.migratePersistedRecord(
						patched,
						session.serializedSchema,
						'up'
					)
					if (upgraded.type === 'error') {
						return fail(TLIncompatibilityReason.ClientTooOld)
					}
					const diff = doc.replaceState(upgraded.value, this.clock)
					if (!diff.ok) {
						return fail(TLIncompatibilityReason.InvalidRecord)
					}
					if (diff.value) propagateOp(id, [RecordOpType.Patch, diff.value])
				} else if (compareRecordVersions(ourVersion, theirVersion) === -1) {
					// if the client's version of the record is newer than ours, we can't apply the patch
					return fail(TLIncompatibilityReason.ServerTooOld)
				} else {
					// otherwise apply the patch and propagate the patch op if needed
					const diff = doc.mergeDiff(patch, this.clock)
					if (!diff.ok) {
						return fail(TLIncompatibilityReason.InvalidRecord)
					}
					if (diff.value) propagateOp(id, [RecordOpType.Patch, diff.value])
				}

				return Result.ok(undefined)
			}

			if (isPresencePush) {
				const id = session.presenceId
				const [type, val] = message.presence
				if (type === RecordOpType.Put) {
					if (!addDocument(id, { ...val, id, typeName: this.presenceType.typeName }).ok) return
				} else {
					if (
						!patchDocument(id, {
							...val,
							id: [ValueOpType.Put, id],
							typeName: [ValueOpType.Put, this.presenceType.typeName],
						}).ok
					)
						return
				}
				this.sendMessage(session.sessionKey, {
					type: 'push_result',
					clientClock,
					action: 'commit',
					serverClock: this.clock,
				})
			} else {
				const diff = message.diff
				for (const [id, op] of Object.entries(diff)) {
					if (op[0] === RecordOpType.Put) {
						// if it's not a document record, fail
						if (!this.documentTypes.has(op[1].typeName)) {
							return fail(TLIncompatibilityReason.InvalidRecord)
						}
						if (!addDocument(id, op[1]).ok) return
					} else if (op[0] === RecordOpType.Remove) {
						// if it was already deleted, don't do anything, no need to propagate a delete op
						const doc = this.getDocument(id)
						if (!doc) continue
						if (!this.documentTypes.has(doc.state.typeName)) {
							return fail(TLIncompatibilityReason.InvalidOperation)
						}
						// otherwise delete the document and propagate the delete op
						this.removeDocument(id, this.clock)
						// schedule a pruneTombstones call to happen after we are done here
						setTimeout(this.pruneTombstones, 0)
						propagateOp(id, op)
					} else if (op[0] === RecordOpType.Patch) {
						if (!patchDocument(id, op[1]).ok) return
					}
				}

				if (!mergedChanges) {
					// we applied the client's changes but they had no effect
					// tell them to drop the diff
					this.sendMessage(session.sessionKey, {
						type: 'push_result',
						serverClock: this.clock,
						clientClock,
						action: 'discard',
					})
				} else if (isEqual(mergedChanges, diff)) {
					// we applied the client's changes and they had the exact same effect
					// on the server as they did on the client
					// tell them to keep the diff
					this.sendMessage(session.sessionKey, {
						type: 'push_result',
						serverClock: this.clock,
						clientClock,
						action: 'commit',
					})
				} else {
					// We applied the client's changes and they had a different non-empty effect
					// on the server, so we need to tell the client to rebase with our gold standard diff
					const migrateResult = this.migrateDiffForSession(session.serializedSchema, mergedChanges)
					if (!migrateResult.ok) {
						return fail(
							migrateResult.error === MigrationFailureReason.TargetVersionTooNew
								? TLIncompatibilityReason.ServerTooOld
								: TLIncompatibilityReason.ClientTooOld
						)
					}
					this.sendMessage(session.sessionKey, {
						type: 'push_result',
						serverClock: this.clock,
						clientClock,
						action: { rebaseWithDiff: migrateResult.value },
					})
				}
			}

			if (mergedChanges) {
				// let all other client know about the changes
				this.broadcastPatch({
					sourceSessionKey: session.sessionKey,
					diff: mergedChanges,
				})
			}

			return
		})
	}

	/**
	 * Handle the event when a client disconnects.
	 *
	 * @param client - The client that disconnected.
	 */
	handleClose = (sessionKey: string) => {
		this.cancelSession(sessionKey)
	}
}
