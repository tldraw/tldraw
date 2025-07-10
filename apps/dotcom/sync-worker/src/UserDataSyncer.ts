import {
	DB,
	OptimisticAppStore,
	TlaFile,
	TlaRow,
	ZEvent,
	ZRowUpdate,
	ZServerSentPacket,
	ZStoreData,
	ZStoreDataV1,
	ZTable,
} from '@tldraw/dotcom-shared'
import { react, transact } from '@tldraw/state'
import { ExecutionQueue, assert, promiseWithResolve, sleep, uniqueId } from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { CompiledQuery, Kysely, sql } from 'kysely'
import throttle from 'lodash.throttle'
import { Logger } from './Logger'
import { fetchEverythingSql } from './fetchEverythingSql.snap'
import { parseResultRow } from './parseResultRow'
import { getSubscriptionChanges } from './replicator/Subscription'
import { Environment, TLUserDurableObjectEvent, getUserDoSnapshotKey } from './types'
import { getReplicator, getStatsDurableObjct } from './utils/durableObjects'
import { retryOnConnectionFailure } from './utils/retryOnConnectionFailure'
type PromiseWithResolve = ReturnType<typeof promiseWithResolve>

export interface ZRowUpdateEvent {
	type: 'row_update'
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

const stateVersion = 2
interface StateSnapshot {
	version: number
	initialData: ZStoreData
	optimisticUpdates: Array<{
		updates: ZRowUpdate[]
		mutationId: string
	}>
	sequenceId: string
	lastSequenceNumber: number
}

const notASequenceId = 'not_a_sequence'

function migrateStateSnapshot(snapshot: any) {
	if (snapshot.version === 0) {
		snapshot.version = 1
		const data = snapshot.initialData as ZStoreDataV1
		snapshot.initialData = {
			lsn: data.lsn,
			user: [data.user],
			file: data.files,
			file_state: data.fileStates,
		} satisfies ZStoreData
	}

	if (snapshot.version === 1) {
		snapshot.version = 2
		snapshot.sequenceId = notASequenceId
		snapshot.lastSequenceNumber = 0
	}
}

const MUTATION_COMMIT_TIMEOUT = 10_000
const LSN_COMMIT_TIMEOUT = 120_000

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
		private broadcast: (message: ZServerSentPacket) => void,
		private logEvent: (event: TLUserDurableObjectEvent) => void,
		private log: Logger
	) {
		this.sentry = createSentry(ctx, env)
		this.reboot({ delay: false, source: 'constructor' })
		const persist = throttle(
			async () => {
				if (this.state.type !== 'connected') return
				const initialData = this.store.getCommittedData()
				if (initialData) {
					const snapshot: StateSnapshot = {
						version: stateVersion,
						initialData,
						optimisticUpdates: this.store.getOptimisticUpdates(),
						sequenceId: this.state.sequenceId,
						lastSequenceNumber: this.state.lastSequenceNumber,
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

	async reboot({
		delay = true,
		hard = false,
		source,
	}: {
		delay?: boolean
		hard?: boolean
		source: string
	}) {
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
			const bootPromise = this.boot(hard, controller.signal)
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
				this.reboot({ hard: this.numConsecutiveReboots > 4, source: source + '_retry' })
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
			this.log.debug('snapshot version mismatch', data.version, stateVersion)
			return null
		}
		this.log.debug('loaded snapshot from R2')
		this.logEvent({ type: 'found_snapshot', id: this.userId })
		return data
	}

	private async loadInitialDataFromPostgres(hard: boolean, signal: AbortSignal) {
		this.logEvent({ type: hard ? 'full_data_fetch_hard' : 'full_data_fetch', id: this.userId })
		this.log.debug('fetching fresh initial data from postgres')
		// if the bootId changes during the boot process, we should stop silently
		const initialData: ZStoreData & { mutationNumber?: number } = {
			user: [],
			file: [],
			file_state: [],
			lsn: '0/0',
			mutationNumber: 0,
		}
		// we connect to pg via a pooler, so in the case that the pool is exhausted
		// we need to retry the connection. (also in the case that a neon branch is asleep apparently?)
		await retryOnConnectionFailure(
			async () => {
				// sync initial data
				if (signal.aborted) return
				initialData.user = []
				initialData.file = []
				initialData.file_state = []

				await this.db.transaction().execute(async (tx) => {
					const result = await tx.executeQuery(CompiledQuery.raw(fetchEverythingSql, [this.userId]))
					assert(this.state.type === 'connecting', 'state should be connecting in boot')
					if (signal.aborted) return
					for (const _row of result.rows) {
						const { table, row } = parseResultRow(_row)
						switch (table) {
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
							default:
								initialData[table].push(row)
						}
					}
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
			sequenceId: notASequenceId,
			lastSequenceNumber: 0,
		} satisfies StateSnapshot
	}

	private async boot(hard: boolean, signal: AbortSignal): Promise<void> {
		this.log.debug('boot hard:', hard)
		// todo: clean up old resources if necessary?
		const start = Date.now()
		this.state = {
			type: 'connecting',
			// preserve the promise so any awaiters do eventually get resolved
			bootId: uniqueId(),
			bufferedEvents: [],
		}
		let resumeData: { sequenceId: string; lastSequenceNumber: number } | null = null
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
				(!hard && (await this.loadInitialDataFromR2(signal))) ||
				(await this.loadInitialDataFromPostgres(hard, signal))

			if (signal.aborted) return

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
			if (res.sequenceId !== notASequenceId) {
				resumeData = { sequenceId: res.sequenceId, lastSequenceNumber: res.lastSequenceNumber }
			}
		}

		const initialData = this.store.getCommittedData()!

		const guestFileIds = initialData.file.filter((f) => f.ownerId !== this.userId).map((f) => f.id)

		if (
			!resumeData ||
			!(await getReplicator(this.env).resumeSequence({
				userId: this.userId,
				sequenceId: resumeData.sequenceId,
				lastSequenceNumber: resumeData.lastSequenceNumber,
			}))
		) {
			const res = await getReplicator(this.env).registerUser({
				userId: this.userId,
				lsn: initialData.lsn,
				guestFileIds,
				bootId: this.state.bootId,
			})

			if (signal.aborted) {
				this.log.debug('aborting because of timeout')
				return
			}

			if (res.type === 'reboot') {
				this.logEvent({ type: 'not_enough_history_for_fast_reboot', id: this.userId })
				if (hard) throw new Error('reboot loop, waiting')
				return this.boot(true, signal)
			}
			resumeData = { sequenceId: res.sequenceId, lastSequenceNumber: res.sequenceNumber }
		}

		const bufferedEvents = this.state.bufferedEvents
		this.state = {
			type: 'connected',
			bootId: this.state.bootId,
			sequenceId: resumeData.sequenceId,
			lastSequenceNumber: resumeData.lastSequenceNumber,
		}

		if (bufferedEvents.length > 0) {
			bufferedEvents.forEach((event) => this.handleReplicationEvent(event))
		}

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
			this.reboot({ source: 'handleRowUpdateEvent' })
		}
	}

	// start with a random offset to avoid thundering herd
	lastLsnCommit = Date.now() + LSN_COMMIT_TIMEOUT + Math.random() * LSN_COMMIT_TIMEOUT

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
			this.reboot({ source: 'handleReplicationEvent(force reboot)' })
			return
		}

		if (event.sequenceNumber !== this.state.lastSequenceNumber + 1) {
			this.log.debug(
				'sequence number mismatch',
				event.sequenceNumber,
				this.state.lastSequenceNumber
			)
			this.reboot({ source: 'handleReplicationEvent(sequence number mismatch)' })
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

		// do a hard reboot if any topic subscriptions changed
		const topicUpdates = getSubscriptionChanges(
			event.changes
				.filter((c): c is ZRowUpdateEvent => c.type === 'row_update')
				.map((ev) => ({ row: ev.row, event: { command: ev.event, table: ev.table } }))
		)

		if (topicUpdates.newSubscriptions?.length || topicUpdates.removedSubscriptions?.length) {
			this.reboot({ hard: true, delay: false, source: 'handleReplicationEvent(hard reboot)' })
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
				this.reboot({ hard: true, source: 'onInterval' })
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
