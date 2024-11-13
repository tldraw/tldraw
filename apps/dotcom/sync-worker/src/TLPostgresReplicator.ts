import { ROOM_PREFIX, TlaFile, TlaFileState, TlaUser } from '@tldraw/dotcom-shared'
import { assert, compact, uniq, uniqueId } from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
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
DROP TABLE IF EXISTS active_user;

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

CREATE TABLE active_user (
	id TEXT PRIMARY KEY
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
			let didFetchInitialData = false
			let didGetBootIdInSubscription = false
			const myId = this.ctx.id.toString()
			const bootId = uniqueId()
			// TODO: time how long this takes
			await new Promise((resolve, reject) => {
				const initialUpdateBuffer: Array<{
					row: postgres.Row | null
					info: postgres.ReplicationEvent
				}> = []
				this.db
					.subscribe(
						'*',
						async (row, info) => {
							if (didGetBootIdInSubscription) {
								if (!didFetchInitialData) {
									initialUpdateBuffer.push({ row, info })
								} else {
									try {
										this.handleEvent(row, info)
									} catch (e) {
										this.captureException(e)
									}
								}
							} else if (
								info.relation.table === 'replicator_boot_id' &&
								(row as any)?.bootId === bootId
							) {
								didGetBootIdInSubscription = true
							} else {
								// ignore events until we get the boot id
							}
						},
						async () => {
							try {
								const sql = getFetchEverythingSql(myId, bootId)
								this.ctx.storage.sql.exec(seed)
								// ok
								await this.db.begin(async (db) => {
									return db
										.unsafe(sql, [], { prepare: false })
										.simple()
										.forEach((row: any) => {
											this.insertRow(
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
								while (initialUpdateBuffer.length) {
									const { row, info } = initialUpdateBuffer.shift()!
									this.handleEvent(row, info)
								}
								// this will prevent more events from being added to the buffer
								didFetchInitialData = true
							} catch (e) {
								this.captureException(e)
								reject(e)
							}
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

	// It is important that this method is synchronous!!!!
	// We need to make sure that events are handled in-order.
	// If we make this asynchronous for whatever reason we should
	// make sure to uphold this invariant.
	handleEvent(row: postgres.Row | null, event: postgres.ReplicationEvent) {
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
					row,
					event.relation.table as 'user' | 'file' | 'file_state',
					event.command,
					userId
				)
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
					this.getStubForUser(row.userId).onRowChange(
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
					this.getStubForUser(row.userId).onRowChange(
						JSON.parse(file.json),
						'file',
						'insert',
						row.userId
					)
				}
				break
			}
		}
	}

	getActiveImpactedUserIds(row: postgres.Row, event: postgres.ReplicationEvent): string[] {
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
