import {
	AtomMap,
	MigrationFailureReason,
	RecordId,
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
	TLObjectStoreAccess,
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
 * A low-level hook that runs before each client write of one record, and decides what the record
 * becomes. Use it for data rules the server must enforce: stamp fields, keep fields immutable, or
 * reject a record that breaks an invariant. For example, force a comment's `authorId` to the
 * signed-in user from `session.meta`, so nobody can post in someone else's name.
 *
 * It is not an access control API. It sees one write at a time and knows nothing of roles,
 * grants, or reads. For who may edit or view a document, use the session's `isReadonly` and
 * `objectAccess` when it connects (see {@link TLSocketRoom.handleSocketConnect}). For who may
 * write a record, use {@link canWrite}, which builds these hooks from boolean checks.
 *
 * Called on **create**, **update**, and **delete** of records whose `typeName` it's registered for
 * (see {@link TLBeforeWriteHooks}), and only for client pushes — never for server-initiated writes.
 *
 * `prev` and `next` are always at the **server's** schema version: client writes are migrated
 * before the hook runs, so guarding or stamping a field never requires knowing what older
 * clients call it. The record you return is what gets stored (after validation) — no migration
 * runs afterwards, so stamped fields can't be clobbered.
 *
 * Return the record that should exist after the write:
 *
 * - nothing, to apply the write as the client sent it;
 * - a record, to store that record instead. It must keep the record's `id` and `typeName`;
 * - `prev`, to keep the record as it was. This rejects the write on any op, since `prev` is `null`
 *   on create;
 * - `null`, for no record: a create is skipped, an update deletes the record, a delete goes ahead.
 *
 * When the stored result differs from the client's write, the client is corrected by the push
 * result, as for any other server-side change.
 *
 * ⚠︎ Runs synchronously inside the commit transaction, on the same path as every document edit — it
 * must be fast and do **no** I/O. `next`/`prev` are client-controlled records, so treat their
 * contents as untrusted. A throw is caught, logged, and keeps `prev` (fail closed) rather than
 * crashing the push. For expensive, async checks (e.g. resolving mentions against who can access a
 * file), react after the fact via `onCommittedChanges`.
 *
 * @public
 */
export type TLBeforeWriteHook<Rec extends UnknownRecord, SessionMeta> = (
	args: {
		/** The session performing the write: its host-provided `meta` (e.g. the authenticated user
		 *  id) and the canvas-lane `isReadonly` state, for hosts whose object-lane policy follows
		 *  canvas access. */
		session: { sessionId: string; isReadonly: boolean; meta: SessionMeta }
		/**
		 * Reads any document record as of this write, including earlier writes in the same push.
		 * Use it for rules that depend on other records, e.g. "only inside a frame you can edit"
		 * needs the shape's parent. Reads the server's copy, never the client's. A typed id such
		 * as `shape.parentId` gives a typed result. A plain string gives `UnknownRecord`; narrow
		 * that by `typeName`.
		 */
		get<Id extends RecordId<UnknownRecord>>(id: Id): Id['__type__'] | undefined
		get(id: string): UnknownRecord | undefined
	} & (
		| { type: 'create'; prev: null; next: Rec }
		| { type: 'update'; prev: Rec; next: Rec }
		| { type: 'delete'; prev: Rec; next: null }
	)
) => Rec | null | void

/**
 * A map from record `typeName` to a {@link TLBeforeWriteHook} for that record type. Only listed
 * types are run through a hook; every other record writes through untouched, so this stays off the
 * hot path for the vast majority of writes (shape drags etc.).
 *
 * Each hook is typed to its record — e.g. `next` in the `comment` entry is a `TLComment` — so
 * renaming a field on the record makes the hook that reads it fail to compile, rather than
 * silently stamp or guard the wrong field.
 *
 * Presence records never run through hooks (presence is per-session and ephemeral); registering the
 * presence typeName is a construction-time error.
 *
 * @public
 */
export type TLBeforeWriteHooks<R extends UnknownRecord, SessionMeta> = {
	[K in R['typeName']]?: TLBeforeWriteHook<Extract<R, { typeName: K }>, SessionMeta>
}

/**
 * Combines several {@link TLBeforeWriteHooks} maps into one. A spread keeps only the last hook for
 * a type, so two packages that both guard `comment` would silently drop one; use this instead.
 *
 * For each type, the hooks run in argument order, and each gets the record the hook before it
 * returned as `next`. A hook that keeps `prev` or returns `null` decides the write, and later
 * hooks don't run.
 *
 * @example
 * ```ts
 * new TLSocketRoom<MyRecord, SessionMeta>({
 * 	beforeWrite: composeBeforeWrite(
 * 		createCommentAuthorizers({ getUserId }),
 * 		{ comment: ({ prev, next }) => (next && isTooLong(next) ? prev : undefined) }
 * 	),
 * })
 * ```
 *
 * @public
 */
export function composeBeforeWrite<R extends UnknownRecord, SessionMeta>(
	...maps: TLBeforeWriteHooks<R, SessionMeta>[]
): TLBeforeWriteHooks<R, SessionMeta> {
	type AnyHook = TLBeforeWriteHook<R, SessionMeta>
	const composed: Record<string, AnyHook> = {}
	for (const [typeName, hooks] of groupHooksByType<AnyHook>(maps)) {
		composed[typeName] =
			hooks.length === 1
				? hooks[0]
				: (args) => {
						let next: R | null = args.next
						for (const hook of hooks) {
							const result = hook({ ...args, next } as typeof args)
							if (result === undefined) continue
							if (result === null || result === args.prev) return result
							next = result
						}
						return next === args.next ? undefined : next
					}
	}
	return composed as unknown as TLBeforeWriteHooks<R, SessionMeta>
}

/** What a client holds of each record that has a `beforeRead` hook. */
type HeldRecords<R extends UnknownRecord = UnknownRecord> = Extract<
	RoomSession<R, unknown>,
	{ state: 'connected' }
>['held']

interface PushChanges<R extends UnknownRecord> {
	diffs: {
		networkDiff: NetworkDiff<R>
		diff: TLSyncForwardDiff<R>
	} | null
}

function isEmptyForwardDiff(diff: TLSyncForwardDiff<UnknownRecord>) {
	return diff.deletes.length === 0 && Object.keys(diff.puts).length === 0
}

function groupHooksByType<Hook>(maps: object[]): Map<string, Hook[]> {
	const byType = new Map<string, Hook[]>()
	for (const map of maps) {
		for (const [typeName, hook] of Object.entries(map as Record<string, Hook | undefined>)) {
			if (!hook) continue
			const hooks = byType.get(typeName)
			if (hooks) hooks.push(hook)
			else byType.set(typeName, [hook])
		}
	}
	return byType
}

/**
 * A low-level hook that runs before the room sends a record to a session, and decides what that
 * session receives. Use it to hide a record from some sessions, or to send them a changed copy. For
 * example, send a card without its face to every player but its owner.
 *
 * Return what the session should receive:
 *
 * - nothing, to send the record as stored;
 * - a record, to send that record instead. It must keep the record's `id` and `typeName`, and pass
 *   the record type's validator;
 * - `null`, to send nothing. If the session already holds the record, the room removes it there.
 *
 * The hook runs for every record when a session connects, and for each record change the session
 * would receive, including the corrections to its own pushes. It runs again for a record only when
 * that record changes. A rule that reads other records with `get` (e.g. "hidden when its frame is
 * hidden") is not re-run when only those other records change, so the session keeps what it got.
 *
 * Writes: a client writes against what it received. An update arrives as a patch of the fields the
 * client changed, so fields it never saw keep their stored values. Use `beforeWrite` or
 * {@link canWrite} to stop a session from writing records or fields that it cannot read.
 *
 * Presence records never run through hooks; registering the presence typeName is a
 * construction-time error.
 *
 * ⚠︎ Runs synchronously, once for each session for each change, on the same path as every document
 * edit — it must be fast and do **no** I/O. A throw, or a result that changes the `id` or
 * `typeName` or fails validation, is logged and sends nothing (fail closed).
 *
 * @public
 */
export type TLBeforeReadHook<Rec extends UnknownRecord, SessionMeta> = (args: {
	/** The session that receives the record. */
	session: { sessionId: string; isReadonly: boolean; meta: SessionMeta }
	/** The record as stored, at the server's schema version. */
	record: Rec
	/**
	 * Reads any document record as stored on the server. A typed id such as `shape.parentId` gives
	 * a typed result. A plain string gives `UnknownRecord`; narrow that by `typeName`.
	 */
	get<Id extends RecordId<UnknownRecord>>(id: Id): Id['__type__'] | undefined
	get(id: string): UnknownRecord | undefined
}) => Rec | null | void

/**
 * A map from record `typeName` to a {@link TLBeforeReadHook} for that record type. Only listed types
 * run through a hook; every other record is sent as stored, on the same path as a room with no
 * hooks.
 *
 * @public
 */
export type TLBeforeReadHooks<R extends UnknownRecord, SessionMeta> = {
	[K in R['typeName']]?: TLBeforeReadHook<Extract<R, { typeName: K }>, SessionMeta>
}

/**
 * Combines several {@link TLBeforeReadHooks} maps into one. For each type, the hooks run in argument
 * order, and each gets the record the hook before it returned. A hook that returns `null` decides,
 * and later hooks don't run.
 *
 * @public
 */
export function composeBeforeRead<R extends UnknownRecord, SessionMeta>(
	...maps: TLBeforeReadHooks<R, SessionMeta>[]
): TLBeforeReadHooks<R, SessionMeta> {
	type AnyHook = TLBeforeReadHook<R, SessionMeta>
	const composed: Record<string, AnyHook> = {}
	for (const [typeName, hooks] of groupHooksByType<AnyHook>(maps)) {
		composed[typeName] =
			hooks.length === 1
				? hooks[0]
				: (args) => {
						let record: R = args.record
						for (const hook of hooks) {
							const result = hook({ ...args, record })
							if (result === null) return null
							if (result !== undefined) record = result
						}
						return record === args.record ? undefined : record
					}
	}
	return composed as unknown as TLBeforeReadHooks<R, SessionMeta>
}

/**
 * @deprecated Use `TLBeforeWriteHook` instead. Returns `null` to reject.
 * @public
 */
export type TLRecordAuthorizer<Rec extends UnknownRecord, SessionMeta> = (
	args: Parameters<TLBeforeWriteHook<Rec, SessionMeta>>[0]
) => Rec | null

/**
 * @deprecated Use `TLBeforeWriteHooks` instead.
 * @public
 */
export type TLRecordAuthorizers<R extends UnknownRecord, SessionMeta> = {
	// oxlint-disable-next-line typescript/no-deprecated
	[K in R['typeName']]?: TLRecordAuthorizer<Extract<R, { typeName: K }>, SessionMeta>
}

/**
 * Runs the deprecated `authorizeRecord` hooks as `beforeWrite` hooks. They return `null` to reject,
 * which would mean "delete" to a `beforeWrite` hook, and their returned record counts on create only.
 *
 * @internal
 */
export function beforeWriteFromAuthorizers<R extends UnknownRecord, SessionMeta>(
	// oxlint-disable-next-line typescript/no-deprecated
	authorizers: TLRecordAuthorizers<R, SessionMeta>
): TLBeforeWriteHooks<R, SessionMeta> {
	// oxlint-disable-next-line typescript/no-deprecated
	type AnyAuthorizer = TLRecordAuthorizer<R, SessionMeta>
	const hooks: Record<string, TLBeforeWriteHook<R, SessionMeta>> = {}
	for (const [typeName, authorize] of Object.entries(
		authorizers as Record<string, AnyAuthorizer | undefined>
	)) {
		if (!authorize) continue
		hooks[typeName] = (args) => {
			const result: unknown = authorize(args)
			if (result === null || result === false) return args.prev
			return args.type === 'create' ? (result as R) : undefined
		}
	}
	return hooks as unknown as TLBeforeWriteHooks<R, SessionMeta>
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
	 * as document records but are gated by the session's `objectAccess` instead of `isReadonly`,
	 * and are excluded from `documentTypes` so hosts can persist them in a separate lane.
	 */
	readonly objectTypes: Set<string>
	readonly presenceType: RecordType<R, any> | null
	private log?: TLSyncLog
	public readonly schema: StoreSchema<R, any>
	private onPresenceChange?(): void
	private onCommittedChanges?(args: { diff: TLSyncForwardDiff<R>; documentClock: number }): void
	private readonly beforeWrite?: TLBeforeWriteHooks<R, SessionMeta>
	private readonly readHooks = new Map<
		string,
		ReturnType<TLSyncRoom<R, SessionMeta>['wrapReadHook']>
	>()
	private readonly sessionIdleTimeout: number

	/**
	 * Runs the `beforeWrite` hook registered for a record type and returns what the record becomes:
	 * a record to store, `null` for no record, or `'keep'` to leave the stored record as it is. Each
	 * entry in `beforeWrite` is typed to its specific record; the cast here is the one place we
	 * can't statically correlate a runtime `typeName` with its record type, so it lives in the
	 * library rather than in every consumer.
	 */
	private writeHookFor(
		typeName: R['typeName']
	): ((args: Parameters<TLBeforeWriteHook<R, SessionMeta>>[0]) => R | null | 'keep') | undefined {
		const hook = this.beforeWrite?.[typeName] as TLBeforeWriteHook<R, SessionMeta> | undefined
		if (!hook) return undefined
		return (args) => {
			let result: R | null | void
			try {
				result = hook(args)
			} catch (e) {
				// Fail closed: hooks are security-sensitive, so a bug must never let a write through.
				this.log?.error?.('beforeWrite hook threw; keeping the stored record', e)
				return 'keep'
			}
			if (result === undefined) return args.next
			if (result === args.prev) {
				this.log?.warn?.(
					'beforeWrite kept the stored record',
					typeName,
					args.type,
					(args.next ?? args.prev)!.id,
					'session:',
					args.session.sessionId
				)
				return 'keep'
			}
			if (result === null) return null
			const id = (args.next ?? args.prev)!.id
			if (result.id !== id || result.typeName !== typeName) {
				// A changed id or typeName would write a different record than the one this op
				// was checked against.
				this.log?.error?.('beforeWrite hook changed id or typeName; keeping the stored record', id)
				return 'keep'
			}
			return result
		}
	}

	/**
	 * Wraps a `beforeRead` hook so that it returns what the session receives: the stored record
	 * (`'same'`), a changed copy, or nothing (`null`). Built once per type at construction, because
	 * it runs for every session on every change.
	 */
	private wrapReadHook(
		typeName: string,
		hook: TLBeforeReadHook<R, SessionMeta>
	): (args: Parameters<TLBeforeReadHook<R, SessionMeta>>[0]) => R | 'same' | null {
		return (args) => {
			let result: R | null | void
			try {
				result = hook(args)
			} catch (e) {
				// Fail closed: a bug in a read rule must never send a record it was meant to hide.
				this.log?.error?.('beforeRead hook threw; sending nothing', e)
				return null
			}
			if (result === undefined || result === args.record) return 'same'
			if (result === null) return null
			if (result.id !== args.record.id || result.typeName !== typeName) {
				this.log?.error?.('beforeRead hook changed id or typeName; sending nothing', args.record.id)
				return null
			}
			return result
		}
	}

	/** Whether a changed copy may be sent. The client validates what it receives, and an invalid record breaks its store. */
	private isValidCopy(copy: R) {
		try {
			getOwnProperty(this.schema.types, copy.typeName)?.validate(copy)
			return true
		} catch (e) {
			this.log?.error?.('beforeRead hook returned an invalid record; sending nothing', e)
			return false
		}
	}

	/**
	 * Rewrites a diff into what one session receives, and records what it now holds. Returns the
	 * same diff object when nothing in it changes for this session.
	 *
	 * A patch is only valid against the record the client holds, so it is kept only when the client
	 * holds the stored record. Otherwise the session gets the whole record, or a remove when it may
	 * hold a record that it can no longer see. A changed copy equal to the one the client holds is
	 * not sent again, so the client cannot tell when hidden fields change.
	 */
	private diffForSession(
		session: { sessionId: string; isReadonly: boolean; meta: SessionMeta; held: HeldRecords<R> },
		diff: TLSyncForwardDiff<R>,
		get: ((id: string) => UnknownRecord | undefined) | undefined
	): TLSyncForwardDiff<R> {
		if (this.readHooks.size === 0) return diff
		const { held } = session
		// After a full-view connect the room has decided every hooked record, so a new one is not
		// held. A resumed session may hold anything.
		const holds = (id: string) => held.records.get(id) ?? (held.complete ? 'none' : undefined)
		const hookSession = {
			sessionId: session.sessionId,
			isReadonly: session.isReadonly,
			meta: session.meta,
		}

		let puts: TLSyncForwardDiff<R>['puts'] | null = null
		const removes: string[] = []
		const skipDeletes = new Set<string>()
		const setPut = (id: string, put: R | undefined) => {
			puts ??= { ...diff.puts }
			if (put) puts[id] = put
			else delete puts[id]
		}

		for (const [id, put] of objectMapEntriesIterable(diff.puts)) {
			const record = Array.isArray(put) ? put[1] : put
			const hook = this.readHooks.get(record.typeName)
			if (!hook) continue
			assert(get, 'beforeRead needs a record reader for this diff')
			const held_ = holds(id)
			let sent = hook({ session: hookSession, record, get } as Parameters<typeof hook>[0])
			if (sent !== null && sent !== 'same' && !this.isValidCopy(sent)) sent = null
			if (sent === null) {
				setPut(id, undefined)
				if (held_ !== 'none') removes.push(id)
				held.records.set(id, 'none')
			} else if (sent === 'same') {
				// a patch only applies to the stored record it was computed from
				if (held_ !== 'same' && Array.isArray(put)) setPut(id, record)
				held.records.set(id, 'same')
			} else if (typeof held_ === 'object' && isEqual(held_, sent)) {
				setPut(id, undefined)
			} else {
				setPut(id, sent)
				held.records.set(id, sent)
			}
		}
		for (const id of diff.deletes) {
			const held_ = held.records.get(id)
			if (held_ === undefined) continue
			// A record the client never held needs no remove.
			if (held_ === 'none') skipDeletes.add(id)
			held.records.delete(id)
		}

		if (!puts && removes.length === 0 && skipDeletes.size === 0) return diff
		return {
			puts: puts ?? diff.puts,
			deletes: [...diff.deletes.filter((id) => !skipDeletes.has(id)), ...removes],
		}
	}

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
		 * Each must be a document-scoped type registered in the schema. Object-lane writes are
		 * gated per session by `objectAccess` rather than `isReadonly`.
		 */
		objectTypes?: readonly string[]
		/**
		 * Per-type authorizers for client record writes (create, update, delete): veto or, on
		 * create, rewrite. See {@link TLBeforeWriteHooks}.
		 */
		beforeWrite?: TLBeforeWriteHooks<R, SessionMeta>
		/** Per-type hooks that decide what each session receives. See {@link TLBeforeReadHooks}. */
		beforeRead?: TLBeforeReadHooks<R, SessionMeta>
		storage: TLSyncStorage<R>
		clientTimeout?: number
	}) {
		this.schema = opts.schema
		this.log = opts.log
		this.onPresenceChange = opts.onPresenceChange
		this.onCommittedChanges = opts.onCommittedChanges
		this.beforeWrite = opts.beforeWrite
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

		// The presence lane never consults authorizers, so a presence key in `beforeWrite`
		// would be a silent no-op — fail loudly at construction instead.
		if (this.presenceType && this.beforeWrite) {
			assert(
				!getOwnProperty(this.beforeWrite, this.presenceType.typeName),
				`TLSyncRoom: beforeWrite['${this.presenceType.typeName}'] is a presence type; presence records are not authorized`
			)
		}
		if (this.presenceType && opts.beforeRead) {
			assert(
				!getOwnProperty(opts.beforeRead, this.presenceType.typeName),
				`TLSyncRoom: beforeRead['${this.presenceType.typeName}'] is a presence type; presence records are not filtered`
			)
		}
		for (const [typeName, hook] of Object.entries(opts.beforeRead ?? {})) {
			if (hook) this.readHooks.set(typeName, this.wrapReadHook(typeName, hook as any))
		}

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
			isReadonly: session.isReadonly,
			objectAccess: session.objectAccess,
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
	 * @param get - Reads stored records for `beforeRead` hooks. Required when the diff can hold a
	 *              record type that has one.
	 */
	private broadcastPatch(
		diff: TLSyncForwardDiff<R>,
		networkDiff?: NetworkDiff<R> | null,
		sourceSessionId?: string,
		get?: (id: string) => UnknownRecord | undefined
	) {
		// Computed once and shared by every session that needs no down-migration; the push path
		// hands us the diff it already computed (in legacy append mode when needed), and re-deriving
		// it per session would both repeat the diffing work and lose that legacy handling.
		const legacyAppendMode = !this.getCanEmitStringAppend()
		const unmigrated = networkDiff ?? toNetworkDiff(diff, legacyAppendMode)

		this.sessions.forEach((session) => {
			if (session.state !== RoomSessionState.Connected) return
			if (sourceSessionId === session.sessionId) return
			if (!session.socket.isOpen) {
				this.cancelSession(session.sessionId)
				return
			}

			const view = this.diffForSession(session, diff, get)
			if (view !== diff && isEmptyForwardDiff(view)) return
			const diffResult = this.migrateDiffOrRejectSession(
				session.sessionId,
				session.serializedSchema,
				session.requiresDownMigrations,
				view,
				view === diff ? unmigrated : undefined,
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
		objectAccess?: TLObjectStoreAccess
	}) {
		const { sessionId, socket, meta, isReadonly, objectAccess } = opts
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
			isReadonly: isReadonly ?? false,
			objectAccess: objectAccess ?? 'write',
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
		isReadonly: boolean
		objectAccess?: TLObjectStoreAccess
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
			isReadonly,
			objectAccess,
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
			held: { complete: false, records: new Map() },
			meta,
			isReadonly,
			objectAccess: objectAccess ?? 'write',
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
		this.broadcastPatch(diff, undefined, undefined, (id) => txn.get(id))
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

		const held: HeldRecords<R> = { complete: true, records: new Map() }
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
				held,
				supportsStringAppend: session.supportsStringAppend,
				meta: session.meta,
				isReadonly: session.isReadonly,
				objectAccess: session.objectAccess,
				requiresLegacyRejection: session.requiresLegacyRejection,
			})
			this._unsafe_sendMessage(session.sessionId, msg)
		}

		const { documentClock, result } = this.storage.transaction((txn) => {
			this.broadcastChanges(txn)
			// With read hooks, what the client kept from its last connection may no longer be what
			// it can see, so it always gets a full view.
			const docChanges = txn.getChangesSince(this.readHooks.size > 0 ? -1 : message.lastServerClock)
			const docView =
				docChanges && this.readHooks.size > 0
					? this.diffForSession({ ...session, held }, docChanges.diff, (id) => txn.get(id))
					: docChanges?.diff
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
							.filter((p) => p.id !== session.presenceId)
							.map((p) => [p.id, p])
					),
					deletes: [],
				}
			)
			if (!presenceDiff.ok) return null

			// Migrate the diff if needed, or use the pre-computed network diff
			let docDiff: NetworkDiff<R> | null = null
			if (docView && sessionSchema !== this.serializedSchema) {
				const migrated = this.migrateDiffOrRejectSession(
					session.sessionId,
					sessionSchema,
					requiresDownMigrations,
					docView
				)
				if (!migrated.ok) return null
				docDiff = migrated.value
			} else if (docView) {
				docDiff = toNetworkDiff(docView)
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
				objectAccess: session.objectAccess,
			} satisfies Extract<TLSocketServerSentEvent<R>, { type: 'connect' }>
		}) // no id needed because this only reads, no writes.

		this.lastDocumentClock = documentClock

		if (result) {
			connect(result)
		}
	}

	private sendPushResults(
		session: Extract<RoomSession<R, SessionMeta>, { state: 'connected' }> | null,
		message: Extract<TLSocketClientSentEvent<R>, { type: 'push' }>,
		result: { docChanges: PushChanges<R>; presenceChanges: PushChanges<R> },
		documentClock: number,
		get?: (id: string) => UnknownRecord | undefined
	) {
		const legacyAppendMode = !this.getCanEmitStringAppend()
		// What the pushing client may see of its own push. It already applied what it sent, so a
		// record that it may not see, or sees changed, comes back as a correction.
		let own = result.docChanges.diffs
		if (own && session) {
			const view = this.diffForSession(session, own.diff, get)
			if (view !== own.diff) {
				own = isEmptyForwardDiff(view)
					? null
					: { diff: view, networkDiff: toNetworkDiff(view, legacyAppendMode) }
			}
		}

		let pushResult: TLSocketServerSentEvent<R> | undefined
		if (isEqual(own?.networkDiff, message.diff)) {
			pushResult = {
				type: 'push_result',
				clientClock: message.clientClock,
				serverClock: documentClock,
				action: 'commit',
			}
		} else if (!own) {
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
				own.diff,
				own.networkDiff,
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
				get
			)
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

		const propagateOp = (
			changes: PushChanges<R>,
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
			changes: PushChanges<R>,
			id: string,
			_state: R,
			// What the record becomes (see `writeHookFor`), from the `beforeWrite` hook if one is set.
			resolve?: (prev: R | null, next: R) => R | null | 'keep',
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
			let { value: state } = res

			const doc =
				prevDoc !== undefined ? (prevDoc ?? undefined) : (storage.get(id) as R | undefined)

			// Run the hook on the up-migrated record; its result is stored as-is, so no later
			// migration can clobber stamped fields. The client self-corrects from the push result.
			if (resolve) {
				const result = resolve(doc ?? null, state)
				if (result === 'keep') return Result.ok(undefined)
				if (result === null) {
					if (doc) {
						storage.delete(id)
						propagateOp(changes, id, [RecordOpType.Remove], doc, undefined)
					}
					return Result.ok(undefined)
				}
				state = result
			}

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
			changes: PushChanges<R>,
			id: string,
			patch: ObjectDiff,
			// What the record becomes (see `writeHookFor`), from the `beforeWrite` hook if one is set.
			resolve?: (prev: R, next: R) => R | null | 'keep',
			// The existing document if the caller already fetched it (see `addDocument`).
			prevDoc?: R
		) => {
			// if it was already deleted, there's no need to apply the patch
			const doc = prevDoc ?? (storage.get(id) as R | undefined)
			if (!doc) return

			const recordType = assertExists(getOwnProperty(this.schema.types, doc.typeName))
			// Run the hook on the committed candidate — the record that would actually be stored,
			// never a raw client-version preview.
			const commit = (candidate: R, candidateDiff: ObjectDiff) => {
				const result = resolve ? resolve(doc, candidate) : candidate
				if (result === 'keep') return
				if (result === null) {
					storage.delete(id)
					propagateOp(changes, id, [RecordOpType.Remove], doc, undefined)
					return
				}
				const diff =
					result === candidate
						? candidateDiff
						: diffAndValidateRecord(doc, result, recordType, legacyAppendMode)
				if (!diff) return
				storage.set(id, result)
				propagateOp(changes, id, [RecordOpType.Patch, diff], doc, result)
			}
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
				if (diff) commit(diff[1], diff[0])
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
				if (diff) commit(upgraded.value, diff)
			}
		}

		const { result, documentClock, changes } = this.storage.transaction(
			(txn) => {
				this.broadcastChanges(txn)
				// collect actual ops that resulted from the push
				// these will be broadcast to other users

				const docChanges: PushChanges<R> = { diffs: null }
				const presenceChanges: PushChanges<R> = { diffs: null }

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
				// Per-op write gate: document-lane records are gated by `isReadonly`, object-lane
				// records by `objectAccess`. Denied ops are skipped (the client is corrected by the
				// resulting discard/rebase push_result, exactly as whole-diff readonly skips were).
				// Server-initiated pushes (no session) are always allowed.
				const canWrite = (typeName: string) =>
					!session ||
					(this.objectTypes.has(typeName) ? session.objectAccess !== 'read' : !session.isReadonly)

				// what authorizers see of the pushing session, shared by every authorized op in this push
				const authBase = session
					? {
							session: {
								sessionId: session.sessionId,
								isReadonly: session.isReadonly,
								meta: session.meta,
							},
							get: (id: string) => txn.get(id),
						}
					: null

				if (message.diff) {
					// The push request was for the document scope.
					for (const [id, op] of objectMapEntriesIterable(message.diff!)) {
						switch (op[0]) {
							case RecordOpType.Put: {
								// The write gate is checked before type validation so that a denied
								// session's ops are skipped without rejection, matching the previous
								// whole-diff readonly behavior.
								if (!canWrite(op[1].typeName)) continue
								// Try to add the document.
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
								// A put must not change the record's typeName. Two reasons, and the first
								// applies whether or not authorizers are configured: the write gate above
								// keyed off the *incoming* typeName, so a swap between lanes (document <->
								// object) would let a session denied on one lane write through the other by
								// relabeling an existing record. The second is that the authorizer lookup
								// also keys off the incoming typeName while the replace path validates
								// against the stored one, so a swap would consult the wrong authorizer (or
								// none). Skip it like a veto; the client self-corrects.
								// `undefined` (no session) means the guard didn't fetch, so addDocument will.
								const prevRecord = session ? ((txn.get(id) as R | undefined) ?? null) : undefined
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
								// Client pushes only; runs inside `addDocument`, on the up-migrated record.
								const hook = session && this.writeHookFor(record.typeName)
								const resolve = hook
									? (prev: R | null, next: R) =>
											prev
												? hook({ ...authBase!, type: 'update', prev, next })
												: hook({ ...authBase!, type: 'create', prev: null, next })
									: undefined
								// The guard above already fetched this, so don't hit storage again.
								addDocument(txn, docChanges, id, record, resolve, prevRecord)
								break
							}
							case RecordOpType.Patch: {
								const doc = txn.get(id) as R | undefined
								// if it was already deleted, there's no need to apply the patch
								if (!doc) continue
								if (!canWrite(doc.typeName)) continue
								// Runs inside `patchDocument` on the committed candidate.
								const hook = session && this.writeHookFor(doc.typeName)
								const resolve = hook
									? (prev: R, next: R) => hook({ ...authBase!, type: 'update', prev, next })
									: undefined
								// Try to patch the document. If it fails, stop here. The write gate above
								// already fetched the record, so pass it through.
								patchDocument(txn, docChanges, id, op[1], resolve, doc)
								break
							}
							case RecordOpType.Remove: {
								const doc = txn.get(id) as R | undefined
								if (!doc) {
									// If the doc was already deleted, don't do anything, no need to propagate a delete op
									continue
								}
								if (!canWrite(doc.typeName)) continue
								const hook = session && this.writeHookFor(doc.typeName)
								const result = hook
									? hook({ ...authBase!, type: 'delete', prev: doc, next: null })
									: null
								if (result === 'keep') continue
								if (result) {
									// The hook replaced the delete with a write of this record.
									const recordType = assertExists(getOwnProperty(this.schema.types, doc.typeName))
									const diff = diffAndValidateRecord(doc, result, recordType, legacyAppendMode)
									if (diff) {
										txn.set(id, result)
										propagateOp(docChanges, id, [RecordOpType.Patch, diff], doc, result)
									}
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

		if (changes && session) {
			// txn did not apply verbatim so we should broadcast the actual changes
			result.docChanges.diffs = {
				networkDiff: toNetworkDiff(changes, legacyAppendMode),
				diff: changes,
			}
		}

		// Read hooks read stored records, which needs a transaction. The views run after the push
		// commits, because the storage may change what was written (`changes` above), and each view
		// updates what its session holds, so it must run once, on the final diff.
		if (this.readHooks.size > 0) {
			this.storage.transaction((txn) =>
				this.sendPushResults(session, message, result, documentClock, (id) => txn.get(id))
			)
		} else {
			this.sendPushResults(session, message, result, documentClock)
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
