import {
	DB,
	OptimisticAppStore,
	TlaRow,
	ZEvent,
	ZServerSentMessage,
	ZStoreData,
	ZTable,
} from '@tldraw/dotcom-shared'
import {
	ExecutionQueue,
	assert,
	assertExists,
	promiseWithResolve,
	sleep,
	uniqueId,
} from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { Kysely } from 'kysely'
import { Logger } from './Logger'
import {
	fileKeys,
	fileStateKeys,
	getFetchUserDataSql,
	parseResultRow,
	userKeys,
} from './getFetchEverythingSql'
import { Environment, TLUserDurableObjectEvent } from './types'
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
			promise: PromiseWithResolve
			bufferedEvents: Array<ZReplicationEvent>
	  }
	| {
			type: 'connected'
			bootId: string
			sequenceId: string
			lastSequenceNumber: number
	  }

export class UserDataSyncer {
	state: BootState = {
		type: 'init',
		promise: promiseWithResolve(),
	}

	store = new OptimisticAppStore()
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

	interval: NodeJS.Timeout | null = null

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
		this.reboot(false)
	}

	maybeStartInterval() {
		if (!this.interval) {
			this.interval = setInterval(() => this.__rebootIfMutationsNotCommitted(), 1000)
		}
	}

	stopInterval() {
		if (this.interval) {
			clearInterval(this.interval)
			this.interval = null
		}
	}

	private queue = new ExecutionQueue()

	numConsecutiveReboots = 0

	async reboot(delay = true) {
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
				this.boot().then(() => 'ok'),
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
				this.reboot()
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

	private async boot() {
		this.log.debug('booting')
		// todo: clean up old resources if necessary?
		const start = Date.now()
		this.state = {
			type: 'connecting',
			// preserve the promise so any awaiters do eventually get resolved
			// TODO: set a timeout on the promise?
			promise: 'promise' in this.state ? this.state.promise : promiseWithResolve(),
			bootId: uniqueId(),
			bufferedEvents: [],
		}
		/**
		 * BOOTUP SEQUENCE
		 * 1. Generate a unique boot id
		 * 2. Subscribe to all changes
		 * 3. Fetch all data and write the boot id in a transaction
		 * 4. If we receive events before the boot id update comes through, ignore them
		 * 5. If we receive events after the boot id comes through but before we've finished
		 *    fetching all data, buffer them and apply them after we've finished fetching all data.
		 *    (not sure this is possible, but just in case)
		 * 6. Once we've finished fetching all data, apply any buffered events
		 */

		// if the bootId changes during the boot process, we should stop silently
		const userSql = getFetchUserDataSql(this.userId)
		const initialData: ZStoreData = {
			user: null as any,
			files: [],
			fileStates: [],
		}
		let mutationNumber = 0
		let lsn = '0/0'
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
							case 'meta':
								assert(typeof row.mutationNumber === 'number', 'mutationNumber should be a number')
								assert(typeof row.lsn === 'string', 'lsn should be a string')
								mutationNumber = row.mutationNumber
								lsn = row.lsn
								break
						}
					})
				})
			},
			() => {
				this.logEvent({ type: 'connect_retry', id: this.userId })
			}
		)

		this.log.debug('got initial data')
		this.store.initialize(initialData)
		this.state.promise.resolve(null)
		// do an unnecessary assign here to tell typescript that the state might have changed
		const guestFileIds = initialData.files.filter((f) => f.ownerId !== this.userId).map((f) => f.id)
		const res = await getReplicator(this.env).registerUser({
			userId: this.userId,
			lsn,
			guestFileIds,
			bootId: this.state.bootId,
		})

		if (res.type === 'reboot') {
			// TODO: clear the db
			this.store = new OptimisticAppStore()
			throw new Error('reboot')
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
			this.broadcast({
				type: 'initial_data',
				initialData: assertExists(this.store.getCommittedData()),
			})
		}

		this.commitMutations(mutationNumber)
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
		if (this.state.type === 'init') return

		// ignore irrelevant events
		if (!event.sequenceId.endsWith(this.state.bootId)) return

		// buffer events until we know the sequence numbers
		if (this.state.type === 'connecting') {
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

		for (const ev of event.changes) {
			if (ev.type === 'mutation_commit') {
				this.commitMutations(ev.mutationNumber)
				continue
			}

			assert(ev.type === 'row_update', `event type should be row_update got ${event.type}`)
			this.handleRowUpdateEvent(ev)
		}
	}

	async getInitialData() {
		if (this.state.type === 'connecting') {
			await this.state.promise
		}
		const data = this.store.getCommittedData()
		assert(data, 'data should be defined')
		return data
	}

	private __rebootIfMutationsNotCommitted() {
		// if any mutations have been not been committed for 5 seconds, let's reboot the cache
		for (const mutation of this.mutations) {
			if (Date.now() - mutation.timestamp > 5000) {
				this.log.debug("Mutations haven't been committed for 5 seconds, rebooting")
				this.reboot()
				break
			}
		}
	}
}
