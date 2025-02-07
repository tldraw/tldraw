import { DB, TlaFile, ZTable } from '@tldraw/dotcom-shared'
import {
	ExecutionQueue,
	assert,
	exhaustiveSwitchError,
	promiseWithResolve,
	sleep,
	uniqueId,
} from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { Kysely, sql } from 'kysely'
import postgres from 'postgres'
import { Logger } from './Logger'
import { ZReplicationEventWithoutSequenceInfo } from './UserDataSyncer'
import { createPostgresConnection, createPostgresConnectionPool } from './postgres'
import { Analytics, Environment, TLPostgresReplicatorEvent } from './types'
import { EventData, writeDataPoint } from './utils/analytics'
import { getRoomDurableObject, getUserDurableObject } from './utils/durableObjects'

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
]

const ONE_MINUTE = 60 * 1000

type PromiseWithResolve = ReturnType<typeof promiseWithResolve>

type BootState =
	| {
			type: 'init'
			promise: PromiseWithResolve
			sequenceId: string
	  }
	| {
			type: 'connecting'
			db: postgres.Sql
			sequenceId: string
			promise: PromiseWithResolve
	  }
	| {
			type: 'connected'
			db: postgres.Sql
			sequenceId: string
			subscription: postgres.SubscriptionHandle
	  }

export class TLPostgresReplicator extends DurableObject<Environment> {
	private sql: SqlStorage
	private state: BootState = {
		type: 'init',
		promise: promiseWithResolve(),
		sequenceId: uniqueId(),
	}
	private measure: Analytics | undefined
	private postgresUpdates = 0
	private lastPostgresMessageTime = Date.now()
	private lastRpmLogTime = Date.now()

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

	private readonly db: Kysely<DB>
	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)
		this.sentry = createSentry(ctx, env)
		this.sql = this.ctx.storage.sql

		this.ctx.blockConcurrencyWhile(async () =>
			this._migrate().catch((e) => {
				this.captureException(e)
				throw e
			})
		)

		// debug logging in preview envs by default
		this.log = new Logger(env, 'TLPostgresReplicator', this.sentry)
		this.db = createPostgresConnectionPool(env, 'TLPostgresReplicator')

		this.alarm()
		this.reboot(false).catch((e) => {
			this.captureException(e)
			this.__test__panic()
		})
		this.measure = env.MEASURE
	}

	private _applyMigration(index: number) {
		this.sql.exec(migrations[index].code)
		this.sql.exec(
			'insert into migrations (id, code) values (?, ?)',
			migrations[index].id,
			migrations[index].code
		)
	}

	private async _migrate() {
		let appliedMigrations: Migration[]
		try {
			appliedMigrations = this.sql
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

	__test__forceReboot() {
		this.reboot()
	}
	__test__panic() {
		this.ctx.abort()
	}

	override async alarm() {
		this.ctx.storage.setAlarm(Date.now() + 1000)
		this.maybeLogRpm()
		// If we haven't heard anything from postgres for 5 seconds, do a little transaction
		// to update a random string as a kind of 'ping' to keep the connection alive
		// If we haven't heard anything for 10 seconds, reboot
		if (Date.now() - this.lastPostgresMessageTime > 10000) {
			this.log.debug('rebooting due to inactivity')
			this.reboot()
		} else if (Date.now() - this.lastPostgresMessageTime > 5000) {
			sql`insert into replicator_boot_id ("replicatorId", "bootId") values (${this.ctx.id.toString()}, ${uniqueId()}) on conflict ("replicatorId") do update set "bootId" = excluded."bootId"`.execute(
				this.db
			)
		}
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

	private async reboot(delay = true) {
		this.logEvent({ type: 'reboot' })
		this.log.debug('reboot push')
		await this.queue.push(async () => {
			if (delay) {
				await sleep(1000)
			}
			const start = Date.now()
			this.log.debug('rebooting')
			const res = await Promise.race([
				this.boot().then(() => 'ok'),
				sleep(3000).then(() => 'timeout'),
			]).catch((e) => {
				this.logEvent({ type: 'reboot_error' })
				this.captureException(e)
				return 'error'
			})
			this.log.debug('rebooted', res)
			if (res === 'ok') {
				this.logEvent({ type: 'reboot_duration', duration: Date.now() - start })
			} else {
				this.reboot()
			}
		})
	}

	private async boot() {
		this.log.debug('booting')
		this.lastPostgresMessageTime = Date.now()
		// clean up old resources if necessary
		if (this.state.type === 'connected') {
			this.state.subscription.unsubscribe()
			this.state.db.end().catch(this.captureException)
		} else if (this.state.type === 'connecting') {
			this.state.db.end().catch(this.captureException)
		}
		const promise = 'promise' in this.state ? this.state.promise : promiseWithResolve()
		this.state = {
			type: 'connecting',
			// preserve the promise so any awaiters do eventually get resolved
			// TODO: set a timeout on the promise?
			promise,
			db: createPostgresConnection(this.env, { name: 'TLPostgresReplicator' }),
			sequenceId: uniqueId(),
		}
		const subscription = await this.state.db.subscribe(
			'*',
			this.handleEvent.bind(this),
			() => {
				this.onDidBoot()
			},
			() => {
				// this is invoked if the subscription is closed unexpectedly
				this.captureException(new Error('Subscription error (we can tolerate this)'))
				this.reboot()
			}
		)

		this.state = {
			type: 'connected',
			subscription,
			sequenceId: this.state.sequenceId,
			db: this.state.db,
		}
		promise.resolve(null)
	}

	private onDidBoot() {
		// re-register all active users to get their latest guest info
		// do this in small batches to avoid overwhelming the system
		const users = this.sql.exec('SELECT id FROM active_user').toArray()
		const sequenceId = this.state.sequenceId
		const BATCH_SIZE = 5
		const tick = () => {
			if (this.state.sequenceId !== sequenceId) return
			if (users.length === 0) return
			const batch = users.splice(0, BATCH_SIZE)
			for (const user of batch) {
				this.messageUser(user.id as string, { type: 'force_reboot' })
			}
			setTimeout(tick, 10)
		}
		tick()
	}

	private handleEvent(row: postgres.Row | null, event: postgres.ReplicationEvent) {
		this.lastPostgresMessageTime = Date.now()
		if (event.relation.table === 'replicator_boot_id') {
			// ping, ignore
			return
		}
		this.postgresUpdates++
		this.log.debug('handleEvent', event)
		assert(this.state.type === 'connected', 'state should be connected in handleEvent')
		try {
			switch (event.relation.table) {
				case 'user_boot_id':
					this.handleBootEvent(row, event)
					return
				case 'user_mutation_number':
					this.handleMutationConfirmationEvent(row, event)
					return
				case 'file_state':
					this.handleFileStateEvent(row, event)
					return
				case 'file':
					this.handleFileEvent(row, event)
					return
				case 'user':
					this.handleUserEvent(row, event)
					return
				// We don't synchronize events for these tables
				case 'asset':
				case 'applied_migrations':
					return
				default:
					this.captureException(new Error(`Unhandled table: ${event.relation.table}`), {
						event,
						row,
					})
					return
			}
		} catch (e) {
			this.captureException(e)
		}
	}

	private handleBootEvent(row: postgres.Row | null, event: postgres.ReplicationEvent) {
		if (event.command === 'delete') return
		assert(row?.bootId, 'bootId is required')
		this.messageUser(row.userId, {
			type: 'boot_complete',
			userId: row.userId,
			bootId: row.bootId,
		})
	}

	private handleMutationConfirmationEvent(
		row: postgres.Row | null,
		event: postgres.ReplicationEvent
	) {
		if (event.command === 'delete') return
		assert(typeof row?.mutationNumber === 'number', 'mutationNumber is required')
		this.messageUser(row.userId, {
			type: 'mutation_commit',
			mutationNumber: row.mutationNumber,
			userId: row.userId,
		})
	}

	private handleFileStateEvent(row: postgres.Row | null, event: postgres.ReplicationEvent) {
		assert(row?.userId, 'userId is required')
		if (!this.userIsActive(row.userId)) return
		if (event.command === 'insert') {
			this.sql.exec(
				`INSERT INTO user_file_subscriptions (userId, fileId) VALUES (?, ?)`,
				row.userId,
				row.fileId
			)
			assert(typeof row.isFileOwner === 'boolean', 'isFileOwner is required')
			if (!row.isFileOwner) {
				// need to dispatch a file creation event to the user
				const sequenceId = this.state.sequenceId
				this.getFileRecord(row.fileId).then((file) => {
					// mitigate a couple of race conditions

					// check that we didn't reboot (in which case the user do will fetch the file record on its own)
					if (this.state.sequenceId !== sequenceId) return
					// check that the subscription wasn't deleted before we managed to fetch the file record
					const sub = this.sql
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
			const sub = this.sql
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
				this.sql.exec(
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
			table: event.relation.table as ZTable,
			event: event.command,
			userId: row.userId,
		})
	}

	private handleFileEvent(row: postgres.Row | null, event: postgres.ReplicationEvent) {
		assert(row?.id, 'row id is required')
		const impactedUserIds = this.sql
			.exec('SELECT userId FROM user_file_subscriptions WHERE fileId = ?', row.id)
			.toArray()
			.map((x) => x.userId as string)
		// if the file state was deleted before the file, we might not have any impacted users
		if (event.command === 'delete') {
			getRoomDurableObject(this.env, row.id).appFileRecordDidDelete()
			this.sql.exec(`DELETE FROM user_file_subscriptions WHERE fileId = ?`, row.id)
		} else if (event.command === 'update') {
			assert(row.ownerId, 'ownerId is required when updating file')
			getRoomDurableObject(this.env, row.id).appFileRecordDidUpdate(row as TlaFile)
		} else if (event.command === 'insert') {
			assert(row.ownerId, 'ownerId is required when inserting file')
			if (!impactedUserIds.includes(row.ownerId)) {
				impactedUserIds.push(row.ownerId)
			}
			getRoomDurableObject(this.env, row.id).appFileRecordCreated(row as TlaFile)
		}
		for (const userId of impactedUserIds) {
			this.messageUser(userId, {
				type: 'row_update',
				row: row as any,
				table: event.relation.table as ZTable,
				event: event.command,
				userId,
			})
		}
	}

	private handleUserEvent(row: postgres.Row | null, event: postgres.ReplicationEvent) {
		assert(row?.id, 'user id is required')
		this.log.debug('USER EVENT', event.command, row.id)
		this.messageUser(row.id, {
			type: 'row_update',
			row: row as any,
			table: event.relation.table as ZTable,
			event: event.command,
			userId: row.id,
		})
	}

	private userIsActive(userId: string) {
		return this.sql.exec(`SELECT * FROM active_user WHERE id = ?`, userId).toArray().length > 0
	}

	async ping() {
		this.log.debug('ping')
		return { sequenceId: this.state.sequenceId }
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
			const res = await this.state.db`select * from public.file where id = ${fileId}`
			if (res.length === 0) return null
			return res[0] as TlaFile
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
				const { sequenceNumber, sequenceIdSuffix } = this.sql
					.exec(
						'UPDATE active_user SET sequenceNumber = sequenceNumber + 1 WHERE id = ? RETURNING sequenceNumber, sequenceIdSuffix',
						userId
					)
					.one()

				const user = getUserDurableObject(this.env, userId)

				assert(typeof sequenceNumber === 'number', 'sequenceNumber should be a number')
				assert(typeof sequenceIdSuffix === 'string', 'sequenceIdSuffix should be a string')

				const res = await user.handleReplicationEvent({
					...event,
					sequenceNumber,
					sequenceId: this.state.sequenceId + ':' + sequenceIdSuffix,
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

	async registerUser(userId: string) {
		try {
			this.log.debug('registering user', userId)
			this.logEvent({ type: 'register_user' })
			this.log.debug('reg user wait')
			await this.waitUntilConnected()
			this.log.debug('reg user connect')
			assert(this.state.type === 'connected', 'state should be connected in registerUser')
			const guestFiles = await this.state
				.db`SELECT "fileId" as id FROM file_state where "userId" = ${userId}`
			this.log.debug('got guest files')

			const sequenceIdSuffix = uniqueId()

			// clear user and subscriptions
			this.sql.exec(`DELETE FROM active_user WHERE id = ?`, userId)
			this.log.debug('cleared active user')
			this.sql.exec(
				`INSERT INTO active_user (id, sequenceNumber, sequenceIdSuffix) VALUES (?, 0, ?)`,
				userId,
				sequenceIdSuffix
			)
			this.log.debug('inserted active user')
			for (const file of guestFiles) {
				this.sql.exec(
					`INSERT INTO user_file_subscriptions (userId, fileId) VALUES (?, ?) ON CONFLICT (userId, fileId) DO NOTHING`,
					userId,
					file.id
				)
			}
			this.log.debug('inserted guest files', guestFiles.length)
			return {
				sequenceId: this.state.sequenceId + ':' + sequenceIdSuffix,
				sequenceNumber: 0,
			}
		} catch (e) {
			this.captureException(e)
			throw e
		}
	}

	async unregisterUser(userId: string) {
		this.logEvent({ type: 'unregister_user' })
		this.sql.exec(`DELETE FROM active_user WHERE id = ?`, userId)
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
			default:
				exhaustiveSwitchError(event)
		}
	}
}
