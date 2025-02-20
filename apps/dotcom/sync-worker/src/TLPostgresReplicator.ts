import { DB, TlaFile, TlaRow, ZTable } from '@tldraw/dotcom-shared'
import {
	ExecutionQueue,
	assert,
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

interface ReplicationEvent {
	command: 'insert' | 'update' | 'delete'
	table: keyof DB | 'replicator_boot_id' | 'user_boot_id' | 'user_mutation_number'
}

interface Migration {
	id: string
	code: string
}

const migrations: Migration[] = [
	{
		id: '000_seed',
		code: `
			CREATE TABLE IF NOT EXISTS active_user (
				id TEXT PRIMARY KEY
			);
			CREATE TABLE IF NOT EXISTS user_file_subscriptions (
				userId TEXT,
				fileId TEXT,
				PRIMARY KEY (userId, fileId),
				FOREIGN KEY (userId) REFERENCES active_user(id) ON DELETE CASCADE
			);
			CREATE TABLE migrations (
				id TEXT PRIMARY KEY,
				code TEXT NOT NULL
			);
		`,
	},
	{
		id: '001_add_sequence_number',
		code: `
			ALTER TABLE active_user ADD COLUMN sequenceNumber INTEGER NOT NULL DEFAULT 0;
			ALTER TABLE active_user ADD COLUMN sequenceIdSuffix TEXT NOT NULL DEFAULT '';
		`,
	},
	{
		id: '002_add_last_updated_at',
		code: `
			ALTER TABLE active_user ADD COLUMN lastUpdatedAt INTEGER NOT NULL DEFAULT 0;
		`,
	},
	{
		id: '003_add_lsn_tracking',
		code: `
			CREATE TABLE IF NOT EXISTS meta (
				lsn TEXT PRIMARY KEY,
				slotName TEXT NOT NULL
			);
			-- The slot name references the replication slot in postgres.
			-- If something ever gets messed up beyond mortal comprehension and we need to force all
			-- clients to reboot, we can just change the slot name by altering the slotNamePrefix in the constructor.
			INSERT INTO meta (lsn, slotName) VALUES ('0/0', 'init');
		`,
	},
]

const ONE_MINUTE = 60 * 1000
const PRUNE_TIME = 10 * ONE_MINUTE

type PromiseWithResolve = ReturnType<typeof promiseWithResolve>

type Row =
	| TlaRow
	| {
			bootId: string
			userId: string
	  }
	| {
			mutationNumber: number
			userId: string
	  }

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
		if (!this.sentry) {
			console.error(`[TLPostgresReplicator]: `, exception)
		}
	}

	private log

	private readonly replicationService
	private readonly slotName
	private readonly wal2jsonPlugin = new Wal2JsonPlugin({})

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
				await this._migrate().catch((e) => {
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

	private _applyMigration(index: number) {
		this.sqlite.exec(migrations[index].code)
		this.sqlite.exec(
			'insert into migrations (id, code) values (?, ?)',
			migrations[index].id,
			migrations[index].code
		)
	}

	private async _migrate() {
		let appliedMigrations: Migration[]
		try {
			appliedMigrations = this.sqlite
				.exec('select code, id from migrations order by id asc')
				.toArray() as any
		} catch (_e) {
			// no migrations table, run initial migration
			this._applyMigration(0)
			appliedMigrations = [migrations[0]]
		}

		for (let i = 0; i < appliedMigrations.length; i++) {
			if (appliedMigrations[i].id !== migrations[i].id) {
				throw new Error(
					'TLPostgresReplicator migrations have changed!! this is an append-only array!!'
				)
			}
		}

		for (let i = appliedMigrations.length; i < migrations.length; i++) {
			this._applyMigration(i)
		}
	}

	async __test__forceReboot() {
		this.reboot('test')
	}

	async __test__panic() {
		this.ctx.abort()
	}

	override async alarm() {
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
			this.replicationService.acknowledge('0/0')
		}
		this.maybePruneUsers()
	}

	private async maybePruneUsers() {
		const now = Date.now()
		if (now - this.lastUserPruneTime < PRUNE_TIME) return
		const cutoffTime = now - PRUNE_TIME
		const usersWithoutRecentUpdates = this.ctx.storage.sql
			.exec('SELECT id FROM active_user WHERE lastUpdatedAt < ?', cutoffTime)
			.toArray() as {
			id: string
		}[]
		for (const { id } of usersWithoutRecentUpdates) {
			if (await getUserDurableObject(this.env, id).notActive()) {
				await this.unregisterUser(id)
			}
		}
		this.lastUserPruneTime = Date.now()
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
			this.lastPostgresMessageTime = Date.now()
			this.reportPostgresUpdate()
			// don't call this.updateLsn here because it's not necessary
			// to save the lsn after heartbeats since they contain no information
			this.replicationService.acknowledge(lsn).catch(this.captureException)
		})

		this.replicationService.addListener('data', (lsn: string, log: Wal2Json.Output) => {
			this.lastPostgresMessageTime = Date.now()
			this.reportPostgresUpdate()
			for (const change of log.change) {
				this.handleEvent(change)
			}
			this.updateLsn(lsn)
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

	private async updateLsn(lsn: string) {
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
				this.messageUser(user.id as string, { type: 'maybe_force_reboot' })
			}
			setTimeout(tick, 10)
		}
		tick()
	}

	private reportPostgresUpdate = throttle(
		() => getStatsDurableObjct(this.env).recordReplicatorPostgresUpdate(),
		5000
	)

	private handleEvent(change: Wal2Json.Change) {
		// ignore events received after disconnecting, if that can even happen
		if (this.state.type !== 'connected') return

		this.postgresUpdates++

		// ignore our keepalive pings (we probably don't need this now we have the heartbeats)
		if (change.table === 'replicator_boot_id') return

		const { row, event } = this.getRowAndEvent(change)
		// We shouldn't get these two, but just to be sure we'll filter them out
		const { command, table } = event
		if (command === 'truncate' || command === 'message') {
			this.log.debug('ignoring event', event)
			return
		}
		this.log.debug('handleEvent', event, row)
		assert(this.state.type === 'connected', 'state should be connected in handleEvent')
		try {
			switch (table) {
				case 'user_boot_id':
					this.handleBootEvent(row, { command, table })
					break
				case 'user_mutation_number':
					this.handleMutationConfirmationEvent(row, { command, table })
					break
				case 'file_state':
					this.handleFileStateEvent(row, { command, table })
					break
				case 'file':
					this.handleFileEvent(row, { command, table })
					break
				case 'user':
					this.handleUserEvent(row, { command, table })
					break
				// We don't synchronize events for these tables
				case 'asset':
				case 'applied_migrations':
					break
				default:
					this.captureException(new Error(`Unhandled table: ${table}`), {
						event,
						row,
					})
					break
			}
		} catch (e) {
			this.captureException(e)
		}
	}

	private getRowAndEvent(change: Wal2Json.Change) {
		const row = {} as any
		// take everything from change.columnnames and associated the values from change.columnvalues
		if (change.kind === 'delete') {
			const oldkeys = change.oldkeys
			assert(oldkeys, 'oldkeys is required for delete events')
			assert(oldkeys.keyvalues, 'oldkeys is required for delete events')
			oldkeys.keynames.forEach((key, i) => {
				row[key] = oldkeys.keyvalues[i]
			})
		} else {
			change.columnnames.forEach((col, i) => {
				row[col] = change.columnvalues[i]
			})
		}

		const event = {
			command: change.kind,
			table: change.table,
		}
		return { row, event }
	}

	private handleBootEvent(row: Row | null, event: ReplicationEvent) {
		if (event.command === 'delete') return
		assert(row && 'bootId' in row, 'bootId is required')
		this.messageUser(row.userId, {
			type: 'boot_complete',
			userId: row.userId,
			bootId: row.bootId,
		})
	}

	private handleMutationConfirmationEvent(row: Row | null, event: ReplicationEvent) {
		if (event.command === 'delete') return
		assert(row && 'mutationNumber' in row, 'mutationNumber is required')
		this.messageUser(row.userId, {
			type: 'mutation_commit',
			mutationNumber: row.mutationNumber,
			userId: row.userId,
		})
	}

	private handleFileStateEvent(row: Row | null, event: ReplicationEvent) {
		assert(row && 'userId' in row && 'fileId' in row, 'userId is required')
		if (!this.userIsActive(row.userId)) return
		if (event.command === 'insert') {
			this.sqlite.exec(
				`INSERT INTO user_file_subscriptions (userId, fileId) VALUES (?, ?) ON CONFLICT (userId, fileId) DO NOTHING`,
				row.userId,
				row.fileId
			)
			assert(typeof row.isFileOwner === 'boolean', 'isFileOwner is required')
			if (!row.isFileOwner) {
				// need to dispatch a file creation event to the user
				this.getFileRecord(row.fileId).then((file) => {
					// check that the subscription wasn't deleted before we managed to fetch the file record
					const sub = this.sqlite
						.exec(
							`SELECT * FROM user_file_subscriptions WHERE userId = ? AND fileId = ?`,
							row.userId,
							row.fileId
						)
						.toArray()[0]
					if (!sub) return

					// alright we're good to go
					this.messageUser(row.userId, {
						type: 'row_update',
						row: file as any,
						table: 'file',
						event: 'insert',
						userId: row.userId,
					})
				})
			}
		} else if (event.command === 'delete') {
			// If the file state being deleted does not belong to the file owner,
			// we need to send a delete event for the file to the user
			const sub = this.sqlite
				.exec(
					`SELECT * FROM user_file_subscriptions WHERE userId = ? AND fileId = ?`,
					row.userId,
					row.fileId
				)
				.toArray()[0]
			if (!sub) {
				// the file was deleted before the file state
				this.log.debug('file state deleted before file', row)
			} else {
				this.sqlite.exec(
					`DELETE FROM user_file_subscriptions WHERE userId = ? AND fileId = ?`,
					row.userId,
					row.fileId
				)
				// We forward a file delete event to the user
				// even if they are the file owner. This is because the file_state
				// deletion might happen before the file deletion and we don't get the
				// ownerId on file delete events
				this.messageUser(row.userId, {
					type: 'row_update',
					row: { id: row.fileId } as any,
					table: 'file',
					event: 'delete',
					userId: row.userId,
				})
			}
		}
		this.messageUser(row.userId, {
			type: 'row_update',
			row: row as any,
			table: event.table as ZTable,
			event: event.command,
			userId: row.userId,
		})
	}

	private handleFileEvent(row: Row | null, event: ReplicationEvent) {
		assert(row && 'id' in row, 'row id is required')
		const impactedUserIds = this.sqlite
			.exec('SELECT userId FROM user_file_subscriptions WHERE fileId = ?', row.id)
			.toArray()
			.map((x) => x.userId as string)
		// if the file state was deleted before the file, we might not have any impacted users
		if (event.command === 'delete') {
			getRoomDurableObject(this.env, row.id).appFileRecordDidDelete()
			this.sqlite.exec(`DELETE FROM user_file_subscriptions WHERE fileId = ?`, row.id)
		} else if (event.command === 'update') {
			assert('ownerId' in row, 'ownerId is required when updating file')
			getRoomDurableObject(this.env, row.id).appFileRecordDidUpdate(row as TlaFile)
		} else if (event.command === 'insert') {
			assert('ownerId' in row, 'ownerId is required when inserting file')
			if (!impactedUserIds.includes(row.ownerId)) {
				impactedUserIds.push(row.ownerId)
			}
			getRoomDurableObject(this.env, row.id).appFileRecordCreated(row as TlaFile)
		}
		for (const userId of impactedUserIds) {
			this.messageUser(userId, {
				type: 'row_update',
				row: row as any,
				table: event.table as ZTable,
				event: event.command,
				userId,
			})
		}
	}

	private handleUserEvent(row: Row | null, event: ReplicationEvent) {
		assert(row && 'id' in row, 'user id is required')
		this.log.debug('USER EVENT', event.command, row.id)
		this.messageUser(row.id, {
			type: 'row_update',
			row: row as any,
			table: event.table as ZTable,
			event: event.command,
			userId: row.id,
		})
	}

	private userIsActive(userId: string) {
		return this.sqlite.exec(`SELECT * FROM active_user WHERE id = ?`, userId).toArray().length > 0
	}

	async ping() {
		this.log.debug('ping')
		return { sequenceId: this.slotName }
	}

	private async waitUntilConnected() {
		while (this.state.type !== 'connected') {
			await this.state.promise
		}
	}

	async getFileRecord(fileId: string) {
		this.logEvent({ type: 'get_file_record' })
		await this.waitUntilConnected()
		assert(this.state.type === 'connected', 'state should be connected in getFileRecord')
		try {
			const res = await sql`select * from public.file where id = ${fileId}`.execute(this.db)
			if (res.rows.length === 0) return null
			return res.rows[0] as TlaFile
		} catch (_e) {
			return null
		}
	}

	private async messageUser(userId: string, event: ZReplicationEventWithoutSequenceInfo) {
		if (!this.userIsActive(userId)) return
		try {
			let q = this.userDispatchQueues.get(userId)
			if (!q) {
				q = new ExecutionQueue()
				this.userDispatchQueues.set(userId, q)
			}
			await q.push(async () => {
				const { sequenceNumber, sequenceIdSuffix } = this.sqlite
					.exec(
						'UPDATE active_user SET sequenceNumber = sequenceNumber + 1, lastUpdatedAt = ? WHERE id = ? RETURNING sequenceNumber, sequenceIdSuffix',
						Date.now(),
						userId
					)
					.one()

				const user = getUserDurableObject(this.env, userId)

				assert(typeof sequenceNumber === 'number', 'sequenceNumber should be a number')
				assert(typeof sequenceIdSuffix === 'string', 'sequenceIdSuffix should be a string')

				const res = await user.handleReplicationEvent({
					...event,
					sequenceNumber,
					sequenceId: this.slotName,
				})
				if (res === 'unregister') {
					this.log.debug('unregistering user', userId, event)
					this.unregisterUser(userId)
				}
			})
		} catch (e) {
			console.error('Error in messageUser', e)
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

	async registerUser(userId: string) {
		try {
			this.log.debug('registering user', userId)
			this.logEvent({ type: 'register_user' })
			this.log.debug('reg user wait')
			await this.waitUntilConnected()
			this.log.debug('reg user connect')
			assert(this.state.type === 'connected', 'state should be connected in registerUser')
			const guestFiles = await sql<{
				id: string
			}>`SELECT "fileId" as id FROM file_state where "userId" = ${userId}`.execute(this.db)
			this.log.debug('got guest files')

			const sequenceIdSuffix = uniqueId()

			// clear user and subscriptions
			this.sqlite.exec(`DELETE FROM active_user WHERE id = ?`, userId)
			this.sqlite.exec(
				`INSERT INTO active_user (id, sequenceNumber, sequenceIdSuffix, lastUpdatedAt) VALUES (?, 0, ?, ?)`,
				userId,
				sequenceIdSuffix,
				Date.now()
			)
			this.reportActiveUsers()
			this.log.debug('inserted active user')
			for (const file of guestFiles.rows) {
				this.sqlite.exec(
					`INSERT INTO user_file_subscriptions (userId, fileId) VALUES (?, ?) ON CONFLICT (userId, fileId) DO NOTHING`,
					userId,
					file.id
				)
			}
			this.log.debug('inserted guest files', guestFiles.rows.length)
			return {
				sequenceId: this.slotName,
				sequenceNumber: 0,
			}
		} catch (e) {
			this.captureException(e)
			throw e
		}
	}

	async unregisterUser(userId: string) {
		this.logEvent({ type: 'unregister_user' })
		this.sqlite.exec(`DELETE FROM active_user WHERE id = ?`, userId)
		this.reportActiveUsers()
		const queue = this.userDispatchQueues.get(userId)
		if (queue) {
			queue.close()
			this.userDispatchQueues.delete(userId)
		}
	}

	private writeEvent(eventData: EventData) {
		writeDataPoint(this.measure, this.env, 'replicator', eventData)
	}

	logEvent(event: TLPostgresReplicatorEvent) {
		switch (event.type) {
			case 'reboot':
				this.writeEvent({ blobs: [event.type, event.source] })
				break
			case 'reboot_error':
			case 'register_user':
			case 'unregister_user':
			case 'get_file_record':
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
}
