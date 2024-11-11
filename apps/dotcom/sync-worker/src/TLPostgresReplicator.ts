import { ROOM_PREFIX, TlaFile, TlaFileState, TlaUser } from '@tldraw/dotcom-shared'
import { assert, compact, uniq } from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import postgres from 'postgres'
import type { EventHint } from 'toucan-js/node_modules/@sentry/types'
import type { TLUserDurableObject } from './TLUserDurableObject'
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
	json TEXT NOT NULL,
	FOREIGN KEY (ownerId) REFERENCES user (id) ON DELETE CASCADE
);

CREATE TABLE file_state (
	userId TEXT NOT NULL,
	fileId TEXT NOT NULL,
	json TEXT NOT NULL,
	PRIMARY KEY (userId, fileId),
	FOREIGN KEY (userId) REFERENCES user (id) ON DELETE CASCADE,
	FOREIGN KEY (fileId) REFERENCES file (id) ON DELETE CASCADE
);
`

export class TLPostgresReplicator extends DurableObject<Environment> {
	sql: SqlStorage
	db: ReturnType<typeof postgres>
	sentry
	captureException(exception: unknown, eventHint?: EventHint) {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		this.sentry?.captureException(exception, eventHint) as any
		if (!this.sentry) {
			console.error(exception)
		}
	}
	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)
		this.sentry = createSentry(ctx, env)

		this.db = postgres(env.BOTCOM_POSTGRES_CONNECTION_STRING, {
			types: {
				bigint: {
					from: [20], // PostgreSQL OID for BIGINT
					parse: (value: string) => Number(value), // Convert string to number
					to: 20,
					serialize: (value: number) => String(value), // Convert number to string
				},
			},
		})

		this.ctx.blockConcurrencyWhile(async () => {
			let didFetchInitialData = false
			// TODO: time how long this takes
			await new Promise((resolve, reject) => {
				this.db
					.subscribe(
						'*',
						async (row, info) => {
							if (!didFetchInitialData) {
								return
							}
							try {
								await this.handleEvent(row, info)
							} catch (e) {
								this.captureException(e)
							}
						},
						async () => {
							try {
								const users = await this.db`SELECT * FROM public.user`
								const files = await this.db`SELECT * FROM file`
								const fileStates = await this.db`SELECT * FROM file_state`
								this.ctx.storage.sql.exec(seed)
								users.forEach((user) => this.insertRow(user, 'user'))
								files.forEach((file) => this.insertRow(file, 'file'))
								fileStates.forEach((fileState) => this.insertRow(fileState, 'file_state'))
							} catch (e) {
								this.captureException(e)
								reject(e)
							}
							didFetchInitialData = true
							resolve(null)
						},
						() => {
							// TODO: ping team if this fails
							this.captureException(new Error('replication start failed'))
							reject(null)
						}
					)
					.catch((err) => {
						// TODO: ping team if this fails
						this.captureException(new Error('replication start failed (catch)'))
						this.captureException(err)
					})
			})
		})
		this.sql = this.ctx.storage.sql
	}

	async handleEvent(row: postgres.Row | null, event: postgres.ReplicationEvent) {
		if (event.relation.table === 'user_mutation_number') {
			if (!row) throw new Error('Row is required for delete event')
			const stub = this.env.TL_USER.get(
				this.env.TL_USER.idFromName(row.userId)
			) as any as TLUserDurableObject
			stub.commitMutation(row.mutationNumber)
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
			userIds = this.getImpactedUserIds(row, event)
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
				const stub = this.env.TL_USER.get(
					this.env.TL_USER.idFromName(userId)
				) as any as TLUserDurableObject
				stub.onRowChange(row, event.relation.table as 'user' | 'file' | 'file_state', event.command)
			}
		}
	}

	deleteRow(row: postgres.Row, event: postgres.ReplicationEvent) {
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
					const stub = this.env.TL_USER.get(
						this.env.TL_USER.idFromName(row.userId)
					) as any as TLUserDurableObject
					stub.onRowChange(JSON.parse(file.json), 'file', 'delete')
				}

				break
			}
		}
	}

	insertRow(_row: object, table: 'user' | 'file' | 'file_state') {
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
				const file = this.sql.exec(`SELECT * FROM file WHERE id = ?`, row.fileId).toArray()[0] as {
					json: string
					ownerId: string
				} | null
				if (!file) break
				if (file.ownerId !== row.userId) {
					const stub = this.env.TL_USER.get(
						this.env.TL_USER.idFromName(row.userId)
					) as any as TLUserDurableObject
					stub.onRowChange(JSON.parse(file.json), 'file', 'insert')
				}
				break
			}
		}
	}

	getImpactedUserIds(row: postgres.Row, event: postgres.ReplicationEvent): string[] {
		switch (event.relation.table) {
			case 'user':
				assert(row.id, 'row id is required')
				return [row.id as string]
			case 'file': {
				assert(row.id, 'row id is required')
				const file = this.sql.exec(`SELECT * FROM file WHERE id = ?`, row.id).toArray()[0]
				return compact(
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
			}

			case 'file_state':
				assert(row.userId, 'user id is required')
				assert(row.fileId, 'file id is required')
				return [row.userId as string]
		}
		return []
	}

	updateRow(_row: postgres.Row, event: postgres.ReplicationEvent) {
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

	async fetchDataForUser(userId: string) {
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
			files: files as TlaFile[],
			fileStates: fileStates as TlaFileState[],
			user: user as TlaUser,
		}
	}

	async getFileRecord(fileId: string) {
		try {
			const { json } = this.sql.exec(`SELECT json FROM file WHERE id = ?`, fileId).one()
			return JSON.parse(json as string) as TlaFile
		} catch (_e) {
			return null
		}
	}
}
