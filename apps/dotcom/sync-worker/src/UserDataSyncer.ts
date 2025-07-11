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
import { TopicSubscriptionTree, getSubscriptionChanges } from './replicator/Subscription'
import {
	USER_REGISTRATION_MESSAGE_PREFIX,
	USER_REGISTRATION_VERSION,
	UserRegistrationNotification,
} from './replicator/replicatorTypes'
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
			type: 'connecting_soft'
			bootId: string
			bufferedEvents: Array<ZReplicationEvent>
	  }
	| {
			type: 'connecting_hard'
			bootId: string
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
		this.logEvent({ type: 'fast_resume', id: this.userId })
		return data
	}

	private async loadInitialDataFromPostgres(signal: AbortSignal, bootId: string) {
		this.logEvent({ type: 'full_data_fetch_hard', id: this.userId })
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

					// Extract topic subscriptions and send notification
					const topicSubscriptions: TopicSubscriptionTree = {}
					for (const file_state of initialData.file_state) {
						topicSubscriptions[`file:${file_state.fileId}`] = 1
					}

					// Send notification to replicator to register user
					const notificationPayload: UserRegistrationNotification = {
						version: USER_REGISTRATION_VERSION,
						userId: this.userId,
						bootId,
						topicSubscriptions,
					}
					this.log.debug('sending user registration notification', notificationPayload)

					await tx.executeQuery(
						CompiledQuery.raw(`SELECT pg_logical_emit_message(true, $1, $2)`, [
							USER_REGISTRATION_MESSAGE_PREFIX,
							JSON.stringify(notificationPayload),
						])
					)
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

	private async hardBoot(signal: AbortSignal) {
		this.state = {
			type: 'connecting_hard',
			bootId: uniqueId(),
		}

		const res = await this.loadInitialDataFromPostgres(signal, this.state.bootId)
		if (signal.aborted) return
		this.store.initialize(res.initialData, [])

		// Wait for the state to change to connected, this allows the timeout logic
		// in the caller to abort the boot process
		while (!signal.aborted && (this.state as BootState).type !== 'connected') {
			await sleep(50)
		}
	}

	private async softBoot(signal: AbortSignal) {
		const bufferedEvents: ZReplicationEvent[] = []
		this.state = {
			type: 'connecting_soft',
			bootId: uniqueId(),
			bufferedEvents,
		}
		const res = await this.loadInitialDataFromR2(signal)
		if (signal.aborted) return
		if (!res) {
			return this.boot(true, signal)
		}

		this.store.initialize(res.initialData, res.optimisticUpdates)
		this.broadcast({
			type: 'initial_data',
			initialData: res.initialData,
		})

		if (
			res.sequenceId === notASequenceId ||
			!(await getReplicator(this.env).resumeSequence({
				userId: this.userId,
				sequenceId: res.sequenceId,
				lastSequenceNumber: res.lastSequenceNumber,
			}))
		) {
			if (signal.aborted) return
			return this.boot(true, signal)
		}

		this.state = {
			type: 'connected',
			bootId: this.state.bootId,
			sequenceId: res.sequenceId,
			lastSequenceNumber: res.lastSequenceNumber,
		}

		for (const event of bufferedEvents) {
			this.handleReplicationEvent(event)
		}
	}

	/**
	 * Boot logic for UserDataSyncer with two-phase initialization:
	 *
	 * 1. SOFT BOOT (hard=false): Attempts fast resume from R2 snapshot
	 *    - Loads cached state from R2 storage
	 *    - Tries to resume replication sequence from replicator
	 *    - Falls back to hard boot if snapshot is missing/invalid or sequence resume fails
	 *    - Immediately transitions to 'connected' state and processes buffered events
	 *
	 * 2. HARD BOOT (hard=true): Full initialization from PostgreSQL
	 *    - Fetches fresh data directly from database
	 *    - Sends user registration notification to replicator
	 *    - Transitions to 'connecting_hard' state, waiting for first replication event
	 *    - Only becomes 'connected' when first event arrives with sequence info
	 *
	 * State transitions:
	 * - 'connecting': Events are buffered, waiting for sequence info
	 * - 'connecting_hard': Waiting for first replication event after hard boot
	 * - 'connected': Fully operational, processing events in sequence
	 *
	 * The bootId ensures events from previous boot attempts are ignored,
	 * and sequence numbers guarantee ordered event processing.
	 */
	private async boot(hard: boolean, signal: AbortSignal): Promise<void> {
		this.log.debug('boot hard:', hard)
		const start = Date.now()
		// fine to discard previous buffered events because we're generating a new bootId

		if (hard) {
			await this.hardBoot(signal)
		} else {
			await this.softBoot(signal)
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
			this.log.debug('ignoring irrelevant event', event.sequenceId, this.state.bootId)
			return
		}

		// buffer events until we know the sequence numbers
		if (this.state.type === 'connecting_soft') {
			this.log.debug('buffering event', event)
			this.state.bufferedEvents.push(event)
			return
		}

		if (this.state.type === 'connecting_hard') {
			// connected now
			this.state = {
				type: 'connected',
				bootId: this.state.bootId,
				sequenceId: event.sequenceId,
				lastSequenceNumber: event.sequenceNumber - 1,
			}
		}

		assert(this.state.type === 'connected', 'state should be connected now')

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

		if (topicUpdates.removedSubscriptions && topicUpdates.removedSubscriptions.length > 0) {
			this.reboot({
				hard: true,
				delay: false,
				source: 'handleReplicationEvent(removed subscription)',
			})
			return
		}

		// if we encounter a new subscription for the user to a file, and the file is not in the store,
		// we can add the file to the store directly instead of doing a hard reboot
		for (const update of topicUpdates.newSubscriptions ?? []) {
			// Only handle user-to-file subscriptions, reboot for everything else
			if (update.fromTopic === `user:${this.userId}` && update.toTopic.startsWith('file:')) {
				const fileId = update.toTopic.split(':')[1]
				if (!this.store.getCommittedData()?.file.find((f) => f.id === fileId)) {
					this.log.debug('new subscription, adding guest file', fileId)
					this.addGuestFile(fileId)
				}
			} else {
				this.reboot({
					hard: true,
					delay: false,
					source: 'handleReplicationEvent(new subscription)',
				})
				return
			}
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
		assert('bootId' in this.state, 'bootId should be in state')
		const bootId = this.state.bootId
		const file =
			typeof fileOrId === 'string'
				? await this.db.selectFrom('file').where('id', '=', fileOrId).selectAll().executeTakeFirst()
				: fileOrId
		if (!file) return
		if (file.ownerId !== this.userId && !file.shared) return
		if (this.state.bootId !== bootId) return
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
