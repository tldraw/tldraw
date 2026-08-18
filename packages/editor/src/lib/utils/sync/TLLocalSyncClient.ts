import { Signal, transact } from '@tldraw/state'
import { RecordsDiff, SerializedSchema, UnknownRecord, squashRecordDiffs } from '@tldraw/store'
import { TLStore } from '@tldraw/tlschema'
import { assert } from '@tldraw/utils'
import {
	TAB_ID,
	TLSessionStateSnapshot,
	createSessionStateSnapshotSignal,
	extractSessionStateFromLegacySnapshot,
	loadSessionStateSnapshotIntoStore,
} from '../../config/TLSessionStateSnapshot'
import { showCantReadFromIndexDbAlert, showCantWriteToIndexDbAlert } from './alerts'
import { LocalIndexedDb } from './LocalIndexedDb'

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

interface SyncMessage {
	type: 'diff'
	storeId: string
	changes: RecordsDiff<UnknownRecord>
	schema: SerializedSchema
}

// Sent by new clients when they connect
// If another client is on the channel with a newer schema version
// It will
interface AnnounceMessage {
	type: 'announce'
	schema: SerializedSchema
}

type Message = SyncMessage | AnnounceMessage

type UnpackPromise<T> = T extends Promise<infer U> ? U : T

const msg = (msg: Message) => msg

/** @internal */
export class BroadcastChannelMock {
	onmessage?: (e: MessageEvent) => void
	constructor(_name: string) {
		// noop
	}
	postMessage(_msg: Message) {
		// noop
	}
	close() {
		// noop
	}
}

const BC = typeof BroadcastChannel === 'undefined' ? BroadcastChannelMock : BroadcastChannel

/** @internal */
export class TLLocalSyncClient {
	private disposables = new Set<() => void>()
	private diffQueue: Array<RecordsDiff<UnknownRecord> | typeof UPDATE_INSTANCE_STATE> = []
	private didDispose = false
	private didLoad = false
	private shouldDoFullDBWrite = true
	private isReloading = false
	readonly persistenceKey: string
	readonly sessionId: string
	readonly serializedSchema: SerializedSchema
	private isDebugging = false
	private readonly documentTypes: ReadonlySet<string>
	private readonly $sessionStateSnapshot: Signal<TLSessionStateSnapshot | null>
	/** @internal */
	readonly db: LocalIndexedDb

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
			onLoad(self: TLLocalSyncClient): void
			onLoadError(error: Error): void
		},
		public readonly channel = new BC(`tldraw-tab-sync-${persistenceKey}`)
	) {
		if (typeof window !== 'undefined') {
			;(window as any).tlsync = this
		}
		this.persistenceKey = persistenceKey
		this.sessionId = sessionId
		this.db = new LocalIndexedDb(persistenceKey)

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
					this.channel.postMessage(
						msg({
							type: 'diff',
							storeId: this.store.id,
							changes,
							schema: this.serializedSchema,
						})
					)
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
		let data: UnpackPromise<ReturnType<LocalIndexedDb['load']>> | undefined

		// Listen from the start and hold messages until we have loaded. A diff another tab
		// broadcasts while our load is in flight may not be in what we read (that tab persists on
		// a throttle), and our first persist is a full snapshot write — so if we missed it here it
		// would be erased from IndexedDB for good. Re-applying one we did read is a no-op.
		const messagesReceivedWhileLoading: MessageEvent[] = []
		this.channel.onmessage = (event) => {
			messagesReceivedWhileLoading.push(event)
		}
		this.disposables.add(() => {
			this.channel.close()
		})

		try {
			data = await this.db.load({ sessionId: this.sessionId })
		} catch (error: any) {
			onLoadError(error)
			showCantReadFromIndexDbAlert()
			return
		}

		this.debug('loaded data from store', data, 'didDispose', this.didDispose)
		if (this.didDispose) return

		try {
			if (data) {
				const documentSnapshot = Object.fromEntries(data.records.map((r) => [r.id, r]))
				const sessionStateSnapshot =
					data.sessionStateSnapshot ?? extractSessionStateFromLegacySnapshot(documentSnapshot)
				const migrationResult = this.store.schema.migrateStoreSnapshot({
					store: documentSnapshot,
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					schema: data.schema ?? this.store.schema.serializeEarliestVersion(),
				})

				if (migrationResult.type === 'error') {
					console.error('failed to migrate store', migrationResult)
					onLoadError(new Error(`Failed to migrate store: ${migrationResult.reason}`))
					return
				}

				const records = Object.values(migrationResult.value).filter((r) =>
					this.documentTypes.has(r.typeName)
				)
				if (records.length > 0) {
					// 3. Merge the changes into the REAL STORE
					this.store.mergeRemoteChanges(() => {
						// Calling put will validate the records!
						this.store.put(records, 'initialize')
					})
				}

				if (sessionStateSnapshot) {
					loadSessionStateSnapshotIntoStore(this.store, sessionStateSnapshot, {
						forceOverwrite: true,
					})
				}
			}
			this.didLoad = true
			// anything queued while loading was held back by persistIfNeeded; write it now
			if (this.diffQueue.length > 0) this.schedulePersist()

			const handleMessage = ({ data }: MessageEvent) => {
				this.debug('got message', data)
				const msg = data as Message
				// if their schema is earlier than ours, we need to tell them so they can refresh
				// if their schema is later than ours, we need to refresh
				const res = this.store.schema.getMigrationsSince(msg.schema)

				if (!res.ok) {
					// we are older, refresh
					// but add a safety check to make sure we don't get in an infinite loop
					const timeSinceInit = Date.now() - this.initTime
					if (timeSinceInit < 5000) {
						// This tab was just reloaded, but is out of date compared to other tabs.
						// Not expecting this to ever happen. It should only happen if we roll back a release that incremented
						// the schema version (which we should never do)
						// Or maybe during development if you have multiple local tabs open running the app on prod mode and you
						// check out an older commit. Dev server should be fine.
						//
						// Either way this tab must stop writing: persisting its older schema over the
						// newer tab's records would corrupt the next load.
						this.isReloading = true
						onLoadError(new Error('Schema mismatch, please close other tabs and reload the page'))
						return
					}
					this.debug('reloading')
					this.isReloading = true
					window?.location?.reload?.()
					return
				} else if (res.value.length > 0) {
					// they are older, tell them to refresh and not write any more data
					this.debug('telling them to reload')
					this.channel.postMessage({ type: 'announce', schema: this.serializedSchema })
					// schedule a full db write in case they wrote data anyway
					this.shouldDoFullDBWrite = true
					this.persistIfNeeded()
					return
				}
				// otherwise, all good, same version :)
				if (msg.type === 'diff') {
					this.debug('applying diff')
					transact(() => {
						this.store.mergeRemoteChanges(() => {
							this.store.applyDiff(msg.changes as any)
						})
					})
				}
			}
			this.channel.onmessage = handleMessage
			for (const event of messagesReceivedWhileLoading) {
				handleMessage(event)
			}
			// a held-back message may have found us out of date (onLoadError already reported it, or
			// the page is reloading); don't report a successful load on top of that
			if (this.isReloading) return
			this.channel.postMessage({ type: 'announce', schema: this.serializedSchema })
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
		if (this.scheduledPersistTimeout) {
			clearTimeout(this.scheduledPersistTimeout)
			this.scheduledPersistTimeout = null
		}
		this.didDispose = true
		this.disposables.forEach((d) => d())
		if (typeof window !== 'undefined' && (window as any).tlsync === this) {
			delete (window as any).tlsync
		}
		void this.flushAndCloseDb()
	}

	/**
	 * Write out whatever is still queued instead of throwing it away — the persist throttle means
	 * the last few hundred milliseconds of edits before an unmount are usually still pending — and
	 * only then close the database.
	 */
	private async flushAndCloseDb() {
		// let a write that is already in flight finish first; edits made during it are queued
		if (this.currentPersist) await this.currentPersist
		if (
			this.didLoad &&
			!this.isReloading &&
			!this.store.isPossiblyCorrupted() &&
			(this.shouldDoFullDBWrite || this.diffQueue.length > 0)
		) {
			await this.doPersist()
		}
		await this.db.close()
	}

	private isPersisting = false
	private currentPersist: Promise<void> | null = null
	private didLastWriteError = false
	// eslint-disable-next-line no-restricted-globals
	private scheduledPersistTimeout: ReturnType<typeof setTimeout> | null = null

	/**
	 * Schedule a persist. Persists don't happen immediately: they are throttled to avoid writing too
	 * often, and will retry if failed.
	 *
	 * @internal
	 */
	private schedulePersist() {
		this.debug('schedulePersist', this.scheduledPersistTimeout)
		if (this.didDispose || this.scheduledPersistTimeout) return
		// eslint-disable-next-line no-restricted-globals
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

		// until the initial load has merged what IndexedDB holds, the store is not the source of
		// truth: writing it out now (the first write is a full snapshot) would wipe the saved document
		if (!this.didLoad) return

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
			void this.doPersist()
		}
	}

	/**
	 * Actually persist to IndexedDB. If the write fails, then we'll retry with a full db write after
	 * a short delay.
	 */
	private doPersist(): Promise<void> {
		assert(!this.isPersisting, 'persist already in progress')
		this.isPersisting = true
		this.currentPersist = this.doPersistInner().finally(() => {
			this.isPersisting = false
			this.currentPersist = null
			// changes might have come in between when we started the persist and
			// now. we request another persist so any new changes can get written
			this.schedulePersist()
		})
		return this.currentPersist
	}

	private async doPersistInner() {
		this.debug('doPersist start')

		// instantly empty the diff queue, but keep our own copy of it. this way
		// diffs that come in during the persist will still get tracked
		const diffQueue = this.diffQueue
		this.diffQueue = []

		try {
			if (this.shouldDoFullDBWrite) {
				this.shouldDoFullDBWrite = false
				await this.db.storeSnapshot({
					schema: this.store.schema,
					snapshot: this.store.serialize(),
					sessionId: this.sessionId,
					sessionStateSnapshot: this.$sessionStateSnapshot.get(),
				})
			} else {
				const diffs = squashRecordDiffs(
					diffQueue.filter((d): d is RecordsDiff<UnknownRecord> => d !== UPDATE_INSTANCE_STATE)
				)
				await this.db.storeChanges({
					changes: diffs,
					schema: this.store.schema,
					sessionId: this.sessionId,
					sessionStateSnapshot: this.$sessionStateSnapshot.get(),
				})
			}
			this.didLastWriteError = false
		} catch (e) {
			// set this.shouldDoFullDBWrite because we clear the diffQueue no matter what,
			// so if this is just a temporary error, we will still persist all changes
			this.shouldDoFullDBWrite = true
			this.didLastWriteError = true
			console.error('failed to store changes in indexed db', e)

			// the final flush after close() must not alert or reload: the component is unmounting,
			// and its user is no longer looking at this document
			if (this.didDispose) return
			showCantWriteToIndexDbAlert()
			if (typeof window !== 'undefined') {
				// adios
				window.location.reload()
			}
		}

		this.debug('doPersist end')
	}
}
