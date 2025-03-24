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
import { Kysely, sql } from 'kysely'
import throttle from 'lodash.throttle'
import { Logger } from './Logger'
import {
	fileKeys,
	fileStateKeys,
	getFetchUserDataSql,
	parseResultRow,
	userKeys,
} from './getFetchEverythingSql'
import { Environment, TLUserDurableObjectEvent, UserBootMode, getUserDoSnapshotKey } from './types'
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
			bufferedEvents: Array<ZReplicationEvent>
	  }
	| {
			type: 'connected'
			sequenceId: string
			lastSequenceNumber: number
	  }

const stateVersion = 1
interface StateSnapshot {
	version: number
	initialData: ZStoreData
	optimisticUpdates: Array<{
		updates: ZRowUpdate[]
		mutationId: string
	}>
	// v1
	sequenceId: string
	lastSequenceNumber: number
	timestamp: number
}

function migrateStateSnapshot(snapshot: StateSnapshot): void {
	if (snapshot.version === 0) {
		snapshot.version = 1
		snapshot.sequenceId = ''
		snapshot.lastSequenceNumber = 0
		snapshot.timestamp = 0
		if ('mutationNumber' in snapshot.initialData) {
			// whoops we accidentally included this in initialData in previous versions
			// let's remove it to be clean and tidy!
			delete snapshot.initialData.mutationNumber
		}
	}
}

const MUTATION_COMMIT_TIMEOUT = 10_000
export const LSN_COMMIT_TIMEOUT = 120_000

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
		this.reboot({ delay: false, mode: 'soft', source: 'constructor' })
		getReplicator(env).ping()

		const persist = throttle(
			async () => {
				const initialData = this.store.getCommittedData()
				if (initialData) {
					const snapshot: StateSnapshot = {
						version: stateVersion,
						initialData,
						optimisticUpdates: this.store.getOptimisticUpdates(),
						sequenceId: this.state.type === 'connected' ? this.state.sequenceId : '',
						lastSequenceNumber: this.state.type === 'connected' ? this.state.lastSequenceNumber : 0,
						timestamp: Date.now(),
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

	async reboot({ delay, source, mode }: { mode: UserBootMode; delay: boolean; source: string }) {
		this.numConsecutiveReboots++
		if (this.numConsecutiveReboots > 8) {
			this.logEvent({ type: 'user_do_abort', id: this.userId })
			getStatsDurableObjct(this.env).recordUserDoAbort()
			this.ctx.abort()
			return
		}
		this.log.debug('rebooting', source)
		this.logEvent({ type: 'reboot', id: this.userId })
		await this.queue.push(async () => {
			if (delay) {
				await sleep(Math.random() * 5000)
			}
			const controller = new AbortController()
			const bootPromise = this.boot({ mode, signal: controller.signal })
				.then(() => 'ok' as const)
				.catch((e) => {
					this.logEvent({ type: 'reboot_error', id: this.userId })
					this.log.debug('reboot error', e.stack)
					this.captureException(e, { source })
					return 'error' as const
				})
			const res = await Promise.race([
				bootPromise,
				sleep(30_000).then(() => {
					controller.abort()
					return 'timeout' as const
				}),
			])
			await bootPromise
			this.log.debug('rebooted', res)
			if (res === 'ok') {
				this.numConsecutiveReboots = 0
			} else {
				this.reboot({
					delay: true,
					mode: this.numConsecutiveReboots > 4 ? 'hard' : 'soft+reregister',
					source: source + '_retry',
				})
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

	private async loadInitialDataFromR2(signal: AbortSignal) {
		this.log.debug('loading snapshot from R2')
		const res = await this.env.USER_DO_SNAPSHOTS.get(getUserDoSnapshotKey(this.env, this.userId))
		if (signal.aborted) return null
		if (!res) {
			this.log.debug('no snapshot found')
			return null
		}
		const data = (await res.json()) as StateSnapshot
		if (signal.aborted) return null
		migrateStateSnapshot(data)
		if (data.version !== stateVersion) {
			this.log.debug('snapshot version mismatch')
			return null
		}
		const { lastSequenceNumber, sequenceId, timestamp } = data
		this.log.debug('loaded snapshot from R2', { lastSequenceNumber, sequenceId, timestamp })
		this.logEvent({ type: 'found_snapshot', id: this.userId })
		return data
	}

	private async loadInitialDataFromPostgres(mode: UserBootMode, signal: AbortSignal) {
		this.logEvent({ type: `full_data_fetch_${mode}`, id: this.userId })
		this.log.debug('fetching fresh initial data from postgres')
		// if the bootId changes during the boot process, we should stop silently
		const userSql = getFetchUserDataSql(this.userId)
		const initialData: ZStoreData = {
			user: null as any,
			files: [],
			fileStates: [],
			lsn: '0/0',
		}
		// we connect to pg via a pooler, so in the case that the pool is exhausted
		// we need to retry the connection. (also in the case that a neon branch is asleep apparently?)
		await retryOnConnectionFailure(
			async () => {
				// sync initial data
				if (signal.aborted) return
				initialData.user = null as any
				initialData.files = []
				initialData.fileStates = []

				await this.db.transaction().execute(async (tx) => {
					const result = await userSql.execute(tx)
					if (signal.aborted) return
					result.rows.forEach((row: any) => {
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
			sequenceId: '',
			lastSequenceNumber: 0,
			timestamp: 0,
		} satisfies StateSnapshot
	}

	private async boot({ mode, signal }: { mode: UserBootMode; signal: AbortSignal }): Promise<void> {
		this.log.debug('booting mode:', mode)

		const start = Date.now()
		this.state = {
			type: 'connecting',
			bufferedEvents: [],
		}

		const hasStoreData = !!this.store.getCommittedData()

		// if this is the first boot since the constructor ran, or if we're in hard mode
		// we need to load data
		if (!hasStoreData || mode === 'hard') {
			let res = null as { type: 'snapshot' | 'postgres'; data: StateSnapshot } | null
			if (mode !== 'hard') {
				const data = await this.loadInitialDataFromR2(signal)
				if (data) {
					res = { type: 'snapshot', data }
				}
			}

			if (signal.aborted) return

			if (!res) {
				res = {
					type: 'postgres' as const,
					data: await this.loadInitialDataFromPostgres(mode, signal),
				}
			}

			if (signal.aborted) return

			this.log.debug('got initial data')
			this.store.initialize(res.data.initialData, res.data.optimisticUpdates)
			this.broadcast({ type: 'initial_data', initialData: res.data.initialData })

			if (res.type === 'postgres') {
				// if we reset from postgres we have the latest data and optimistic updates
				// can all be cleared.
				this.commitMutations(+Infinity)
			}

			// We can skip registerUser if we're in soft mode (on DO launch), and if the snapshot that
			// we loaded was made recently enough that the replicator won't have pruned us yet.
			if (mode === 'soft' && Date.now() - res.data.timestamp < LSN_COMMIT_TIMEOUT * 2) {
				this._completeBoot({
					bufferedEvents: this.state.bufferedEvents,
					sequenceId: res.data.sequenceId,
					lastSequenceNumber: res.data.lastSequenceNumber,
					start,
				})
				return
			}
		}

		const initialData = this.store.getCommittedData()!

		const guestFileIds = initialData.files.filter((f) => f.ownerId !== this.userId).map((f) => f.id)
		const bootId = uniqueId()
		const res = await getReplicator(this.env).registerUser({
			userId: this.userId,
			lsn: initialData.lsn,
			guestFileIds,
			bootId,
		})

		if (signal.aborted) {
			this.log.debug('aborting because of timeout')
			return
		}

		if (res.type === 'reboot') {
			this.logEvent({ type: 'not_enough_history_for_fast_reboot', id: this.userId })
			if (mode === 'hard') throw new Error('reboot loop, waiting')
			return this.boot({ mode: 'hard', signal })
		}
		this._completeBoot({
			bufferedEvents: this.state.bufferedEvents,
			sequenceId: res.sequenceId,
			lastSequenceNumber: res.sequenceNumber,
			start,
		})
	}

	private _completeBoot(args: {
		bufferedEvents: ZReplicationEvent[]
		sequenceId: string
		lastSequenceNumber: number
		start: number
	}) {
		const bufferedEvents = args.bufferedEvents
		this.state = {
			type: 'connected',
			sequenceId: args.sequenceId,
			lastSequenceNumber: args.lastSequenceNumber,
		}

		if (bufferedEvents?.length > 0) {
			for (const event of bufferedEvents) {
				if (event.sequenceId !== args.sequenceId) {
					this.log.debug('ignoring irrelevant event', event)
					return
				}
				this.handleReplicationEvent(event)
			}
		}

		const end = Date.now()
		this.logEvent({ type: 'reboot_duration', id: this.userId, duration: end - args.start })
		this.log.debug('boot time', end - args.start, 'ms')
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
			this.reboot({
				// hard reboot because it's probably a data corruption issue
				mode: 'hard',
				delay: false,
				source: 'handleRowUpdateEvent',
			})
		}
	}

	// start with a random offset to avoid thundering herd
	lastLsnCommit = Date.now() + LSN_COMMIT_TIMEOUT + Math.random() * LSN_COMMIT_TIMEOUT

	handleReplicationEvent(event: ZReplicationEvent) {
		if (this.state.type === 'init') {
			this.log.debug('ignoring during init', event)
			return
		}

		// buffer events until we know the sequence numbers
		if (this.state.type === 'connecting') {
			this.log.debug('buffering event', event)
			this.state.bufferedEvents.push(event)
			return
		}

		if (this.state.sequenceId !== event.sequenceId) {
			// the replicator has a new replication slot, so we need to reregister
			this.log.debug('force reboot', this.state, event)
			this.reboot({ mode: 'soft+reregister', delay: false, source: 'force_reboot' })
			return
		}

		if (event.sequenceNumber !== this.state.lastSequenceNumber + 1) {
			// we missed a message or two, need to reregister
			this.log.debug(
				'sequence number mismatch',
				event.sequenceNumber,
				this.state.lastSequenceNumber
			)
			this.reboot({ mode: 'soft+reregister', delay: false, source: 'sequence_number_mismatch' })
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

			this.log.debug('committing lsn', event.lsn)
			this.lastLsnCommit = Date.now()
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
			if (Date.now() - mutation.timestamp > MUTATION_COMMIT_TIMEOUT) {
				this.log.debug("Mutations haven't been committed for 10 seconds, rebooting", mutation)
				this.reboot({
					// hard reboot, to wipe the optimistic updates
					mode: 'hard',
					delay: false,
					source: 'onInterval',
				})
				break
			}
		}

		if (this.lastLsnCommit < Date.now() - LSN_COMMIT_TIMEOUT) {
			this.log.debug('requesting lsn update', this.userId)
			sql`SELECT pg_logical_emit_message(true, 'requestLsnUpdate', ${this.userId});`
				.execute(this.db)
				.catch((e) => {
					this.log.debug('failed to request lsn update', e)
					this.captureException(e)
				})
			this.lastLsnCommit = Date.now()
		}
	}
}
