import {
	DB,
	OptimisticAppStore,
	TlaRow,
	ZEvent,
	ZServerSentMessage,
	ZStoreData,
	ZTable,
} from '@tldraw/dotcom-shared'
import { ExecutionQueue, assert, promiseWithResolve, sleep, uniqueId } from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { Kysely } from 'kysely'
import { TLPostgresReplicator } from './TLPostgresReplicator'
import {
	fileKeys,
	fileStateKeys,
	getFetchUserDataSql,
	parseResultRow,
	userKeys,
} from './getFetchEverythingSql'
import { Environment, TLUserDurableObjectEvent } from './types'
import { getReplicator } from './utils/durableObjects'
import { retryOnConnectionFailure } from './utils/retryOnConnectionFailure'
type PromiseWithResolve = ReturnType<typeof promiseWithResolve>

export interface ZRowUpdateEvent {
	type: 'row_update'
	userId: string
	// A unique id for the replicator's unbroken sequence of events.
	// If the replicator fails and restarts, this id will change.
	// And in that case the user DO should reboot.
	sequenceId: string
	sequenceNumber: number
	row: TlaRow
	table: ZTable
	event: ZEvent
}

export interface ZBootCompleteEvent {
	type: 'boot_complete'
	userId: string
	sequenceId: string
	sequenceNumber: number
	bootId: string
}

export interface ZMutationCommit {
	type: 'mutation_commit'
	userId: string
	mutationNumber: number
	// if the sequence id changes make sure we still handle the mutation commit
	sequenceId: string
	sequenceNumber: number
}
export interface ZForceReboot {
	type: 'force_reboot'
	sequenceId: string
	sequenceNumber: number
}

export type ZReplicationEvent =
	| ZRowUpdateEvent
	| ZBootCompleteEvent
	| ZMutationCommit
	| ZForceReboot

export type ZReplicationEventWithoutSequenceInfo =
	| Omit<ZRowUpdateEvent, 'sequenceNumber' | 'sequenceId'>
	| Omit<ZBootCompleteEvent, 'sequenceNumber' | 'sequenceId'>
	| Omit<ZMutationCommit, 'sequenceNumber' | 'sequenceId'>
	| Omit<ZForceReboot, 'sequenceNumber' | 'sequenceId'>

type BootState =
	| {
			type: 'init'
			promise: PromiseWithResolve
	  }
	| {
			type: 'connecting'
			bootId: string
			sequenceId: string
			lastSequenceNumber: number
			promise: PromiseWithResolve
			bufferedEvents: Array<ZReplicationEvent>
			didGetBootId: boolean
			data: null | ZStoreData
			mutationNumber: number
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
	replicator: TLPostgresReplicator

	store = new OptimisticAppStore()
	mutations: { mutationNumber: number; mutationId: string }[] = []

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
		ctx: DurableObjectState,
		env: Environment,
		private db: Kysely<DB>,
		private userId: string,
		private broadcast: (message: ZServerSentMessage) => void,
		private logEvent: (event: TLUserDurableObjectEvent) => void
	) {
		this.sentry = createSentry(ctx, env)
		this.replicator = getReplicator(env)
		this.reboot(false)
	}

	private debug(...args: any[]) {
		// uncomment for dev time debugging
		// console.log('[UserDataSyncer]:', ...args)
		if (this.sentry) {
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			this.sentry.addBreadcrumb({
				message: `[UserDataSyncer]: ${args.join(' ')}`,
			})
		}
	}

	private queue = new ExecutionQueue()

	async reboot(delay = true) {
		this.debug('rebooting')
		this.logEvent({ type: 'reboot', id: this.userId })
		await this.queue.push(async () => {
			if (delay) {
				await sleep(1000)
			}
			try {
				await this.boot()
			} catch (e) {
				this.logEvent({ type: 'reboot_error', id: this.userId })
				this.captureException(e)
				this.reboot()
			}
		})
	}

	private commitMutations(upToAndIncludingNumber: number) {
		this.debug('commit mutations', this.userId, upToAndIncludingNumber, this.mutations)
		const mutationIds = this.mutations
			.filter((m) => m.mutationNumber <= upToAndIncludingNumber)
			.map((m) => m.mutationId)
		this.mutations = this.mutations.filter((m) => m.mutationNumber > upToAndIncludingNumber)
		this.store.commitMutations(mutationIds)
		this.broadcast({ type: 'commit', mutationIds: mutationIds })
	}

	private updateStateAfterBootStep() {
		assert(this.state.type === 'connecting', 'state should be connecting')
		if (this.state.didGetBootId && this.state.data) {
			// we got everything, so we can set the state to connected and apply any buffered events
			const promise = this.state.promise
			const bufferedEvents = this.state.bufferedEvents
			const data = this.state.data
			const mutationNumber = this.state.mutationNumber
			this.state = {
				type: 'connected',
				bootId: this.state.bootId,
				sequenceId: this.state.sequenceId,
				lastSequenceNumber: this.state.lastSequenceNumber,
			}
			this.store.initialize(data)

			if (bufferedEvents.length > 0) {
				bufferedEvents.forEach((event) => this.handleReplicationEvent(event))
			}
			promise.resolve(null)
			this.broadcast({
				type: 'initial_data',
				initialData: data,
			})
			this.commitMutations(mutationNumber)
		}
		return this.state
	}

	private async boot() {
		this.debug('booting')
		// todo: clean up old resources if necessary?
		const start = Date.now()
		const { sequenceId, sequenceNumber } = await this.replicator.registerUser(this.userId)
		this.debug('registered user, sequenceId:', sequenceId)
		this.state = {
			type: 'connecting',
			// preserve the promise so any awaiters do eventually get resolved
			// TODO: set a timeout on the promise?
			promise: 'promise' in this.state ? this.state.promise : promiseWithResolve(),
			bootId: uniqueId(),
			sequenceId,
			lastSequenceNumber: sequenceNumber,
			bufferedEvents: [],
			didGetBootId: false,
			data: null,
			mutationNumber: 0,
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
		const bootId = this.state.bootId

		const promise = this.state.promise

		const userSql = getFetchUserDataSql(this.userId, bootId)
		const initialData: ZStoreData = {
			user: null as any,
			files: [],
			fileStates: [],
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
							case 'user_mutation_number':
								assert(typeof row.mutationNumber === 'number', 'mutationNumber should be a number')
								this.state.mutationNumber = row.mutationNumber
								break
						}
					})
				})
			},
			() => {
				this.logEvent({ type: 'connect_retry', id: this.userId })
			}
		)

		this.state.data = initialData
		// do an unnecessary assign here to tell typescript that the state might have changed
		this.debug('got initial data')
		this.state = this.updateStateAfterBootStep()
		// this will prevent more events from being added to the buffer

		await promise
		const end = Date.now()
		this.logEvent({ type: 'reboot_duration', id: this.userId, duration: end - start })
		this.debug('boot time', end - start, 'ms')
		assert(this.state.type === 'connected', 'state should be connected after boot')
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
		if (
			event.type === 'force_reboot' ||
			('sequenceId' in this.state && this.state.sequenceId !== event.sequenceId)
		) {
			// the replicator has restarted, so we need to reboot
			this.debug('force reboot', this.state, event)
			this.reboot()
			return
		}
		assert(this.state.type !== 'init', 'state should not be init: ' + event.type)
		if (event.sequenceNumber !== this.state.lastSequenceNumber + 1) {
			this.debug('sequence number mismatch', event.sequenceNumber, this.state.lastSequenceNumber)
			this.reboot()
			return
		}
		this.state.lastSequenceNumber++

		if (event.type === 'mutation_commit') {
			this.commitMutations(event.mutationNumber)
			return
		}

		if (this.state.type === 'connected') {
			assert(event.type === 'row_update', `event type should be row_update got ${event.type}`)
			this.handleRowUpdateEvent(event)
			return
		}

		assert(this.state.type === 'connecting')
		this.debug('got event', event, this.state.didGetBootId, this.state.bootId)
		if (this.state.didGetBootId) {
			// we've already got the boot id, so just shove things into
			// a buffer until the state is set to 'connecting'
			this.state.bufferedEvents.push(event)
		} else if (event.type === 'boot_complete' && event.bootId === this.state.bootId) {
			this.state.didGetBootId = true
			this.debug('got boot id')
			this.updateStateAfterBootStep()
		}
		// ignore other events until we get the boot id
	}

	async waitUntilConnected() {
		while (this.state.type !== 'connected') {
			await this.state.promise
		}
	}
}
