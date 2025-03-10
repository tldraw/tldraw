import {
	DB,
	OptimisticAppStore,
	TlaFile,
	TlaRow,
	ZEvent,
	ZRowUpdate,
	ZServerSentMessage,
	ZStoreData,
	ZTable,
} from '@tldraw/dotcom-shared'
import { react, transact } from '@tldraw/state'
import { ExecutionQueue, assert, promiseWithResolve, sleep, uniqueId } from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { Kysely } from 'kysely'
import throttle from 'lodash.throttle'
import { Logger } from './Logger'
import {
	fileKeys,
	fileStateKeys,
	getFetchUserDataSql,
	parseResultRow,
	userKeys,
} from './getFetchEverythingSql'
import { Environment, TLUserDurableObjectEvent, getUserDoSnapshotKey } from './types'
import { getReplicator, getStatsDurableObjct } from './utils/durableObjects'
import { retryOnConnectionFailure } from './utils/retryOnConnectionFailure'
type PromiseWithResolve = ReturnType<typeof promiseWithResolve>

export interface ZRowUpdateEvent {
	type: 'row_update'
	userId: string
	row: TlaRow
	table: ZTable
	event: ZEvent
}

export interface ZMutationCommit {
	type: 'mutation_commit'
	userId: string
	mutationNumber: number
	// if the sequence id changes make sure we still handle the mutation commit
}
export interface ZForceReboot {
	type: 'maybe_force_reboot'
	sequenceId: string
	sequenceNumber: number
}

export type ZReplicationChange = ZRowUpdateEvent | ZMutationCommit

export interface ZChanges {
	type: 'changes'
	lsn: string
	changes: ZReplicationChange[]
	// A unique id for the replicator's unbroken sequence of events.
	// If the replicator fails and restarts, this id will change.
	sequenceId: string
	sequenceNumber: number
}

export type ZReplicationEvent = ZForceReboot | ZChanges

export type ZReplicationEventWithoutSequenceInfo =
	| Omit<ZForceReboot, 'sequenceNumber' | 'sequenceId'>
	| Omit<ZChanges, 'sequenceNumber' | 'sequenceId'>

type BootState =
	| {
			type: 'init'
			promise: PromiseWithResolve
	  }
	| {
			type: 'connecting'
			bootId: string
			bufferedEvents: Array<ZReplicationEvent>
	  }
	| {
			type: 'connected'
			bootId: string
			sequenceId: string
			lastSequenceNumber: number
	  }

const stateVersion = 0
interface StateSnapshot {
	version: number
	initialData: ZStoreData
	optimisticUpdates: Array<{
		updates: ZRowUpdate[]
		mutationId: string
	}>
}

export class UserDataSyncer {
	state: BootState = {
		type: 'init',
		promise: promiseWithResolve(),
	}

	store = new OptimisticAppStore()
	lastStashEpoch = 0
	mutations: { mutationNumber: number; mutationId: string; timestamp: number }[] = []

	sentry
	private captureException(exception: unknown, extras?: Record<string, unknown>) {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		this.sentry?.withScope((scope) => {
			if (extras) scope.setExtras(extras)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			this.sentry?.captureException(exception) as any
		})
		if (!this.sentry) {
			console.error(`[UserDataSyncer]: `, exception)
		}
	}

	constructor(
		private ctx: DurableObjectState,
		private env: Environment,
		private db: Kysely<DB>,
		private userId: string,
		private broadcast: (message: ZServerSentMessage) => void,
		private logEvent: (event: TLUserDurableObjectEvent) => void,
		private log: Logger
	) {
		this.sentry = createSentry(ctx, env)
		this.reboot({ delay: false })
		const persist = throttle(
			async () => {
				const initialData = this.store.getCommittedData()
				if (initialData) {
					const snapshot: StateSnapshot = {
						version: stateVersion,
						initialData,
						optimisticUpdates: this.store.getOptimisticUpdates(),
					}
					this.log.debug('stashing snapshot')
					this.lastStashEpoch = this.store.epoch
					await this.env.USER_DO_SNAPSHOTS.put(
						getUserDoSnapshotKey(this.env, this.userId),
						JSON.stringify(snapshot)
					)
				}
			},
			1000,
			{ trailing: true, leading: false }
		)
		react('persist user store', () => {
			const _fullData = this.store.getFullData()
			persist()
		})
	}

	private queue = new ExecutionQueue()

	numConsecutiveReboots = 0

	async reboot({ delay = true, hard = false }: { delay?: boolean; hard?: boolean } = {}) {
		this.numConsecutiveReboots++
		if (this.numConsecutiveReboots > 5) {
			this.logEvent({ type: 'user_do_abort', id: this.userId })
			getStatsDurableObjct(this.env).recordUserDoAbort()
			this.ctx.abort()
			return
		}
		this.log.debug('rebooting')
		this.logEvent({ type: 'reboot', id: this.userId })
		await this.queue.push(async () => {
			if (delay) {
				await sleep(1000)
			}
			const res = await Promise.race([
				this.boot(hard).then(() => 'ok'),
				sleep(5000).then(() => 'timeout'),
			]).catch((e) => {
				this.logEvent({ type: 'reboot_error', id: this.userId })
				this.log.debug('reboot error', e.stack)
				this.captureException(e)
				return 'error'
			})
			this.log.debug('rebooted', res)
			if (res === 'ok') {
				this.numConsecutiveReboots = 0
			} else {
				this.reboot({ hard: true })
			}
		})
	}

	private commitMutations(upToAndIncludingNumber: number) {
		this.log.debug('commit mutations', this.userId, upToAndIncludingNumber, this.mutations)
		const mutationIds = this.mutations
			.filter((m) => m.mutationNumber <= upToAndIncludingNumber)
			.map((m) => m.mutationId)
		this.mutations = this.mutations.filter((m) => m.mutationNumber > upToAndIncludingNumber)
		this.store.commitMutations(mutationIds)
		this.broadcast({ type: 'commit', mutationIds: mutationIds })
	}

	private async loadInitialDataFromR2() {
		this.log.debug('loading snapshot from R2')
		const res = await this.env.USER_DO_SNAPSHOTS.get(getUserDoSnapshotKey(this.env, this.userId))
		if (!res) {
			this.log.debug('no snapshot found')
			return null
		}
		const data = (await res.json()) as StateSnapshot
		if (data.version !== stateVersion) {
			this.log.debug('snapshot version mismatch')
			return null
		}
		this.log.debug('loaded snapshot from R2')
		return data
	}

	private async loadInitialDataFromPostgres() {
		this.logEvent({ type: 'full_data_fetch', id: this.userId })
		this.log.debug('fetching fresh initial data from postgres')
		// if the bootId changes during the boot process, we should stop silently
		const userSql = getFetchUserDataSql(this.userId)
		const initialData: ZStoreData & { mutationNumber?: number } = {
			user: null as any,
			files: [],
			fileStates: [],
			lsn: '0/0',
			mutationNumber: 0,
		}
		// we connect to pg via a pooler, so in the case that the pool is exhausted
		// we need to retry the connection. (also in the case that a neon branch is asleep apparently?)
		await retryOnConnectionFailure(
			async () => {
				// sync initial data
				initialData.user = null as any
				initialData.files = []
				initialData.fileStates = []

				await this.db.transaction().execute(async (tx) => {
					const result = await userSql.execute(tx)
					return result.rows.forEach((row: any) => {
						assert(this.state.type === 'connecting', 'state should be connecting in boot')
						switch (row.table) {
							case 'user':
								initialData.user = parseResultRow(userKeys, row)
								break
							case 'file':
								initialData.files.push(parseResultRow(fileKeys, row))
								break
							case 'file_state':
								initialData.fileStates.push(parseResultRow(fileStateKeys, row))
								break
							case 'lsn':
								assert(typeof row.lsn === 'string', 'lsn should be a string')
								initialData.lsn = row.lsn
								break
							case 'user_mutation_number':
								assert(
									typeof row.mutationNumber === 'number' || row.mutationNumber === null,
									'mutationNumber should be a number or null, got' + JSON.stringify(row)
								)
								if (row.mutationNumber !== null) {
									initialData.mutationNumber = row.mutationNumber
								}
								break
						}
					})
				})
			},
			() => {
				this.logEvent({ type: 'connect_retry', id: this.userId })
			}
		)

		return {
			version: stateVersion,
			initialData,
			optimisticUpdates: [],
		} satisfies StateSnapshot
	}

	private async boot(hard: boolean): Promise<void> {
		this.log.debug('booting')
		// todo: clean up old resources if necessary?
		const start = Date.now()
		this.state = {
			type: 'connecting',
			// preserve the promise so any awaiters do eventually get resolved
			bootId: uniqueId(),
			bufferedEvents: [],
		}
		/**
		 * BOOTUP SEQUENCE
		 * 1. Generate a unique boot id
		 * 2. Fetch data from R2, or fetch fresh data from postgres
		 * 3. Send initial data to client
		 * 4. Register with the replicator
		 * 5. Ignore any events that come in before the sequence id ends with our boot id
		 * 6. Buffer any events that come in with a valid sequence id
		 * 7. Once the replicator responds to the registration request, apply the buffered events
		 */
		if (!this.store.getCommittedData() || hard) {
			const res =
				(!hard && (await this.loadInitialDataFromR2())) ||
				(await this.loadInitialDataFromPostgres())

			this.log.debug('got initial data')
			this.store.initialize(res.initialData, res.optimisticUpdates)
			this.broadcast({
				type: 'initial_data',
				initialData: res.initialData,
			})
			if (
				'mutationNumber' in res.initialData &&
				typeof res.initialData.mutationNumber === 'number'
			) {
				this.commitMutations(res.initialData.mutationNumber)
			}
		}

		const initialData = this.store.getCommittedData()!

		// do an unnecessary assign here to tell typescript that the state might have changed
		const guestFileIds = initialData.files.filter((f) => f.ownerId !== this.userId).map((f) => f.id)
		const res = await getReplicator(this.env).registerUser({
			userId: this.userId,
			lsn: initialData.lsn,
			guestFileIds,
			bootId: this.state.bootId,
		})

		if (res.type === 'reboot') {
			if (hard) throw new Error('reboot loop, waiting')
			return this.boot(true)
		}

		const bufferedEvents = this.state.bufferedEvents
		this.state = {
			type: 'connected',
			bootId: this.state.bootId,
			sequenceId: res.sequenceId,
			lastSequenceNumber: res.sequenceNumber,
		}

		if (bufferedEvents.length > 0) {
			bufferedEvents.forEach((event) => this.handleReplicationEvent(event))
		}

		// this will prevent more events from being added to the buffer
		const end = Date.now()
		this.logEvent({ type: 'reboot_duration', id: this.userId, duration: end - start })
		this.log.debug('boot time', end - start, 'ms')
	}

	// It is important that this method is synchronous!!!!
	// We need to make sure that events are handled in-order.
	// If we make this asynchronous for whatever reason we should
	// make sure to uphold this invariant.
	private handleRowUpdateEvent(event: ZRowUpdateEvent) {
		try {
			assert(this.state.type === 'connected', 'state should be connected in handleEvent')
			if (event.table !== 'user' && event.table !== 'file' && event.table !== 'file_state') {
				throw new Error(`Unhandled table: ${event.table}`)
			}
			this.store.updateCommittedData(event)
			this.broadcast({
				type: 'update',
				update: {
					// reference the properties individually because the
					// event might have extra properties that we don't want to send
					event: event.event,
					row: event.row,
					table: event.table,
				},
			})
		} catch (e) {
			this.captureException(e)
			this.reboot()
		}
	}

	handleReplicationEvent(event: ZReplicationEvent) {
		if (this.state.type === 'init') {
			this.log.debug('ignoring during init', event)
			return
		}

		// ignore irrelevant events
		if (!event.sequenceId.endsWith(this.state.bootId)) {
			this.log.debug('ignoring irrelevant event', event)
			return
		}

		// buffer events until we know the sequence numbers
		if (this.state.type === 'connecting') {
			this.log.debug('buffering event', event)
			this.state.bufferedEvents.push(event)
			return
		}

		if (this.state.sequenceId !== event.sequenceId) {
			// the replicator has restarted, so we need to reboot
			this.log.debug('force reboot', this.state, event)
			this.reboot()
			return
		}

		if (event.sequenceNumber !== this.state.lastSequenceNumber + 1) {
			this.log.debug(
				'sequence number mismatch',
				event.sequenceNumber,
				this.state.lastSequenceNumber
			)
			this.reboot()
			return
		}

		this.state.lastSequenceNumber++

		// this event type only exists to make us check the sequence id + number
		// so its job is done.
		if (event.type === 'maybe_force_reboot') return

		// in the rare case that the replicator was behind us when we called registerUser,
		// ignore any events that came in from before we got our initial data.
		if (event.lsn < this.store.getCommittedData()!.lsn) {
			this.log.debug('ignoring old event', event.lsn, '<', this.store.getCommittedData()!.lsn)
			return
		}

		transact(() => {
			let maxMutationNumber = -1
			for (const ev of event.changes) {
				if (ev.type === 'mutation_commit') {
					if (ev.mutationNumber > maxMutationNumber) {
						maxMutationNumber = ev.mutationNumber
					}
					continue
				}

				assert(ev.type === 'row_update', `event type should be row_update got ${event.type}`)
				this.handleRowUpdateEvent(ev)
			}
			if (maxMutationNumber >= 0) {
				this.commitMutations(maxMutationNumber)
			}

			this.store.commitLsn(event.lsn)
		})

		// make sure we have all the files we need
		const data = this.store.getFullData()
		for (const fileState of data?.fileStates ?? []) {
			if (!data?.files.some((f) => f.id === fileState.fileId)) {
				this.log.debug('missing file', fileState.fileId)
				this.addGuestFile(fileState.fileId)
			}
		}

		for (const file of data?.files ?? []) {
			// and make sure we don't have any files we don't need
			// this happens when a shared file is made private
			if (file.ownerId !== this.userId && !data?.fileStates.some((fs) => fs.fileId === file.id)) {
				this.log.debug('extra file', file.id)
				const update: ZRowUpdate = {
					event: 'delete',
					row: { id: file.id },
					table: 'file',
				}
				this.store.updateCommittedData(update)
				this.broadcast({ type: 'update', update: update })
				continue
			}
		}
	}

	async addGuestFile(fileOrId: string | TlaFile) {
		const file =
			typeof fileOrId === 'string'
				? await this.db.selectFrom('file').where('id', '=', fileOrId).selectAll().executeTakeFirst()
				: fileOrId
		if (!file) return
		if (file.ownerId !== this.userId && !file.shared) return
		const update: ZRowUpdate = {
			event: 'insert',
			row: file,
			table: 'file',
		}
		this.store.updateCommittedData(update)
		this.broadcast({ type: 'update', update })
	}

	async onInterval() {
		// if any mutations have been not been committed for 5 seconds, let's reboot the cache
		for (const mutation of this.mutations) {
			if (Date.now() - mutation.timestamp > 5000) {
				this.log.debug("Mutations haven't been committed for 5 seconds, rebooting", mutation)
				this.reboot({ hard: true })
				break
			}
		}
	}
}
