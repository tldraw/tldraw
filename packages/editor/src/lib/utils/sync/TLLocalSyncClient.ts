import { TLInstanceId, TLRecord, TLStore } from '@tldraw/tlschema'
import { RecordsDiff, SerializedSchema, compareSchemas, squashRecordDiffs } from '@tldraw/tlstore'
import { assert, hasOwnProperty } from '@tldraw/utils'
import { transact } from 'signia'
import { showCantReadFromIndexDbAlert, showCantWriteToIndexDbAlert } from './alerts'
import { loadDataFromStore, storeChangesInIndexedDb, storeSnapshotInIndexedDb } from './indexedDb'

/** How should we debounce persists? */
const PERSIST_THROTTLE_MS = 350
/** If we're in an error state, how long should we wait before retrying a write? */
const PERSIST_RETRY_THROTTLE_MS = 10_000

/**
 * IMPORTANT!!!
 *
 * This is just a quick-n-dirty temporary solution that will be replaced with the remote sync client
 * once it has the db integrated
 */

type SyncMessage = {
	type: 'diff'
	instanceId: TLInstanceId
	changes: RecordsDiff<any>
	schema: SerializedSchema
}

// Sent by new clients when they connect
// If another client is on the channel with a newer schema version
// It will
type AnnounceMessage = {
	type: 'announce'
	schema: SerializedSchema
}

type Message = SyncMessage | AnnounceMessage

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
	private diffQueue: RecordsDiff<any>[] = []
	private didDispose = false
	private shouldDoFullDBWrite = true
	private isReloading = false
	readonly universalPersistenceKey: string
	readonly serializedSchema: SerializedSchema
	private isDebugging = false

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
			universalPersistenceKey,
			onLoad,
			onLoadError,
		}: {
			universalPersistenceKey: string
			onLoad: (self: TLLocalSyncClient) => void
			onLoadError: (error: Error) => void
		},
		public readonly channel = new BC(`tldraw-tab-sync-${universalPersistenceKey}`)
	) {
		if (typeof window !== 'undefined') {
			;(window as any).tlsync = this
		}
		this.universalPersistenceKey = universalPersistenceKey

		this.serializedSchema = this.store.schema.serialize()

		this.disposables.add(
			// Set up a subscription to changes from the store: When
			// the store changes (and if the change was made by the user)
			// then immediately send the diff to other tabs via postMessage
			// and schedule a persist.
			store.listen(({ changes, source }) => {
				this.debug('changes', changes, source)
				if (source === 'user') {
					this.diffQueue.push(changes)
					this.channel.postMessage(
						msg({
							type: 'diff',
							instanceId: this.store.props.instanceId,
							changes,
							schema: this.serializedSchema,
						})
					)
					this.schedulePersist()
				}
			})
		)

		this.connect(onLoad, onLoadError)
	}

	private async connect(onLoad: (client: this) => void, onLoadError: (error: Error) => void) {
		this.debug('connecting')
		let data:
			| {
					records: TLRecord[]
					schema?: SerializedSchema
			  }
			| undefined

		try {
			data = await loadDataFromStore(this.universalPersistenceKey)
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
				const snapshot = Object.fromEntries(data.records.map((r) => [r.id, r]))
				const migrationResult = this.store.schema.migrateStoreSnapshot(
					snapshot,
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
						Object.values(migrationResult.value).filter(
							(r) => this.store.schema.types[r.typeName].scope !== 'presence'
						),
						'initialize'
					)
				})
			}

			this.channel.onmessage = ({ data }) => {
				this.debug('got message', data)
				const msg = data as Message
				// if their schema is eralier than ours, we need to tell them so they can refresh
				// if their schema is later than ours, we need to refresh
				const comparison = compareSchemas(
					this.serializedSchema,
					msg.schema ?? this.store.schema.serializeEarliestVersion()
				)
				if (comparison === -1) {
					// we are older, refresh
					// but add a safety check to make sure we don't get in an infnite loop
					const timeSinceInit = Date.now() - this.initTime
					if (timeSinceInit < 5000) {
						// This tab was just reloaded, but is out of date compared to other tabs.
						// Not expecting this to ever happen. It should only happen if we roll back a release that incremented
						// the schema version (which we should never do)
						// Or maybe during development if you have multiple local tabs open running the app on prod mode and you
						// check out an older commit. Dev server should be fine.
						onLoadError(new Error('Schema mismatch, please close other tabs and reload the page'))
						return
					}
					this.debug('reloading')
					this.isReloading = true
					window?.location?.reload?.()
					return
				} else if (comparison === 1) {
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
					const doesDeleteInstance = hasOwnProperty(
						msg.changes.removed,
						this.store.props.instanceId
					)
					transact(() => {
						this.store.mergeRemoteChanges(() => {
							this.store.applyDiff(msg.changes)
						})
						if (doesDeleteInstance) {
							this.store.ensureStoreIsUsable()
						}
					})
				}
			}
			this.channel.postMessage({ type: 'announce', schema: this.serializedSchema })
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
	 * Persist to indexeddb only under certain circumstances:
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
	 * Actually persist to indexeddb. If the write fails, then we'll retry with a full db write after
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
				await storeSnapshotInIndexedDb(
					this.universalPersistenceKey,
					this.store.schema,
					this.store.serialize(),
					{
						didCancel: () => this.didDispose,
					}
				)
			} else {
				const diffs = squashRecordDiffs(diffQueue)
				await storeChangesInIndexedDb(this.universalPersistenceKey, this.store.schema, diffs)
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
