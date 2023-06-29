import { Signal, atom } from '@tldraw/state'
import {
	GoingDownstreamMessage,
	GoingDownstreamSocket,
	GoingUpstreamMessage,
	GoingUpstreamSocket,
	RecordsDiff,
	SerializedSchema,
	UnknownRecord,
	squashRecordDiffs,
} from '@tldraw/store'
import { TLRecord, TLStore } from '@tldraw/tlschema'
import { assert } from '@tldraw/utils'
import { BroadcastChannel, createLeaderElection } from 'broadcast-channel'
import { Emitter, createNanoEvents } from 'nanoevents'
import {
	TAB_ID,
	TLSessionStateSnapshot,
	createSessionStateSnapshotSignal,
	extractSessionStateFromLegacySnapshot,
	loadSessionStateSnapshotIntoStore,
} from '../../config/TLSessionStateSnapshot'
import { showCantReadFromIndexDbAlert, showCantWriteToIndexDbAlert } from './alerts'
import { loadDataFromStore, storeChangesInIndexedDb, storeSnapshotInIndexedDb } from './indexedDb'

/** How should we debounce persists? */
const PERSIST_THROTTLE_MS = 350
/** If we're in an error state, how long should we wait before retrying a write? */
const PERSIST_RETRY_THROTTLE_MS = 10_000

const UPDATE_INSTANCE_STATE = Symbol('UPDATE_INSTANCE_STATE')

/**
 * IMPORTANT!!!
 *
 * This is just a quick-n-dirty temporary solution that will be replaced with the remote sync client
 * once it has the db integrated
 */

type SyncMessage =
	| {
			type: 'going_upstream'
			fromClientId: string
			toClientId: string
			message: GoingUpstreamMessage<TLRecord>
	  }
	| {
			type: 'going_downstream'
			fromClientId: string
			toClientId: string
			message: GoingDownstreamMessage<TLRecord>
	  }

// Sent by new clients when they connect
// If another client is on the channel with a newer schema version
// It will
type AnnounceMessage = {
	type: 'announce'
	schema: SerializedSchema
	clientId: string
}
type IAmLeader = {
	type: 'i_am_leader'
	leaderId: string
}
type IAmFollower = {
	type: 'i_am_follower'
	followerId: string
}

type Message = SyncMessage | AnnounceMessage | IAmLeader | IAmFollower

type UnpackPromise<T> = T extends Promise<infer U> ? U : T

const msg = (msg: Message) => msg

class GoingUpstreamBCSocket implements GoingUpstreamSocket<TLRecord> {
	constructor(
		private readonly bus: Emitter<{ message: (msg: Message) => void }>,
		private readonly upstreamId: string,
		private readonly myId: string
	) {}

	handleMessage = (msg: Message) => {
		if (msg.type === 'going_downstream' && msg.toClientId === this.myId) {
			this.messageListeners.forEach((cb) => cb(msg.message))
		}
	}

	_isOpen = false

	_off = () => {
		// noop
	}

	open() {
		if (this._isOpen) return
		this._off = this.bus.on('message', this.handleMessage)
		this._isOpen = true
		this.statusListeners.forEach((cb) => cb(true))
	}

	close() {
		if (!this._isOpen) return
		this._off()
		this._isOpen = false
		this.statusListeners.forEach((cb) => cb(false))
	}

	isOpen(): boolean {
		return false
	}

	sendMessage(message: GoingUpstreamMessage<TLRecord>): void {
		this.bus.emit(
			'message',
			msg({ type: 'going_upstream', fromClientId: this.myId, toClientId: this.upstreamId, message })
		)
	}
	messageListeners: Set<(message: GoingDownstreamMessage<TLRecord>) => void> = new Set()
	onMessage(callback: (message: GoingDownstreamMessage<TLRecord>) => void): () => void {
		this.messageListeners.add(callback)

		return () => {
			this.messageListeners.delete(callback)
		}
	}
	statusListeners: Set<(isOpen: boolean) => void> = new Set()
	onStatusChange(cb: (isOpen: boolean) => void): () => void {
		this.statusListeners.add(cb)
		return () => {
			this.statusListeners.delete(cb)
		}
	}
}

class GoingDownstreamBCSocket implements GoingDownstreamSocket<TLRecord> {
	constructor(
		private readonly bus: Emitter<{ message: (msg: Message) => void }>,
		private readonly downstreamId: string,
		private readonly myId: string
	) {
		this._off = bus.on('message', this.handleMessage)
	}
	_isOpen = true
	_off = () => {
		// noop
	}
	handleMessage = (msg: Message) => {
		if (msg.type === 'going_upstream' && msg.toClientId === this.myId) {
			this.messageListeners.forEach((cb) => cb(msg.message))
		}
	}
	isOpen(): boolean {
		return this._isOpen
	}
	sendMessage(message: GoingDownstreamMessage<TLRecord>): void {
		this.bus.emit(
			'message',
			msg({
				type: 'going_downstream',
				fromClientId: this.myId,
				toClientId: this.downstreamId,
				message,
			})
		)
	}
	messageListeners: Set<(message: GoingUpstreamMessage<TLRecord>) => void> = new Set()
	onMessage(callback: (message: GoingUpstreamMessage<TLRecord>) => void): () => void {
		this.messageListeners.add(callback)

		return () => {
			this.messageListeners.delete(callback)
		}
	}
	close(): void {
		if (!this._isOpen) return
		this._off()
		this._isOpen = false
	}
}

type ClientState =
	| {
			type: 'leader'
	  }
	| {
			type: 'follower'
			leaderId: string
	  }
	| {
			type: 'initial'
	  }

/** @internal */
export class TLLocalSyncClient2 {
	private state = atom<ClientState>('localSyncClient.state', { type: 'initial' })
	private disposables = new Set<() => void>()
	private diffQueue: Array<RecordsDiff<UnknownRecord> | typeof UPDATE_INSTANCE_STATE> = []
	private didDispose = false
	private shouldDoFullDBWrite = true
	private isReloading = false
	readonly persistenceKey: string
	readonly sessionId: string
	readonly serializedSchema: SerializedSchema
	private isDebugging = false
	private readonly documentTypes: ReadonlySet<string>
	private readonly $sessionStateSnapshot: Signal<TLSessionStateSnapshot | null>
	private events = createNanoEvents<{ message: (msg: Message) => void }>()

	initTime = Date.now()
	private debug(...args: any[]) {
		if (this.isDebugging) {
			// eslint-disable-next-line no-console
			console.debug(...args)
		}
	}
	constructor(
		public readonly store: TLStore,
		{
			persistenceKey,
			sessionId = TAB_ID,
			onLoad,
			onLoadError,
		}: {
			persistenceKey: string
			sessionId?: string
			onLoad: (self: TLLocalSyncClient2) => void
			onLoadError: (error: Error) => void
		},
		public readonly channel = new BroadcastChannel(`tldraw-tab-sync-${persistenceKey}`)
	) {
		if (typeof window !== 'undefined') {
			;(window as any).tlsync = this
		}
		this.persistenceKey = persistenceKey
		this.sessionId = sessionId

		this.serializedSchema = this.store.schema.serialize()
		this.$sessionStateSnapshot = createSessionStateSnapshotSignal(this.store)

		this.disposables.add(
			// Set up a subscription to changes from the store: When
			// the store changes (and if the change was made by the user)
			// then immediately send the diff to other tabs via postMessage
			// and schedule a persist.
			store.listen(
				({ changes }) => {
					this.diffQueue.push(changes)
					this.schedulePersist()
				},
				{ source: 'user', scope: 'document' }
			)
		)
		this.disposables.add(
			store.listen(
				() => {
					this.diffQueue.push(UPDATE_INSTANCE_STATE)
					this.schedulePersist()
				},
				{ scope: 'session' }
			)
		)

		this.connect(onLoad, onLoadError)

		this.documentTypes = new Set(
			Object.values(this.store.schema.types)
				.filter((t) => t.scope === 'document')
				.map((t) => t.typeName)
		)
	}

	private async connect(onLoad: (client: this) => void, onLoadError: (error: Error) => void) {
		this.debug('connecting')
		let data: UnpackPromise<ReturnType<typeof loadDataFromStore>> | undefined

		try {
			data = await loadDataFromStore({
				persistenceKey: this.persistenceKey,
				sessionId: this.sessionId,
				didCancel: () => this.didDispose,
			})
		} catch (error: any) {
			onLoadError(error)
			showCantReadFromIndexDbAlert()
			if (typeof window !== 'undefined') {
				window.location.reload()
			}
			return
		}

		this.debug('loaded data from store', data, 'didDispose', this.didDispose)
		if (this.didDispose) return

		try {
			if (data) {
				const documentSnapshot = Object.fromEntries(data.records.map((r) => [r.id, r]))
				const sessionStateSnapshot =
					data.sessionStateSnapshot ?? extractSessionStateFromLegacySnapshot(documentSnapshot)
				const migrationResult = this.store.schema.migrateStoreSnapshot(
					documentSnapshot,
					data.schema ?? this.store.schema.serializeEarliestVersion()
				)

				if (migrationResult.type === 'error') {
					console.error('failed to migrate store', migrationResult)
					onLoadError(new Error(`Failed to migrate store: ${migrationResult.reason}`))
					return
				}

				// 3. Merge the changes into the REAL STORE
				this.store.mergeRemoteChanges(() => {
					// Calling put will validate the records!
					this.store.put(
						Object.values(migrationResult.value).filter((r) => this.documentTypes.has(r.typeName))
					)
				})

				if (sessionStateSnapshot) {
					loadSessionStateSnapshotIntoStore(this.store, sessionStateSnapshot)
				}
			}
			const postMessage = (msg: Message) => {
				// eslint-disable-next-line no-console
				console.log('post message', msg)
				this.channel.postMessage(msg)
			}
			this.events.on('message', (msg) => {
				if (
					(msg.type === 'going_downstream' || msg.type === 'going_upstream') &&
					msg.toClientId !== this.store.id
				) {
					postMessage(msg)
				}
			})

			const elector = createLeaderElection(this.channel)
			let currentLeaderId = null as null | string
			elector.awaitLeadership().then(() => {
				this.store.setUpstream(null)
				postMessage({ type: 'i_am_leader', leaderId: this.store.id })
				currentLeaderId = this.store.id
			})
			this.channel.onmessage = (data) => {
				// eslint-disable-next-line no-console
				console.log('got message', data)
				this.debug('got message', data)
				const msg = data as Message
				if (msg.type === 'i_am_leader') {
					if (msg.leaderId !== currentLeaderId) {
						currentLeaderId = msg.leaderId
						// this is not the leader, let's connect to them
						postMessage({ type: 'i_am_follower', followerId: this.store.id })
						this.store.setUpstream(
							new GoingUpstreamBCSocket(this.events, msg.leaderId, this.store.id)
						)
					}
					return
				}

				if (msg.type === 'announce') {
					// i am leader
					if (currentLeaderId === this.store.id) {
						postMessage({ type: 'i_am_leader', leaderId: this.store.id })
					}
					return
				}

				if (msg.type === 'i_am_follower') {
					if (currentLeaderId === this.store.id) {
						this.store.addClient(
							msg.followerId,
							new GoingDownstreamBCSocket(this.events, msg.followerId, this.store.id)
						)
					}
					return
				}

				if (msg.toClientId !== this.store.id) return

				this.events.emit('message', msg)
			}
			postMessage({
				type: 'announce',
				schema: this.serializedSchema,
				clientId: this.store.id,
			})
			this.disposables.add(() => {
				this.channel.close()
			})
			onLoad(this)
		} catch (e: any) {
			this.debug('error loading data from store', e)
			if (this.didDispose) return
			onLoadError(e)
			return
		}
	}

	close() {
		this.debug('closing')
		this.didDispose = true
		this.disposables.forEach((d) => d())
	}

	private isPersisting = false
	private didLastWriteError = false
	private scheduledPersistTimeout: ReturnType<typeof setTimeout> | null = null

	/**
	 * Schedule a persist. Persists don't happen immediately: they are throttled to avoid writing too
	 * often, and will retry if failed.
	 *
	 * @internal
	 */
	private schedulePersist() {
		this.debug('schedulePersist', this.scheduledPersistTimeout)
		if (this.scheduledPersistTimeout) return
		this.scheduledPersistTimeout = setTimeout(
			() => {
				this.scheduledPersistTimeout = null
				this.persistIfNeeded()
			},
			this.didLastWriteError ? PERSIST_RETRY_THROTTLE_MS : PERSIST_THROTTLE_MS
		)
	}

	/**
	 * Persist to IndexedDB only under certain circumstances:
	 *
	 * - If we're not already persisting
	 * - If we're not reloading the page
	 * - And we have something to persist (a full db write scheduled or changes in the diff queue)
	 *
	 * @internal
	 */
	private persistIfNeeded() {
		this.debug('persistIfNeeded', {
			isPersisting: this.isPersisting,
			isReloading: this.isReloading,
			shouldDoFullDBWrite: this.shouldDoFullDBWrite,
			diffQueueLength: this.diffQueue.length,
			storeIsPossiblyCorrupt: this.store.isPossiblyCorrupted(),
		})

		// if we've scheduled a persist for the future, that's no longer needed
		if (this.scheduledPersistTimeout) {
			clearTimeout(this.scheduledPersistTimeout)
			this.scheduledPersistTimeout = null
		}

		// if a persist is already in progress, we don't need to do anything -
		// if there are still outstanding changes once it's finished, it'll
		// schedule another persist
		if (this.isPersisting) return

		// if we're reloading the page, it's because there's a newer client
		// present so lets not overwrite their changes
		if (this.isReloading) return

		// if the store is possibly corrupted, we don't want to persist
		if (this.store.isPossiblyCorrupted()) return

		// if we're scheduled for a full write or if we have changes outstanding, let's persist them!
		if (this.shouldDoFullDBWrite || this.diffQueue.length > 0) {
			this.doPersist()
		}
	}

	/**
	 * Actually persist to IndexedDB. If the write fails, then we'll retry with a full db write after
	 * a short delay.
	 */
	private async doPersist() {
		assert(!this.isPersisting, 'persist already in progress')
		this.isPersisting = true

		this.debug('doPersist start')

		// instantly empty the diff queue, but keep our own copy of it. this way
		// diffs that come in during the persist will still get tracked
		const diffQueue = this.diffQueue
		this.diffQueue = []

		try {
			if (this.shouldDoFullDBWrite) {
				this.shouldDoFullDBWrite = false
				await storeSnapshotInIndexedDb({
					persistenceKey: this.persistenceKey,
					schema: this.store.schema,
					snapshot: this.store.serialize(),
					didCancel: () => this.didDispose,
					sessionId: this.sessionId,
					sessionStateSnapshot: this.$sessionStateSnapshot.value,
				})
			} else {
				const diffs = squashRecordDiffs(
					diffQueue.filter((d): d is RecordsDiff<UnknownRecord> => d !== UPDATE_INSTANCE_STATE)
				)
				await storeChangesInIndexedDb({
					persistenceKey: this.persistenceKey,
					changes: diffs,
					schema: this.store.schema,
					didCancel: () => this.didDispose,
					sessionId: this.sessionId,
					sessionStateSnapshot: this.$sessionStateSnapshot.value,
				})
			}
			this.didLastWriteError = false
		} catch (e) {
			// set this.shouldDoFullDBWrite because we clear the diffQueue no matter what,
			// so if this is just a temporary error, we will still persist all changes
			this.shouldDoFullDBWrite = true
			this.didLastWriteError = true
			console.error('failed to store changes in indexed db', e)

			showCantWriteToIndexDbAlert()
			if (typeof window !== 'undefined') {
				// adios
				window.location.reload()
			}
		}

		this.isPersisting = false
		this.debug('doPersist end')

		// changes might have come in between when we started the persist and
		// now. we request another persist so any new changes can get written
		this.schedulePersist()
	}
}
