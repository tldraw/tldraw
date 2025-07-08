import { DB, TlaFile } from '@tldraw/dotcom-shared'
import {
	ExecutionQueue,
	assert,
	assertExists,
	exhaustiveSwitchError,
	promiseWithResolve,
	sleep,
	throttle,
	uniqueId,
} from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { Kysely, sql } from 'kysely'

import { LogicalReplicationService, Wal2Json, Wal2JsonPlugin } from 'pg-logical-replication'
import { Logger } from './Logger'
import { ZReplicationEventWithoutSequenceInfo } from './UserDataSyncer'
import { createPostgresConnectionPool } from './postgres'
import { getR2KeyForRoom } from './r2'
import { LiveChangeCollator, buildTopicsString, getTopics } from './replicator/ChangeCollator'
import { getSubscriptionChanges, serializeSubscriptions } from './replicator/Subscription'
import { getResumeType } from './replicator/getResumeType'
import { pruneTopicSubscriptionsSql } from './replicator/pruneTopicSubscriptions'
import { migrate } from './replicator/replicatorMigrations'
import { ChangeV2, ReplicationEvent, relevantTables } from './replicator/replicatorTypes'
import {
	Analytics,
	Environment,
	TLPostgresReplicatorEvent,
	TLPostgresReplicatorRebootSource,
} from './types'
import { EventData, writeDataPoint } from './utils/analytics'
import {
	getRoomDurableObject,
	getStatsDurableObjct,
	getUserDurableObject,
} from './utils/durableObjects'

const ONE_MINUTE = 60 * 1000
// IMPORTANT prune interval needs to be at least twice as big as the lsn update request timeout
// otherwise we might prune users who are still connected.
const PRUNE_INTERVAL = 10 * ONE_MINUTE
const MAX_HISTORY_ROWS = 20_000

type PromiseWithResolve = ReturnType<typeof promiseWithResolve>

type BootState =
	| {
			type: 'init'
			promise: PromiseWithResolve
	  }
	| {
			type: 'connecting'
			promise: PromiseWithResolve
	  }
	| {
			type: 'connected'
	  }

export class TLPostgresReplicator extends DurableObject<Environment> {
	private sqlite: SqlStorage
	private state: BootState
	private measure: Analytics | undefined
	private postgresUpdates = 0
	private lastPostgresMessageTime = Date.now()
	private lastRpmLogTime = Date.now()
	private lastUserPruneTime = Date.now()

	// we need to guarantee in-order delivery of messages to users
	// but DO RPC calls are not guaranteed to happen in order, so we need to
	// use a queue per user
	private userDispatchQueues: Map<string, ExecutionQueue> = new Map()

	sentry
	// eslint-disable-next-line local/prefer-class-methods
	private captureException = (exception: unknown, extras?: Record<string, unknown>) => {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		this.sentry?.withScope((scope) => {
			if (extras) scope.setExtras(extras)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			this.sentry?.captureException(exception) as any
		})
		this.log.debug('ERROR', (exception as any)?.stack ?? exception)
		if (!this.sentry) {
			console.error(`[TLPostgresReplicator]: `, exception)
		}
	}

	private log

	private readonly replicationService
	private readonly slotName
	private readonly wal2jsonPlugin = new Wal2JsonPlugin({
		addTables:
			'public.user,public.file,public.file_state,public.user_mutation_number,public.replicator_boot_id',
	})

	private readonly db: Kysely<DB>
	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)
		this.measure = env.MEASURE
		this.sentry = createSentry(ctx, env)
		this.sqlite = this.ctx.storage.sql
		this.state = {
			type: 'init',
			promise: promiseWithResolve(),
		}

		const slotNameMaxLength = 63 // max postgres identifier length
		const slotNamePrefix = 'tlpr_' // pick something short so we can get more of the durable object id
		const durableObjectId = this.ctx.id.toString()
		this.slotName =
			slotNamePrefix + durableObjectId.slice(0, slotNameMaxLength - slotNamePrefix.length)

		this.log = new Logger(env, 'TLPostgresReplicator', this.sentry)
		this.db = createPostgresConnectionPool(env, 'TLPostgresReplicator', 100)

		this.replicationService = new LogicalReplicationService(
			/**
			 * node-postgres Client options for connection
			 * https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/pg/index.d.ts#L16
			 */
			{
				database: 'postgres',
				connectionString: env.BOTCOM_POSTGRES_CONNECTION_STRING,
				application_name: this.slotName,
			},
			/**
			 * Logical replication service config
			 * https://github.com/kibae/pg-logical-replication/blob/main/src/logical-replication-service.ts#L9
			 */
			{
				acknowledge: {
					auto: false,
					timeoutSeconds: 10,
				},
			}
		)

		this.alarm()
		this.ctx
			.blockConcurrencyWhile(async () => {
				await migrate(this.sqlite, this.log).catch((e) => {
					this.captureException(e)
					throw e
				})
				// if the slot name changed, we set the lsn to null, which will trigger a mass user DO reboot
				if (this.sqlite.exec('select slotName from meta').one().slotName !== this.slotName) {
					this.sqlite.exec('UPDATE meta SET slotName = ?, lsn = null', this.slotName)
				}
				await sql`SELECT pg_create_logical_replication_slot(${this.slotName}, 'wal2json') WHERE NOT EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name = ${this.slotName})`.execute(
					this.db
				)
				this.pruneHistory()
			})
			.then(() => {
				this.reboot('constructor', false).catch((e) => {
					this.captureException(e)
					this.__test__panic()
				})
			})
		// no need to catch since throwing in a blockConcurrencyWhile will trigger
		// a DO reboot
	}

	async __test__forceReboot() {
		this.reboot('test')
	}

	async __test__panic() {
		this.ctx.abort()
	}

	override async alarm() {
		try {
			this.ctx.storage.setAlarm(Date.now() + 3000)
			this.maybeLogRpm()
			// If we haven't heard anything from postgres for 5 seconds, trigger a heartbeat.
			// Otherwise, if we haven't heard anything for 10 seconds, do a soft reboot.
			if (Date.now() - this.lastPostgresMessageTime > 10000) {
				this.log.debug('rebooting due to inactivity')
				this.reboot('inactivity')
			} else if (Date.now() - this.lastPostgresMessageTime > 5000) {
				// this triggers a heartbeat
				this.log.debug('triggering heartbeat due to inactivity')
				await this.replicationService.acknowledge('0/0')
			}
			await this.maybePrune()
		} catch (e) {
			this.captureException(e)
		}
	}

	private async maybePrune() {
		const now = Date.now()
		if (now - this.lastUserPruneTime < PRUNE_INTERVAL) return
		this.logEvent({ type: 'prune' })
		this.log.debug('pruning')
		const cutoffTime = now - PRUNE_INTERVAL
		const usersWithoutRecentUpdates = this.ctx.storage.sql
			.exec('SELECT id FROM active_user WHERE lastUpdatedAt < ?', cutoffTime)
			.toArray() as {
			id: string
		}[]
		for (const { id } of usersWithoutRecentUpdates) {
			await this.unregisterUser(id)
		}
		this.pruneHistory()
		this.pruneTopicSubscriptions()
		this.lastUserPruneTime = Date.now()
	}

	private pruneHistory() {
		this.sqlite.exec(`
      WITH max AS (
        SELECT MAX(rowid) AS max_id FROM history
      )
      DELETE FROM history
      WHERE rowid < (SELECT max_id FROM max) - ${MAX_HISTORY_ROWS};
    `)
	}

	private pruneTopicSubscriptions() {
		// Use a temp table + index for fast lookups during the delete
		this.ctx.storage.transactionSync(() => {
			this.sqlite.exec(pruneTopicSubscriptionsSql)
		})
	}

	private maybeLogRpm() {
		const now = Date.now()
		if (this.postgresUpdates > 0 && now - this.lastRpmLogTime > ONE_MINUTE) {
			this.logEvent({
				type: 'rpm',
				rpm: this.postgresUpdates,
			})
			this.postgresUpdates = 0
			this.lastRpmLogTime = now
		}
	}

	async getDiagnostics() {
		const earliestHistoryRow = this.sqlite
			.exec<{ timestamp: number }>('select * from history order by rowid asc limit 1')
			.toArray()[0]
		const latestHistoryRow = this.sqlite
			.exec<{ timestamp: number }>('select * from history order by rowid desc limit 1')
			.toArray()[0]
		const numHistoryRows = this.sqlite.exec('select count(*) from history').one().count as number
		const numTopicSubscriptions = this.sqlite.exec('select count(*) from topic_subscription').one()
			.count as number
		const activeUsers = this.sqlite.exec('select count(*) from active_user').one().count as number
		const meta = this.sqlite.exec('select * from meta').one()
		return {
			earliestHistoryRow,
			latestHistoryRow,
			historyDurationMinutes: (latestHistoryRow.timestamp - earliestHistoryRow.timestamp) / 60_000,
			numHistoryRows,
			numTopicSubscriptions,
			activeUsers,
			meta,
		}
	}

	private queue = new ExecutionQueue()

	private async reboot(source: TLPostgresReplicatorRebootSource, delay = true) {
		this.logEvent({ type: 'reboot', source })
		if (!this.queue.isEmpty()) {
			this.log.debug('reboot is already in progress.', source)
			return
		}
		this.log.debug('reboot push', source)
		await this.queue.push(async () => {
			if (delay) {
				await sleep(2000)
			}
			const start = Date.now()
			this.log.debug('rebooting', source)
			const res = await Promise.race([
				this.boot().then(() => 'ok'),
				sleep(3000).then(() => 'timeout'),
			]).catch((e) => {
				this.logEvent({ type: 'reboot_error' })
				this.log.debug('reboot error', e.stack)
				this.captureException(e)
				return 'error'
			})
			this.log.debug('rebooted', res)
			if (res === 'ok') {
				this.logEvent({ type: 'reboot_duration', duration: Date.now() - start })
			} else {
				getStatsDurableObjct(this.env).recordReplicatorBootRetry()
				this.reboot('retry')
			}
		})
	}

	private async boot() {
		this.log.debug('booting')
		this.lastPostgresMessageTime = Date.now()
		this.replicationService.removeAllListeners()

		// stop any previous subscriptions both here and on the postgres side to make sure we will be allowed to connect
		// to the slot again.
		this.log.debug('stopping replication')
		this.replicationService.stop().catch(this.captureException)
		this.log.debug('terminating backend')
		await sql`SELECT pg_terminate_backend(active_pid) FROM pg_replication_slots WHERE slot_name = ${this.slotName} AND active`.execute(
			this.db
		)
		this.log.debug('done')

		const promise = 'promise' in this.state ? this.state.promise : promiseWithResolve()
		this.state = {
			type: 'connecting',
			// preserve the promise so any awaiters do eventually get resolved
			// TODO: set a timeout on the promise?
			promise,
		}

		this.replicationService.on('heartbeat', (lsn: string) => {
			this.log.debug('heartbeat', lsn)
			this.lastPostgresMessageTime = Date.now()
			this.reportPostgresUpdate()
			// don't call this.updateLsn here because it's not necessary
			// to save the lsn after heartbeats since they contain no information
			this.replicationService.acknowledge(lsn).catch(this.captureException)
		})

		this.replicationService.addListener('data', (lsn: string, log: Wal2Json.Output) => {
			// ignore events received after disconnecting, if that can even happen
			try {
				if (this.state.type !== 'connected') return
				this.postgresUpdates++
				this.lastPostgresMessageTime = Date.now()
				this.reportPostgresUpdate()

				const changes: ChangeV2[] = []

				for (const _change of log.change) {
					if (_change.kind === 'message' && (_change as any).prefix === 'requestLsnUpdate') {
						this.requestLsnUpdate((_change as any).content)
						continue
					}
					const change = this.parseChange(_change)
					if (!change) {
						this.log.debug('IGNORING CHANGE', _change)
						continue
					}
					changes.push(change)
				}

				if (changes.length === 0) {
					return
				}

				const { newSubscriptions, removedSubscriptions } = getSubscriptionChanges(changes)

				this.log.debug('data', lsn, { changes, newSubscriptions, removedSubscriptions })

				this.ctx.storage.transactionSync(() => {
					this.sqlite.exec(
						'INSERT INTO history (lsn, changesJson, newSubscriptions, removedSubscriptions, topics, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
						lsn,
						JSON.stringify(changes),
						newSubscriptions && serializeSubscriptions(newSubscriptions),
						removedSubscriptions && serializeSubscriptions(removedSubscriptions),
						buildTopicsString(changes),
						Date.now()
					)

					const collator = new LiveChangeCollator(this.sqlite)

					// handle add ops first so that we get insertions for new topics
					if (newSubscriptions) {
						collator.addSubscriptions(newSubscriptions)
					}

					for (const change of changes) {
						collator.handleEvent(change)
					}

					// handle remove ops last so that we get deletions/updates for dying topics
					if (removedSubscriptions) {
						collator.removeSubscriptions(removedSubscriptions)
					}

					collator.effects.forEach((effect) => {
						switch (effect.type) {
							case 'publish':
								return this.publishSnapshot(effect.file)
							case 'unpublish':
								return this.unpublishSnapshot(effect.file)
							case 'notify_file_durable_object':
								switch (effect.command) {
									case 'insert':
										return getRoomDurableObject(this.env, effect.file.id).appFileRecordCreated(
											effect.file
										)
									case 'update':
										return getRoomDurableObject(this.env, effect.file.id).appFileRecordDidUpdate(
											effect.file
										)
									case 'delete':
										return getRoomDurableObject(this.env, effect.file.id).appFileRecordDidDelete(
											effect.file
										)
									default:
										exhaustiveSwitchError(effect.command)
								}
							default:
								exhaustiveSwitchError(effect)
						}
					})

					for (const [userId, changes] of collator.changes) {
						this._messageUser(userId, { type: 'changes', changes, lsn })
					}
				})
				this.commitLsn(lsn)
			} catch (e) {
				this.captureException(e)
			}
		})

		this.replicationService.addListener('start', () => {
			if (!this.getCurrentLsn()) {
				// make a request to force an updateLsn()
				sql`insert into replicator_boot_id ("replicatorId", "bootId") values (${this.ctx.id.toString()}, ${uniqueId()}) on conflict ("replicatorId") do update set "bootId" = excluded."bootId"`.execute(
					this.db
				)
			}
		})

		const handleError = (e: Error) => {
			this.captureException(e)
			this.reboot('retry')
		}

		this.replicationService.on('error', handleError)
		this.replicationService.subscribe(this.wal2jsonPlugin, this.slotName).catch(handleError)

		this.state = {
			type: 'connected',
		}
		promise.resolve(null)
	}

	private getCurrentLsn() {
		return this.sqlite.exec('SELECT lsn FROM meta').one().lsn as string | null
	}

	private async commitLsn(lsn: string) {
		const result = await this.replicationService.acknowledge(lsn)
		if (result) {
			// if the current lsn in the meta table is null it means
			// that we are using a brand new replication slot and we
			// need to force all user DOs to reboot
			const prevLsn = this.getCurrentLsn()
			this.sqlite.exec('UPDATE meta SET lsn = ?', lsn)
			if (!prevLsn) {
				this.onDidSequenceBreak()
			}
		} else {
			this.captureException(new Error('acknowledge failed'))
			this.reboot('retry')
		}
	}

	private parseChange(change: Wal2Json.Change): ChangeV2 | null {
		const table = change.table as ReplicationEvent['table']
		if (change.kind === 'truncate' || change.kind === 'message' || !(table in relevantTables)) {
			return null
		}

		const row = {} as any
		const previous = {} as any
		// take everything from change.columnnames and associated the values from change.columnvalues
		if (change.kind === 'delete') {
			const oldkeys = change.oldkeys
			assert(oldkeys, 'oldkeys is required for delete events')
			assert(oldkeys.keyvalues, 'oldkeys is required for delete events')
			oldkeys.keynames.forEach((key, i) => {
				row[key] = oldkeys.keyvalues[i]
			})
		} else if (change.kind === 'update') {
			const oldkeys = change.oldkeys
			assert(oldkeys, 'oldkeys is required for delete events')
			assert(oldkeys.keyvalues, 'oldkeys is required for delete events')
			oldkeys.keynames.forEach((key, i) => {
				previous[key] = oldkeys.keyvalues[i]
			})
			change.columnnames.forEach((col, i) => {
				row[col] = change.columnvalues[i]
			})
		} else {
			change.columnnames.forEach((col, i) => {
				row[col] = change.columnvalues[i]
			})
		}

		const event = {
			command: change.kind,
			table,
		}

		const topics = getTopics(row, event)
		if (topics.length === 0) {
			this.captureException(new Error('getTopics returned empty array'), { change })
			return null
		}

		return { row, previous, event, topics }
	}

	private onDidSequenceBreak() {
		// re-register all active users to get their latest guest info
		// do this in small batches to avoid overwhelming the system
		const users = this.sqlite.exec('SELECT id FROM active_user').toArray()
		this.reportActiveUsers()
		const BATCH_SIZE = 5
		const tick = () => {
			if (users.length === 0) return
			const batch = users.splice(0, BATCH_SIZE)
			for (const user of batch) {
				this._messageUser(user.id as string, { type: 'maybe_force_reboot' })
			}
			setTimeout(tick, 10)
		}
		tick()
	}

	private reportPostgresUpdate = throttle(
		() => getStatsDurableObjct(this.env).recordReplicatorPostgresUpdate(),
		5000
	)

	private userIsActive(userId: string) {
		return this.sqlite.exec(`SELECT * FROM active_user WHERE id = ?`, userId).toArray().length > 0
	}

	async ping() {
		this.log.debug('ping')
		return { sequenceId: this.slotName }
	}

	private _messageUser(userId: string, event: ZReplicationEventWithoutSequenceInfo) {
		this.log.debug('messageUser', userId, event)
		if (!this.userIsActive(userId)) {
			this.log.debug('user is not active', userId)
			return
		}
		try {
			let q = this.userDispatchQueues.get(userId)
			if (!q) {
				q = new ExecutionQueue()
				this.userDispatchQueues.set(userId, q)
			}
			const { sequenceNumber, sequenceIdSuffix } = this.sqlite
				.exec(
					'UPDATE active_user SET sequenceNumber = sequenceNumber + 1, lastUpdatedAt = ? WHERE id = ? RETURNING sequenceNumber, sequenceIdSuffix',
					Date.now(),
					userId
				)
				.one()
			assert(typeof sequenceNumber === 'number', 'sequenceNumber should be a number')
			assert(typeof sequenceIdSuffix === 'string', 'sequenceIdSuffix should be a string')

			q.push(async () => {
				const user = getUserDurableObject(this.env, userId)

				const res = await user.handleReplicationEvent({
					...event,
					sequenceNumber,
					sequenceId: this.slotName + sequenceIdSuffix,
				})
				if (res === 'unregister') {
					this.log.debug('unregistering user', userId, event)
					this.unregisterUser(userId)
				}
			})
		} catch (e) {
			this.captureException(e)
		}
	}

	reportActiveUsers() {
		try {
			const { count } = this.sqlite.exec('SELECT COUNT(*) as count FROM active_user').one()
			this.logEvent({ type: 'active_users', count: count as number })
		} catch (e) {
			console.error('Error in reportActiveUsers', e)
		}
	}

	async resumeSequence({
		userId,
		sequenceId,
		lastSequenceNumber,
	}: {
		userId: string
		sequenceId: string
		lastSequenceNumber: number
	}) {
		this.log.debug('resumeSequence', userId, sequenceId, lastSequenceNumber)
		const [row] = this.sqlite
			.exec<{
				sequenceIdSuffix: string
				sequenceNumber: number
			}>('SELECT sequenceIdSuffix, sequenceNumber FROM active_user WHERE id = ?', userId)
			.toArray()
		if (!row) return false
		const { sequenceIdSuffix, sequenceNumber: currentSequenceNumber } = row
		const canResume =
			sequenceId === this.slotName + sequenceIdSuffix &&
			lastSequenceNumber === currentSequenceNumber
		if (canResume) {
			this.log.debug('can resume sequence', userId, sequenceId, lastSequenceNumber)
			this.logEvent({ type: 'resume_sequence' })
			this.sqlite.exec('UPDATE active_user SET lastUpdatedAt = ? WHERE id = ?', Date.now(), userId)
			return true
		}
		this.log.debug('cannot resume sequence', userId, sequenceId, lastSequenceNumber)
		return false
	}

	async registerUser({
		userId,
		lsn,
		guestFileIds,
		bootId,
	}: {
		userId: string
		lsn: string
		guestFileIds: string[]
		bootId: string
	}): Promise<{ type: 'done'; sequenceId: string; sequenceNumber: number } | { type: 'reboot' }> {
		try {
			while (!this.getCurrentLsn()) {
				// this should only happen once per slot name change, which should never happen!
				await sleep(100)
			}

			this.log.debug('registering user', userId, lsn, bootId, guestFileIds)
			this.logEvent({ type: 'register_user' })

			// clear user and subscriptions
			this.sqlite.exec(`DELETE FROM active_user WHERE id = ?`, userId)
			this.sqlite.exec(
				`INSERT INTO active_user (id, sequenceNumber, sequenceIdSuffix, lastUpdatedAt) VALUES (?, 0, ?, ?)`,
				userId,
				bootId,
				Date.now()
			)

			// Clear existing subscriptions for this user
			this.sqlite.exec(`DELETE FROM topic_subscription WHERE fromTopic = ?`, `user:${userId}`)

			// Add direct subscriptions for all files the user cares about (both owned and guest)
			for (const fileId of guestFileIds) {
				this.sqlite.exec(
					`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES (?, ?) ON CONFLICT (fromTopic, toTopic) DO NOTHING`,
					`user:${userId}`,
					`file:${fileId}`
				)
			}

			this.log.debug('inserted guest file subscriptions', guestFileIds.length)

			this.reportActiveUsers()
			this.log.debug('inserted active user')

			const resume = getResumeType({
				sqlite: this.sqlite,
				log: this.log,
				currentLsn: assertExists(this.getCurrentLsn()),
				lsn,
				userId,
			})
			if (resume.type === 'reboot') {
				return { type: 'reboot' }
			}

			if (resume.messages) {
				for (const message of resume.messages) {
					this._messageUser(userId, message)
				}
			}

			return {
				type: 'done',
				sequenceId: this.slotName + bootId,
				sequenceNumber: 0,
			}
		} catch (e) {
			this.captureException(e)
			throw e
		}
	}

	private async requestLsnUpdate(userId: string) {
		try {
			this.log.debug('requestLsnUpdate', userId)
			this.logEvent({ type: 'request_lsn_update' })
			const lsn = assertExists(this.getCurrentLsn(), 'lsn should exist')
			this._messageUser(userId, { type: 'changes', changes: [], lsn })
		} catch (e) {
			this.captureException(e)
			throw e
		}
		return
	}

	async unregisterUser(userId: string) {
		this.logEvent({ type: 'unregister_user' })
		this.sqlite.exec(`DELETE FROM active_user WHERE id = ?`, userId)
		this.sqlite.exec(`DELETE FROM topic_subscription WHERE fromTopic = ?`, `user:${userId}`)
		this.reportActiveUsers()
		const queue = this.userDispatchQueues.get(userId)
		if (queue) {
			queue.close()
			this.userDispatchQueues.delete(userId)
		}
	}

	private writeEvent(eventData: EventData) {
		writeDataPoint(this.sentry, this.measure, this.env, 'replicator', eventData)
	}

	logEvent(event: TLPostgresReplicatorEvent) {
		switch (event.type) {
			case 'reboot':
				this.writeEvent({ blobs: [event.type, event.source] })
				break
			case 'reboot_error':
			case 'register_user':
			case 'unregister_user':
			case 'request_lsn_update':
			case 'prune':
			case 'get_file_record':
			case 'resume_sequence':
				this.writeEvent({
					blobs: [event.type],
				})
				break

			case 'reboot_duration':
				this.writeEvent({
					blobs: [event.type],
					doubles: [event.duration],
				})
				break
			case 'rpm':
				this.writeEvent({
					blobs: [event.type],
					doubles: [event.rpm],
				})
				break
			case 'active_users':
				this.writeEvent({
					blobs: [event.type],
					doubles: [event.count],
				})
				break
			default:
				exhaustiveSwitchError(event)
		}
	}

	private async publishSnapshot(file: TlaFile) {
		try {
			// make sure the room's snapshot is up to date
			await getRoomDurableObject(this.env, file.id).awaitPersist()
			// and that it exists
			const snapshot = await this.env.ROOMS.get(getR2KeyForRoom({ slug: file.id, isApp: true }))

			if (!snapshot) {
				throw new Error('Snapshot not found')
			}
			const blob = await snapshot.blob()

			// Create a new slug for the published room
			await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put(file.publishedSlug, file.id)

			// Bang the snapshot into the database
			await this.env.ROOM_SNAPSHOTS.put(
				getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}`, isApp: true }),
				blob
			)
			const currentTime = new Date().toISOString()
			await this.env.ROOM_SNAPSHOTS.put(
				getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}|${currentTime}`, isApp: true }),
				blob
			)
		} catch (e) {
			this.log.debug('Error publishing snapshot', e)
		}
	}

	private async unpublishSnapshot(file: TlaFile) {
		try {
			await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(file.publishedSlug)
			await this.env.ROOM_SNAPSHOTS.delete(
				getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}`, isApp: true })
			)
		} catch (e) {
			this.log.debug('Error unpublishing snapshot', e)
		}
	}
}
