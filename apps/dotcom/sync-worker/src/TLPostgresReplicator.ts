import { ROOM_PREFIX, TlaFile, TlaFileState, TlaUser } from '@tldraw/dotcom-shared'
import { assert, compact, promiseWithResolve, sleep, uniq, uniqueId } from '@tldraw/utils'
import { ExecutionQueue, createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import postgres from 'postgres'
import type { EventHint } from 'toucan-js/node_modules/@sentry/types'
import type { TLUserDurableObject } from './TLUserDurableObject'
import {
	fileKeys,
	fileStateKeys,
	getFetchEverythingSql,
	parseResultRow,
	userKeys,
} from './getFetchEverythingSql'
import { Environment } from './types'

const seed = `
DROP TABLE IF EXISTS file_state;
DROP TABLE IF EXISTS file;
DROP TABLE IF EXISTS user;

CREATE TABLE user (
	id TEXT PRIMARY KEY,
	json TEXT NOT NULL
);

CREATE TABLE file (
	id TEXT PRIMARY KEY,
	ownerId TEXT NOT NULL,
	json TEXT NOT NULL
);

CREATE TABLE file_state (
	userId TEXT NOT NULL,
	fileId TEXT NOT NULL,
	json TEXT NOT NULL,
	PRIMARY KEY (userId, fileId)
);

-- we keep the active_user data between reboots to 
-- make sure users don't miss updates.
CREATE TABLE IF NOT EXISTS active_user (
	id TEXT PRIMARY KEY
);
`

type PromiseWithResolve = ReturnType<typeof promiseWithResolve>

type BootState =
	| {
			type: 'init'
			promise: PromiseWithResolve
	  }
	| {
			type: 'connecting'
			db: postgres.Sql
			bootId: string
			promise: PromiseWithResolve
	  }
	| {
			type: 'connected'
			db: postgres.Sql
			bootId: string
			subscription: postgres.SubscriptionHandle
	  }

export class TLPostgresReplicator extends DurableObject<Environment> {
	sql: SqlStorage
	state: BootState = {
		type: 'init',
		promise: promiseWithResolve(),
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
		this.state = {
			type: 'connecting',
			// preserve the promise so any awaiters do eventually get resolved
			// TODO: set a timeout on the promise?
			promise: 'promise' in this.state ? this.state.promise : promiseWithResolve(),
			db: postgres(this.env.BOTCOM_POSTGRES_CONNECTION_STRING, {
				types: {
					bigint: {
						from: [20], // PostgreSQL OID for BIGINT
						parse: (value: string) => Number(value), // Convert string to number
						to: 20,
						serialize: (value: number) => String(value), // Convert number to string
					},
				},
			}),
			bootId: uniqueId(),
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

		const myId = this.ctx.id.toString()
		// if the bootId changes during the boot process, we should stop silently
		const bootId = this.state.bootId

		const promise = this.state.promise

		// TODO: time how long this takes
		const result = await new Promise<'error' | 'success'>((resolve) => {
			let didFetchInitialData = false
			let didGetBootIdInSubscription = false
			let subscription: postgres.SubscriptionHandle | undefined

			const initialUpdateBuffer: Array<{
				row: postgres.Row | null
				info: postgres.ReplicationEvent
			}> = []

			const updateState = () => {
				if (didFetchInitialData && didGetBootIdInSubscription && subscription) {
					// we got everything, so we can set the state to connected and apply any buffered events
					assert(this.state.type === 'connecting', 'state should be connecting')
					this.state = {
						type: 'connected',
						db: this.state.db,
						bootId: this.state.bootId,
						subscription,
					}
					this.debug('num updates pending after pg sync:', initialUpdateBuffer.length)
					if (initialUpdateBuffer.length) {
						while (initialUpdateBuffer.length) {
							const { row, info } = initialUpdateBuffer.shift()!
							this.handleEvent(row, info)
						}
					}
					resolve('success')
				}
			}

			assert(this.state.type === 'connecting', 'state should be connecting')
			this.debug('subscribing')
			this.state.db
				.subscribe(
					'*',
					// on message
					async (row, info) => {
						if (this.state.type === 'connected') {
							this.handleEvent(row, info)
							return
						}
						if (this.state.type !== 'connecting') return

						if (didGetBootIdInSubscription) {
							// we've already got the boot id, so just shove things into
							// a buffer until the state is set to 'connecting'
							initialUpdateBuffer.push({ row, info })
						} else if (
							info.relation.table === 'replicator_boot_id' &&
							(row as any)?.bootId === this.state.bootId
						) {
							didGetBootIdInSubscription = true
							updateState()
						}
						// ignore other events until we get the boot id
					},
					// on connect
					async () => {
						this.debug('on connect')
						try {
							assert(this.state.type === 'connecting', 'state should be connecting')
							const sql = getFetchEverythingSql(myId, bootId)
							this.ctx.storage.sql.exec(seed)
							// ok
							await this.state.db.begin(async (db) => {
								return db
									.unsafe(sql, [], { prepare: false })
									.simple()
									.forEach((row: any) => {
										this._insertRow(
											parseResultRow(
												row.table === 'user'
													? userKeys
													: row.table === 'file'
														? fileKeys
														: fileStateKeys,
												row
											),
											row.table
										)
									})
							})
							// this will prevent more events from being added to the buffer
							didFetchInitialData = true
							updateState()
						} catch (e) {
							this.debug('init failed')
							this.captureException(e)
							resolve('error')
							return
						}
					},
					// on error
					() => {
						this.debug('on error')
						// TODO: ping team if this fails repeatedly
						const e = new Error('replication start failed')
						this.captureException(e)
						if (this.state.type === 'connecting') {
							resolve('error')
						} else {
							// This happens when the connection is lost, e.g. when the database is restarted
							// or network conditions get weird.
							this.reboot()
						}
					}
				)
				.then((handle) => {
					this.debug('got handle')
					subscription = handle
					updateState()
				})
				.catch((err) => {
					this.debug('caught error')
					// TODO: ping team if this fails
					this.captureException(new Error('replication start failed (catch)'))
					this.captureException(err)
					resolve('error')
				})
		})

		if (result === 'error') {
			this.reboot()
		} else {
			promise.resolve(null)
		}
	}

	// It is important that this method is synchronous!!!!
	// We need to make sure that events are handled in-order.
	// If we make this asynchronous for whatever reason we should
	// make sure to uphold this invariant.
	handleEvent(row: postgres.Row | null, event: postgres.ReplicationEvent) {
		assert(this.state.type === 'connected', 'state should be connected in handleEvent')
		try {
			if (event.relation.table === 'replicator_boot_id') {
				assert(
					(row as any)?.replicatorId && (row as any)?.replicatorId !== this.ctx.id.toString(),
					'we should only get boot id events for other replicators: ' + (row as any)?.replicatorId
				)
				return
			}
			if (event.relation.table === 'user_mutation_number') {
				if (!row) throw new Error('Row is required for delete event')
				this.getStubForUser(row.userId).commitMutation(row.mutationNumber, row.userId)
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

			let userIds: string[] = []
			if (row) {
				userIds = this.getActiveImpactedUserIds(row, event)
			}
			switch (event.command) {
				case 'delete':
					if (!row) throw new Error('Row is required for delete event')
					this.deleteRow(row, event)
					break
				case 'insert':
					if (!row) throw new Error('Row is required for delete event')
					this.insertRow(row, event.relation.table as 'user' | 'file' | 'file_state')
					break
				case 'update':
					if (!row) throw new Error('Row is required for delete event')
					this.updateRow(row, event)
					break
				default:
					console.error(`Unhandled event: ${event}`)
			}
			if (row) {
				for (const userId of userIds) {
					// get user DO and send update message
					this.getStubForUser(userId).onRowChange(
						this.state.bootId,
						row,
						event.relation.table as 'user' | 'file' | 'file_state',
						event.command,
						userId
					)
				}
			}
		} catch (e) {
			this.captureException(e)
		}
	}

	private deleteRow(row: postgres.Row, event: postgres.ReplicationEvent) {
		assert(this.state.type === 'connected', 'state should be connected in deleteRow')
		switch (event.relation.table) {
			case 'user':
				this.sql.exec(`DELETE FROM user WHERE id = ?`, row.id)
				break
			case 'file':
				this.sql.exec(`DELETE FROM file WHERE id = ?`, row.id)
				break
			case 'file_state': {
				this.sql.exec(
					`DELETE FROM file_state WHERE userId = ? AND fileId = ?`,
					row.userId,
					row.fileId
				)

				const files = this.sql
					.exec(`SELECT * FROM file WHERE id = ? LIMIT 1`, row.fileId)
					.toArray() as any as TlaFile[]
				if (!files.length) break
				const file = files[0] as any
				if (row.userId !== file.ownerId) {
					this.getStubForUser(row.userId).onRowChange(
						this.state.bootId,
						JSON.parse(file.json),
						'file',
						'delete',
						row.userId
					)
				}

				break
			}
		}
	}
	private insertRow(_row: object, table: 'user' | 'file' | 'file_state') {
		assert(this.state.type === 'connected', 'state should be connected in insertRow')
		this._insertRow(_row, table)

		// If a user just added a file state for a shared file for the first time, they won't
		// have access to the file. We need to send them the file.
		if (table !== 'file_state') return
		const fileState = _row as TlaFileState
		const fileRow = this.sql
			.exec(`SELECT * FROM file WHERE id = ?`, fileState.fileId)
			.toArray()[0] as {
			json: string
		} | null
		if (!fileRow) return
		const file = JSON.parse(fileRow.json) as TlaFile
		if (file.shared && file.ownerId !== fileState.userId) {
			this.getStubForUser(fileState.userId).onRowChange(
				this.state.bootId,
				file,
				'file',
				'insert',
				fileState.userId
			)
		}
		// todo: if the file is no longer shared (i.e. it was unshared between the time that the mutation was validated and now)
		// then we should probably remove the fileState somehow?
	}

	private _insertRow(_row: object, table: 'user' | 'file' | 'file_state') {
		switch (table) {
			case 'user': {
				const row = _row as TlaUser
				this.sql.exec(`INSERT INTO user VALUES (?, ?)`, row.id, JSON.stringify(row))
				break
			}
			case 'file': {
				const row = _row as TlaFile
				this.sql.exec(`INSERT INTO file VALUES (?, ?, ?)`, row.id, row.ownerId, JSON.stringify(row))
				break
			}
			case 'file_state': {
				const row = _row as TlaFileState
				this.sql.exec(
					`INSERT INTO file_state VALUES (?, ?, ?)`,
					row.userId,
					row.fileId,
					JSON.stringify(row)
				)
				break
			}
		}
	}

	private getActiveImpactedUserIds(row: postgres.Row, event: postgres.ReplicationEvent): string[] {
		let result: string[] = []

		switch (event.relation.table) {
			case 'user':
				assert(row.id, 'row id is required')
				result = [row.id as string]
				break
			case 'file': {
				assert(row.id, 'row id is required')
				const file = this.sql.exec(`SELECT * FROM file WHERE id = ?`, row.id).toArray()[0]
				result = compact(
					uniq([
						...(this.sql
							.exec(
								`SELECT id FROM user WHERE EXISTS(select 1 from file_state where fileId = ?)`,
								row.id
							)
							.toArray()
							.map((x) => x.id) as string[]),
						row.ownerId as string,
						file?.ownerId as string,
					])
				)
				break
			}

			case 'file_state':
				assert(row.userId, 'user id is required')
				assert(row.fileId, 'file id is required')
				result = [row.userId as string]
				break
		}
		if (result.length === 0) return []

		const placeholders = result.map(() => '?').join(', ')
		return this.sql
			.exec(`SELECT * FROM active_user WHERE id IN (${placeholders})`, ...result)
			.toArray()
			.map((x) => x.id as string)
	}

	private updateRow(_row: postgres.Row, event: postgres.ReplicationEvent) {
		assert(this.state.type === 'connected', 'state should be connected in updateRow')
		switch (event.relation.table) {
			case 'user': {
				const row = _row as TlaUser
				this.sql.exec(`UPDATE user SET json = ? WHERE id = ?`, JSON.stringify(row), row.id)
				break
			}
			case 'file': {
				const row = _row as TlaFile
				this.sql.exec(
					`UPDATE file SET json = ?, ownerId = ? WHERE id = ?`,
					JSON.stringify(row),
					row.ownerId,
					row.id
				)

				const room = this.env.TLDR_DOC.get(
					this.env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${row.id}`)
				)
				room.appFileRecordDidUpdate(row).catch(console.error)
				break
			}
			case 'file_state': {
				const row = _row as TlaFileState
				this.sql.exec(
					`UPDATE file_state SET json = ? WHERE userId = ? AND fileId = ?`,
					JSON.stringify(row),
					row.userId,
					row.fileId
				)
				break
			}
		}
	}

	async ping() {
		return 'pong'
	}

	async waitUntilConnected() {
		while (this.state.type !== 'connected') {
			await this.state.promise
		}
	}

	async fetchDataForUser(userId: string) {
		await this.waitUntilConnected()
		assert(this.state.type === 'connected', 'state should be connected in fetchDataForUser')

		const files = this.sql
			.exec(
				`SELECT json FROM file WHERE ownerId = ? OR EXISTS(SELECT 1 from file_state WHERE userId = ? AND file_state.fileId = file.id) `,
				userId,
				userId
			)
			.toArray()
			.map((x) => JSON.parse(x.json as string))
		const fileStates = this.sql
			.exec(`SELECT json FROM file_state WHERE userId = ?`, userId)
			.toArray()
			.map((x) => JSON.parse(x.json as string))
		const user = this.sql
			.exec(`SELECT json FROM user WHERE id = ?`, userId)
			.toArray()
			.map((x) => JSON.parse(x.json as string))[0]

		return {
			bootId: this.state.bootId,
			data: {
				files: files as TlaFile[],
				fileStates: fileStates as TlaFileState[],
				user: user as TlaUser,
			},
		}
	}

	async getFileRecord(fileId: string) {
		await this.waitUntilConnected()
		try {
			const { json } = this.sql.exec(`SELECT json FROM file WHERE id = ?`, fileId).one()
			return JSON.parse(json as string) as TlaFile
		} catch (_e) {
			return null
		}
	}

	private getStubForUser(userId: string) {
		const id = this.env.TL_USER.idFromName(userId)
		return this.env.TL_USER.get(id) as any as TLUserDurableObject
	}

	registerUser(userId: string) {
		this.sql.exec(`INSERT INTO active_user (id) VALUES (?) ON CONFLICT (id) DO NOTHING`, userId)
	}

	unregisterUser(userId: string) {
		this.sql.exec(`DELETE FROM active_user WHERE id = ?`, userId)
	}
}
