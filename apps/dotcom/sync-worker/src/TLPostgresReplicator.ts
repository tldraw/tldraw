import { ROOM_PREFIX, TlaFile, ZTable } from '@tldraw/dotcom-shared'
import { assert, promiseWithResolve, sleep, uniqueId } from '@tldraw/utils'
import { ExecutionQueue, createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import postgres from 'postgres'
import type { EventHint } from 'toucan-js/node_modules/@sentry/types'
import type { TLDrawDurableObject } from './TLDrawDurableObject'
import { ZReplicationEvent } from './UserDataSyncer'
import { getPostgres } from './getPostgres'
import { Environment } from './types'
import { getUserDurableObject } from './utils/durableObjects'

const seed = `
-- we keep the active_user data between reboots to 
-- make sure users don't miss updates.
CREATE TABLE IF NOT EXISTS active_user (
	id TEXT PRIMARY KEY
);
DROP TABLE IF EXISTS user_file_subscriptions;
CREATE TABLE user_file_subscriptions (
	userId TEXT,
	fileId TEXT,
	PRIMARY KEY (userId, fileId),
	FOREIGN KEY (userId) REFERENCES active_user(id) ON DELETE CASCADE
);
`

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
	sql: SqlStorage
	state: BootState = {
		type: 'init',
		promise: promiseWithResolve(),
		sequenceId: uniqueId(),
	}

	sentry
	// eslint-disable-next-line local/prefer-class-methods
	private captureException = (exception: unknown, eventHint?: EventHint) => {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		this.sentry?.captureException(exception, eventHint) as any
		if (!this.sentry) {
			console.error(exception)
		}
	}

	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)
		this.sentry = createSentry(ctx, env)
		this.sql = this.ctx.storage.sql
		this.sql.exec(seed)
		this.reboot(false)
		this.alarm()
	}

	__test__forceReboot() {
		this.reboot()
	}
	__test__panic() {
		this.ctx.abort()
	}

	private debug(...args: any[]) {
		// uncomment for dev time debugging
		// console.log('[TLPostgresReplicator]:', ...args)
		if (this.sentry) {
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			this.sentry.addBreadcrumb({
				message: `[TLPostgresReplicator]: ${args.join(' ')}`,
			})
		}
	}
	override async alarm() {
		this.ctx.storage.setAlarm(Date.now() + 1000)
	}

	private queue = new ExecutionQueue()

	private async reboot(delay = true) {
		// TODO: set up analytics and alerts for this
		this.debug('reboot push')
		await this.queue.push(async () => {
			if (delay) {
				await sleep(1000)
			}
			this.debug('rebooting')
			const res = await Promise.race([
				this.boot().then(() => 'ok'),
				sleep(3000).then(() => 'timeout'),
			]).catch((e) => {
				this.captureException(e)
				return 'error'
			})
			this.debug('rebooted', res)
			if (res !== 'ok') {
				this.reboot()
			}
		})
	}

	private async boot() {
		this.debug('booting')
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
			db: getPostgres(this.env),
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
				this.captureException(new Error('Subscription error'))
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
				this.messageUser(user.id as string, { type: 'force_reboot', sequenceId })
			}
			setTimeout(tick, 10)
		}
		tick()
	}

	private handleEvent(row: postgres.Row | null, event: postgres.ReplicationEvent) {
		this.queue.push(() => this._handleEvent(row, event))
	}

	private async _handleEvent(row: postgres.Row | null, event: postgres.ReplicationEvent) {
		assert(this.state.type === 'connected', 'state should be connected in handleEvent')
		try {
			if (event.relation.table === 'user_boot_id' && event.command !== 'delete') {
				assert(row, 'Row is required for insert/update event')
				this.messageUser(row.userId, {
					type: 'boot_complete',
					userId: row.userId,
					bootId: row.bootId,
					sequenceId: this.state.sequenceId,
				})
				return
			}
			if (event.relation.table === 'user_mutation_number') {
				if (!row) throw new Error('Row is required for delete event')
				this.messageUser(row.userId, {
					type: 'mutation_commit',
					mutationNumber: row.mutationNumber,
					userId: row.userId,
					sequenceId: this.state.sequenceId,
				})
				return
			}
			if (
				event.relation.table !== 'user' &&
				event.relation.table !== 'file' &&
				event.relation.table !== 'file_state'
			) {
				console.error(`Unhandled table: ${event.relation.table}`)
				return
			}
			assert(row, 'Row is required for insert/update/delete event')

			if (
				event.relation.table === 'file_state' &&
				event.command === 'insert' &&
				this.userIsActive(row.userId)
			) {
				const file = await this.getFileRecord(row.fileId)
				if (
					file &&
					file?.ownerId !== row.userId &&
					// mitigate a potential race condition where the file is unshared between the time this
					// event was dispatched and the time it was processed
					file.shared
				) {
					this.sql.exec(
						`INSERT INTO user_file_subscriptions (userId, fileId) VALUES (?, ?) ON CONFLICT (userId, fileId) DO NOTHING`,
						row.userId,
						row.fileId
					)
					this.messageUser(row.userId, {
						type: 'row_update',
						row: file,
						table: 'file',
						event: 'insert',
						sequenceId: this.state.sequenceId,
						userId: row.userId,
					})
				} else if (!file) {
					this.captureException(new Error(`File not found: ${row.fileId}`))
				}
			} else if (
				event.relation.table === 'file_state' &&
				event.command === 'delete' &&
				this.userIsActive(row.userId)
			) {
				const didHaveSubscription =
					this.sql
						.exec(
							'SELECT * FROM user_file_subscriptions WHERE userId = ? AND fileId = ?',
							row.userId,
							row.fileId
						)
						.toArray().length > 0
				if (didHaveSubscription) {
					this.sql.exec(
						`DELETE FROM user_file_subscriptions WHERE userId = ? AND fileId = ?`,
						row.userId,
						row
					)
					this.messageUser(row.userId, {
						type: 'row_update',
						row: { id: row.fileId } as any,
						table: 'file',
						event: 'delete',
						sequenceId: this.state.sequenceId,
						userId: row.userId,
					})
				}
			}
			if (event.relation.table === 'file' && event.command === 'delete') {
				this.getStubForFile(row.id).appFileRecordDidDelete()
			}
			if (event.relation.table === 'file' && event.command === 'update') {
				this.getStubForFile(row.id).appFileRecordDidUpdate(row as TlaFile)
			}

			let userIds: string[] = []
			if (row) {
				userIds = this.getActiveImpactedUserIds(row, event)
			}
			if (row) {
				for (const userId of userIds) {
					// get user DO and send update message
					this.messageUser(userId, {
						type: 'row_update',
						row: row as any,
						table: event.relation.table as ZTable,
						event: event.command,
						sequenceId: this.state.sequenceId,
						userId,
					})
				}
			}
		} catch (e) {
			this.captureException(e)
		}
	}

	private userIsActive(userId: string) {
		return this.sql.exec(`SELECT * FROM active_user WHERE id = ?`, userId).toArray().length > 0
	}

	private getActiveImpactedUserIds(row: postgres.Row, event: postgres.ReplicationEvent): string[] {
		switch (event.relation.table) {
			case 'user':
				assert(row.id, 'row id is required')
				return this.userIsActive(row.id) ? [row.id as string] : []
			case 'file': {
				const result = this.userIsActive(row.ownerId) ? [row.ownerId as string] : []
				const guestUserIds = this.sql.exec(
					`SELECT "userId" FROM user_file_subscriptions WHERE "fileId" = ?`,
					row.id
				)
				result.push(...guestUserIds.toArray().map((x) => x.userId as string))
				return result
			}
			case 'file_state':
				assert(row.userId, 'user id is required')
				assert(row.fileId, 'file id is required')
				return this.userIsActive(row.userId) ? [row.userId as string] : []
				break
			default:
				this.captureException(
					new Error(`[getActiveImpactedUserIds] Unhandled table: ${event.relation.table}`)
				)
		}
		return []
	}

	async ping() {
		this.debug('ping')
		return { sequenceId: this.state.sequenceId }
	}

	private async waitUntilConnected() {
		while (this.state.type !== 'connected') {
			await this.state.promise
		}
	}

	async getFileRecord(fileId: string) {
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

	private async messageUser(userId: string, event: ZReplicationEvent) {
		const user = getUserDurableObject(this.env, userId)
		const res = await user.handleReplicationEvent(event)
		if (res === 'unregister') {
			this.unregisterUser(userId)
		}
	}

	private getStubForFile(fileId: string) {
		const id = this.env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${fileId}`)
		return this.env.TLDR_DOC.get(id) as any as TLDrawDurableObject
	}

	async registerUser(userId: string) {
		await this.waitUntilConnected()
		assert(this.state.type === 'connected', 'state should be connected in registerUser')
		const guestFiles = await this.state
			.db`SELECT file.id as id FROM file_state JOIN file ON file_state."userId" = ${userId} AND file."ownerId" != ${userId} AND file_state."fileId" = file.id`

		// clear user and subscriptions
		this.sql.exec(`DELETE FROM active_user WHERE id = ?`, userId)
		this.sql.exec(`INSERT INTO active_user (id) VALUES (?)`, userId)
		for (const file of guestFiles) {
			this.sql.exec(
				`INSERT INTO user_file_subscriptions (userId, fileId) VALUES (?, ?) ON CONFLICT (userId, fileId) DO NOTHING`,
				userId,
				file.id
			)
		}
		return this.state.sequenceId
	}

	async unregisterUser(userId: string) {
		this.sql.exec(`DELETE FROM active_user WHERE id = ?`, userId)
	}
}
