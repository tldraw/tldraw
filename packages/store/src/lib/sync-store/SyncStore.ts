import { Atom, Signal, atom, react, transact, transaction } from '@tldraw/state'
import { Result, exhaustiveSwitchError, objectMapValues, omit, rafThrottle } from '@tldraw/utils'
import isEqual from 'lodash.isequal'
import { nanoid } from 'nanoid'
import { IdOf, UnknownRecord } from '../BaseRecord'
import { RecordType } from '../RecordType'
import { ChangeSource } from '../Store'
import { SerializedSchema, StoreSchema } from '../StoreSchema'
import { MigrationFailureReason, compareRecordVersions, getRecordVersion } from '../migrate'
import {
	ChangeOp,
	ChangeOpType,
	Changes,
	addDeleteChange,
	addSetChange,
	mergeChanges,
} from './changes'
import {
	NetworkDiff,
	ObjectDiff,
	RecordOpType,
	applyObjectDiff,
	diffRecord,
	getNetworkDiff,
} from './diff'
import {
	GoingDownstreamConnectMessage,
	GoingDownstreamMessage,
	GoingDownstreamPatchMessage,
	GoingDownstreamSocket,
	GoingUpstreamMessage,
	GoingUpstreamPushMessage,
	GoingUpstreamSocket,
	TLIncompatibilityReason,
	TLSYNC_PROTOCOL_VERSION,
} from './protocol'

export type PushOp<R extends UnknownRecord> = {
	pushId: string
	changes: Changes<R>
	diff: NetworkDiff<R>
}

type ClockSnapshot = {
	id: string
	epoch: number
}

type SatisfiedPushes = { [clientId: string]: string[] }
type PushId = {
	clientId: string
	pushId: string
}

function addPush(satisfiedPushes: SatisfiedPushes, pushId?: PushId): SatisfiedPushes {
	if (!pushId) return satisfiedPushes
	const satisfied = satisfiedPushes[pushId.clientId] as string[] | undefined
	if (satisfied?.includes(pushId.pushId)) return satisfiedPushes

	return { ...satisfiedPushes, [pushId.clientId]: [...(satisfied ?? []), pushId.pushId] }
}

type RecordWithTimestamp<R extends UnknownRecord> = {
	state: R
	lastUpdatedAt: number
}
type RecordAtom<R extends UnknownRecord> = Atom<RecordWithTimestamp<R>>

type ApplyStack<R extends UnknownRecord> = {
	changes: Changes<R>
	source: ChangeSource
	below: ApplyStack<R> | null
}

type UpstreamConnectionState =
	| {
			type: 'connected'
			hasSentFirstMessage: boolean
			lastPongTime: number
	  }
	| {
			type: 'awaiting-reconnect'
			spanId: string
	  }
	| {
			type: 'offline'
			lastCheckTime: number
	  }
	| {
			type: 'initial'
	  }

type PresenceRecordInfo<R extends UnknownRecord> = {
	clientId: string
	maskedId: IdOf<R>
	unmaskedId: IdOf<R>
}
type PresenceOwnership<R extends UnknownRecord> = {
	clientId2MaskedIds: Record<string, IdOf<R>[]>
	presenceId2Info: Record<string, PresenceRecordInfo<R>>
}

function addPresenceOwnership<R extends UnknownRecord>(
	presenceOwnership: PresenceOwnership<R>,
	clientId: string,
	unmaskedPresenceId: IdOf<R>
): [PresenceOwnership<R>, IdOf<R>] {
	{
		const info = presenceOwnership.presenceId2Info[unmaskedPresenceId]
		if (info) {
			return [presenceOwnership, info.maskedId]
		}
	}
	const typename = unmaskedPresenceId.split(':')[0]
	const maskedId = (typename + ':' + nanoid()) as IdOf<R>

	const info: PresenceRecordInfo<R> = {
		clientId,
		maskedId,
		unmaskedId: unmaskedPresenceId,
	}
	return [
		{
			clientId2MaskedIds: {
				...presenceOwnership.clientId2MaskedIds,
				[clientId]: [...(presenceOwnership.clientId2MaskedIds[clientId] ?? []), maskedId],
			},
			presenceId2Info: {
				...presenceOwnership.presenceId2Info,
				[unmaskedPresenceId]: info,
				[maskedId]: info,
			},
		},
		maskedId,
	]
}

function removePresenceOwnership<R extends UnknownRecord>(
	presenceOwnership: PresenceOwnership<R>,
	presenceId: IdOf<R>
): PresenceOwnership<R> {
	const info = presenceOwnership.presenceId2Info[presenceId]
	if (!info) return presenceOwnership
	const presenceId2Info = omit(presenceOwnership.presenceId2Info, [info.unmaskedId, info.maskedId])
	const maskedIdsForClient = presenceOwnership.clientId2MaskedIds[info.clientId].filter(
		(id) => id !== info.maskedId
	)

	if (maskedIdsForClient.length === 0) {
		return {
			clientId2MaskedIds: omit(presenceOwnership.clientId2MaskedIds, info.clientId),
			presenceId2Info,
		}
	} else {
		return {
			clientId2MaskedIds: {
				...presenceOwnership.clientId2MaskedIds,
				[info.clientId]: maskedIdsForClient,
			},
			presenceId2Info,
		}
	}
}

function removeClientOwnership<R extends UnknownRecord>(
	presenceOwnership: PresenceOwnership<R>,
	clientId: string
): PresenceOwnership<R> {
	const maskedIds = presenceOwnership.clientId2MaskedIds[clientId]
	if (!maskedIds) return presenceOwnership
	const infos = maskedIds.map((id) => presenceOwnership.presenceId2Info[id])
	return {
		clientId2MaskedIds: omit(presenceOwnership.clientId2MaskedIds, clientId),
		presenceId2Info: omit(presenceOwnership.presenceId2Info, [
			...maskedIds,
			...infos.map((i) => i.unmaskedId),
		]),
	}
}

/**
 * A serialized snapshot of the record store's values.
 *
 * @public
 */
export type SyncStoreSnapshot<R extends UnknownRecord> = {
	synced: {
		upstreamClock: number
		records: Record<string, { state: R; lastUpdatedAt: number }>
		tombstones: {
			deletions: Record<string, number>
			historyStartsAt: number
		}
	}
	pending?: Changes<R>
	clock: ClockSnapshot
}

/** @internal */
export type StoreRecord<S extends SyncStore<any>> = S extends SyncStore<infer R> ? R : never

export enum DownstreamClientState {
	AWAITING_CONNECT_MESSAGE = 'awaiting-connect-message',
	AWAITING_REMOVAL = 'awaiting-removal',
	CONNECTED = 'connected',
}

const timeSince = (time: number) => Date.now() - time

export const SESSION_START_WAIT_TIME = 10000
export const SESSION_REMOVAL_WAIT_TIME = 10000
export const SESSION_IDLE_TIMEOUT = 20000

export type DownstreamClient<R extends UnknownRecord> =
	| {
			state: DownstreamClientState.AWAITING_CONNECT_MESSAGE
			clientId: string
			socket: GoingDownstreamSocket<R>
			sessionStartTime: number
	  }
	| {
			state: DownstreamClientState.AWAITING_REMOVAL
			clientId: string
			socket: GoingDownstreamSocket<R>
			cancellationTime: number
	  }
	| {
			state: DownstreamClientState.CONNECTED
			clientId: string
			socket: GoingDownstreamSocket<R>
			serializedSchema: SerializedSchema
			lastInteractionTime: number
	  }

/**
 * A store of records.
 *
 * @public
 */
export class SyncStore<R extends UnknownRecord = UnknownRecord> {
	readonly scopedTypes: {
		document: ReadonlySet<string>
		session: ReadonlySet<string>
	}
	readonly presenceType: RecordType<R, never>
	readonly presenceTypePrefix: string
	readonly serializedSchema: SerializedSchema
	readonly myPresenceId: string
	constructor(
		private readonly schema: StoreSchema<R>,
		private readonly upstream: GoingUpstreamSocket<R> | undefined,
		private readonly localPresence: Signal<R>,
		private readonly onAfterConnect: ((store: SyncStore<R>) => void) | undefined,
		snapshot: SyncStoreSnapshot<R>
	) {
		if (snapshot) {
			// TODO: migrations
			this.prevClock = snapshot.clock
		}

		this.scopedTypes = {
			document: new Set(
				objectMapValues(this.schema.types)
					.filter((t) => t.scope === 'document')
					.map((t) => t.typeName)
			),
			session: new Set(
				objectMapValues(this.schema.types)
					.filter((t) => t.scope === 'session')
					.map((t) => t.typeName)
			),
		}
		const presenceTypes = new Set(
			objectMapValues(this.schema.types)
				.filter((t) => t.scope === 'presence')
				.map((t) => t.typeName)
		)
		if (presenceTypes.size !== 1) {
			throw new Error('Exactly one presence type must be defined')
		}
		this.presenceType = schema.types[[...presenceTypes][0]] as any
		this.presenceTypePrefix = `${this.presenceType.typeName}:`
		this.serializedSchema = this.schema.serialize()
		this.myPresenceId = this.presenceType.createId(this.storeInstanceId)
		this.disposables.add(
			react('store.localPresence', () =>
				this.set({
					...this.localPresence.value,
					id: this.myPresenceId,
					typeName: this.presenceType.typeName,
				})
			)
		)
		if (this.upstream) {
			this.disposables.add(
				this.upstream.onStatusChange((isOpen) => {
					if (isOpen) {
						this.sendUpstreamConnectRequest()
					} else {
						this.resetConnection()
					}
				})
			)
		}
	}

	private readonly prevClock: ClockSnapshot | undefined
	private readonly clock = atom('store.clock', 0)
	private readonly storeInstanceId = nanoid()

	private readonly synced = {
		upstreamClock: atom('store.synced.clock', 0),
		records: atom('store.synced.records', {} as Record<string, RecordAtom<R>>),
		tombstones: atom('synced.tombstones', {
			historyStartsAt: 0,
			deletions: {} as Record<string, number>,
		}), // todo: this should be a cheap sorted map
	}
	private readonly pending = {
		records: atom('store.pending.records', {} as Record<string, RecordAtom<R>>),
		tombstones: atom('store.pending.tombstones', {} as Record<string, number>), // todo: this should be a cheap sorted map
		pushes: atom('store.pending.pushes', [] as PushOp<R>[]),
		pendingPushChanges: atom('store.pending.pendingPushChanges', {} as Changes<R>),
	}
	private readonly presenceOwnership = atom<PresenceOwnership<R>>('store.presenceOwnership', {
		clientId2MaskedIds: {},
		presenceId2Info: {},
	})
	private readonly downstreamClients = new Map<string, DownstreamClient<R>>()
	private readonly disposables = new Set<() => void>()

	pruneSessions = () => {
		for (const client of this.downstreamClients.values()) {
			switch (client.state) {
				case DownstreamClientState.CONNECTED: {
					const hasTimedOut = timeSince(client.lastInteractionTime) > SESSION_IDLE_TIMEOUT
					if (hasTimedOut || !client.socket.isOpen) {
						this.markClientForRemoval(client.clientId)
					}
					break
				}
				case DownstreamClientState.AWAITING_CONNECT_MESSAGE: {
					const hasTimedOut = timeSince(client.sessionStartTime) > SESSION_START_WAIT_TIME
					if (hasTimedOut || !client.socket.isOpen) {
						// remove immediately
						this.removeClient(client.clientId)
					}
					break
				}
				case DownstreamClientState.AWAITING_REMOVAL: {
					const hasTimedOut = timeSince(client.cancellationTime) > SESSION_REMOVAL_WAIT_TIME
					if (hasTimedOut) {
						this.removeClient(client.clientId)
					}
					break
				}
				default: {
					exhaustiveSwitchError(client)
				}
			}
		}
	}

	close() {
		this.disposables.forEach((d) => d())
	}

	/**
	 * When a client connects to the room, add them to the list of clients and then merge the history
	 * down into the snapshots.
	 *
	 * @param client - The client that connected to the room.
	 */
	addClient = (clientId: string, socket: GoingDownstreamSocket<R>) => {
		const unlisten = socket.onMessage((message) => {
			this.handleMessageFromDownstream(clientId, message)
		})
		this.downstreamClients.set(clientId, {
			state: DownstreamClientState.AWAITING_CONNECT_MESSAGE,
			clientId,
			socket,
			sessionStartTime: Date.now(),
			// TODO unlisten,
		})
		this.disposables.add(unlisten)
		return this
	}

	/**
	 * When the server receives a message from the clients Currently supports connect and patches.
	 * Invalid messages types log a warning. Currently doesn't validate data.
	 *
	 * @param client - The client that sent the message
	 * @param message - The message that was sent
	 */
	private handleMessageFromDownstream(clientId: string, message: GoingUpstreamMessage<R>) {
		const client = this.downstreamClients.get(clientId)
		if (!client) {
			console.warn('Received message from unknown client')
			return
		}
		switch (message.type) {
			case 'connect':
				return this.handleConnectRequest(client, message)
			case 'push':
				return this.handlePushRequest(client, message)
			case 'ping': {
				if (client.state === DownstreamClientState.CONNECTED) {
					client.lastInteractionTime = Date.now()
				}
				return this.sendDownstreamMessage(clientId, { type: 'pong' })
			}
			default:
				exhaustiveSwitchError(message)
		}
	}

	handleMessageFromUpstream = async (message: GoingDownstreamMessage<R>) => {
		switch (message.type) {
			case 'error': {
				console.error('Received error from upstream', message)
				// todo: handle error
				break
			}
			case 'incompatibility_error': {
				console.error('Received incompatibility error from upstream', message)
				// todo: handle error
				break
			}
			case 'connect': {
				this.didReconnect(message)
				break
			}
			case 'patch': {
				this.incomingFromUpstreamPatchBuffer.update((buffer) => [...buffer, message])
				this.scheduleRebase()
				break
			}
			case 'pong': {
				// noop
				break
			}
			default: {
				exhaustiveSwitchError(message)
			}
		}
	}

	readonly upstreamConnectionState = atom<UpstreamConnectionState>('upstream.connectionState', {
		type: 'initial',
	})

	private sendUpstreamConnectRequest() {
		transact(() => {
			if (!this.upstream) {
				console.error('sendUpstreamConnectRequest called while not connected to upstream')
				return
			}
			const spanId = nanoid()

			this.upstreamConnectionState.set({
				type: 'awaiting-reconnect',
				spanId,
			})

			this.upstream.sendMessage({
				type: 'connect',
				protocolVersion: TLSYNC_PROTOCOL_VERSION,
				schema: this.serializedSchema,
				lastUpstreamClock: this.synced.upstreamClock.value,
				spanId,
			})
		})
	}

	/** Switch to offline mode */
	private resetConnection(hard = false) {
		transact(() => {
			if (!this.upstream) {
				console.error('resetConnection called while not connected to upstream')
				return
			}
			if (hard) {
				// reset the clock so that next time we get the full history
				this.synced.upstreamClock.set(0)
			}
			this.upstreamConnectionState.set({
				type: 'offline',
				lastCheckTime: Date.now(),
			})
			// apply any unapplied incoming patches to clear the incoming buffer
			this.rebase()
			// squash pending ops into one unsent push so that next time we reconnect we send the full state
			const sentChanges = this.pending.pushes.value.reduce(
				(acc, push) => mergeChanges(acc, push.changes, true),
				{}
			)
			this.pending.pendingPushChanges.set(
				mergeChanges(sentChanges, this.pending.pendingPushChanges.value)
			)
			this.pending.pushes.set([])
			if (this.upstream.isOpen()) {
				this.upstream.reopen()
			}
		})
	}

	private didReconnect(message: GoingDownstreamConnectMessage<R>) {
		const upstreamConnectionState = this.upstreamConnectionState.value
		if (upstreamConnectionState.type !== 'awaiting-reconnect') {
			console.error('didReconnect called while not awaiting reconnect')
			this.resetConnection()
			return
		}
		if (upstreamConnectionState.spanId !== message.spanId) {
			// ignore connect events for old connect requests
			console.warn('Ignoring connect event for old connect request')
			return
		}

		// at the end of this process we want to have at most one pending push request
		// based on anything inside this.speculativeChanges
		transact(() => {
			// Now our goal is to rebase on the server's state.
			// This means wiping away any upstream presence data, which the server will replace in full on every connect.
			// If the server does not have enough history to give us a partial document state hydration we will
			// also need to wipe away all of our document state before hydrating with the server's state from scratch.

			const nextClock = this.incrementClock()
			const presenceInfo = this.presenceOwnership.value.presenceId2Info

			const deleteAll = message.hydrationType === 'wipe_all'

			for (const [id, recordAtom] of Object.entries(this.synced.records.value)) {
				const isUpstreamPresence =
					id !== this.myPresenceId && id.startsWith(this.presenceTypePrefix) && !presenceInfo[id]
				const isDocumentState = this.scopedTypes.document.has(recordAtom.value.state.typeName)
				if (isUpstreamPresence || (deleteAll && isDocumentState)) {
					this.deleteSynced(id, nextClock)
				}
			}

			this.syncUpstreamPatch(message.diff)

			this.upstreamConnectionState.set({
				type: 'connected',
				hasSentFirstMessage: false,
				lastPongTime: Date.now(),
			})
			this.synced.upstreamClock.set(message.upstreamClock)

			this.onAfterConnect?.(this)
		})
	}

	/** If the client is out of date or we are out of date, we need to let them know */
	private rejectClient(client: DownstreamClient<R>, reason: TLIncompatibilityReason) {
		try {
			if (client.socket.isOpen()) {
				client.socket.sendMessage({
					type: 'incompatibility_error',
					reason,
				})
			}
		} catch (e) {
			// noop
		} finally {
			this.removeClient(client.clientId)
		}
	}

	/**
	 * When we send a diff to a client, if that client is on a lower version than us, we need to make
	 * the diff compatible with their version. At the moment this means migrating each affected record
	 * to the client's version and sending the whole record again. We can optimize this later by
	 * keeping the previous versions of records around long enough to recalculate these diffs for
	 * older client versions.
	 */
	private migrateDiffForClient(
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
			if (op[0] === RecordOpType.Delete) {
				result[id] = op
				continue
			}

			const migrationResult = this.schema.migratePersistedRecord(
				this.synced.records.value[id]?.value.state,
				serializedSchema,
				'down'
			)

			if (migrationResult.type === 'error') {
				return Result.err(migrationResult.reason)
			}

			result[id] = [RecordOpType.Set, migrationResult.value]
		}

		return Result.ok(result)
	}

	private handleConnectRequest(
		client: DownstreamClient<R>,
		message: Extract<GoingUpstreamMessage<R>, { type: 'connect' }>
	) {
		// if the protocol versions don't match, disconnect the client
		// we will eventually want to try to make our protocol backwards compatible to some degree
		// and have a MIN_PROTOCOL_VERSION constant that the TLSyncRoom implements support for
		if (message.protocolVersion == null || message.protocolVersion < TLSYNC_PROTOCOL_VERSION) {
			this.rejectClient(client, TLIncompatibilityReason.ClientTooOld)
			return
		} else if (message.protocolVersion > TLSYNC_PROTOCOL_VERSION) {
			this.rejectClient(client, TLIncompatibilityReason.ServerTooOld)
			return
		}
		// If the client's store is at a different version to ours, it could cause corruption.
		// We should disconnect the client and ask them to refresh.
		if (message.schema == null || message.schema.storeVersion < this.schema.currentStoreVersion) {
			this.rejectClient(client, TLIncompatibilityReason.ClientTooOld)
			return
		} else if (message.schema.storeVersion > this.schema.currentStoreVersion) {
			this.rejectClient(client, TLIncompatibilityReason.ServerTooOld)
			return
		}

		const sessionSchema = isEqual(message.schema, this.serializedSchema)
			? this.serializedSchema
			: message.schema

		const connect = (msg: GoingDownstreamMessage<R>) => {
			this.downstreamClients.set(client.clientId, {
				state: DownstreamClientState.CONNECTED,
				clientId: client.clientId,
				socket: client.socket,
				serializedSchema: sessionSchema,
				lastInteractionTime: Date.now(),
			})
			this.sendDownstreamMessage(client.clientId, msg)
		}

		transaction((rollback) => {
			if (
				// if the client requests changes since a time before we have tombstone history, send them the full state
				message.lastUpstreamClock < this.synced.tombstones.value.historyStartsAt ||
				// similarly, if they ask for a time we haven't reached yet, send them the full state
				// this will only happen if the DB is reset (or there is no db) and the server restarts
				// or if the server exits/crashes with unpersisted changes
				message.lastUpstreamClock > this.clock.value
			) {
				const migrated = this.migrateDiffForClient(
					sessionSchema,
					Object.fromEntries(
						Object.values(this.synced.records.value).map((doc) => [
							doc.value.state.id,
							[RecordOpType.Set, doc.value.state],
						])
					)
				)
				if (!migrated.ok) {
					rollback()
					this.rejectClient(
						client,
						migrated.error === MigrationFailureReason.TargetVersionTooNew
							? TLIncompatibilityReason.ServerTooOld
							: TLIncompatibilityReason.ClientTooOld
					)
					return
				}
				connect({
					type: 'connect',
					spanId: message.spanId,
					hydrationType: 'wipe_all',
					protocolVersion: TLSYNC_PROTOCOL_VERSION,
					schema: this.schema.serialize(),
					upstreamClock: this.clock.value,
					diff: migrated.value,
				})
			} else {
				// calculate the changes since the time the client last saw
				const diff: NetworkDiff<R> = {}
				for (const doc of Object.values(this.synced.records.value)) {
					const { state, lastUpdatedAt } = doc.value
					if (
						state.typeName === this.presenceType.typeName ||
						lastUpdatedAt > message.lastUpstreamClock
					) {
						diff[state.id] = [RecordOpType.Set, state]
					}
				}

				for (const [id, deletedAt] of Object.entries(this.synced.tombstones.value.deletions)) {
					if (deletedAt > message.lastUpstreamClock) {
						diff[id] = [RecordOpType.Delete]
					}
				}
				const migrated = this.migrateDiffForClient(sessionSchema, diff)
				if (!migrated.ok) {
					rollback()
					this.rejectClient(
						client,
						migrated.error === MigrationFailureReason.TargetVersionTooNew
							? TLIncompatibilityReason.ServerTooOld
							: TLIncompatibilityReason.ClientTooOld
					)
					return
				}

				connect({
					type: 'connect',
					spanId: message.spanId,
					hydrationType: 'wipe_presence',
					schema: this.schema.serialize(),
					protocolVersion: TLSYNC_PROTOCOL_VERSION,
					upstreamClock: this.clock.value,
					diff: migrated.value,
				})
			}
		})
	}

	private handlePushRequest(client: DownstreamClient<R>, message: GoingUpstreamPushMessage<R>) {
		if (client.state !== DownstreamClientState.CONNECTED) {
			return
		}
		client.lastInteractionTime = Date.now()

		const pushId: PushId | undefined =
			message.type === 'push'
				? {
						pushId: message.pushId,
						clientId: client.clientId,
				  }
				: undefined

		// increment the clock for this push
		transaction((rollback) => {
			const fail = (reason: TLIncompatibilityReason): Result<void, void> => {
				rollback()
				this.rejectClient(client, reason)
				if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
					console.error('failed to apply push', reason, message)
				}
				return Result.err(undefined)
			}

			const addDocument = (_state: R): Result<void, void> => {
				const res = this.schema.migratePersistedRecord(_state, client.serializedSchema, 'up')
				if (res.type === 'error') {
					return fail(
						res.reason === MigrationFailureReason.TargetVersionTooOld // target version is our version
							? TLIncompatibilityReason.ServerTooOld
							: TLIncompatibilityReason.ClientTooOld
					)
				}
				const state = res.value
				try {
					this.set(state, pushId)
				} catch (e) {
					return fail(TLIncompatibilityReason.InvalidRecord)
				}

				return Result.ok(undefined)
			}

			const patchDocument = (id: string, patch: ObjectDiff): Result<void, void> => {
				// if it was already deleted, there's no need to apply the patch
				const state = this.get(id)
				if (!state) return Result.ok(undefined)
				const theirVersion = getRecordVersion(state, client.serializedSchema)
				const ourVersion = getRecordVersion(state, this.serializedSchema)
				if (compareRecordVersions(ourVersion, theirVersion) === 1) {
					// if the client's version of the record is older than ours, we apply the patch to the downgraded version of the record
					const downgraded = this.schema.migratePersistedRecord(
						state,
						client.serializedSchema,
						'down'
					)
					if (downgraded.type === 'error') {
						return fail(TLIncompatibilityReason.ClientTooOld)
					}
					const patched = applyObjectDiff(downgraded.value, patch)
					// then upgrade the patched version and use that as the new state
					const upgraded = this.schema.migratePersistedRecord(
						patched,
						client.serializedSchema,
						'up'
					)
					if (upgraded.type === 'error') {
						return fail(TLIncompatibilityReason.ClientTooOld)
					}
					try {
						this.set(upgraded.value, pushId)
					} catch (e) {
						return fail(TLIncompatibilityReason.InvalidRecord)
					}
				} else if (compareRecordVersions(ourVersion, theirVersion) === -1) {
					// if the client's version of the record is newer than ours, we can't apply the patch
					return fail(TLIncompatibilityReason.ServerTooOld)
				} else {
					// otherwise apply the patch and propagate the patch op if needed
					try {
						this.set(applyObjectDiff(state, patch), pushId)
					} catch (e) {
						return fail(TLIncompatibilityReason.InvalidRecord)
					}
				}

				return Result.ok(undefined)
			}

			const diff = message.diff
			for (const [id, op] of Object.entries(diff)) {
				if (op[0] === RecordOpType.Set) {
					// if it's not a document record, fail
					if (!addDocument(op[1]).ok) return
				} else if (op[0] === RecordOpType.Delete) {
					this.delete(id, pushId)
				} else if (op[0] === RecordOpType.Patch) {
					if (!patchDocument(id, op[1]).ok) return
				}
			}
		})
	}

	private markClientForRemoval(clientId: string) {
		const client = this.downstreamClients.get(clientId)
		if (!client) {
			return
		}

		if (client.state === DownstreamClientState.AWAITING_REMOVAL) {
			console.warn('Tried to cancel session that is already awaiting removal')
			return
		}

		this.downstreamClients.set(clientId, {
			state: DownstreamClientState.AWAITING_REMOVAL,
			clientId,
			socket: client.socket,
			cancellationTime: Date.now(),
		})
	}

	private removeClient(clientId: string) {
		const client = this.downstreamClients.get(clientId)
		if (!client) {
			console.warn('Tried to remove unknown session')
			return
		}

		this.downstreamClients.delete(clientId)

		try {
			if (client.socket.isOpen()) {
				client.socket.close()
			}
		} catch (_e) {
			// noop
		}

		this.presenceOwnership.update((ownership) => removeClientOwnership(ownership, clientId))

		// this.events.emit('session_removed', { sessionKey: clientId })
		// if (this.sessions.size === 0) {
		// 	this.events.emit('room_became_empty')
		// }
	}

	/**
	 * Send a message to a particular client.
	 *
	 * @param client - The client to send the message to.
	 * @param message - The message to send.
	 */
	private sendDownstreamMessage(clientId: string, message: GoingDownstreamMessage<R>) {
		const session = this.downstreamClients.get(clientId)
		if (!session) {
			console.warn('Tried to send message to unknown session', message.type)
			return
		}
		if (session.state !== DownstreamClientState.CONNECTED) {
			console.warn('Tried to send message to disconnected client', message.type)
			return
		}
		if (session.socket.isOpen()) {
			try {
				session.socket.sendMessage(message)
			} catch (e) {
				this.markClientForRemoval(session.clientId)
			}
		} else {
			this.markClientForRemoval(session.clientId)
		}
	}

	private readonly incomingFromUpstreamPatchBuffer = atom(
		'store.incomingPatchBuffer',
		[] as GoingDownstreamPatchMessage<R>[]
	)

	private readonly goingDownstreamPatchBuffer = atom<{
		touchedRecords: Record<string, null | R>
		satisfiedPushes: SatisfiedPushes
	}>('store.outgoingPatchBuffer', { touchedRecords: {}, satisfiedPushes: {} })

	private recordWillBeTouched(id: string, pushId?: PushId) {
		if (this.downstreamClients.size === 0) return

		const hasIdBeenTouchedAlready =
			typeof this.goingDownstreamPatchBuffer.value.touchedRecords[id] === 'undefined'

		this.goingDownstreamPatchBuffer.update(({ touchedRecords, satisfiedPushes }) => {
			return {
				touchedRecords: hasIdBeenTouchedAlready
					? touchedRecords
					: {
							...touchedRecords,
							[id]: this.get(id) ?? null,
					  },
				satisfiedPushes: addPush(satisfiedPushes, pushId),
			}
		})

		this.scheduleBroadcastPatches()
	}

	private getLastChangedTimestamp(id: string): undefined | number {
		const recordTimestamp = this.getRecordWithTimestamp(id)?.lastUpdatedAt
		if (recordTimestamp) return recordTimestamp
		const tombstoneTimestamp =
			this.pending.tombstones.value[id] ?? this.synced.tombstones.value.deletions[id]
		return tombstoneTimestamp
	}

	private getRecordWithTimestamp(id: string): RecordWithTimestamp<R> | undefined {
		if (!this.upstream) {
			return this.synced.records.value[id].value
		}
		const pendingRecord = this.pending.records.value[id]?.value
		if (pendingRecord) return pendingRecord
		const hasPendingDeletion = !!this.pending.tombstones.value[id]
		if (hasPendingDeletion) return undefined

		return this.synced.records.value[id]?.value
	}

	get(id: string): R | undefined
	get(id: IdOf<R>): R | undefined {
		return this.getRecordWithTimestamp(id)?.state
	}

	private maskDownstreamPresence(record: R, clientId: string): R {
		if (record.typeName !== this.presenceType.typeName) return record
		const presenceInfo = this.presenceOwnership.value.presenceId2Info[record.id]
		if (!presenceInfo) {
			const [nextOwnership, maskedId] = addPresenceOwnership(
				this.presenceOwnership.value,
				clientId,
				record.id
			)
			this.presenceOwnership.set(nextOwnership)
			return { ...record, id: maskedId }
		}
		return record.id === presenceInfo.maskedId ? record : { ...record, id: presenceInfo.maskedId }
	}

	private setSynced(record: R, nextClock: number, pushId?: PushId) {
		const id = record.id
		this.recordWillBeTouched(id, pushId)
		const existingAtom = this.synced.records.value[id]
		if (existingAtom) {
			existingAtom.set({ state: record, lastUpdatedAt: nextClock })
		} else {
			const newAtom = atom('synced.records.' + id, { state: record, lastUpdatedAt: nextClock })
			this.synced.records.set({ ...this.synced.records.value, [id]: newAtom })
			if (this.synced.tombstones.value.deletions[id]) {
				this.synced.tombstones.update(
					({ deletions: { [id]: _, ...deletions }, historyStartsAt }) => ({
						historyStartsAt,
						deletions,
					})
				)
			}
		}
	}

	private addPushOp(cb: (changes: Changes<R>) => Changes<R>) {
		this.pending.pendingPushChanges.update((prev) => cb(prev))
		this.schedulePush()
	}

	private incrementClock(): number {
		return this.clock.update((prev) => prev + 1)
	}

	private setPending(record: R, nextClock: number, push: boolean, pushId?: PushId) {
		const id = record.id
		this.recordWillBeTouched(id, pushId)
		const existingAtom = this.pending.records.value[id]
		const prevState = existingAtom?.value.state as R | undefined
		if (existingAtom) {
			existingAtom.set({ state: record, lastUpdatedAt: nextClock })
		} else {
			this.pending.records.set({
				...this.pending.records.value,
				[id]: atom('pending.records.' + id, { state: record, lastUpdatedAt: nextClock }),
			})
			if (this.pending.tombstones.value[id]) {
				this.pending.tombstones.update(({ [id]: _, ...tombstones }) => tombstones)
			}
		}
		if (!push) return

		this.addPushOp((changes) => addSetChange(changes, prevState, record, nextClock))
	}

	private getInitialPresenceDiff() {
		const allMaskedIds = Object.values(this.presenceOwnership.value.clientId2MaskedIds).flat()

		if (allMaskedIds.length === 0) return null

		const result: NetworkDiff<R> = {}

		for (const maskedId of allMaskedIds) {
			const record = this.getRecordWithTimestamp(maskedId)
			if (!record) continue
			result[maskedId] = [RecordOpType.Set, record.state]
		}

		return result
	}

	private push = () => {
		transact(() => {
			if (!this.upstream) {
				console.error('push called while not connected to upstream')
				return
			}
			const connectionState = this.upstreamConnectionState.value
			if (connectionState.type !== 'connected') {
				return
			}
			// if we have not sent a first message yet, make sure we send full pushes for all presence records
			const changes = this.pending.pendingPushChanges.value
			this.pending.pendingPushChanges.set({})
			const docDiff = getNetworkDiff(changes)
			const initialPresenceDiff = connectionState.hasSentFirstMessage
				? null
				: this.getInitialPresenceDiff()
			if (!docDiff && !initialPresenceDiff) return

			const diff: NetworkDiff<R> = {
				...(docDiff ?? {}),
				...(initialPresenceDiff ?? {}),
			}

			const pushId = nanoid()
			this.pending.pushes.update((prev) => [
				...prev,
				{
					pushId,
					changes,
					diff,
				},
			])
			this.upstream.sendMessage({
				type: 'push',
				diff,
				pushId,
			})
		})
	}

	private readonly schedulePush = rafThrottle(this.push)

	set(record: R, pushId?: PushId): void {
		transact(() => {
			if (pushId) {
				record = this.maskDownstreamPresence(record, pushId.clientId)
			}
			if (!this.upstream || this.scopedTypes.session.has(record.typeName)) {
				this.setSynced(record, this.incrementClock(), pushId)
				return
			}

			this.setPending(record, this.incrementClock(), true, pushId)
		})
	}

	private deleteSynced(id: string, nextClock: number, pushId?: PushId) {
		this.recordWillBeTouched(id, pushId)
		const existingAtom = this.synced.records.value[id]
		if (!existingAtom) return

		this.synced.records.update(({ [id]: _, ...records }) => records)
		this.synced.tombstones.set({
			deletions: { ...this.synced.tombstones.value.deletions, [id]: nextClock },
			historyStartsAt: this.synced.tombstones.value.historyStartsAt,
		})
	}

	private deletePending(id: string, nextClock: number, push: boolean, pushId?: PushId) {
		this.recordWillBeTouched(id, pushId)
		const pendingRecordAtom = this.pending.records.value[id]
		const syncedRecordAtom = this.synced.records.value[id]
		// check whether there is anything to delete
		if (!pendingRecordAtom && !syncedRecordAtom) return

		const record = pendingRecordAtom?.value.state || syncedRecordAtom?.value.state

		if (pendingRecordAtom) {
			// remove the pending atom
			this.pending.records.update(({ [id]: _, ...recordAtoms }) => recordAtoms)
		}
		if (syncedRecordAtom) {
			// add a pending tombstone if there is a synced atom so we know it has been deleted
			this.pending.tombstones.set({ ...this.pending.tombstones.value, [id]: nextClock })
		}

		if (!push) return

		this.addPushOp((changes) => addDeleteChange(changes, record, nextClock))
	}

	delete(id: string, pushId?: PushId): void {
		transact(() => {
			if (pushId && id.startsWith(this.presenceTypePrefix)) {
				const info = this.presenceOwnership.value.presenceId2Info[id]
				if (info) {
					id = info.maskedId
					this.presenceOwnership.update((ownership) =>
						removePresenceOwnership(ownership, id as IdOf<R>)
					)
				}
			}
			const typeName = id.slice(0, id.indexOf(':'))
			if (!this.upstream || this.scopedTypes.session.has(typeName)) {
				this.deleteSynced(id, this.incrementClock(), pushId)
				return
			}

			this.deletePending(id, this.incrementClock(), true, pushId)
		})
	}

	getSnapshot(): SyncStoreSnapshot<R> {
		return {
			synced: {
				upstreamClock: this.synced.upstreamClock.value,
				records: Object.fromEntries(
					Object.entries(this.synced.records.value).map(([key, atom]) => [key, atom.value])
				),
				tombstones: this.synced.tombstones.value,
			},
			pending: this.upstream
				? this.pending.pushes.value.reduce(
						(changes, op) => mergeChanges(changes, op.changes, true),
						{}
				  )
				: undefined,
			clock: {
				id: this.storeInstanceId,
				epoch: this.clock.value,
			},
		}
	}

	private syncUpstreamPatch(diff: NetworkDiff<R>) {
		transact(() => {
			const nextClock = this.incrementClock()

			for (const [id, op] of Object.entries(diff)) {
				const existingRecord = this.synced.records.value[id]?.value.state as R | undefined
				switch (op[0]) {
					case RecordOpType.Set: {
						this.setSynced(op[1], nextClock)
						break
					}
					case RecordOpType.Patch: {
						if (!existingRecord) throw new Error(`Cannot patch non-existent record ${id}`)
						this.setSynced(applyObjectDiff(existingRecord, op[1]), nextClock)
						break
					}
					case RecordOpType.Delete: {
						if (!existingRecord) throw new Error(`Cannot delete non-existent record ${id}`)
						this.deleteSynced(id, nextClock)
						break
					}
					default:
						exhaustiveSwitchError(op)
				}
			}
		})
	}

	applyStack = null as null | ApplyStack<R>

	private consumePendingOp(id: string) {
		let stack = this.applyStack
		while (stack) {
			const op = stack.changes[id]
			if (op) {
				delete stack.changes[id]
				return this.applyOp(op)
			}
			stack = stack.below
		}
		return null
	}

	private applyOp(op: ChangeOp<R>) {
		switch (op.op) {
			case ChangeOpType.Set:
				this.set(op.record)
				break
			case ChangeOpType.Delete:
				this.delete(op.record.id)
				break
			default:
				exhaustiveSwitchError(op)
		}
	}

	private applyChanges(changes: Changes<R>, source: ChangeSource) {
		try {
			this.applyStack = { changes, source, below: this.applyStack }
			const changedIds = Object.keys(changes)
			transact(() => {
				for (const id of changedIds) {
					this.consumePendingOp(id)
				}
			})
		} finally {
			this.applyStack = this.applyStack?.below ?? null
		}
	}

	private reapplyPendingChanges(changes: Changes<R>) {
		let nextClock = undefined as undefined | number
		const getNextClock = () => {
			if (nextClock === undefined) {
				nextClock = this.incrementClock()
			}
			return nextClock
		}

		for (const change of Object.values(changes)) {
			// if the record was altered beneath this pending change, we need to update the timestamp to make sure
			// it remains up-to-date after the change is applied
			const lastChanged = this.getLastChangedTimestamp(change.record.id)
			let clock =
				lastChanged !== undefined && lastChanged > change.clock ? getNextClock() : change.clock
			switch (change.op) {
				case ChangeOpType.Set: {
					let record = change.record
					if (change.prev) {
						const diff = diffRecord(change.prev, change.record)
						if (diff) {
							record = applyObjectDiff(this.get(record.id) ?? change.prev, diff)
						}
						// if applying the diff to the current state produces a different record, we need to make sure the timestamp
						// is bumped
						if (!isEqual(record, change.record)) {
							clock = getNextClock()
						}
					}
					this.setPending(record, clock, false)
					break
				}
				case ChangeOpType.Delete:
					this.deletePending(change.record.id, clock, false)
					break
				default:
					exhaustiveSwitchError(change)
			}
		}
	}

	private broadcastPatches = () => {
		if (this.downstreamClients.size === 0) {
			this.goingDownstreamPatchBuffer.set({ touchedRecords: {}, satisfiedPushes: {} })
			return
		}

		const { touchedRecords, satisfiedPushes } = this.goingDownstreamPatchBuffer.value
		this.goingDownstreamPatchBuffer.set({ touchedRecords: {}, satisfiedPushes: {} })

		const diff: NetworkDiff<R> = {}

		for (const [id, prev] of Object.entries(touchedRecords)) {
			const next = this.get(id)
			if (prev && !next) {
				diff[id] = [RecordOpType.Delete]
			} else if (!prev && next) {
				diff[id] = [RecordOpType.Set, next]
			} else if (prev && next) {
				const patch = diffRecord(prev, next)
				if (patch) {
					diff[id] = [RecordOpType.Patch, patch]
				}
			}
		}

		for (const client of this.downstreamClients.values()) {
			let clientSpecificDiff = undefined as undefined | NetworkDiff<R>

			// remove any of the client's own presence records from the diff
			for (const maskedId of this.presenceOwnership.value.clientId2MaskedIds[client.clientId] ??
				[]) {
				if (maskedId in diff) {
					clientSpecificDiff ??= { ...diff }
					delete clientSpecificDiff[maskedId]
				}
			}

			this.sendDownstreamMessage(client.clientId, {
				type: 'patch',
				diff: clientSpecificDiff ?? diff,
				serverClock: this.clock.value,
				satisfiedPushIds: satisfiedPushes[client.clientId],
			})
		}
	}

	private rebase = () => {
		const incomingPatches = this.incomingFromUpstreamPatchBuffer.value
		if (incomingPatches.length === 0) return

		transact(() => {
			let lastServerClock = this.synced.upstreamClock.value
			this.incomingFromUpstreamPatchBuffer.set([])

			let pendingPushOps = null as null | PushOp<R>[]

			for (const msg of incomingPatches) {
				this.syncUpstreamPatch(msg.diff)
				if (!msg.satisfiedPushIds) continue

				if (!pendingPushOps) {
					pendingPushOps = [...this.pending.pushes.value]
				}
				for (const pushId of msg.satisfiedPushIds) {
					const nextOp = pendingPushOps.shift()
					if (!nextOp) {
						throw new Error('Unexpected push result.')
					}
					if (pushId !== nextOp.pushId) {
						throw new Error('pushId mismatch while rebasing.')
					}
					// all good, apply any presence changes directly
					for (const change of Object.values(nextOp.changes)) {
						if (change.op === ChangeOpType.Set) {
							this.setSynced(change.record, change.clock)
						} else {
							this.deleteSynced(change.record.id, change.clock)
						}
					}
				}

				lastServerClock = msg.serverClock
			}

			this.synced.upstreamClock.set(lastServerClock)

			// if pending push ops didn't change we don't need to update the pending doc state
			if (!pendingPushOps) return

			this.pending.pushes.set(pendingPushOps)
			this.pending.records.set({})
			this.pending.tombstones.set({})

			for (const pushOp of pendingPushOps) {
				this.reapplyPendingChanges(pushOp.changes)
			}
		})
	}

	private scheduleBroadcastPatches = rafThrottle(this.broadcastPatches)
	private scheduleRebase = rafThrottle(this.rebase)
}
