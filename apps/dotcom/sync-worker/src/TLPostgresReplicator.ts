import { ROOM_PREFIX, TlaFile } from '@tldraw/dotcom-shared'
import { assert, promiseWithResolve, sleep, uniqueId } from '@tldraw/utils'
import { ExecutionQueue, createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import postgres from 'postgres'
import type { EventHint } from 'toucan-js/node_modules/@sentry/types'
import type { TLDrawDurableObject } from './TLDrawDurableObject'
import type { TLUserDurableObject } from './TLUserDurableObject'
import { getPostgres } from './getPostgres'
import { Environment } from './types'

const seed = `
-- we keep the active_user data between reboots to 
-- make sure users don't miss updates.
CREATE TABLE IF NOT EXISTS active_user (
	id TEXT PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS user_file_subscriptions (
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
	}
	private debug(...args: any[]) {
		// uncomment for dev time debugging
		// console.log(...args)
		if (this.sentry) {
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			this.sentry.addBreadcrumb({
				message: args.join(' '),
			})
		}
	}

	private queue = new ExecutionQueue()

	private async reboot(delay = true) {
		// TODO: set up analytics and alerts for this
		this.debug('rebooting')
		await this.queue.push(async () => {
			if (delay) {
				await sleep(1000)
			}
			await this.boot()
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
			() => {},
			() => {
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

	handleEvent(row: postgres.Row | null, event: postgres.ReplicationEvent) {
		this.queue.push(() => this._handleEvent(row, event))
	}

	async _handleEvent(row: postgres.Row | null, event: postgres.ReplicationEvent) {
		assert(this.state.type === 'connected', 'state should be connected in handleEvent')
		try {
			if (event.relation.table === 'user_boot_id' && event.command !== 'delete') {
				assert(row, 'Row is required for insert/update event')
				this.getStubForUser(row.userId).handleReplicationEvent({
					type: 'boot_complete',
					userId: row.userId,
					bootId: row.bootId,
					sequenceId: this.state.sequenceId,
				})
				return
			}
			if (event.relation.table === 'user_mutation_number') {
				if (!row) throw new Error('Row is required for delete event')
				this.getStubForUser(row.userId).handleReplicationEvent({
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
					this.getStubForUser(row.userId).handleReplicationEvent({
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
					this.getStubForUser(row.userId).handleReplicationEvent({
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
					this.getStubForUser(userId).handleReplicationEvent({
						type: 'row_update',
						row: row as any,
						table: event.relation.table as 'user' | 'file' | 'file_state',
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
		let result: string[] = []

		switch (event.relation.table) {
			case 'user':
				assert(row.id, 'row id is required')
				result = [row.id as string]
				break
			case 'file': {
				result = [row.ownerId as string]
				const guestUserIds = this.sql.exec(
					`SELECT "userId" FROM user_file_subscriptions WHERE "fileId" = ?`,
					row.id
				)
				result.push(...guestUserIds.toArray().map((x) => x.userId as string))
				break
			}
			case 'file_state':
				assert(row.userId, 'user id is required')
				assert(row.fileId, 'file id is required')
				result = [row.userId as string]
				break
		}
		if (result.length === 0) return []

		const ids = result.map((id) => `'${id}'`).join(', ')
		return this.sql
			.exec(`SELECT * FROM active_user WHERE id IN (${ids})`)
			.toArray()
			.map((x) => x.id as string)
	}

	async ping() {
		return { sequenceId: this.state.sequenceId }
	}

	async waitUntilConnected() {
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

	private getStubForUser(userId: string) {
		const id = this.env.TL_USER.idFromName(userId)
		return this.env.TL_USER.get(id) as any as TLUserDurableObject
	}

	private getStubForFile(fileId: string) {
		const id = this.env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${fileId}`)
		return this.env.TLDR_DOC.get(id) as any as TLDrawDurableObject
	}

	async registerUser(userId: string) {
		this.debug('registerUser', userId)
		await this.waitUntilConnected()
		this.debug('registerUser', userId, 'connected')
		assert(this.state.type === 'connected', 'state should be connected in registerUser')
		this.sql.exec(`INSERT INTO active_user (id) VALUES (?) ON CONFLICT (id) DO NOTHING`, userId)
		const guestFiles = await this.state
			.db`SELECT file.id FROM file_state JOIN file ON file_state."userId" = ${userId} AND file."ownerId" != ${userId} AND file_state."fileId" = file.id`
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
